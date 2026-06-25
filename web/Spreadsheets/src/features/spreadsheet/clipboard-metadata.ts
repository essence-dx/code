import { parseCellKey } from "@/features/workbooks/addresses";
import type {
  CellLink,
  CellNote,
  ChartDefinition,
  ConditionalFormatRule,
  DataValidationRule,
  InsertedObjectDefinition,
  MergedCellRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type ClipboardRange = {
  startRowIndex: number;
  startColumnIndex: number;
  endRowIndex: number;
  endColumnIndex: number;
};

export type SpreadsheetClipboardMetadata = {
  charts: ChartDefinition[];
  insertedObjects: InsertedObjectDefinition[];
  cellNotes: CellNote[];
  cellLinks: CellLink[];
  mergedCells: MergedCellRange[];
  conditionalFormats: ConditionalFormatRule[];
  dataValidations: DataValidationRule[];
};

export function createSpreadsheetClipboardMetadata({
  document,
  range,
  sheet,
}: {
  document: WorkbookDocument;
  range: ClipboardRange;
  sheet: SheetData;
}): SpreadsheetClipboardMetadata | null {
  const metadata: SpreadsheetClipboardMetadata = {
    charts: (document.charts ?? [])
      .filter((chart) => chart.sheetId === sheet.id && rangeContainsRange(range, chart.range))
      .map((chart) => structuredClone(chart)),
    insertedObjects: (document.insertedObjects ?? [])
      .filter(
        (object) =>
          object.sheetId === sheet.id &&
          rangeContainsPoint(range, object.anchor.rowIndex, object.anchor.columnIndex),
      )
      .map((object) => structuredClone(object)),
    cellNotes: (document.cellNotes ?? [])
      .filter(
        (note) =>
          note.sheetId === sheet.id &&
          cellKeyIsInRange(note.cellKey, range),
      )
      .map((note) => structuredClone(note)),
    cellLinks: (document.cellLinks ?? [])
      .filter(
        (link) =>
          link.sheetId === sheet.id &&
          cellKeyIsInRange(link.cellKey, range),
      )
      .map((link) => structuredClone(link)),
    mergedCells: (sheet.mergedCells ?? [])
      .filter((mergedCell) => rangeContainsRange(range, mergedCell))
      .map((mergedCell) => structuredClone(mergedCell)),
    conditionalFormats: (document.conditionalFormats ?? [])
      .filter(
        (rule) =>
          rule.sheetId === sheet.id && rangeContainsRange(range, rule.range),
      )
      .map((rule) => structuredClone(rule)),
    dataValidations: (document.dataValidations ?? [])
      .filter(
        (rule) =>
          rule.sheetId === sheet.id && rangeContainsRange(range, rule.range),
      )
      .map((rule) => structuredClone(rule)),
  };

  return metadataHasEntries(metadata) ? metadata : null;
}

export function metadataHasEntries(metadata: SpreadsheetClipboardMetadata) {
  return Object.values(metadata).some((items) => items.length > 0);
}

function rangeContainsRange(container: ClipboardRange, candidate: ClipboardRange) {
  return (
    candidate.startRowIndex >= container.startRowIndex &&
    candidate.endRowIndex <= container.endRowIndex &&
    candidate.startColumnIndex >= container.startColumnIndex &&
    candidate.endColumnIndex <= container.endColumnIndex
  );
}

function rangeContainsPoint(
  range: ClipboardRange,
  rowIndex: number,
  columnIndex: number,
) {
  return (
    rowIndex >= range.startRowIndex &&
    rowIndex <= range.endRowIndex &&
    columnIndex >= range.startColumnIndex &&
    columnIndex <= range.endColumnIndex
  );
}

function cellKeyIsInRange(key: string, range: ClipboardRange) {
  const parsed = parseCellKey(key);

  return parsed
    ? rangeContainsPoint(range, parsed.rowIndex, parsed.columnIndex)
    : false;
}
