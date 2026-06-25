import {
  cellKey,
  columnIndex,
  parseCellKey,
} from "@/features/workbooks/addresses";
import type { ChartRange, SheetData } from "@/features/workbooks/types";

export type DynamicArraySpill = {
  anchorKey: string;
  blockedKeys: string[];
  formula: string;
  range: ChartRange;
  values: string[][];
};

export type SheetDynamicArrayState = {
  computedValues: Record<string, string>;
  spillAnchorKeys: Set<string>;
  spillBlockedKeys: Set<string>;
  spillKeys: Set<string>;
  spills: DynamicArraySpill[];
};

type DynamicArrayEvaluationInput = {
  anchorKey: string;
  computedValues: Record<string, string>;
  formula: string;
  sheet: SheetData;
};

type FormulaFunctionCall = {
  args: string[];
  name: string;
};

type DynamicArrayEvaluation =
  | {
      kind: "values";
      values: string[][];
    }
  | {
      kind: "error";
      error: string;
    };

const MAX_SPILL_CELLS = 10000;
const dynamicArrayFormulaPattern =
  /^=\s*(CHOOSECOLS|CHOOSEROWS|DROP|FILTER|SEQUENCE|SORT|TAKE|TRANSPOSE|UNIQUE)\s*\(/i;

export function isDynamicArrayFormula(raw: string) {
  return dynamicArrayFormulaPattern.test(raw.trim());
}

export function getSheetDynamicArrayState({
  sheet,
  computedValues,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
}): SheetDynamicArrayState {
  const nextComputedValues = { ...computedValues };
  const spillAnchorKeys = new Set<string>();
  const spillBlockedKeys = new Set<string>();
  const spillKeys = new Set<string>();
  const spills: DynamicArraySpill[] = [];

  for (const [anchorKey, cell] of getFormulaCellsInSheetOrder(sheet)) {
    const evaluation = evaluateDynamicArrayFormula({
      anchorKey,
      computedValues: nextComputedValues,
      formula: cell.raw,
      sheet,
    });

    if (!evaluation) {
      continue;
    }

    spillAnchorKeys.add(anchorKey);

    if (evaluation.kind === "error") {
      nextComputedValues[anchorKey] = evaluation.error;
      continue;
    }

    const occupiedSpillKeys = new Set(spillKeys);
    const values = evaluation.values;
    const anchorPosition = parseCellKey(anchorKey);
    const width = getArrayWidth(values);

    if (!anchorPosition || values.length === 0 || width === 0) {
      nextComputedValues[anchorKey] = "#CALC!";
      continue;
    }

    const range = {
      startRowIndex: anchorPosition.rowIndex,
      startColumnIndex: anchorPosition.columnIndex,
      endRowIndex: anchorPosition.rowIndex + values.length - 1,
      endColumnIndex: anchorPosition.columnIndex + width - 1,
    };
    const blockedKeys = getSpillBlockedKeys({
      anchorKey,
      occupiedSpillKeys,
      range,
      sheet,
    });

    if (
      range.endRowIndex >= sheet.rowCount ||
      range.endColumnIndex >= sheet.columnCount
    ) {
      nextComputedValues[anchorKey] = "#SPILL!";
      spills.push({
        anchorKey,
        blockedKeys,
        formula: cell.raw,
        range,
        values,
      });
      continue;
    }

    if (blockedKeys.length > 0) {
      nextComputedValues[anchorKey] = "#SPILL!";
      blockedKeys.forEach((key) => spillBlockedKeys.add(key));
      spills.push({
        anchorKey,
        blockedKeys,
        formula: cell.raw,
        range,
        values,
      });
      continue;
    }

    for (let rowOffset = 0; rowOffset < values.length; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < width; columnOffset += 1) {
        const key = cellKey(
          range.startRowIndex + rowOffset,
          range.startColumnIndex + columnOffset,
        );

        nextComputedValues[key] = values[rowOffset]?.[columnOffset] ?? "";
        spillKeys.add(key);
      }
    }

    spills.push({
      anchorKey,
      blockedKeys,
      formula: cell.raw,
      range,
      values,
    });
  }

  return {
    computedValues: nextComputedValues,
    spillAnchorKeys,
    spillBlockedKeys,
    spillKeys,
    spills,
  };
}

function getFormulaCellsInSheetOrder(sheet: SheetData) {
  return Object.entries(sheet.cells)
    .filter(([, cell]) => cell.raw.trimStart().startsWith("="))
    .sort(([leftKey], [rightKey]) => {
      const left = parseCellKey(leftKey);
      const right = parseCellKey(rightKey);

      if (!left || !right) {
        return leftKey.localeCompare(rightKey);
      }

      return (
        left.rowIndex - right.rowIndex ||
        left.columnIndex - right.columnIndex
      );
    });
}

