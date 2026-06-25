import type { CollaborationReviewRole } from "./collaboration-review-handoff"
import type { DeckMergeConflict, DeckMergeResult } from "./deck-merge"

export type DeckMergeSafetyState = "blocked" | "conflict" | "ready"

export type DeckMergeConflictAreaSummary = {
  area: DeckMergeConflict["area"]
  count: number
  label: string
}

export type DeckMergeResolutionChoiceId =
  | "apply-clean-merge"
  | "inspect-conflicts"
  | "keep-local"
  | "request-owner"
  | "use-cloud"

export type DeckMergeResolutionChoice = {
  detail: string
  enabled: boolean
  id: DeckMergeResolutionChoiceId
  label: string
  risk: "high" | "low" | "medium"
}

export type DeckMergeSafetyReport = {
  canMerge: boolean
  conflictAreas: DeckMergeConflictAreaSummary[]
  conflictCount: number
  detail: string
  mergedAssets: number
  mergedSlides: number
  resolutionChoices: DeckMergeResolutionChoice[]
  role: CollaborationReviewRole
  state: DeckMergeSafetyState
  summary: string
  visibleConflicts: DeckMergeConflict[]
}

type DeckMergeSafetyOptions = {
  role?: CollaborationReviewRole
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

function areaLabel(area: DeckMergeConflict["area"]) {
  if (area === "asset") return "Assets"
  if (area === "master") return "Master"
  if (area === "theme") return "Theme"
  if (area === "title") return "Title"

  return "Slides"
}

function conflictAreas(conflicts: DeckMergeConflict[]) {
  const counts = new Map<DeckMergeConflict["area"], number>()

  for (const conflict of conflicts) {
    counts.set(conflict.area, (counts.get(conflict.area) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([area, count]) => ({
      area,
      count,
      label: `${areaLabel(area)}: ${count}`,
    }))
    .sort((first, second) => second.count - first.count)
}

function changedItems(result: DeckMergeResult) {
  return result.mergedSlides + result.mergedAssets
}

function canWrite(role: CollaborationReviewRole) {
  return role === "owner" || role === "editor"
}

function resolutionChoice(
  id: DeckMergeResolutionChoiceId,
  label: string,
  enabled: boolean,
  detail: string,
  risk: DeckMergeResolutionChoice["risk"],
): DeckMergeResolutionChoice {
  return { detail, enabled, id, label, risk }
}

function resolutionChoices(
  result: DeckMergeResult,
  state: DeckMergeSafetyState,
  role: CollaborationReviewRole,
): DeckMergeResolutionChoice[] {
  const writer = canWrite(role)

  if (state === "blocked") {
    return [
      resolutionChoice(
        "inspect-conflicts",
        "Inspect changes",
        true,
        "Viewer can inspect the merge report without changing the deck.",
        "low",
      ),
      resolutionChoice(
        "request-owner",
        "Request owner or editor",
        true,
        "Ask a writer to apply the merge or choose a conflict side.",
        "low",
      ),
    ]
  }

  if (result.status === "merged") {
    return [
      resolutionChoice(
        "apply-clean-merge",
        "Apply clean merge",
        writer,
        writer
          ? "Apply the non-conflicting local and cloud changes."
          : "Only owners and editors can apply merge results.",
        "low",
      ),
    ]
  }

  return [
    resolutionChoice(
      "inspect-conflicts",
      "Inspect conflict details",
      true,
      "Review the grouped conflict areas before choosing a side.",
      "low",
    ),
    resolutionChoice(
      "keep-local",
      "Keep local and overwrite cloud",
      writer,
      writer
        ? "Publish the current local deck when local edits are authoritative."
        : "Only owners and editors can overwrite the cloud copy.",
      "high",
    ),
    resolutionChoice(
      "use-cloud",
      "Open cloud version",
      writer,
      writer
        ? "Switch to the cloud version when remote edits should win."
        : "Only owners and editors can replace the local editing copy.",
      "medium",
    ),
  ]
}

export function deckMergeSafetyReport(
  result: DeckMergeResult,
  options: DeckMergeSafetyOptions = {},
): DeckMergeSafetyReport {
  const role = options.role ?? "owner"
  const viewerBlocked = role === "viewer"
  const conflictCount = result.status === "conflict" ? result.conflicts.length : 0
  const state: DeckMergeSafetyState = viewerBlocked
    ? "blocked"
    : conflictCount
      ? "conflict"
      : "ready"
  const canMerge = state === "ready"
  const totalChanges = changedItems(result)
  const summary =
    state === "blocked"
      ? `Viewer can review ${plural(totalChanges, "change")} but cannot merge.`
      : state === "conflict"
        ? `${plural(conflictCount, "merge conflict")} need manual review.`
        : `Ready to merge ${plural(totalChanges, "change")}.`

  return {
    canMerge,
    conflictAreas:
      result.status === "conflict" ? conflictAreas(result.conflicts) : [],
    conflictCount,
    detail:
      state === "blocked"
        ? "Ask an owner or editor to apply the merge after review."
        : state === "conflict"
          ? "Resolve conflicting deck changes before applying the cloud merge."
          : "No conflicting local and cloud edits were detected.",
    mergedAssets: result.mergedAssets,
    mergedSlides: result.mergedSlides,
    resolutionChoices: resolutionChoices(result, state, role),
    role,
    state,
    summary,
    visibleConflicts:
      result.status === "conflict" ? result.conflicts.slice(0, 3) : [],
  }
}
