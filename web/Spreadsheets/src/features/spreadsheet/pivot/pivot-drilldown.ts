import { cellKey } from "@/features/workbooks/addresses";
import { createBlankSheet } from "@/features/workbooks/default-workbook";
import { createDataModelPivotSourceModel } from "@/features/spreadsheet/data-model";
import { applyPivotCalculatedFields } from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import {
  createEffectivePivotTableFilterSelections,
  createEffectivePivotTableTimelineFilters,
} from "@/features/spreadsheet/pivot/pivot-control-sync";
import { filterPivotSource } from "@/features/spreadsheet/pivot/pivot-filters";
import { filterPivotSourceByTimelines } from "@/features/spreadsheet/pivot/pivot-timelines";
import type {
  CellStyle,
  PivotTableDefinition,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

const MAX_DETAIL_ROWS = 5000;
const MAX_DETAIL_COLUMNS = 100;
const HEADER_STYLE: CellStyle = {
  background: "#ecfeff",
  bold: true,
  foreground: "#155e75",
};

function normalizeSheetName(value: string) {
  return value
    .trim()
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 31)
    .trim();
}

function createDetailSheetName(document: WorkbookDocument, pivotTableName: string) {
  const usedNames = new Set(
    document.sheets.map((sheet) => sheet.name.toLowerCase()),
  );
  const baseName = normalizeSheetName(`${pivotTableName} Details`) || "Details";
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix}`;

    candidate = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

function clampColumnWidth(characterCount: number) {
  return Math.min(Math.max(characterCount * 8 + 24, 88), 240);
}

export function createPivotDrillDownSheet({
  computedValues,
  document,
  pivotTable,
  sourceSheet,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  sourceSheet: SheetData;
}) {
  const source = applyPivotCalculatedFields(
    createDataModelPivotSourceModel({
      computedValues,
      document,
      pivotTable,
      sheet: sourceSheet,
    }),
    pivotTable.calculatedFields ?? [],
  );
  const filteredSource = filterPivotSourceByTimelines(
    filterPivotSource(
      source,
      createEffectivePivotTableFilterSelections({
        document,
        pivotTable,
        source,
      }),
    ),
    createEffectivePivotTableTimelineFilters({
      document,
      pivotTable,
      source,
    }),
  );
  const fields = filteredSource.fields.slice(0, MAX_DETAIL_COLUMNS);
  const records = filteredSource.records.slice(0, MAX_DETAIL_ROWS - 1);
  const sheet = createBlankSheet(createDetailSheetName(document, pivotTable.name));

  sheet.rowCount = Math.max(1000, records.length + 1);
  sheet.columnCount = Math.max(52, fields.length);

  fields.forEach((field, columnIndex) => {
    sheet.cells[cellKey(0, columnIndex)] = {
      raw: field.name,
      style: HEADER_STYLE,
    };
  });

  records.forEach((record, rowOffset) => {
    fields.forEach((field, columnIndex) => {
      const raw = record.values[field.id] ?? "";

      if (raw) {
        sheet.cells[cellKey(rowOffset + 1, columnIndex)] = { raw };
      }
    });
  });

  fields.forEach((field, columnIndex) => {
    const values = records
      .slice(0, 50)
      .map((record) => record.values[field.id] ?? "");
    const width = Math.max(field.name.length, ...values.map((value) => value.length));

    sheet.columnWidths[columnIndex] = clampColumnWidth(width);
  });

  return sheet;
}