function evaluateDynamicArrayFormula(
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation | null {
  const call = parseFormulaFunctionCall(input.formula);

  if (!call) {
    return null;
  }

  switch (call.name) {
    case "CHOOSECOLS":
      return evaluateChooseColumns(call.args, input);
    case "CHOOSEROWS":
      return evaluateChooseRows(call.args, input);
    case "DROP":
      return evaluateDrop(call.args, input);
    case "FILTER":
      return evaluateFilter(call.args, input);
    case "SEQUENCE":
      return evaluateSequence(call.args, input);
    case "SORT":
      return evaluateSort(call.args, input);
    case "TAKE":
      return evaluateTake(call.args, input);
    case "TRANSPOSE":
      return evaluateTranspose(call.args, input);
    case "UNIQUE":
      return evaluateUnique(call.args, input);
    default:
      return null;
  }
}

function evaluateSequence(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const rows = parsePositiveIntegerArg(args[0] ?? "1", input);
  const columns = parsePositiveIntegerArg(args[1] ?? "1", input);
  const start = parseNumberArg(args[2] ?? "1", input);
  const step = parseNumberArg(args[3] ?? "1", input);

  if (!rows || !columns || start === null || step === null) {
    return { kind: "error", error: "#VALUE!" };
  }

  if (rows * columns > MAX_SPILL_CELLS) {
    return { kind: "error", error: "#SPILL!" };
  }

  return {
    kind: "values",
    values: Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, columnIndex) =>
        formatDynamicValue(start + (rowIndex * columns + columnIndex) * step),
      ),
    ),
  };
}

function evaluateTranspose(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);

  if (!values) {
    return { kind: "error", error: "#VALUE!" };
  }

  const width = getArrayWidth(values);

  return {
    kind: "values",
    values: Array.from({ length: width }, (_, columnIndex) =>
      values.map((row) => row[columnIndex] ?? ""),
    ),
  };
}

function evaluateUnique(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);

  if (!values) {
    return { kind: "error", error: "#VALUE!" };
  }

  const seen = new Set<string>();
  const uniqueValues = values.filter((row) => {
    const key = row.join("\u001f");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return { kind: "values", values: uniqueValues };
}

function evaluateSort(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);

  if (!values) {
    return { kind: "error", error: "#VALUE!" };
  }

  const width = getArrayWidth(values);
  const sortIndex = parsePositiveIntegerArg(args[1] ?? "1", input) ?? 1;
  const sortOrder = parseNumberArg(args[2] ?? "1", input) ?? 1;
  const sortColumnIndex = sortIndex - 1;

  if (sortColumnIndex < 0 || sortColumnIndex >= width) {
    return { kind: "error", error: "#VALUE!" };
  }

  return {
    kind: "values",
    values: [...values].sort((left, right) => {
      const comparison = compareDynamicValues(
        left[sortColumnIndex] ?? "",
        right[sortColumnIndex] ?? "",
      );

      return sortOrder < 0 ? -comparison : comparison;
    }),
  };
}

function evaluateFilter(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);
  const includeValues = parseArrayArg(args[1] ?? "", input);

  if (!values || !includeValues) {
    return { kind: "error", error: "#VALUE!" };
  }

  const arrayWidth = getArrayWidth(values);
  const includeWidth = getArrayWidth(includeValues);
  const ifEmpty = args[2] ? parseScalarArg(args[2], input) : "";

  if (includeValues.length === values.length && includeWidth === 1) {
    const filteredRows = values.filter((_, index) =>
      isTruthyDynamicValue(includeValues[index]?.[0] ?? ""),
    );

    return {
      kind: "values",
      values: filteredRows.length > 0 ? filteredRows : [[ifEmpty]],
    };
  }

  if (includeValues.length === 1 && includeWidth === arrayWidth) {
    const filteredColumns = values.map((row) =>
      row.filter((_, index) =>
        isTruthyDynamicValue(includeValues[0]?.[index] ?? ""),
      ),
    );

    return {
      kind: "values",
      values:
        getArrayWidth(filteredColumns) > 0
          ? filteredColumns
          : [[ifEmpty]],
    };
  }

  return { kind: "error", error: "#VALUE!" };
}

function evaluateTake(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);
  const rows = parseIntegerArg(args[1] ?? "0", input);
  const columns = args[2] ? parseIntegerArg(args[2], input) : getArrayWidth(values ?? []);

  if (!values || rows === null || columns === null || rows === 0 || columns === 0) {
    return { kind: "error", error: "#VALUE!" };
  }

  return {
    kind: "values",
    values: sliceArray(values, rows, columns),
  };
}

