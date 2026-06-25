import { nanoid } from "nanoid";
import type { CreativeControls } from "@/lib/ai/schemas";
import { recordCreationDraftArchiveEvent } from "./creation-draft-archive-events";
import type { PersonaAttachment } from "./persona-library";
import type { VoiceProfileAttachment } from "./voice-profiles";

const storageKey = "essence-suno:creation-drafts";
const recoveryStorageKey = "essence-suno:creation-drafts-recovery";
const draftsChangedEvent = "essence-suno:creation-drafts-changed";
export const creationDraftLimit = 40;

export type CreationDraftInput = {
  audioPrompt: string;
  coverPrompt: string;
  creativeControls?: CreativeControls;
  lyrics: string;
  persona?: PersonaAttachment | null;
  source?: CreationDraftSource | null;
  styleIdea: string;
  theme: string;
  title: string;
  voiceProfile?: VoiceProfileAttachment | null;
};

export type CreationDraftSource = {
  detail?: string;
  label: string;
  type:
    | "manual"
    | "persona"
    | "playlist"
    | "replay"
    | "reuse"
    | "variant"
    | "voice";
};

export type CreationDraft = CreationDraftInput & {
  createdAt: number;
  id: string;
  notes?: string;
  pinned?: boolean;
  updatedAt: number;
};

export type CreationDraftImportResult = {
  archiveScope: CreationDraftArchiveScope;
  capacityLimited: number;
  duplicates: number;
  invalid: number;
  imported: number;
  recoverySnapshot: CreationDraftRecoverySnapshotSummary | null;
  skipped: number;
  total: number;
  version: number | null;
};

export type CreationDraftArchivePreview = {
  archiveScope: CreationDraftArchiveScope;
  capacityLimited: number;
  duplicates: number;
  importable: number;
  invalid: number;
  total: number;
  version: number | null;
};

export type CreationDraftRecoveryRestorePreview = {
  archiveScope: CreationDraftArchiveScope;
  archiveVersion: number | null;
  canRestore: boolean;
  capacityLimited: number;
  currentDraftCount: number;
  duplicates: number;
  invalid: number;
  recoveryDraftCount: number;
  recoverySnapshotCreatedAt: number;
  recoverySnapshotReason: CreationDraftRecoveryReason;
};

export type CreationDraftRecoveryRestoreResult = {
  archiveScope: CreationDraftArchiveScope;
  archiveVersion: number | null;
  capacityLimited: number;
  duplicates: number;
  invalid: number;
  previousSnapshot: CreationDraftRecoverySnapshotSummary | null;
  restored: number;
  total: number;
};

export type CreationDraftArchiveScope =
  | "full-vault"
  | "legacy"
  | "selected-visible";

export type CreationDraftArchiveOptions = {
  scope?: Exclude<CreationDraftArchiveScope, "legacy">;
};

export type CreationDraftRecoveryReason = "archive-import" | "recovery-restore";

export type CreationDraftRecoverySnapshot = {
  archive: string;
  createdAt: number;
  draftCount: number;
  reason: CreationDraftRecoveryReason;
  version: 1;
};

export type CreationDraftRecoverySnapshotSummary = Omit<
  CreationDraftRecoverySnapshot,
  "archive"
>;

export function listCreationDrafts(): CreationDraft[] {
  return sortDrafts(readDrafts());
}

export function saveCreationDraft(input: CreationDraftInput) {
  const drafts = readDrafts();
  const now = Date.now();
  const draft: CreationDraft = {
    ...normalizeCreationDraftInput(input),
    createdAt: now,
    id: nanoid(),
    updatedAt: now,
  };
  const nextDrafts = [draft, ...drafts].slice(0, creationDraftLimit);
  writeDrafts(nextDrafts);
  return draft;
}

export function deleteCreationDraft(id: string) {
  writeDrafts(readDrafts().filter((draft) => draft.id !== id));
}

export function deleteCreationDrafts(ids: string[]) {
  const idSet = new Set(ids);
  writeDrafts(readDrafts().filter((draft) => !idSet.has(draft.id)));
}

