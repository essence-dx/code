import { cellKey } from "@/features/workbooks/addresses";
import type {
  WorkbookProtectedRange,
  WorkbookRole,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

export type WorkbookProtectionIdentity = {
  email?: string;
  role?: WorkbookRole;
};

export type WorkbookProtectedRangeDraft = {
  name: string;
  range: CellRange;
  allowedEmails: string[];
  createdByName: string;
  createdByEmail: string;
};

export function isSheetProtected(document: WorkbookDocument, sheetId: string) {
  return (document.sheetProtections ?? []).some(
    (protection) => protection.sheetId === sheetId,
  );
}

export function toggleActiveSheetProtectionInDocument(
  document: WorkbookDocument,
) {
  document.sheetProtections ??= [];

  const protectionIndex = document.sheetProtections.findIndex(
    (protection) => protection.sheetId === document.activeSheetId,
  );

  if (protectionIndex >= 0) {
    document.sheetProtections.splice(protectionIndex, 1);
    return;
  }

  document.sheetProtections.push({
    sheetId: document.activeSheetId,
    protectedAt: new Date().toISOString(),
  });
}

export function toggleWorkbookProtectionInDocument(
  document: WorkbookDocument,
) {
  document.workbookProtection = document.workbookProtection
    ? null
    : { protectedAt: new Date().toISOString() };
}

export function isCellUnlocked(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
) {
  return sheet.cells[cellKey(rowIndex, columnIndex)]?.style?.locked === false;
}

export function isCellFormulaHidden(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
) {
  const cell = sheet.cells[cellKey(rowIndex, columnIndex)];

  return Boolean(cell?.style?.formulaHidden && cell.raw.startsWith("="));
}

export function canEditProtectedCell(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
) {
  return (
    isCellUnlocked(sheet, rowIndex, columnIndex) &&
    !isCellFormulaHidden(sheet, rowIndex, columnIndex)
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function cellIsInRange(range: CellRange, rowIndex: number, columnIndex: number) {
  return (
    rowIndex >= range.startRowIndex &&
    rowIndex <= range.endRowIndex &&
    columnIndex >= range.startColumnIndex &&
    columnIndex <= range.endColumnIndex
  );
}

function clampRangeToSheet(range: CellRange, sheet: SheetData): CellRange {
  const startRowIndex = Math.min(
    Math.max(Math.min(range.startRowIndex, range.endRowIndex), 0),
    sheet.rowCount - 1,
  );
  const startColumnIndex = Math.min(
    Math.max(Math.min(range.startColumnIndex, range.endColumnIndex), 0),
    sheet.columnCount - 1,
  );
  const endRowIndex = Math.min(
    Math.max(Math.max(range.startRowIndex, range.endRowIndex), startRowIndex),
    sheet.rowCount - 1,
  );
  const endColumnIndex = Math.min(
    Math.max(Math.max(range.startColumnIndex, range.endColumnIndex), startColumnIndex),
    sheet.columnCount - 1,
  );

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

export function canEditWorkbookProtectedRange(
  protectedRange: WorkbookProtectedRange,
  identity: WorkbookProtectionIdentity,
) {
  if (identity.role === "owner") {
    return true;
  }

  const email = identity.email ? normalizeEmail(identity.email) : "";

  return Boolean(
    email &&
      protectedRange.allowedEmails.some(
        (allowedEmail) => normalizeEmail(allowedEmail) === email,
      ),
  );
}

export function isCellBlockedByProtectedRange({
  columnIndex,
  document,
  identity,
  rowIndex,
  sheetId,
}: {
  columnIndex: number;
  document: WorkbookDocument;
  identity: WorkbookProtectionIdentity;
  rowIndex: number;
  sheetId: string;
}) {
  return (document.protectedRanges ?? []).some(
    (protectedRange) =>
      protectedRange.sheetId === sheetId &&
      cellIsInRange(protectedRange.range, rowIndex, columnIndex) &&
      !canEditWorkbookProtectedRange(protectedRange, identity),
  );
}

export function canEditCellWithProtectionRules({
  columnIndex,
  document,
  identity,
  rowIndex,
  sheet,
}: {
  columnIndex: number;
  document: WorkbookDocument;
  identity: WorkbookProtectionIdentity;
  rowIndex: number;
  sheet: SheetData;
}) {
  if (
    isCellBlockedByProtectedRange({
      columnIndex,
      document,
      identity,
      rowIndex,
      sheetId: sheet.id,
    })
  ) {
    return false;
  }

  return !isSheetProtected(document, sheet.id) || canEditProtectedCell(
    sheet,
    rowIndex,
    columnIndex,
  );
}

export function isRangeUnlocked(sheet: SheetData, range: CellRange) {
  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      if (!isCellUnlocked(sheet, rowIndex, columnIndex)) {
        return false;
      }
    }
  }

  return true;
}

export function isRangeEditableWhenProtected(
  sheet: SheetData,
  range: CellRange,
) {
  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      if (!canEditProtectedCell(sheet, rowIndex, columnIndex)) {
        return false;
      }
    }
  }

  return true;
}

export function isRangeEditableWithProtectionRules({
  document,
  identity,
  range,
  sheet,
}: {
  document: WorkbookDocument;
  identity: WorkbookProtectionIdentity;
  range: CellRange;
  sheet: SheetData;
}) {
  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      if (
        !canEditCellWithProtectionRules({
          columnIndex,
          document,
          identity,
          rowIndex,
          sheet,
        })
      ) {
        return false;
      }
    }
  }

  return true;
}

export function addProtectedRangeToDocument(
  document: WorkbookDocument,
  sheet: SheetData,
  draft: WorkbookProtectedRangeDraft,
) {
  const now = new Date().toISOString();
  const allowedEmails = Array.from(
    new Set(
      draft.allowedEmails
        .map(normalizeEmail)
        .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)),
    ),
  ).slice(0, 20);

  if (!allowedEmails.length) {
    return null;
  }

  const protectedRange: WorkbookProtectedRange = {
    id: `protected_range_${crypto.randomUUID()}`,
    sheetId: sheet.id,
    name:
      draft.name.trim().replace(/\s+/g, " ").slice(0, 80) ||
      "Protected range",
    range: clampRangeToSheet(draft.range, sheet),
    allowedEmails,
    createdByName: draft.createdByName.trim().slice(0, 80) || "Workbook owner",
    createdByEmail: normalizeEmail(draft.createdByEmail),
    createdAt: now,
    updatedAt: now,
  };

  document.protectedRanges = [
    protectedRange,
    ...(document.protectedRanges ?? []),
  ].slice(0, 200);

  return protectedRange.id;
}

export function deleteProtectedRangeFromDocument(
  document: WorkbookDocument,
  protectedRangeId: string,
) {
  document.protectedRanges = (document.protectedRanges ?? []).filter(
    (protectedRange) => protectedRange.id !== protectedRangeId,
  );
}

export function isRangeFormulaHidden(sheet: SheetData, range: CellRange) {
  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      if (
        sheet.cells[cellKey(rowIndex, columnIndex)]?.style?.formulaHidden !==
        true
      ) {
        return false;
      }
    }
  }

  return true;
}
