import { exportedDeckSignature } from "./local-deck-file-state"
import type { ExportedDeck } from "./types"

export type LocalDeckRecoverySnapshot = {
  capturedAt: string
  deckId: string
  exportedDeck: ExportedDeck
  id: string
  slideCount: number
  title: string
  updatedAt: string
}

export type LocalDeckRecoveryRestoreResult = {
  checkpointCreated: boolean
  snapshot: LocalDeckRecoverySnapshot | null
  snapshots: LocalDeckRecoverySnapshot[]
}

const recoveryStorageKey = "essence-powerpoint:local-recovery-snapshots"
const maxRecoverySnapshots = 6

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window
}

function isExportedDeck(value: unknown): value is ExportedDeck {
  const candidate = value as Partial<ExportedDeck>
  return candidate?.version === 1 && Array.isArray(candidate.deck?.slides)
}

function isRecoverySnapshot(value: unknown): value is LocalDeckRecoverySnapshot {
  const candidate = value as Partial<LocalDeckRecoverySnapshot>

  return (
    typeof candidate.id === "string" &&
    typeof candidate.capturedAt === "string" &&
    typeof candidate.deckId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.slideCount === "number" &&
    typeof candidate.updatedAt === "string" &&
    isExportedDeck(candidate.exportedDeck)
  )
}

function recoverySnapshotId(exportedDeck: ExportedDeck, capturedAt: string) {
  return `${exportedDeck.deck.id}:${capturedAt}`
}

export function localDeckRecoverySnapshotFromExportedDeck(
  exportedDeck: ExportedDeck,
  now = new Date(),
): LocalDeckRecoverySnapshot {
  const capturedAt = now.toISOString()

  return {
    capturedAt,
    deckId: exportedDeck.deck.id,
    exportedDeck,
    id: recoverySnapshotId(exportedDeck, capturedAt),
    slideCount: exportedDeck.deck.slides.length,
    title: exportedDeck.deck.title,
    updatedAt: exportedDeck.deck.updatedAt,
  }
}

export function rememberLocalDeckRecoverySnapshotInList(
  snapshots: LocalDeckRecoverySnapshot[],
  exportedDeck: ExportedDeck,
  now = new Date(),
) {
  const signature = exportedDeckSignature(exportedDeck)
  const existing = snapshots.filter(
    (snapshot) => exportedDeckSignature(snapshot.exportedDeck) !== signature,
  )

  return [
    localDeckRecoverySnapshotFromExportedDeck(exportedDeck, now),
    ...existing,
  ].slice(0, maxRecoverySnapshots)
}

export function rememberLocalDeckRecoveryRestoreCheckpointInList(
  snapshots: LocalDeckRecoverySnapshot[],
  currentExportedDeck: ExportedDeck,
  restoringSnapshot: LocalDeckRecoverySnapshot,
  now = new Date(),
) {
  const currentSignature = exportedDeckSignature(currentExportedDeck)
  const restoringSignature = exportedDeckSignature(
    restoringSnapshot.exportedDeck,
  )

  if (currentSignature === restoringSignature) {
    return {
      checkpointCreated: false,
      snapshots,
    }
  }

  const checkpoint = localDeckRecoverySnapshotFromExportedDeck(
    currentExportedDeck,
    now,
  )
  const remaining = snapshots.filter(
    (snapshot) =>
      snapshot.id !== restoringSnapshot.id &&
      exportedDeckSignature(snapshot.exportedDeck) !== currentSignature,
  )

  return {
    checkpointCreated: true,
    snapshots: [checkpoint, restoringSnapshot, ...remaining].slice(
      0,
      maxRecoverySnapshots,
    ),
  }
}

export function readLocalDeckRecoverySnapshots() {
  if (!canUseLocalStorage()) return []

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(recoveryStorageKey) ?? "[]",
    ) as unknown

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isRecoverySnapshot)
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
      .slice(0, maxRecoverySnapshots)
  } catch {
    return []
  }
}

function writeLocalDeckRecoverySnapshots(
  snapshots: LocalDeckRecoverySnapshot[],
) {
  if (!canUseLocalStorage()) return

  window.localStorage.setItem(
    recoveryStorageKey,
    JSON.stringify(snapshots.slice(0, maxRecoverySnapshots)),
  )
}

export function rememberLocalDeckRecoverySnapshot(exportedDeck: ExportedDeck) {
  const snapshots = rememberLocalDeckRecoverySnapshotInList(
    readLocalDeckRecoverySnapshots(),
    exportedDeck,
  )

  writeLocalDeckRecoverySnapshots(snapshots)

  return snapshots
}

export function forgetLocalDeckRecoverySnapshot(snapshotId: string) {
  const snapshots = readLocalDeckRecoverySnapshots().filter(
    (snapshot) => snapshot.id !== snapshotId,
  )

  writeLocalDeckRecoverySnapshots(snapshots)

  return snapshots
}

export function rememberLocalDeckRecoveryRestoreCheckpoint(
  snapshotId: string,
  currentExportedDeck: ExportedDeck,
): LocalDeckRecoveryRestoreResult {
  const snapshots = readLocalDeckRecoverySnapshots()
  const snapshot = snapshots.find((item) => item.id === snapshotId) ?? null

  if (!snapshot) {
    const updatedSnapshots = snapshots.filter((item) => item.id !== snapshotId)
    writeLocalDeckRecoverySnapshots(updatedSnapshots)

    return {
      checkpointCreated: false,
      snapshot: null,
      snapshots: updatedSnapshots,
    }
  }

  const result = rememberLocalDeckRecoveryRestoreCheckpointInList(
    snapshots,
    currentExportedDeck,
    snapshot,
  )

  writeLocalDeckRecoverySnapshots(result.snapshots)

  return {
    ...result,
    snapshot,
  }
}

export function forgetLocalDeckRecoverySnapshotsForDeckInList(
  snapshots: LocalDeckRecoverySnapshot[],
  deckId: string,
) {
  return snapshots.filter((snapshot) => snapshot.deckId !== deckId)
}

export function forgetLocalDeckRecoverySnapshotsForDeck(deckId: string) {
  const snapshots = forgetLocalDeckRecoverySnapshotsForDeckInList(
    readLocalDeckRecoverySnapshots(),
    deckId,
  )

  writeLocalDeckRecoverySnapshots(snapshots)

  return snapshots
}

export function clearLocalDeckRecoverySnapshots() {
  writeLocalDeckRecoverySnapshots([])

  return []
}