export function setCreationDraftPinned(id: string, pinned: boolean) {
  writeDrafts(
    sortDrafts(
      readDrafts().map((draft) =>
        draft.id === id ? { ...draft, pinned, updatedAt: Date.now() } : draft,
      ),
    ),
  );
}

export function updateCreationDraftNotes(id: string, notes: string) {
  const normalizedNotes = normalizeCreationDraftNotes(notes);
  writeDrafts(
    readDrafts().map((draft) =>
      draft.id === id
        ? {
            ...draft,
            notes: normalizedNotes,
          }
        : draft,
    ),
  );
}

export function serializeCreationDrafts() {
  return serializeCreationDraftArchive(listCreationDrafts());
}

export function serializeCreationDraftArchive(
  drafts: CreationDraft[],
  options: CreationDraftArchiveOptions = {},
) {
  const sortedDrafts = sortDrafts(drafts);

  return JSON.stringify(
    {
      count: sortedDrafts.length,
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      scope: options.scope ?? "full-vault",
      type: "creation-drafts",
      version: 1,
      drafts: sortedDrafts,
    },
    null,
    2,
  );
}

export function importCreationDrafts(raw: string): CreationDraftImportResult {
  const archive = parseDraftArchive(raw);
  const existingDrafts = readDrafts();
  const existingIds = new Set(existingDrafts.map((draft) => draft.id));
  const availableSlots = Math.max(0, creationDraftLimit - existingDrafts.length);
  const importedDrafts: CreationDraft[] = [];
  const result: CreationDraftImportResult = {
    archiveScope: archive.scope,
    capacityLimited: 0,
    duplicates: 0,
    imported: 0,
    invalid: 0,
    recoverySnapshot: null,
    skipped: 0,
    total: archive.drafts.length,
    version: archive.version,
  };

  for (const candidate of archive.drafts) {
    const draft = normalizeImportedDraft(candidate);
    if (!draft) {
      result.invalid += 1;
      result.skipped += 1;
      continue;
    }

    if (existingIds.has(draft.id)) {
      result.duplicates += 1;
      result.skipped += 1;
      continue;
    }

    if (importedDrafts.length >= availableSlots) {
      result.capacityLimited += 1;
      result.skipped += 1;
      continue;
    }

    existingIds.add(draft.id);
    importedDrafts.push(draft);
    result.imported += 1;
  }

  if (importedDrafts.length) {
    result.recoverySnapshot = saveCreationDraftRecoverySnapshot(
      existingDrafts,
      "archive-import",
    );
    writeDrafts(
      sortDrafts([...importedDrafts, ...existingDrafts]).slice(
        0,
        creationDraftLimit,
      ),
    );
    recordCreationDraftArchiveEvent({
      archiveScope: result.archiveScope,
      archiveVersion: result.version,
      capacityLimited: result.capacityLimited,
      draftCount: result.imported,
      duplicates: result.duplicates,
      invalid: result.invalid,
      skipped: result.skipped,
      totalDrafts: result.total,
      type: "archive-import",
    });
  }

  return result;
}

export function previewCreationDraftArchive(
  raw: string,
): CreationDraftArchivePreview {
  const archive = parseDraftArchive(raw);
  const existingDrafts = readDrafts();
  const existingIds = new Set(existingDrafts.map((draft) => draft.id));
  const availableSlots = Math.max(0, creationDraftLimit - existingDrafts.length);
  const preview: CreationDraftArchivePreview = {
    archiveScope: archive.scope,
    capacityLimited: 0,
    duplicates: 0,
    importable: 0,
    invalid: 0,
    total: archive.drafts.length,
    version: archive.version,
  };

  for (const candidate of archive.drafts) {
    const draft = normalizeImportedDraft(candidate);
    if (!draft) {
      preview.invalid += 1;
      continue;
    }

    if (existingIds.has(draft.id)) {
      preview.duplicates += 1;
      continue;
    }

    if (preview.importable >= availableSlots) {
      preview.capacityLimited += 1;
      continue;
    }

    existingIds.add(draft.id);
    preview.importable += 1;
  }

  return preview;
}

