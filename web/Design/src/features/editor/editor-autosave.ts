import type { DesignDocument } from "@/features/editor/types";

const EDITOR_AUTOSAVE_VERSION = 1;
const EDITOR_AUTOSAVE_KEY_PREFIX = "essence-canva:editor-autosave:";

export type EditorAutosaveSnapshot = {
  version: typeof EDITOR_AUTOSAVE_VERSION;
  projectId: string;
  projectName: string;
  updatedAt: string;
  baseUpdatedAt: string;
  document: DesignDocument;
};

export type EditorAutosaveStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type EditorAutosaveConflictStatus = "same-base" | "server-changed";

type CreateEditorAutosaveSnapshotInput = {
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  document: DesignDocument;
  now?: Date;
};

export function createEditorAutosaveKey(projectId: string) {
  return `${EDITOR_AUTOSAVE_KEY_PREFIX}${projectId}`;
}

export function createEditorAutosaveSnapshot({
  projectId,
  projectName,
  baseUpdatedAt,
  document,
  now = new Date(),
}: CreateEditorAutosaveSnapshotInput): EditorAutosaveSnapshot {
  return {
    version: EDITOR_AUTOSAVE_VERSION,
    projectId,
    projectName,
    updatedAt: now.toISOString(),
    baseUpdatedAt,
    document,
  };
}

export function readEditorAutosaveSnapshot(
  projectId: string,
  storage: EditorAutosaveStorage,
) {
  try {
    const rawSnapshot = storage.getItem(createEditorAutosaveKey(projectId));

    if (!rawSnapshot) return null;

    const parsedSnapshot = JSON.parse(rawSnapshot) as unknown;

    if (!isEditorAutosaveSnapshot(parsedSnapshot, projectId)) {
      return null;
    }

    return parsedSnapshot;
  } catch {
    return null;
  }
}

export function writeEditorAutosaveSnapshot(
  snapshot: EditorAutosaveSnapshot,
  storage: EditorAutosaveStorage,
) {
  try {
    storage.setItem(
      createEditorAutosaveKey(snapshot.projectId),
      JSON.stringify(snapshot),
    );

    return true;
  } catch {
    return false;
  }
}

export function clearEditorAutosaveSnapshot(
  projectId: string,
  storage: EditorAutosaveStorage,
) {
  try {
    storage.removeItem(createEditorAutosaveKey(projectId));
    return true;
  } catch {
    return false;
  }
}

export function shouldOfferEditorAutosaveSnapshot({
  snapshot,
  currentProjectName,
  currentDocument,
}: {
  snapshot: EditorAutosaveSnapshot;
  currentProjectName: string;
  currentDocument: DesignDocument;
}) {
  return (
    snapshot.projectName !== currentProjectName ||
    !areDesignDocumentsEqual(snapshot.document, currentDocument)
  );
}

export function getEditorAutosaveConflictStatus({
  snapshot,
  currentBaseUpdatedAt,
}: {
  snapshot: EditorAutosaveSnapshot;
  currentBaseUpdatedAt: string;
}): EditorAutosaveConflictStatus {
  return snapshot.baseUpdatedAt === currentBaseUpdatedAt
    ? "same-base"
    : "server-changed";
}

function isEditorAutosaveSnapshot(
  value: unknown,
  projectId: string,
): value is EditorAutosaveSnapshot {
  if (!isRecord(value)) return false;

  return (
    value.version === EDITOR_AUTOSAVE_VERSION &&
    value.projectId === projectId &&
    typeof value.projectName === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.baseUpdatedAt === "string" &&
    isDesignDocument(value.document)
  );
}

function isDesignDocument(value: unknown): value is DesignDocument {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.activePageId === "string" &&
    Array.isArray(value.pages)
  );
}

function areDesignDocumentsEqual(
  firstDocument: DesignDocument,
  secondDocument: DesignDocument,
) {
  try {
    return JSON.stringify(firstDocument) === JSON.stringify(secondDocument);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
