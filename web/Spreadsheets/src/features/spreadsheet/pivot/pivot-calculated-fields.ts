import type {
  PivotField,
  PivotSourceModel,
  PivotSourceRecord,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableCalculatedField,
  PivotTableCalculatedFieldOperator,
} from "@/features/workbooks/types";

export function isPivotCalculatedFieldId(fieldId: string) {
  return fieldId.startsWith("calc_");
}

export function getPivotCalculatedFieldOperatorLabel(
  operator: PivotTableCalculatedFieldOperator,
) {
  if (operator === "add") {
    return "+";
  }

  if (operator === "subtract") {
    return "-";
  }

  if (operator === "multiply") {
    return "*";
  }

  return "/";
}

function parseNumericValue(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function calculateRecordValue(
  record: PivotSourceRecord,
  calculatedField: PivotTableCalculatedField,
) {
  const left = parseNumericValue(record.values[calculatedField.leftFieldId] ?? "");
  const right = parseNumericValue(record.values[calculatedField.rightFieldId] ?? "");

  if (calculatedField.operator === "add") {
    return left + right;
  }

  if (calculatedField.operator === "subtract") {
    return left - right;
  }

  if (calculatedField.operator === "multiply") {
    return left * right;
  }

  return right === 0 ? 0 : left / right;
}

function createCalculatedField(
  calculatedField: PivotTableCalculatedField,
): PivotField {
  return {
    id: calculatedField.id,
    name: calculatedField.name,
    sampleValues: [],
    sourceColumnIndex: -1,
    valueType: "number",
  };
}

export function applyPivotCalculatedFields(
  source: PivotSourceModel,
  calculatedFields: PivotTableCalculatedField[],
): PivotSourceModel {
  if (calculatedFields.length === 0) {
    return source;
  }

  const fields = [
    ...source.fields,
    ...calculatedFields.map(createCalculatedField),
  ];
  const records = source.records.map((record) => ({
    ...record,
    values: {
      ...record.values,
      ...Object.fromEntries(
        calculatedFields.map((calculatedField) => [
          calculatedField.id,
          String(calculateRecordValue(record, calculatedField)),
        ]),
      ),
    },
  }));

  return {
    ...source,
    fields,
    records,
  };
}
