import { cellKey } from "@/features/workbooks/addresses";
import { aggregatePivotSource } from "@/features/spreadsheet/pivot/pivot-aggregation";
import { applyPivotCalculatedFields } from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import { applyPivotCalculatedItems } from "@/features/spreadsheet/pivot/pivot-calculated-items";
import { createDataModelPivotSourceModel } from "@/features/spreadsheet/data-model";
import { filterPivotSource } from "@/features/spreadsheet/pivot/pivot-filters";
import { applyPivotFieldGroupings } from "@/features/spreadsheet/pivot/pivot-grouping";
import { createPivotFieldListState } from "@/features/spreadsheet/pivot/pivot-layout";
import { applyPivotMeasures } from "@/features/spreadsheet/pivot/pivot-measures";
import { filterPivotSourceByTimelines } from "@/features/spreadsheet/pivot/pivot-timelines";
import {
  createEffectivePivotTableFilterSelections,
  createEffectivePivotTableTimelineFilters,
} from "@/features/spreadsheet/pivot/pivot-control-sync";
import type {
  PivotFieldListState,
  PivotSourceModel,
  PivotValueField,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  CellStyle,
  ChartRange,
  PivotTableDefinition,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

const HEADER_STYLE: CellStyle = {
  background: "#e0f2fe",
  bold: true,
  foreground: "#075985",
};

const TOTAL_STYLE: CellStyle = {
  background: "#f8fafc",
  bold: true,
  foreground: "#0f172a",
};

const SUBTOTAL_STYLE: CellStyle = {
  background: "#f1f5f9",
  bold: true,
  foreground: "#334155",
};

type PivotOutputRow = {
  style?: CellStyle;
  values: string[];
};

function normalizeValueField(
  valueField: PivotTableDefinition["valueFields"][number],
): PivotValueField {
  return {
    aggregation: valueField.aggregation,
    fieldId: valueField.fieldId,
    label: valueField.label,
  };
}

function createLayout(
  source: PivotSourceModel,
  pivotTable: PivotTableDefinition,
): PivotFieldListState {
  const fallback = createPivotFieldListState(source);
  const fieldIds = new Set(source.fields.map((field) => field.id));
  const valueFields = pivotTable.valueFields
    .filter((field) => fieldIds.has(field.fieldId))
    .map(normalizeValueField);

  return {
    availableFields: source.fields,
    columnFieldIds: pivotTable.columnFieldIds.filter((fieldId) =>
      fieldIds.has(fieldId),
    ),
    filterFieldIds: pivotTable.filterFieldIds.filter((fieldId) =>
      fieldIds.has(fieldId),
    ),
    rowFieldIds: pivotTable.rowFieldIds.filter((fieldId) => fieldIds.has(fieldId)),
    valueFields: valueFields.length ? valueFields : fallback.valueFields,
  };
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function clearRange(sheet: SheetData, range: ChartRange) {
  for (let rowIndex = range.startRowIndex; rowIndex <= range.endRowIndex; rowIndex += 1) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      delete sheet.cells[cellKey(rowIndex, columnIndex)];
    }
  }
}

function writeRow({
  sheet,
  rowIndex,
  startColumnIndex,
  values,
  style,
}: {
  sheet: SheetData;
  rowIndex: number;
  startColumnIndex: number;
  values: string[];
  style?: CellStyle;
}) {
  values.forEach((value, offset) => {
    const columnIndex = startColumnIndex + offset;

    if (rowIndex >= sheet.rowCount || columnIndex >= sheet.columnCount) {
      return;
    }

    sheet.cells[cellKey(rowIndex, columnIndex)] = {
      raw: value,
      ...(style ? { style } : {}),
    };
  });
}

function createValueCells({
  columnKeys,
  columnValues,
  hasColumnFields,
  totalValues,
  valueLabels,
}: {
  columnKeys: string[];
  columnValues: Record<string, Record<string, number>>;
  hasColumnFields: boolean;
  totalValues: Record<string, number>;
  valueLabels: string[];
}) {
  return [
    ...(hasColumnFields
      ? columnKeys.flatMap((columnKey) =>
          valueLabels.map((label) =>
            formatNumber(columnValues[columnKey]?.[label] ?? 0),
          ),
        )
      : []),
    ...valueLabels.map((label) => formatNumber(totalValues[label] ?? 0)),
  ];
}

function createSubtotalRow({
  columnKeys,
  groupLabel,
  hasColumnFields,
  subtotal,
  valueLabels,
}: {
  columnKeys: string[];
  groupLabel: string;
  hasColumnFields: boolean;
  subtotal: NonNullable<
    ReturnType<typeof aggregatePivotSource>["rowSubtotals"][string]
  >;
  valueLabels: string[];
}): PivotOutputRow {
  return {
    style: SUBTOTAL_STYLE,
    values: [
      `${groupLabel} subtotal`,
      ...createValueCells({
        columnKeys,
        columnValues: subtotal.columnTotals,
        hasColumnFields,
        totalValues: subtotal.totals,
        valueLabels,
      }),
    ],
  };
}

