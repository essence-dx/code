import type { ExportedDeck } from "./types"

export type LocalDeckFileSession = {
  fileName: string
  lastSavedAt: number
  lastSavedSignature: string
  writable: boolean
}

export type LocalDeckFileStatusKind = "clean" | "dirty" | "untracked"

export type LocalDeckFileStatus = {
  detail: string
  fileName: string
  hasUnsavedChanges: boolean
  kind: LocalDeckFileStatusKind
  label: string
}

export function serializeExportedDeck(value: ExportedDeck) {
  return JSON.stringify(value, null, 2)
}

export function exportedDeckSignature(value: ExportedDeck) {
  return JSON.stringify({
    version: value.version,
    deck: {
      ...value.deck,
      updatedAt: "",
    },
  })
}

export function localDeckFileSessionFromExportedDeck(input: {
  exportedDeck: ExportedDeck
  fileName: string
  now?: Date
  writable: boolean
}): LocalDeckFileSession {
  return {
    fileName: input.fileName,
    lastSavedAt: (input.now ?? new Date()).getTime(),
    lastSavedSignature: exportedDeckSignature(input.exportedDeck),
    writable: input.writable,
  }
}

export function localDeckFileStatus(input: {
  current: ExportedDeck
  session: LocalDeckFileSession | null
}): LocalDeckFileStatus {
  if (!input.session) {
    return {
      detail: "Choose Save as deck file to create a local deck file.",
      fileName: "Unsaved deck",
      hasUnsavedChanges: true,
      kind: "untracked",
      label: "Not saved",
    }
  }

  const hasUnsavedChanges =
    exportedDeckSignature(input.current) !== input.session.lastSavedSignature

  if (hasUnsavedChanges) {
    return {
      detail: input.session.writable
        ? `Ctrl+S saves changes to ${input.session.fileName}.`
        : "Choose Save as deck file to write these changes to a local file.",
      fileName: input.session.fileName,
      hasUnsavedChanges: true,
      kind: "dirty",
      label: "Unsaved changes",
    }
  }

  return {
    detail: input.session.writable
      ? `Saved to ${input.session.fileName}.`
      : "Opened from a local file; use Save as deck file to write a new copy.",
    fileName: input.session.fileName,
    hasUnsavedChanges: false,
    kind: "clean",
    label: "Saved",
  }
}
