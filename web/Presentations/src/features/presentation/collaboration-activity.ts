import type { CloudDeckCollaborationEvent } from "./cloud-api"
import { collaborationMutationFromEvent } from "./collaboration-mutations"
import { collaborationSelectionFromEvent } from "./collaboration-selections"

function objectCountLabel(count: number) {
  if (count <= 0) return "slide"
  return `${count} object${count === 1 ? "" : "s"}`
}

function editActionLabel(action: string | null) {
  if (action === "move") return "Moving"
  if (action === "resize") return "Resizing"
  if (action === "rotate") return "Rotating"
  if (action === "text") return "Editing text"
  return "Editing"
}

function mutationActionLabel(action: string | null) {
  if (action === "move") return "Moved"
  if (action === "resize") return "Resized"
  if (action === "rotate") return "Rotated"
  if (action === "text") return "Updated text in"
  return "Updated"
}

export function shouldShowPresenceActivity(event: CloudDeckCollaborationEvent) {
  return event.type !== "cursor"
}

export function collaborationActivityLabel(event: CloudDeckCollaborationEvent) {
  const selection = collaborationSelectionFromEvent(event)

  if (event.type === "selection") {
    return `Selected ${objectCountLabel(selection?.elementIds.length ?? 0)}`
  }

  if (event.type === "edit-intent") {
    return `${editActionLabel(selection?.action ?? null)} ${objectCountLabel(
      selection?.elementIds.length ?? 0,
    )}`
  }

  if (event.type === "object-mutation") {
    const mutation = collaborationMutationFromEvent(event)

    return `${mutationActionLabel(mutation?.action ?? null)} ${objectCountLabel(
      mutation?.elements.length ?? 0,
    )}`
  }

  return "Moved cursor"
}