export function previewCreationDraftRecoveryRestore(
  snapshot: CreationDraftRecoverySnapshot,
): CreationDraftRecoveryRestorePreview {
  const archive = parseDraftArchive(snapshot.archive);
  const recovery = collectRestorableDrafts(archive.drafts);

  return {
    archiveScope: archive.scope,
    archiveVersion: archive.version,
    canRestore:
      archive.compatible &&
      (recovery.drafts.length > 0 || snapshot.draftCount === 0),
    capacityLimited: recovery.capacityLimited,
    currentDraftCount: readDrafts().length,
    duplicates: recovery.duplicates,
    invalid: recovery.invalid,
    recoveryDraftCount: recovery.drafts.length,
    recoverySnapshotCreatedAt: snapshot.createdAt,
    recoverySnapshotReason: snapshot.reason,
  };
}

export function restoreCreationDraftsFromRecovery(
  snapshot: CreationDraftRecoverySnapshot,
): CreationDraftRecoveryRestoreResult {
  const archive = parseDraftArchive(snapshot.archive);
  const recovery = collectRestorableDrafts(archive.drafts);
  const result: CreationDraftRecoveryRestoreResult = {
    archiveScope: archive.scope,
    archiveVersion: archive.version,
    capacityLimited: recovery.capacityLimited,
    duplicates: recovery.duplicates,
    invalid: recovery.invalid,
    previousSnapshot: null,
    restored: 0,
    total: archive.drafts.length,
  };

  if (
    !archive.compatible ||
    (recovery.drafts.length === 0 && snapshot.draftCount > 0)
  ) {
    return result;
  }

  result.previousSnapshot = saveCreationDraftRecoverySnapshot(
    readDrafts(),
    "recovery-restore",
  );
  writeDrafts(sortDrafts(recovery.drafts));
  result.restored = recovery.drafts.length;
  recordCreationDraftArchiveEvent({
    archiveScope: result.archiveScope,
    archiveVersion: result.archiveVersion,
    capacityLimited: result.capacityLimited,
    draftCount: result.restored,
    duplicates: result.duplicates,
    invalid: result.invalid,
    recoveryReason: snapshot.reason,
    totalDrafts: result.total,
    type: "recovery-restore",
  });
  return result;
}

export function getCreationDraftRecoverySnapshot():
  | CreationDraftRecoverySnapshot
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(recoveryStorageKey);
    const parsed = raw ? JSON.parse(raw) : null;

    return isCreationDraftRecoverySnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCreationDraftRecoverySnapshot() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(recoveryStorageKey);
  window.dispatchEvent(new Event(draftsChangedEvent));
}

function saveCreationDraftRecoverySnapshot(
  drafts: CreationDraft[],
  reason: CreationDraftRecoveryReason,
): CreationDraftRecoverySnapshotSummary | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sortedDrafts = sortDrafts(drafts);
  const snapshot: CreationDraftRecoverySnapshot = {
    archive: serializeCreationDraftArchive(sortedDrafts),
    createdAt: Date.now(),
    draftCount: sortedDrafts.length,
    reason,
    version: 1,
  };

  window.localStorage.setItem(recoveryStorageKey, JSON.stringify(snapshot));
  return summarizeRecoverySnapshot(snapshot);
}

function summarizeRecoverySnapshot(
  snapshot: CreationDraftRecoverySnapshot,
): CreationDraftRecoverySnapshotSummary {
  return {
    createdAt: snapshot.createdAt,
    draftCount: snapshot.draftCount,
    reason: snapshot.reason,
    version: snapshot.version,
  };
}

function sortDrafts(drafts: CreationDraft[]) {
  return [...drafts].sort(
    (a, b) =>
      Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
      b.updatedAt - a.updatedAt,
  );
}

