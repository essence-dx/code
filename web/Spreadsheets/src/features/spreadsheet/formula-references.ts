import { columnIndex, columnLabel } from "@/features/workbooks/addresses";

export function quoteFormulaSheetName(sheetName: string) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(sheetName)) {
    return sheetName;
  }

  return `'${sheetName.replace(/'/g, "''")}'`;
}

export function shiftFormulaReferences({
  formula,
  rowOffset,
  columnOffset,
}: {
  formula: string;
  rowOffset: number;
  columnOffset: number;
}) {
  const referencePattern =
    /(?<![A-Z0-9_.])(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)(?![A-Z0-9_.])/gi;
  let shifted = "";
  let chunk = "";
  let inString = false;

  function shiftChunk(value: string) {
    return value.replace(
      referencePattern,
      (
        match,
        columnLock: string,
        column: string,
        rowLock: string,
        row: string,
      ) => {
        const currentColumnIndex = columnIndex(String(column).toUpperCase());
        const currentRowIndex = Number(row) - 1;
        const nextColumnIndex = columnLock
          ? currentColumnIndex
          : currentColumnIndex + columnOffset;
        const nextRowIndex = rowLock
          ? currentRowIndex
          : currentRowIndex + rowOffset;

        if (nextColumnIndex < 0 || nextRowIndex < 0) {
          return match;
        }

        return `${columnLock}${columnLabel(nextColumnIndex)}${rowLock}${nextRowIndex + 1}`;
      },
    );
  }

  for (const character of formula) {
    if (character === '"') {
      shifted += inString ? chunk + character : shiftChunk(chunk) + character;
      chunk = "";
      inString = !inString;
      continue;
    }

    chunk += character;
  }

  return shifted + (inString ? chunk : shiftChunk(chunk));
}
