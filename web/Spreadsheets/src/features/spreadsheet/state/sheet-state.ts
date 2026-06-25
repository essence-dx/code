import { createBlankSheet } from "@/features/workbooks/default-workbook";
import { enableExcelScaleForSheet } from "@/features/spreadsheet/sheet-scale";
import type {
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";
import { isSheetProtected } from "@/features/spreadsheet/state/protection-state";

export function setActiveSheetInDocument(
  document: WorkbookDocument,
  sheetId: string,
) {
  if (document.sheets.some((sheet) => sheet.id === sheetId)) {
    document.activeSheetId = sheetId;
  }
}

export function addSheetToDocument(document: WorkbookDocument) {
  if (document.workbookProtection) {
    return;
  }

  const sheet = createBlankSheet(`Sheet ${document.sheets.length + 1}`);
  document.sheets.push(sheet);
  document.activeSheetId = sheet.id;
}

export function renameSheetInDocument(
  document: WorkbookDocument,
  sheetId: string,
  name: string,
) {
  if (document.workbookProtection) {
    return;
  }

  const trimmedName = name.trim().slice(0, 80);

  if (!trimmedName) {
    return;
  }

  const sheet = document.sheets.find((item) => item.id === sheetId);

  if (sheet) {
    sheet.name = trimmedName;
  }
}

export function toggleActiveSheetGridlinesInDocument(document: WorkbookDocument) {
  const sheet = document.sheets.find((item) => item.id === document.activeSheetId);

  if (sheet) {
    sheet.showGridlines = sheet.showGridlines === false;
  }
}

export function enableActiveSheetExcelScaleInDocument(
  document: WorkbookDocument,
) {
  const sheet = document.sheets.find((item) => item.id === document.activeSheetId);

  if (!sheet || isSheetProtected(document, sheet.id)) {
    return;
  }

  enableExcelScaleForSheet(sheet);
}

export function setSheetTabColorInDocument(
  document: WorkbookDocument,
  sheetId: string,
  color?: string,
) {
  if (document.workbookProtection) {
    return;
  }

  const sheet = document.sheets.find((item) => item.id === sheetId);

  if (!sheet) {
    return;
  }

  if (!color) {
    delete sheet.tabColor;
    return;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    sheet.tabColor = color;
  }
}

export function duplicateSheetInDocument(
  document: WorkbookDocument,
  sheetId: string,
) {
  if (document.workbookProtection) {
    return;
  }

  const sheet = document.sheets.find((item) => item.id === sheetId);

  if (!sheet) {
    return;
  }

  const copy = structuredClone(sheet);
  copy.id = `sheet_${crypto.randomUUID()}`;
  copy.name = `${sheet.name} Copy`.slice(0, 80);
  document.sheets.push(copy);
  document.activeSheetId = copy.id;
}

export function deleteSheetFromDocument(
  document: WorkbookDocument,
  sheetId: string,
) {
  if (document.workbookProtection || document.sheets.length <= 1) {
    return;
  }

  const index = document.sheets.findIndex((sheet) => sheet.id === sheetId);

  if (index < 0 || isSheetProtected(document, sheetId)) {
    return;
  }

  document.sheets.splice(index, 1);
  document.charts = (document.charts ?? []).filter(
    (chart) => chart.sheetId !== sheetId,
  );
  document.sparklines = (document.sparklines ?? []).filter(
    (sparkline) => sparkline.sheetId !== sheetId,
  );
  document.tables = (document.tables ?? []).filter(
    (table) => table.sheetId !== sheetId,
  );
  document.conditionalFormats = (document.conditionalFormats ?? []).filter(
    (rule) => rule.sheetId !== sheetId,
  );
  document.dataValidations = (document.dataValidations ?? []).filter(
    (rule) => rule.sheetId !== sheetId,
  );
  document.filters = (document.filters ?? []).filter(
    (rule) => rule.sheetId !== sheetId,
  );
  document.cellNotes = (document.cellNotes ?? []).filter(
    (note) => note.sheetId !== sheetId,
  );
  document.commentNotifications = (document.commentNotifications ?? []).filter(
    (notification) => notification.sheetId !== sheetId,
  );
  document.cellLinks = (document.cellLinks ?? []).filter(
    (link) => link.sheetId !== sheetId,
  );
  document.namedRanges = (document.namedRanges ?? []).filter(
    (range) => range.sheetId !== sheetId,
  );
  document.formulaWatches = (document.formulaWatches ?? []).filter(
    (watch) => watch.sheetId !== sheetId,
  );
  document.queries = (document.queries ?? []).filter(
    (query) => query.sheetId !== sheetId,
  );
  document.sheetProtections = (document.sheetProtections ?? []).filter(
    (protection) => protection.sheetId !== sheetId,
  );
  document.sheetPrintSettings = (document.sheetPrintSettings ?? []).filter(
    (settings) => settings.sheetId !== sheetId,
  );

  if (document.activeSheetId === sheetId) {
    document.activeSheetId =
      document.sheets[Math.max(index - 1, 0)]?.id ?? document.sheets[0].id;
  }
}

export function importSheetIntoDocument(
  document: WorkbookDocument,
  sheet: SheetData,
) {
  document.sheets.push(sheet);
  document.activeSheetId = sheet.id;
}

export function replaceWorkbookDocument(
  document: WorkbookDocument,
  nextDocument: WorkbookDocument,
) {
  document.version = nextDocument.version;
  document.metadata = nextDocument.metadata;
  document.activeSheetId = nextDocument.activeSheetId;
  document.versionHistory = nextDocument.versionHistory ?? [];
  document.versionRestores = nextDocument.versionRestores ?? [];
  document.customViews = nextDocument.customViews ?? [];
  document.formulaWatches = nextDocument.formulaWatches ?? [];
  document.whatIfScenarios = nextDocument.whatIfScenarios ?? [];
  document.queries = nextDocument.queries ?? [];
  document.workbookProtection = nextDocument.workbookProtection ?? null;
  document.sheets = nextDocument.sheets;
  document.charts = nextDocument.charts;
  document.sparklines = nextDocument.sparklines ?? [];
  document.tables = nextDocument.tables ?? [];
  document.conditionalFormats = nextDocument.conditionalFormats ?? [];
  document.dataValidations = nextDocument.dataValidations ?? [];
  document.filters = nextDocument.filters ?? [];
  document.filterPresets = nextDocument.filterPresets ?? [];
  document.cellNotes = nextDocument.cellNotes ?? [];
  document.commentNotifications = nextDocument.commentNotifications ?? [];
  document.cellLinks = nextDocument.cellLinks ?? [];
  document.namedRanges = nextDocument.namedRanges ?? [];
  document.sheetProtections = nextDocument.sheetProtections ?? [];
  document.sheetPrintSettings = nextDocument.sheetPrintSettings ?? [];
}