function parseDraftArchive(raw: string): {
  compatible: boolean;
  drafts: unknown[];
  scope: CreationDraftArchiveScope;
  version: number | null;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return {
        compatible: true,
        drafts: parsed,
        scope: "legacy",
        version: null,
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        compatible: false,
        drafts: [],
        scope: "legacy",
        version: null,
      };
    }

    const archive = parsed as {
      drafts?: unknown;
      scope?: unknown;
      type?: unknown;
      version?: unknown;
    };

    if (archive.type !== "creation-drafts" || !Array.isArray(archive.drafts)) {
      return {
        compatible: false,
        drafts: [],
        scope: "legacy",
        version: null,
      };
    }

    return {
      compatible: true,
      drafts: archive.drafts,
      scope:
        archive.scope === "selected-visible" || archive.scope === "full-vault"
          ? archive.scope
          : "full-vault",
      version: typeof archive.version === "number" ? archive.version : null,
    };
  } catch {
    return { compatible: false, drafts: [], scope: "legacy", version: null };
  }
}

function collectRestorableDrafts(drafts: unknown[]) {
  const restoredDrafts: CreationDraft[] = [];
  const ids = new Set<string>();
  const result = {
    capacityLimited: 0,
    drafts: restoredDrafts,
    duplicates: 0,
    invalid: 0,
  };

  for (const candidate of drafts) {
    const draft = normalizeImportedDraft(candidate);

    if (!draft) {
      result.invalid += 1;
      continue;
    }

    if (ids.has(draft.id)) {
      result.duplicates += 1;
      continue;
    }

    if (restoredDrafts.length >= creationDraftLimit) {
      result.capacityLimited += 1;
      continue;
    }

    ids.add(draft.id);
    restoredDrafts.push(draft);
  }

  return result;
}

function readDrafts(): CreationDraft[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCreationDraft);
  } catch {
    return [];
  }
}

function writeDrafts(drafts: CreationDraft[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(drafts));
  window.dispatchEvent(new Event(draftsChangedEvent));
}

function normalizeImportedDraft(value: unknown): CreationDraft | null {
  if (!isCreationDraft(value) || !value.id.trim()) {
    return null;
  }

  return {
    ...normalizeCreationDraftInput(value),
    createdAt: value.createdAt,
    id: value.id.trim(),
    notes: normalizeCreationDraftNotes(value.notes),
    pinned: value.pinned === true,
    updatedAt: value.updatedAt,
  };
}

export function normalizeCreationDraftInput(
  input: CreationDraftInput,
): CreationDraftInput {
  return {
    audioPrompt: input.audioPrompt.trim(),
    coverPrompt: input.coverPrompt.trim(),
    creativeControls: normalizeCreativeControls(input.creativeControls),
    lyrics: input.lyrics.trim(),
    persona: normalizePersonaAttachment(input.persona),
    source: normalizeDraftSource(input.source),
    styleIdea: input.styleIdea.trim(),
    theme: input.theme.trim(),
    title: input.title.trim() || "Untitled draft",
    voiceProfile: normalizeVoiceProfileAttachment(input.voiceProfile),
  };
}

export function subscribeToCreationDrafts(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(draftsChangedEvent, listener);
  return () => window.removeEventListener(draftsChangedEvent, listener);
}

function isCreationDraft(value: unknown): value is CreationDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<CreationDraft>;
  return (
    typeof draft.id === "string" &&
    isCreationDraftInput(value) &&
    typeof draft.createdAt === "number" &&
    Number.isFinite(draft.createdAt) &&
    (draft.notes === undefined || typeof draft.notes === "string") &&
    (draft.pinned === undefined || typeof draft.pinned === "boolean") &&
    typeof draft.updatedAt === "number" &&
    Number.isFinite(draft.updatedAt)
  );
}

function isCreationDraftRecoverySnapshot(
  value: unknown,
): value is CreationDraftRecoverySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<CreationDraftRecoverySnapshot>;

  return (
    typeof snapshot.archive === "string" &&
    typeof snapshot.createdAt === "number" &&
    Number.isFinite(snapshot.createdAt) &&
    typeof snapshot.draftCount === "number" &&
    Number.isFinite(snapshot.draftCount) &&
    snapshot.draftCount >= 0 &&
    (snapshot.reason === "archive-import" ||
      snapshot.reason === "recovery-restore") &&
    snapshot.version === 1
  );
}

