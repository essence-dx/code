import { nanoid } from "nanoid";
import {
  isCreationDraftInput,
  normalizeCreationDraftInput,
  type CreationDraftInput,
  type CreationDraftSource,
} from "./creation-drafts";

const storageKey = "essence-suno:composer-snapshots";
const snapshotsChangedEvent = "essence-suno:composer-snapshots-changed";
export const composerSnapshotLimit = 16;

export type ComposerSnapshotReason =
  | "draft"
  | "manual"
  | "playlist"
  | "replay"
  | "reuse";

export type ComposerSnapshot = {
  changedFields: string[];
  createdAt: number;
  draft: CreationDraftInput;
  handoffTitle: string;
  id: string;
  note?: string;
  pinned?: boolean;
  reason: ComposerSnapshotReason;
};

export type ComposerSnapshotInput = {
  changedFields: string[];
  draft: CreationDraftInput;
  handoffTitle: string;
  reason: ComposerSnapshotReason;
};

export type ComposerSnapshotImportResult = {
  imported: number;
  skipped: number;
  total: number;
};

export function listComposerSnapshots(): ComposerSnapshot[] {
  return sortSnapshots(readSnapshots());
}

export function saveComposerSnapshot(input: ComposerSnapshotInput) {
  const snapshot: ComposerSnapshot = {
    changedFields: normalizeChangedFields(input.changedFields),
    createdAt: Date.now(),
    draft: normalizeSnapshotDraft(input.draft),
    handoffTitle: input.handoffTitle.trim() || "Composer handoff",
    id: nanoid(),
    reason: input.reason,
  };

  if (!hasMeaningfulComposerState(snapshot.draft)) {
    return null;
  }

  writeSnapshots([snapshot, ...readSnapshots()].slice(0, composerSnapshotLimit));
  return snapshot;
}

export function deleteComposerSnapshot(id: string) {
  writeSnapshots(readSnapshots().filter((snapshot) => snapshot.id !== id));
}

export function deleteComposerSnapshots(ids: string[]) {
  const idSet = new Set(ids);
  writeSnapshots(readSnapshots().filter((snapshot) => !idSet.has(snapshot.id)));
}

export function updateComposerSnapshotNote(id: string, note: string) {
  const normalizedNote = normalizeSnapshotNote(note);
  writeSnapshots(
    readSnapshots().map((snapshot) =>
      snapshot.id === id
        ? {
            ...snapshot,
            note: normalizedNote,
          }
        : snapshot,
    ),
  );
}

export function toggleComposerSnapshotPin(id: string) {
  writeSnapshots(
    sortSnapshots(
      readSnapshots().map((snapshot) =>
        snapshot.id === id
          ? {
              ...snapshot,
              pinned: !snapshot.pinned,
            }
          : snapshot,
      ),
    ),
  );
}

export function serializeComposerSnapshots() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      snapshots: listComposerSnapshots(),
      type: "composer-snapshots",
      version: 1,
    },
    null,
    2,
  );
}

export function importComposerSnapshots(
  raw: string,
): ComposerSnapshotImportResult {
  const candidates = parseSnapshotArchive(raw);
  const existingSnapshots = readSnapshots();
  const existingIds = new Set(
    existingSnapshots.map((snapshot) => snapshot.id),
  );
  const availableSlots = Math.max(
    0,
    composerSnapshotLimit - existingSnapshots.length,
  );
  const importedSnapshots: ComposerSnapshot[] = [];
  const result: ComposerSnapshotImportResult = {
    imported: 0,
    skipped: 0,
    total: candidates.length,
  };

  for (const candidate of candidates) {
    if (importedSnapshots.length >= availableSlots) {
      result.skipped += 1;
      continue;
    }

    const snapshot = normalizeImportedSnapshot(candidate);
    if (!snapshot || existingIds.has(snapshot.id)) {
      result.skipped += 1;
      continue;
    }

    existingIds.add(snapshot.id);
    importedSnapshots.push(snapshot);
    result.imported += 1;
  }

  if (importedSnapshots.length) {
    writeSnapshots(
      [...importedSnapshots, ...existingSnapshots]
        .sort(compareSnapshots)
        .slice(0, composerSnapshotLimit),
    );
  }

  return result;
}

export function subscribeToComposerSnapshots(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(snapshotsChangedEvent, listener);
  return () => window.removeEventListener(snapshotsChangedEvent, listener);
}