function createDetailRows({
  cellValues,
  columnKeys,
  hasColumnFields,
  result,
  valueLabels,
}: {
  cellValues: Map<string, ReturnType<typeof aggregatePivotSource>["cells"][number]>;
  columnKeys: string[];
  hasColumnFields: boolean;
  result: ReturnType<typeof aggregatePivotSource>;
  valueLabels: string[];
}) {
  const rows: PivotOutputRow[] = [];
  let currentSubtotalKey: string | null = null;

  for (const rowKey of result.rowKeys) {
    const rowPath = result.rowKeyPaths[rowKey] ?? [rowKey];
    const subtotalKey =
      result.rowFields.length > 1 ? rowPath.slice(0, 1).join(" / ") : null;

    if (currentSubtotalKey && subtotalKey !== currentSubtotalKey) {
      const subtotal = result.rowSubtotals[currentSubtotalKey];

      if (subtotal) {
        rows.push(
          createSubtotalRow({
            columnKeys,
            groupLabel: currentSubtotalKey,
            hasColumnFields,
            subtotal,
            valueLabels,
          }),
        );
      }
    }

    currentSubtotalKey = subtotalKey;
    rows.push({
      values: [
        rowKey,
        ...createValueCells({
          columnKeys,
          columnValues: Object.fromEntries(
            columnKeys.map((columnKey) => {
              const cell = cellValues.get(`${rowKey}\u001f${columnKey}`);

              return [columnKey, cell?.values ?? {}];
            }),
          ),
          hasColumnFields,
          totalValues: result.rowTotals[rowKey] ?? {},
          valueLabels,
        }),
      ],
    });
  }

  if (currentSubtotalKey) {
    const subtotal = result.rowSubtotals[currentSubtotalKey];

    if (subtotal) {
      rows.push(
        createSubtotalRow({
          columnKeys,
          groupLabel: currentSubtotalKey,
          hasColumnFields,
          subtotal,
          valueLabels,
        }),
      );
    }
  }

  return rows;
}

function getOutputRange(
  sheet: SheetData,
  startRowIndex: number,
  startColumnIndex: number,
  rowCount: number,
  columnCount: number,
): ChartRange {
  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex: Math.min(sheet.rowCount - 1, startRowIndex + rowCount - 1),
    endColumnIndex: Math.min(
      sheet.columnCount - 1,
      startColumnIndex + columnCount - 1,
    ),
  };
}

export function renderPivotTableToSheet({
  computedValues,
  document,
  pivotTable,
  sheet,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  sheet: SheetData;
}) {
  const rawSource = createDataModelPivotSourceModel({
    computedValues,
    document,
    pivotTable,
    sheet,
  });
  const calculatedSource = applyPivotCalculatedFields(
    rawSource,
    pivotTable.calculatedFields ?? [],
  );
  const filteredSource = filterPivotSourceByTimelines(
    filterPivotSource(
      calculatedSource,
      createEffectivePivotTableFilterSelections({
        document,
        pivotTable,
        source: calculatedSource,
      }),
    ),
    createEffectivePivotTableTimelineFilters({
      document,
      pivotTable,
      source: calculatedSource,
    }),
  );
  const source = applyPivotFieldGroupings(
    filteredSource,
    pivotTable.fieldGroupings ?? [],
  );
  const layout = createLayout(source, pivotTable);
  const result = applyPivotMeasures(
    applyPivotCalculatedItems(
      aggregatePivotSource(
        source,
        layout,
      ),
      pivotTable.calculatedItems ?? [],
    ),
    pivotTable.measures ?? [],
  );
  const rowHeader = result.rowFields.map((field) => field.name).join(" / ") || "Rows";
  const hasColumnFields = result.columnFields.length > 0;
  const columnKeys = hasColumnFields ? result.columnKeys : [];
  const valueLabels = result.valueFields.map((field) => field.label);
  const grandTotalHeaders = valueLabels.map((label) =>
    hasColumnFields ? `Grand total ${label}` : label,
  );
  const valueHeaders = hasColumnFields
    ? [
        ...columnKeys.flatMap((columnKey) =>
          valueLabels.map((label) => `${columnKey} ${label}`),
        ),
        ...grandTotalHeaders,
      ]
    : grandTotalHeaders;
  const cellValues = new Map(
    result.cells.map((cell) => [`${cell.rowKey}\u001f${cell.columnKey}`, cell]),
  );
  const rows = createDetailRows({
    cellValues,
    columnKeys,
    hasColumnFields,
    result,
    valueLabels,
  });
  const outputRows: PivotOutputRow[] = [
    { style: HEADER_STYLE, values: [pivotTable.name] },
    { style: HEADER_STYLE, values: [rowHeader, ...valueHeaders] },
    ...rows,
    {
      style: TOTAL_STYLE,
      values: [
        "Grand total",
        ...createValueCells({
          columnKeys,
          columnValues: result.columnTotals,
          hasColumnFields,
          totalValues: result.grandTotals,
          valueLabels,
        }),
      ],
    },
  ];
  const columnCount = Math.max(...outputRows.map((row) => row.values.length));
  const outputRange = getOutputRange(
    sheet,
    pivotTable.outputRange.startRowIndex,
    pivotTable.outputRange.startColumnIndex,
    outputRows.length,
    columnCount,
  );

  clearRange(sheet, pivotTable.outputRange);
  outputRows.forEach((row, rowOffset) => {
    writeRow({
      sheet,
      rowIndex: outputRange.startRowIndex + rowOffset,
      startColumnIndex: outputRange.startColumnIndex,
      values: row.values,
      style: row.style,
    });
  });

  return outputRange;
}