function evaluateDrop(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);
  const rows = parseIntegerArg(args[1] ?? "0", input);
  const columns = args[2] ? parseIntegerArg(args[2], input) : 0;

  if (!values || rows === null || columns === null) {
    return { kind: "error", error: "#VALUE!" };
  }

  return {
    kind: "values",
    values: dropArray(values, rows, columns),
  };
}

function evaluateChooseColumns(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);

  if (!values || args.length < 2) {
    return { kind: "error", error: "#VALUE!" };
  }

  const width = getArrayWidth(values);
  const indexes = args.slice(1).map((arg) => resolveArrayIndex(arg, width, input));

  if (indexes.some((index) => index === null)) {
    return { kind: "error", error: "#VALUE!" };
  }

  return {
    kind: "values",
    values: values.map((row) =>
      indexes.map((index) => row[(index ?? 1) - 1] ?? ""),
    ),
  };
}

function evaluateChooseRows(
  args: string[],
  input: DynamicArrayEvaluationInput,
): DynamicArrayEvaluation {
  const values = parseArrayArg(args[0] ?? "", input);

  if (!values || args.length < 2) {
    return { kind: "error", error: "#VALUE!" };
  }

  const indexes = args
    .slice(1)
    .map((arg) => resolveArrayIndex(arg, values.length, input));

  if (indexes.some((index) => index === null)) {
    return { kind: "error", error: "#VALUE!" };
  }

  return {
    kind: "values",
    values: indexes.map((index) => values[(index ?? 1) - 1] ?? []),
  };
}

function parseFormulaFunctionCall(formula: string): FormulaFunctionCall | null {
  const expression = formula.trim().replace(/^=/, "").trim();
  const match = /^([A-Z][A-Z0-9.]*)\s*\(([\s\S]*)\)$/i.exec(expression);

  if (!match) {
    return null;
  }

  return {
    args: splitFormulaArgs(match[2] ?? ""),
    name: match[1].toUpperCase(),
  };
}

