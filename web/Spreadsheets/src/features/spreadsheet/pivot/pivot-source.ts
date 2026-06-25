import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type { ChartRange, SheetData } from "@/features/workbooks/types";
import type {
  PivotField,
  PivotFieldValueType,
  PivotSourceModel,
  PivotSourceRecord,
} from "@/features/spreadsheet/pivot/pivot-types";

function normalizeHeaderName(
  raw: string,
  columnIndex: number,
  usedNames: Set<string>,
) {
  const baseName = raw.trim() || columnLabel(columnIndex);
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function inferValueType(values: string[]): PivotFieldValueType {
  const populatedValues = values.filter((value) => value.trim() !== "");

  if (populatedValues.length === 0) {
    return "empty";
  }

  if (populatedValues.every((value) => Number.isFinite(Number(value)))) {
    return "number";
  }

  if (
    populatedValues.every((value) => {
      const parsedDate = new Date(value);

      return !Number.isNaN(parsedDate.getTime());
    })
  ) {
    return "date";
  }

  return "text";
}

function getDisplayValue(
  sheet: SheetData,
  computedValues: Record<string, string>,
  rowIndex: number,
  columnIndex: number,
) {
  const key = cellKey(rowIndex, columnIndex);

  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function getRangeColumns(range: ChartRange) {
  return Array.from(
    { length: range.endColumnIndex - range.startColumnIndex + 1 },
    (_, index) => range.startColumnIndex + index,
  );
}

function createSourceRecord(
  sheet: SheetData,
  computedValues: Record<string, string>,
  fields: PivotField[],
  rowIndex: number,
): PivotSourceRecord | null {
  const values = fields.reduce<Record<string, string>>((items, field) => {
    items[field.id] = getDisplayValue(
      sheet,
      computedValues,
      rowIndex,
      field.sourceColumnIndex,
    );
    return items;
  }, {});
  const hasValue = Object.values(values).some((value) => value.trim() !== "");

  return hasValue ? { rowIndex, values } : null;
}

export function createPivotSourceModel({
  computedValues,
  range,
  sheet,
}: {
  computedValues: Record<string, string>;
  range: ChartRange;
  sheet: SheetData;
}): PivotSourceModel {
  const columns = getRangeColumns(range);
  const usedNames = new Set<string>();
  const dataRowIndexes = Array.from(
    { length: Math.max(range.endRowIndex - range.startRowIndex, 0) },
    (_, index) => range.startRowIndex + index + 1,
  );
  const fields = columns.map<PivotField>((columnIndex) => {
    const id = `field_${columnIndex}`;
    const sampleValues = dataRowIndexes
      .slice(0, 20)
      .map((rowIndex) =>
        getDisplayValue(sheet, computedValues, rowIndex, columnIndex),
      )
      .filter((value) => value.trim() !== "");

    return {
      id,
      name: normalizeHeaderName(
        getDisplayValue(sheet, computedValues, range.startRowIndex, columnIndex),
        columnIndex,
        usedNames,
      ),
      sampleValues,
      sourceColumnIndex: columnIndex,
      valueType: inferValueType(sampleValues),
    };
  });
  const records = dataRowIndexes.reduce<PivotSourceRecord[]>((items, rowIndex) => {
    const record = createSourceRecord(sheet, computedValues, fields, rowIndex);

    if (record) {
      items.push(record);
    }

    return items;
  }, []);

  return {
    fields,
    range,
    records,
    sheetId: sheet.id,
  };
}
