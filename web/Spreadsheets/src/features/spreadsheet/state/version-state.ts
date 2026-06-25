import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type {
  WorkbookDocument,
  WorkbookVersionRestore,
  WorkbookVersionSnapshot,
} from "@/features/workbooks/types";
import {
  AUTO_VERSION_INTERVAL_MS,
  AUTO_VERSION_LABEL_PREFIX,
  VERSION_HISTORY_LIMIT,
  VERSION_RESTORE_LOG_LIMIT,
} from "@/features/spreadsheet/state/constants";
import {
  countDocumentCells,
  createSnapshotDocument,
} from "@/features/spreadsheet/state/document-state";

export function addVersionSnapshotToDocument(
  document: WorkbookDocument,
  label: string,
) {
  const trimmedLabel = label.trim().slice(0, 80);
  const snapshotDocument = createSnapshotDocument(document);
  const createdAt = new Date().toISOString();
  const snapshot: WorkbookVersionSnapshot = {
    id: `version_${crypto.randomUUID()}`,
    label: trimmedLabel || `Saved ${new Date(createdAt).toLocaleString()}`,
    createdAt,
    sheetCount: snapshotDocument.sheets.length,
    cellCount: countDocumentCells(snapshotDocument),
    documentJson: JSON.stringify(snapshotDocument),
  };

  document.versionHistory = [
    snapshot,
    ...(document.versionHistory ?? []),
  ].slice(0, VERSION_HISTORY_LIMIT);
}

export function shouldCreateAutomaticVersionSnapshot(
  document: WorkbookDocument,
) {
  const latestAutoVersion = (document.versionHistory ?? []).find((version) =>
    version.label.startsWith(AUTO_VERSION_LABEL_PREFIX),
  );
  const latestAutoTime = latestAutoVersion
    ? new Date(latestAutoVersion.createdAt).getTime()
    : 0;

  return (
    !latestAutoTime ||
    !Number.isFinite(latestAutoTime) ||
    Date.now() - latestAutoTime >= AUTO_VERSION_INTERVAL_MS
  );
}

export function addAutomaticVersionSnapshotToDocument(
  document: WorkbookDocument,
) {
  addVersionSnapshotToDocument(document, AUTO_VERSION_LABEL_PREFIX);
}

export function restoreVersionSnapshotInDocument(
  document: WorkbookDocument,
  versionId: string,
) {
  const version = (document.versionHistory ?? []).find(
    (item) => item.id === versionId,
  );

  if (!version) {
    return;
  }

  const currentHistory = document.versionHistory ?? [];
  const currentRestores = document.versionRestores ?? [];
  let restored: WorkbookDocument;

  try {
    restored = normalizeWorkbookDocument(JSON.parse(version.documentJson));
  } catch {
    return;
  }

  const restoreRecord: WorkbookVersionRestore = {
    id: `restore_${crypto.randomUUID()}`,
    versionId: version.id,
    label: version.label,
    restoredAt: new Date().toISOString(),
    sheetCount: version.sheetCount,
    cellCount: version.cellCount,
  };

  restored.versionHistory = currentHistory;
  restored.versionRestores = [restoreRecord, ...currentRestores].slice(
    0,
    VERSION_RESTORE_LOG_LIMIT,
  );
  Object.assign(document, restored);
}

export function deleteVersionSnapshotFromDocument(
  document: WorkbookDocument,
  versionId: string,
) {
  document.versionHistory = (document.versionHistory ?? []).filter(
    (version) => version.id !== versionId,
  );
}
