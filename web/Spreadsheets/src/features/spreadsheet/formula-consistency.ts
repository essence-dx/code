import { cellKey, columnIndex, parseCellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";

export type FormulaConsistencyIssue = {
  key: string;
  rowIndex: number;
  columnIndex: number;
  formula: string;
  expectedFormula: string;
  direction: "row" | "column";
  message: string;
};

type FormulaCell = {
  key: string;
  rowIndex: number;
  columnIndex: number;
  formula: string;
  signature: string;
};

const MAX_CONSISTENCY_ISSUES = 100;
const referencePattern =
  /(?<![A-Z0-9_.])(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)(?![A-Z0-9_.])/gi;

function normalizeFormulaForCell({
  formula,
  rowIndex,
  columnIndex: formulaColumnIndex,
}: {
  formula: string;
  rowIndex: number;
  columnIndex: number;
}) {
  let normalized = "";
  let chunk = "";
  let inString = false;

  function normalizeChunk(value: string) {
    return value.replace(
      referencePattern,
      (
        match,
        columnLock: string,
        column: string,
        rowLock: string,
        row: string,
      ) => {
        const referencedColumnIndex = columnIndex(column);
        const referencedRowIndex = Number(row) - 1;
        const normalizedColumn = columnLock
          ? `C$${column.toUpperCase()}`
          : `C[${referencedColumnIndex - formulaColumnIndex}]`;
        const normalizedRow = rowLock
          ? `R$${row}`
          : `R[${referencedRowIndex - rowIndex}]`;

        return `${normalizedRow}${normalizedColumn}`;
      },
    );
  }

  for (const character of formula) {
    if (character === '"') {
      normalized += inString
        ? chunk + character
        : normalizeChunk(chunk) + character;
      chunk = "";
      inString = !inString;
      continue;
    }

    chunk += character;
  }

  return `${normalized}${inString ? chunk : normalizeChunk(chunk)}`
    .replace(/\s+/g, "")
    .toUpperCase();
}

function issueFromNeighbors({
  cell,
  neighbors,
  direction,
}: {
  cell: FormulaCell;
  neighbors: FormulaCell[];
  direction: FormulaConsistencyIssue["direction"];
}) {
  const grouped = new Map<string, FormulaCell[]>();

  for (const neighbor of neighbors) {
    grouped.set(neighbor.signature, [
      ...(grouped.get(neighbor.signature) ?? []),
      neighbor,
    ]);
  }

  const expectedGroup = Array.from(grouped.values())
    .filter((group) => group.length >= 2)
    .sort((left, right) => right.length - left.length)[0];

  if (!expectedGroup || expectedGroup[0].signature === cell.signature) {
    return null;
  }

  return {
    key: cell.key,
    rowIndex: cell.rowIndex,
    columnIndex: cell.columnIndex,
    formula: cell.formula,
    expectedFormula: expectedGroup[0].formula,
    direction,
    message:
      direction === "column"
        ? "Formula differs from nearby formulas in this column."
        : "Formula differs from nearby formulas in this row.",
  } satisfies FormulaConsistencyIssue;
}

function getFormulaNeighbor({
  formulas,
  rowIndex,
  columnIndex: neighborColumnIndex,
}: {
  formulas: Map<string, FormulaCell>;
  rowIndex: number;
  columnIndex: number;
}) {
  if (rowIndex < 0 || neighborColumnIndex < 0) {
    return null;
  }

  return formulas.get(cellKey(rowIndex, neighborColumnIndex)) ?? null;
}

export function getFormulaConsistencyIssues({
  sheet,
  hideHiddenFormulas = false,
}: {
  sheet: SheetData;
  hideHiddenFormulas?: boolean;
}) {
  const formulas = new Map<string, FormulaCell>();

  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (!cell.raw.trimStart().startsWith("=")) {
      continue;
    }

    const position = parseCellKey(key);

    if (!position) {
      continue;
    }

    formulas.set(key, {
      key,
      rowIndex: position.rowIndex,
      columnIndex: position.columnIndex,
      formula:
        hideHiddenFormulas && cell.style?.formulaHidden
          ? "Formula hidden"
          : cell.raw,
      signature: normalizeFormulaForCell({
        formula: cell.raw,
        rowIndex: position.rowIndex,
        columnIndex: position.columnIndex,
      }),
    });
  }

  const issues: FormulaConsistencyIssue[] = [];
  const sortedFormulas = Array.from(formulas.values()).sort(
    (left, right) =>
      left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex,
  );

  for (const formulaCell of sortedFormulas) {
    const verticalNeighbors = [-2, -1, 1, 2]
      .map((offset) =>
        getFormulaNeighbor({
          formulas,
          rowIndex: formulaCell.rowIndex + offset,
          columnIndex: formulaCell.columnIndex,
        }),
      )
      .filter((neighbor): neighbor is FormulaCell => Boolean(neighbor));
    const horizontalNeighbors = [-2, -1, 1, 2]
      .map((offset) =>
        getFormulaNeighbor({
          formulas,
          rowIndex: formulaCell.rowIndex,
          columnIndex: formulaCell.columnIndex + offset,
        }),
      )
      .filter((neighbor): neighbor is FormulaCell => Boolean(neighbor));
    const issue =
      issueFromNeighbors({
        cell: formulaCell,
        neighbors: verticalNeighbors,
        direction: "column",
      }) ??
      issueFromNeighbors({
        cell: formulaCell,
        neighbors: horizontalNeighbors,
        direction: "row",
      });

    if (issue) {
      issues.push(issue);
    }

    if (issues.length >= MAX_CONSISTENCY_ISSUES) {
      return issues;
    }
  }

  return issues;
}
