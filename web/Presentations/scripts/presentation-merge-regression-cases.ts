import { createDefaultDeck, createSlide } from "../src/features/presentation/default-deck"
import {
  collaborationAuditSummary,
  serializeCollaborationAuditSummary,
} from "../src/features/presentation/collaboration-audit-summary"
import { deckMergeSafetyReport } from "../src/features/presentation/deck-merge-safety"
import { mergeDeckVersions } from "../src/features/presentation/deck-merge"
import type { DeckAsset } from "../src/features/presentation/types"
import { assert, assertEqual, type RegressionCase } from "./presentation-regression-utils"

function imageAsset(id: string, dataUrl: string): DeckAsset {
  return {
    id,
    type: "image",
    name: `${id}.png`,
    mimeType: "image/png",
    dataUrl,
    storage: "inline",
    remoteUrl: "",
    sizeBytes: dataUrl.length,
    createdAt: "2026-05-14T00:00:00.000Z",
  }
}

export const mergeRegressionCases: RegressionCase[] = [
  {
    name: "deck merge combines non-conflicting local and cloud slide edits",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const localDeck = {
        ...baseDeck,
        title: "Local title",
        updatedAt: "2026-05-14T00:05:00.000Z",
        slides: [{ ...firstSlide, title: "Local first slide" }, secondSlide],
      }
      const cloudDeck = {
        ...baseDeck,
        theme: "midnight" as const,
        updatedAt: "2026-05-14T00:10:00.000Z",
        slides: [
          firstSlide,
          { ...secondSlide, title: "Cloud second slide" },
          {
            ...createSlide(3),
            id: "cloud-created-slide",
            title: "Cloud created slide",
          },
        ],
      }
      const result = mergeDeckVersions({ baseDeck, localDeck, cloudDeck })

      assert(result.status === "merged", "Non-conflicting deck edits should merge")
      assertEqual(result.deck.title, "Local title", "Local-only title should win")
      assertEqual(result.deck.theme, "midnight", "Cloud-only theme should win")
      assertEqual(
        result.deck.updatedAt,
        "2026-05-14T00:10:00.000Z",
        "Merged deck should keep the newest update timestamp",
      )
      assertEqual(
        result.deck.slides[0]?.title,
        "Local first slide",
        "Local slide edit should be preserved",
      )
      assertEqual(
        result.deck.slides[1]?.title,
        "Cloud second slide",
        "Cloud slide edit should be preserved",
      )
      assertEqual(
        result.deck.slides[2]?.id,
        "cloud-created-slide",
        "Cloud-created slides should be appended after local order",
      )
      assertEqual(
        result.mergedSlides,
        3,
        "Merged slide count should include changed and created slides",
      )
      const ownerSafety = deckMergeSafetyReport(result, { role: "owner" })
      const viewerSafety = deckMergeSafetyReport(result, { role: "viewer" })

      assertEqual(
        ownerSafety.canMerge,
        true,
        "Owners should be able to apply clean merge summaries",
      )
      assert(
        ownerSafety.summary.includes("Ready to merge"),
        "Clean merge summaries should explain readiness",
      )
      assertEqual(
        ownerSafety.resolutionChoices[0]?.id,
        "apply-clean-merge",
        "Clean merge safety should expose an apply choice",
      )
      assertEqual(
        ownerSafety.resolutionChoices[0]?.enabled,
        true,
        "Owners should be able to choose clean merge application",
      )
      assertEqual(
        viewerSafety.canMerge,
        false,
        "Viewers should be blocked from applying clean merges",
      )
      assertEqual(
        viewerSafety.state,
        "blocked",
        "Viewer merge summaries should be review-only",
      )
      assert(
        viewerSafety.resolutionChoices.some(
          (choice) => choice.id === "request-owner" && choice.enabled,
        ),
        "Viewers should get an owner-request merge choice",
      )
    },
  },
  {
    name: "deck merge reports true coauthoring conflicts instead of overwriting",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const sameSlideConflict = mergeDeckVersions({
        baseDeck,
        localDeck: {
          ...baseDeck,
          slides: [{ ...firstSlide, title: "Local edit" }, secondSlide],
        },
        cloudDeck: {
          ...baseDeck,
          slides: [{ ...firstSlide, title: "Cloud edit" }, secondSlide],
        },
      })

      assertEqual(
        sameSlideConflict.status,
        "conflict",
        "Different edits to the same slide should conflict",
      )
      assertEqual(
        sameSlideConflict.conflicts[0]?.area,
        "slide",
        "Slide conflicts should identify their area",
      )
      const conflictSafety = deckMergeSafetyReport(sameSlideConflict, {
        role: "editor",
      })

      assertEqual(
        conflictSafety.canMerge,
        false,
        "Editors should not be able to apply conflicted merges",
      )
      assertEqual(
        conflictSafety.conflictAreas[0]?.area,
        "slide",
        "Merge safety summaries should group conflicts by area",
      )
      assert(
        conflictSafety.resolutionChoices.some(
          (choice) => choice.id === "keep-local" && choice.enabled,
        ),
        "Editors should be offered a local-wins conflict choice",
      )
      assert(
        conflictSafety.resolutionChoices.some(
          (choice) => choice.id === "use-cloud" && choice.enabled,
        ),
        "Editors should be offered a cloud-wins conflict choice",
      )

      const deleteVsEditConflict = mergeDeckVersions({
        baseDeck,
        localDeck: { ...baseDeck, slides: [firstSlide] },
        cloudDeck: {
          ...baseDeck,
          slides: [firstSlide, { ...secondSlide, title: "Cloud kept editing" }],
        },
      })

      assertEqual(
        deleteVsEditConflict.status,
        "conflict",
        "Deleting a slide while cloud edits it should conflict",
      )
      assertEqual(
        deleteVsEditConflict.conflicts[0]?.id,
        secondSlide.id,
        "Delete/edit conflicts should identify the slide",
      )
    },
  },
  {
    name: "collaboration audit summaries combine replies and merge choices",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const localDeck = {
        ...baseDeck,
        slides: [{ ...firstSlide, title: "Local conflict" }, secondSlide],
      }
      const cloudDeck = {
        ...baseDeck,
        slides: [{ ...firstSlide, title: "Cloud conflict" }, secondSlide],
      }
      const mergeResult = mergeDeckVersions({ baseDeck, localDeck, cloudDeck })
      const localFirstSlide = localDeck.slides[0] ?? firstSlide
      const reviewDeck = {
        ...localDeck,
        title: "Audit deck",
        slides: [
          {
            ...localFirstSlide,
            comments: [
              {
                id: "manual-1",
                authorName: "Ava",
                body: "Open follow-up",
                createdAt: "2026-05-16T10:00:00.000Z",
                mentions: [],
                resolved: false,
                targetElementId: "",
                updatedAt: "2026-05-16T10:00:00.000Z",
              },
              {
                id: "ppt-root-1",
                authorName: "Mira",
                body: "Resolved imported note",
                createdAt: "2026-05-16T10:01:00.000Z",
                mentions: [],
                resolved: true,
                source: "pptx" as const,
                sourceCommentId: "ppt-root-1",
                sourceThreadId: "ppt-thread-1",
                targetElementId: "",
                updatedAt: "2026-05-16T10:01:00.000Z",
              },
            ],
          },
          secondSlide,
        ],
      }
      const ownerAudit = collaborationAuditSummary(reviewDeck, {
        mergeResult,
        role: "owner",
      })
      const viewerAudit = collaborationAuditSummary(reviewDeck, {
        mergeResult,
        role: "viewer",
      })
      const ownerReport = serializeCollaborationAuditSummary(reviewDeck, {
        mergeResult,
        role: "owner",
      })

      assertEqual(
        ownerAudit.status,
        "needs-review",
        "Owner audit should flag merge conflicts for review",
      )
      assertEqual(
        ownerAudit.readyReplyControlCount,
        2,
        "Owners should have reply controls for open and reopenable threads",
      )
      assertEqual(
        viewerAudit.blockedReplyControlCount,
        1,
        "Viewers should have blocked controls for resolved threads",
      )
      assert(
        ownerAudit.resolutionChoices.some(
          (choice) => choice.id === "keep-local" && choice.enabled,
        ),
        "Owner audit should preserve local-wins conflict choices",
      )
      assert(
        ownerReport.includes("Collaboration operation audit") &&
          ownerReport.includes("Conflict resolution choices") &&
          ownerReport.includes("Keep local and overwrite cloud"),
        "Serialized collaboration audit should include conflict choice details",
      )
    },
  },
  {
    name: "deck merge accepts identical dual edits without false conflicts",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const sameEdit = { ...firstSlide, title: "Same coauthor title" }
      const result = mergeDeckVersions({
        baseDeck,
        localDeck: {
          ...baseDeck,
          title: "Shared title",
          slides: [sameEdit, secondSlide],
        },
        cloudDeck: {
          ...baseDeck,
          title: "Shared title",
          slides: [sameEdit, secondSlide],
        },
      })

      assert(result.status === "merged", "Identical local/cloud edits should merge")
      assertEqual(result.deck.title, "Shared title", "Shared title edit should persist")
      assertEqual(
        result.deck.slides[0]?.title,
        "Same coauthor title",
        "Shared slide edit should persist",
      )
    },
  },
  {
    name: "deck merge preserves intentional local deletions of unchanged cloud slides",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide] = baseDeck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const result = mergeDeckVersions({
        baseDeck,
        localDeck: { ...baseDeck, slides: [firstSlide] },
        cloudDeck: baseDeck,
      })

      assert(result.status === "merged", "Deleting an untouched slide should merge")
      assertEqual(result.deck.slides.length, 1, "Untouched deleted slide should stay deleted")
    },
  },
  {
    name: "deck merge reports duplicate created asset ids with different payloads",
    run() {
      const baseDeck = createDefaultDeck()
      const localAsset = imageAsset("shared-new-asset", "data:image/png;base64,local")
      const cloudAsset = imageAsset("shared-new-asset", "data:image/png;base64,cloud")
      const result = mergeDeckVersions({
        baseDeck,
        localDeck: { ...baseDeck, assets: [localAsset] },
        cloudDeck: { ...baseDeck, assets: [cloudAsset] },
      })

      assertEqual(
        result.status,
        "conflict",
        "Different new assets with the same id should conflict",
      )
      assertEqual(
        result.conflicts[0]?.area,
        "asset",
        "Duplicate asset-id conflicts should report asset area",
      )
      assertEqual(
        result.conflicts[0]?.id,
        "shared-new-asset",
        "Duplicate asset-id conflicts should identify the asset",
      )
    },
  },
]