function splitFormulaArgs(input: string) {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (character === '"') {
      current += character;

      if (inString && nextCharacter === '"') {
        current += nextCharacter;
        index += 1;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (!inString) {
      if (character === "(") {
        depth += 1;
      }

      if (character === ")") {
        depth = Math.max(depth - 1, 0);
      }

      if (character === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }

    current += character;
  }

  args.push(current.trim());
  return args;
}

function parsePositiveIntegerArg(
  arg: string,
  input: DynamicArrayEvaluationInput,
) {
  const value = parseIntegerArg(arg, input);

  if (value === null || value <= 0) {
    return null;
  }

  return value;
}

function parseIntegerArg(arg: string, input: DynamicArrayEvaluationInput) {
  const value = parseNumberArg(arg, input);

  if (value === null || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function parseNumberArg(arg: string, input: DynamicArrayEvaluationInput) {
  const scalar = parseScalarArg(arg, input);
  const value = Number(scalar);

  return Number.isFinite(value) ? value : null;
}

function parseScalarArg(arg: string, input: DynamicArrayEvaluationInput) {
  const trimmed = arg.trim();
  const range = parseRangeArg(trimmed, input.sheet);

  if (
    range &&
    range.startRowIndex === range.endRowIndex &&
    range.startColumnIndex === range.endColumnIndex
  ) {
    return readCellValue(range.startRowIndex, range.startColumnIndex, input);
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('""', '"');
  }

  return trimmed;
}

function parseArrayArg(
  arg: string,
  input: DynamicArrayEvaluationInput,
): string[][] | null {
  const range = parseRangeArg(arg, input.sheet);

  if (range) {
    return readRangeValues(range, input);
  }

  const call = parseFormulaFunctionCall(arg.startsWith("=") ? arg : `=${arg}`);

  if (call) {
    const evaluation = evaluateDynamicArrayFormula({
      ...input,
      formula: `=${call.name}(${call.args.join(",")})`,
    });

    return evaluation?.kind === "values" ? evaluation.values : null;
  }

  const scalar = parseScalarArg(arg, input);

  return scalar ? [[scalar]] : null;
}

function parseRangeArg(arg: string, sheet: SheetData): ChartRange | null {
  const trimmed = arg.trim();
  const match =
    /^\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/i.exec(trimmed);

  if (!match) {
    return null;
  }

  const startColumnIndex = columnIndex(match[1]);
  const startRowIndex = Number(match[2]) - 1;
  const endColumnIndex = match[3] ? columnIndex(match[3]) : startColumnIndex;
  const endRowIndex = match[4] ? Number(match[4]) - 1 : startRowIndex;
  const range = {
    startRowIndex: Math.min(startRowIndex, endRowIndex),
    startColumnIndex: Math.min(startColumnIndex, endColumnIndex),
    endRowIndex: Math.max(startRowIndex, endRowIndex),
    endColumnIndex: Math.max(startColumnIndex, endColumnIndex),
  };

  if (
    range.startRowIndex < 0 ||
    range.startColumnIndex < 0 ||
    range.endRowIndex >= sheet.rowCount ||
    range.endColumnIndex >= sheet.columnCount
  ) {
    return null;
  }

  return range;
}

function readRangeValues(
  range: ChartRange,
  input: DynamicArrayEvaluationInput,
) {
  return Array.from(
    { length: range.endRowIndex - range.startRowIndex + 1 },
    (_, rowOffset) =>
      Array.from(
        { length: range.endColumnIndex - range.startColumnIndex + 1 },
        (_, columnOffset) =>
          readCellValue(
            range.startRowIndex + rowOffset,
            range.startColumnIndex + columnOffset,
            input,
          ),
      ),
  );
}

function readCellValue(
  rowIndex: number,
  columnIndexValue: number,
  input: DynamicArrayEvaluationInput,
) {
  const key = cellKey(rowIndex, columnIndexValue);
  const computedValue = input.computedValues[key];

  if (computedValue !== undefined) {
    return computedValue;
  }

  const raw = input.sheet.cells[key]?.raw ?? "";

  return raw.startsWith("=") ? "" : raw;
}

function getSpillBlockedKeys({
  anchorKey,
  occupiedSpillKeys,
  range,
  sheet,
}: {
  anchorKey: string;
  occupiedSpillKeys: Set<string>;
  range: ChartRange;
  sheet: SheetData;
}) {
  const blockedKeys = new Set<string>();

  for (let rowIndex = range.startRowIndex; rowIndex <= range.endRowIndex; rowIndex += 1) {
    for (
      let columnIndexValue = range.startColumnIndex;
      columnIndexValue <= range.endColumnIndex;
      columnIndexValue += 1
    ) {
      const key = cellKey(rowIndex, columnIndexValue);

      if (key === anchorKey) {
        continue;
      }

      if ((sheet.cells[key]?.raw ?? "").trim()) {
        blockedKeys.add(key);
      }

      if (occupiedSpillKeys.has(key)) {
        blockedKeys.add(key);
      }
    }
  }

  for (const mergedCell of sheet.mergedCells ?? []) {
    if (rangesOverlap(range, mergedCell)) {
      blockedKeys.add(
        cellKey(mergedCell.startRowIndex, mergedCell.startColumnIndex),
      );
    }
  }

  return [...blockedKeys].sort((left, right) => {
    const leftPosition = parseCellKey(left);
    const rightPosition = parseCellKey(right);

    if (!leftPosition || !rightPosition) {
      return left.localeCompare(right);
    }

    return (
      leftPosition.rowIndex - rightPosition.rowIndex ||
      leftPosition.columnIndex - rightPosition.columnIndex
    );
  });
}

function rangesOverlap(left: ChartRange, right: ChartRange) {
  return (
    left.startRowIndex <= right.endRowIndex &&
    left.endRowIndex >= right.startRowIndex &&
    left.startColumnIndex <= right.endColumnIndex &&
    left.endColumnIndex >= right.startColumnIndex
  );
}

function getArrayWidth(values: string[][]) {
  return values.reduce((width, row) => Math.max(width, row.length), 0);
}

function sliceArray(values: string[][], rows: number, columns: number) {
  const rowSlice =
    rows > 0 ? values.slice(0, rows) : values.slice(Math.max(values.length + rows, 0));

  return rowSlice.map((row) =>
    columns > 0
      ? row.slice(0, columns)
      : row.slice(Math.max(getArrayWidth(values) + columns, 0)),
  );
}

function dropArray(values: string[][], rows: number, columns: number) {
  const rowSlice =
    rows >= 0 ? values.slice(rows) : values.slice(0, Math.max(values.length + rows, 0));

  return rowSlice.map((row) =>
    columns >= 0
      ? row.slice(columns)
      : row.slice(0, Math.max(getArrayWidth(values) + columns, 0)),
  );
}

function resolveArrayIndex(
  arg: string,
  length: number,
  input: DynamicArrayEvaluationInput,
) {
  const index = parseIntegerArg(arg, input);

  if (index === null || index === 0) {
    return null;
  }

  const resolvedIndex = index > 0 ? index : length + index + 1;

  return resolvedIndex >= 1 && resolvedIndex <= length ? resolvedIndex : null;
}

function compareDynamicValues(left: string, right: string) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function formatDynamicValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(12)));
}

function isTruthyDynamicValue(value: string) {
  const trimmed = value.trim();

  return trimmed !== "" && trimmed !== "0" && trimmed.toUpperCase() !== "FALSE";
}
