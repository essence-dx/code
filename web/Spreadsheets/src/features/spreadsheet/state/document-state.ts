import type {
  SheetFilterRule,
  WorkbookDocument,
} from "@/features/workbooks/types";

export function cloneDocument(document: WorkbookDocument): WorkbookDocument {
  return structuredClone(document);
}

export function cloneFilterForSheet(
  filter: SheetFilterRule,
  sheetId: string,
): SheetFilterRule {
  return {
    ...structuredClone(filter),
    id: `filter_${crypto.randomUUID()}`,
    sheetId,
  };
}

export function normalizeFilterPresetName(name: string, fallbackIndex: number) {
  const normalizedName = name.trim().replace(/\s+/g, " ").slice(0, 80);

  return normalizedName || `Filter preset ${fallbackIndex}`;
}

export function countDocumentCells(document: WorkbookDocument) {
  return document.sheets.reduce(
    (total, sheet) => total + Object.keys(sheet.cells).length,
    0,
  );
}

export function createSnapshotDocument(document: WorkbookDocument) {
  const snapshotDocument = cloneDocument(document);

  snapshotDocument.versionHistory = [];
  snapshotDocument.versionRestores = [];

  return snapshotDocument;
}

export function getActiveSheet(document: WorkbookDocument) {
  return (
    document.sheets.find((sheet) => sheet.id === document.activeSheetId) ??
    document.sheets[0]
  );
}
