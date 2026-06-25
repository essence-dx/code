import { isElementLocked } from "./element-visibility"
import type {
  CollaborationMutationElement,
  CollaborationObjectMutation,
} from "./collaboration-mutations"
import type { Deck, PresentationElement } from "./types"

export type CollaborationMutationSkipReason =
  | "missing-slide"
  | "missing-element"
  | "locked-element"
  | "type-mismatch"

export type CollaborationMutationSkip = {
  elementId: string
  reason: CollaborationMutationSkipReason
}

export type CollaborationMutationApplyResult = {
  appliedCount: number
  deck: Deck
  skipped: CollaborationMutationSkip[]
}

export type CollaborationMutationSkipDetail = CollaborationMutationSkip & {
  canSelectLocalElement: boolean
  localElementType: PresentationElement["type"] | null
}

export function collaborationMutationSkipReasonLabel(
  reason: CollaborationMutationSkipReason,
) {
  if (reason === "missing-slide") return "missing slide"
  if (reason === "missing-element") return "missing object"
  if (reason === "locked-element") return "locked object"
  return "type conflict"
}

export function collaborationMutationApplySummary(
  result: CollaborationMutationApplyResult,
) {
  const applied =
    result.appliedCount > 0
      ? `Applied ${result.appliedCount} remote object${
          result.appliedCount === 1 ? "" : "s"
        }.`
      : "No remote objects were applied."

  if (!result.skipped.length) return applied

  const skippedByReason = result.skipped.reduce(
    (counts, item) =>
      counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1),
    new Map<CollaborationMutationSkipReason, number>(),
  )
  const skipped = Array.from(skippedByReason.entries())
    .map(
      ([reason, count]) =>
        `${count} ${collaborationMutationSkipReasonLabel(reason)}${
          count === 1 ? "" : "s"
        }`,
    )
    .join(", ")

  return `${applied} Skipped ${skipped}.`
}

export function collaborationMutationSkipDetails(
  deck: Deck,
  mutation: CollaborationObjectMutation,
  result: CollaborationMutationApplyResult,
): CollaborationMutationSkipDetail[] {
  const slide = deck.slides.find((item) => item.id === mutation.slideId)

  return result.skipped.map((skip) => {
    const localElement = slide?.elements.find(
      (element) => element.id === skip.elementId,
    )

    return {
      ...skip,
      canSelectLocalElement: Boolean(localElement),
      localElementType: localElement?.type ?? null,
    }
  })
}

function canPatchText(element: PresentationElement) {
  return element.type === "title" || element.type === "text"
}

function patchFromSnapshot(
  existing: PresentationElement,
  snapshot: CollaborationMutationElement,
  action: CollaborationObjectMutation["action"],
): Partial<Omit<PresentationElement, "id">> {
  return {
    height: snapshot.height,
    rotation: snapshot.rotation,
    width: snapshot.width,
    x: snapshot.x,
    y: snapshot.y,
    ...(action === "text" && snapshot.content !== null && canPatchText(existing)
      ? { content: snapshot.content }
      : {}),
  }
}

function hasPatchChange(
  element: PresentationElement,
  patch: Partial<Omit<PresentationElement, "id">>,
) {
  return Object.entries(patch).some(
    ([key, value]) =>
      element[key as keyof PresentationElement] !==
      (value as PresentationElement[keyof PresentationElement]),
  )
}

export function applyCollaborationObjectMutation(
  deck: Deck,
  mutation: CollaborationObjectMutation,
): CollaborationMutationApplyResult {
  const targetSlide = deck.slides.find((slide) => slide.id === mutation.slideId)

  if (!targetSlide) {
    return {
      appliedCount: 0,
      deck,
      skipped: mutation.elements.map((element) => ({
        elementId: element.id,
        reason: "missing-slide",
      })),
    }
  }

  const skipped: CollaborationMutationSkip[] = []
  const patches = new Map<string, Partial<Omit<PresentationElement, "id">>>()

  for (const snapshot of mutation.elements) {
    const existing = targetSlide.elements.find(
      (element) => element.id === snapshot.id,
    )

    if (!existing) {
      skipped.push({ elementId: snapshot.id, reason: "missing-element" })
      continue
    }

    if (isElementLocked(existing)) {
      skipped.push({ elementId: snapshot.id, reason: "locked-element" })
      continue
    }

    if (snapshot.type !== "unknown" && snapshot.type !== existing.type) {
      skipped.push({ elementId: snapshot.id, reason: "type-mismatch" })
      continue
    }

    const patch = patchFromSnapshot(existing, snapshot, mutation.action)
    if (hasPatchChange(existing, patch)) {
      patches.set(existing.id, patch)
    }
  }

  if (!patches.size) {
    return { appliedCount: 0, deck, skipped }
  }

  return {
    appliedCount: patches.size,
    deck: {
      ...deck,
      slides: deck.slides.map((slide) =>
        slide.id === mutation.slideId
          ? {
              ...slide,
              elements: slide.elements.map((element) => {
                const patch = patches.get(element.id)
                return patch ? { ...element, ...patch } : element
              }),
            }
          : slide,
      ),
    },
    skipped,
  }
}