export function composerConflictFields(
  current: CreationDraftInput,
  next: CreationDraftInput,
) {
  return [
    changedField("Prompt", current.audioPrompt, next.audioPrompt),
    changedField("Cover", current.coverPrompt, next.coverPrompt),
    changedField("Lyrics", current.lyrics, next.lyrics),
    changedField("Style", current.styleIdea, next.styleIdea),
    changedField("Theme", current.theme, next.theme),
    changedField("Title", current.title, next.title),
    changedField(
      "Persona",
      current.persona?.id ?? "",
      next.persona?.id ?? "",
    ),
    changedField(
      "Voice",
      current.voiceProfile?.id ?? "",
      next.voiceProfile?.id ?? "",
    ),
    changedField(
      "Controls",
      formatControls(current.creativeControls),
      formatControls(next.creativeControls),
    ),
  ].filter((field): field is string => Boolean(field));
}

export function snapshotReasonFromSource(
  source: CreationDraftSource | null | undefined,
): ComposerSnapshotReason {
  if (source?.type === "playlist") {
    return "playlist";
  }

  if (source?.type === "replay") {
    return "replay";
  }

  if (source?.type === "reuse") {
    return "reuse";
  }

  return "draft";
}

function parseSnapshotArchive(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    const archive = parsed as {
      snapshots?: unknown;
      type?: unknown;
      version?: unknown;
    };

    if (
      archive.type !== "composer-snapshots" ||
      archive.version !== 1 ||
      !Array.isArray(archive.snapshots)
    ) {
      return [];
    }

    return archive.snapshots;
  } catch {
    return [];
  }
}

function readSnapshots(): ComposerSnapshot[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isComposerSnapshot);
  } catch {
    return [];
  }
}

function writeSnapshots(snapshots: ComposerSnapshot[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(snapshots));
  window.dispatchEvent(new Event(snapshotsChangedEvent));
}

function isComposerSnapshot(value: unknown): value is ComposerSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<ComposerSnapshot>;

  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.createdAt === "number" &&
    Number.isFinite(snapshot.createdAt) &&
    isSnapshotReason(snapshot.reason) &&
    typeof snapshot.handoffTitle === "string" &&
    Array.isArray(snapshot.changedFields) &&
    snapshot.changedFields.every((field) => typeof field === "string") &&
    (snapshot.note === undefined || typeof snapshot.note === "string") &&
    (snapshot.pinned === undefined || typeof snapshot.pinned === "boolean") &&
    isSnapshotDraft(snapshot.draft)
  );
}

function isSnapshotReason(
  value: unknown,
): value is ComposerSnapshotReason {
  return (
    value === "draft" ||
    value === "manual" ||
    value === "playlist" ||
    value === "replay" ||
    value === "reuse"
  );
}

function isSnapshotDraft(value: unknown): value is CreationDraftInput {
  return isCreationDraftInput(value);
}

function normalizeImportedSnapshot(value: unknown): ComposerSnapshot | null {
  if (!isComposerSnapshot(value) || !value.id.trim()) {
    return null;
  }

  const draft = normalizeSnapshotDraft(value.draft);

  if (!hasMeaningfulComposerState(draft)) {
    return null;
  }

  return {
    changedFields: normalizeChangedFields(value.changedFields),
    createdAt: value.createdAt,
    draft,
    handoffTitle: value.handoffTitle.trim() || "Imported composer snapshot",
    id: value.id.trim(),
    note: normalizeSnapshotNote(value.note),
    pinned: value.pinned || undefined,
    reason: value.reason,
  };
}

function normalizeSnapshotDraft(draft: CreationDraftInput): CreationDraftInput {
  return {
    ...normalizeCreationDraftInput(draft),
    title: draft.title.trim() || "Untitled composer state",
  };
}

function hasMeaningfulComposerState(draft: CreationDraftInput) {
  return Boolean(
    draft.audioPrompt.trim() ||
      draft.coverPrompt.trim() ||
      draft.lyrics.trim() ||
      draft.styleIdea.trim() ||
      draft.theme.trim() ||
      draft.persona ||
      draft.voiceProfile,
  );
}

function normalizeChangedFields(fields: string[]) {
  const values = fields
    .map((field) => field.trim())
    .filter(Boolean)
    .slice(0, 12);

  return values.length ? values : ["Manual snapshot"];
}

function sortSnapshots(snapshots: ComposerSnapshot[]) {
  return [...snapshots].sort(compareSnapshots);
}

function compareSnapshots(a: ComposerSnapshot, b: ComposerSnapshot) {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }

  return b.createdAt - a.createdAt;
}

function normalizeSnapshotNote(note: string | undefined) {
  const value = note?.trim() ?? "";
  return value ? value.slice(0, 500) : undefined;
}

function changedField(label: string, before: string, after: string) {
  return before.trim() && before.trim() !== after.trim() ? label : "";
}

function formatControls(controls: CreationDraftInput["creativeControls"]) {
  return controls
    ? `${controls.weirdness}/${controls.structure}/${controls.referenceInfluence}`
    : "";
}