export function isCreationDraftInput(
  value: unknown,
): value is CreationDraftInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<CreationDraftInput>;
  return (
    typeof draft.title === "string" &&
    typeof draft.theme === "string" &&
    typeof draft.styleIdea === "string" &&
    typeof draft.lyrics === "string" &&
    typeof draft.audioPrompt === "string" &&
    typeof draft.coverPrompt === "string" &&
    (draft.creativeControls === undefined ||
      isCreativeControls(draft.creativeControls)) &&
    (draft.persona === undefined ||
      draft.persona === null ||
      isPersonaAttachment(draft.persona)) &&
    (draft.source === undefined ||
      draft.source === null ||
      isCreationDraftSource(draft.source)) &&
    (draft.voiceProfile === undefined ||
      draft.voiceProfile === null ||
      isVoiceProfileAttachment(draft.voiceProfile))
  );
}

function normalizeCreativeControls(
  controls: CreativeControls | null | undefined,
) {
  if (!controls) {
    return undefined;
  }

  return {
    referenceInfluence: clampControlValue(controls.referenceInfluence),
    structure: clampControlValue(controls.structure),
    weirdness: clampControlValue(controls.weirdness),
  };
}

function isCreativeControls(value: unknown): value is CreativeControls {
  if (!value || typeof value !== "object") {
    return false;
  }

  const controls = value as Partial<CreativeControls>;
  return (
    isControlValue(controls.referenceInfluence) &&
    isControlValue(controls.structure) &&
    isControlValue(controls.weirdness)
  );
}

function isControlValue(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function clampControlValue(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeDraftSource(source: CreationDraftSource | null | undefined) {
  if (!source) {
    return null;
  }

  return {
    detail: source.detail?.trim() || undefined,
    label: source.label.trim() || toTitle(source.type),
    type: source.type,
  };
}

function normalizeCreationDraftNotes(notes: string | undefined) {
  const value = notes?.trim() ?? "";
  return value ? value.slice(0, 500) : undefined;
}

function isCreationDraftSource(value: unknown): value is CreationDraftSource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const source = value as Partial<CreationDraftSource>;

  return (
    typeof source.label === "string" &&
    isCreationDraftSourceType(source.type) &&
    (source.detail === undefined || typeof source.detail === "string")
  );
}

function isCreationDraftSourceType(
  value: unknown,
): value is CreationDraftSource["type"] {
  return (
    value === "manual" ||
    value === "persona" ||
    value === "playlist" ||
    value === "replay" ||
    value === "reuse" ||
    value === "variant" ||
    value === "voice"
  );
}

function normalizePersonaAttachment(
  persona: PersonaAttachment | null | undefined,
) {
  if (!persona) {
    return null;
  }

  return {
    id: persona.id.trim(),
    name: persona.name.trim(),
    rightsConfirmed: persona.rightsConfirmed,
    summary: persona.summary.trim(),
  };
}

function isPersonaAttachment(value: unknown): value is PersonaAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const persona = value as Partial<PersonaAttachment>;

  return (
    typeof persona.id === "string" &&
    typeof persona.name === "string" &&
    typeof persona.summary === "string" &&
    typeof persona.rightsConfirmed === "boolean"
  );
}

function normalizeVoiceProfileAttachment(
  voiceProfile: VoiceProfileAttachment | null | undefined,
) {
  if (!voiceProfile) {
    return null;
  }

  return {
    id: voiceProfile.id.trim(),
    name: voiceProfile.name.trim(),
    rightsConfirmed: voiceProfile.rightsConfirmed,
    sampleSummary: voiceProfile.sampleSummary.trim(),
    summary: voiceProfile.summary.trim(),
  };
}

function isVoiceProfileAttachment(
  value: unknown,
): value is VoiceProfileAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const voiceProfile = value as Partial<VoiceProfileAttachment>;

  return (
    typeof voiceProfile.id === "string" &&
    typeof voiceProfile.name === "string" &&
    typeof voiceProfile.summary === "string" &&
    typeof voiceProfile.sampleSummary === "string" &&
    typeof voiceProfile.rightsConfirmed === "boolean"
  );
}

function toTitle(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
