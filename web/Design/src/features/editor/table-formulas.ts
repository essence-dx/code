import { getTableCell } from "@/features/editor/table";
import {
  getActiveTableSheet,
  getTableSheets,
  sheetToTableFields,
} from "@/features/editor/table-sheets";
import type { TableElement } from "@/features/editor/types";

export const tableFormulaFunctionNames = [
  "SUM",
  "AVERAGE",
  "MIN",
  "MAX",
  "COUNT",
  "ROUND",
] as const;

export type TableFormulaFunctionName = (typeof tableFormulaFunctionNames)[number];

export type TableFormulaFunctionDefinition = {
  name: TableFormulaFunctionName;
  syntax: string;
  description: string;
  example: string;
};

export const tableFormulaFunctionCatalog: TableFormulaFunctionDefinition[] = [
  {
    name: "SUM",
    syntax: "=SUM(A1:A5)",
    description: "Adds every number in a cell range.",
    example: "=SUM(A1:B3)",
  },
  {
    name: "AVERAGE",
    syntax: "=AVERAGE(A1:A5)",
    description: "Returns the mean value of a numeric range.",
    example: "=AVERAGE(B2:B6)",
  },
  {
    name: "MIN",
    syntax: "=MIN(A1:A5)",
    description: "Finds the smallest numeric value in a range.",
    example: "=MIN(C1:C8)",
  },
  {
    name: "MAX",
    syntax: "=MAX(A1:A5)",
    description: "Finds the largest numeric value in a range.",
    example: "=MAX(C1:C8)",
  },
  {
    name: "COUNT",
    syntax: "=COUNT(A1:A5)",
    description: "Counts numeric cells in a range.",
    example: "=COUNT(A1:D1)",
  },
  {
    name: "ROUND",
    syntax: "=ROUND(A1, 2)",
    description: "Rounds a value to a fixed decimal precision.",
    example: "=ROUND(A1/3, 2)",
  },
];

type Token =
  | {
      type: "number";
      value: string;
    }
  | {
      type: "identifier";
      value: string;
    }
  | {
      type: "operator";
      value: "+" | "-" | "*" | "/" | "^" | ":" | ",";
    }
  | {
      type: "paren";
      value: "(" | ")";
    }
  | {
      type: "eof";
      value: "";
    };
type FormulaOperator = Extract<Token, { type: "operator" }>["value"];

type FormulaContext = {
  activeSheetId: string;
  sheets: FormulaSheetContext[];
};

type FormulaSheetContext = {
  id: string;
  name: string;
  cells: string[];
  columns: number;
  rows: number;
};

export type TableFormulaDiagnostic = {
  cellLabel: string;
  columnIndex: number;
  error: string;
  formula: string;
  rowIndex: number;
};

export type TableCellDisplayValue = {
  displayValue: string;
  error?: string;
  isFormula: boolean;
  rawValue: string;
};

export function isFormulaCell(value: string) {
  return value.trim().startsWith("=");
}

export function getTableCellDisplayValue(
  element: TableElement,
  rowIndex: number,
  columnIndex: number,
): TableCellDisplayValue {
  const activeSheet = getActiveTableSheet(element);
  const rawValue = getTableCell(
    activeSheet.cells,
    activeSheet.columns,
    rowIndex,
    columnIndex,
  );

  if (!isFormulaCell(rawValue)) {
    return {
      displayValue: rawValue,
      isFormula: false,
      rawValue,
    };
  }

  const result = evaluateFormulaCell(
    createFormulaContext(element),
    activeSheet.id,
    rowIndex,
    columnIndex,
    new Set([createCellKey(activeSheet.id, rowIndex, columnIndex)]),
  );

  if (!result.ok) {
    return {
      displayValue: result.error,
      error: result.error,
      isFormula: true,
      rawValue,
    };
  }

  return {
    displayValue: formatFormulaNumber(result.value),
    isFormula: true,
    rawValue,
  };
}

export function getTableFormulaDiagnostics(
  element: TableElement,
): TableFormulaDiagnostic[] {
  const diagnostics: TableFormulaDiagnostic[] = [];
  const sheets = getTableSheets(element);

  for (const sheet of sheets) {
    const sheetElement = {
      ...element,
      ...sheetToTableFields(sheet),
      activeSheetId: sheet.id,
      sheets,
    };

    for (let rowIndex = 0; rowIndex < sheet.rows; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < sheet.columns; columnIndex += 1) {
        const display = getTableCellDisplayValue(
          sheetElement,
          rowIndex,
          columnIndex,
        );

        if (!display.isFormula || !display.error) continue;

        diagnostics.push({
          cellLabel: `${sheet.name}!${createCellLabel(rowIndex, columnIndex)}`,
          columnIndex,
          error: display.error,
          formula: display.rawValue,
          rowIndex,
        });
      }
    }
  }

  return diagnostics;
}

export function countTableFormulas(element: TableElement) {
  return getTableSheets(element).reduce(
    (total, sheet) => total + sheet.cells.filter(isFormulaCell).length,
    0,
  );
}

function evaluateFormulaCell(
  context: FormulaContext,
  sheetId: string,
  rowIndex: number,
  columnIndex: number,
  visited: Set<string>,
): { ok: true; value: number } | { ok: false; error: string } {
  const sheet = getFormulaSheetById(context, sheetId);
  if (!sheet) {
    return { ok: false, error: "#REF!" };
  }

  const rawValue = getTableCell(
    sheet.cells,
    sheet.columns,
    rowIndex,
    columnIndex,
  );

  if (!isFormulaCell(rawValue)) {
    return coerceCellNumber(rawValue);
  }

  try {
    const formula = rawValue.trim().slice(1);
    const parser = new FormulaParser(
      tokenizeFormula(formula),
      context,
      sheet.id,
      visited,
    );
    const value = parser.parse();

    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: "#NUM!",
      };
    }

    return {
      ok: true,
      value,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof FormulaError ? error.message : "#ERROR!",
    };
  }
}

class FormulaParser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: FormulaContext,
    private readonly activeSheetId: string,
    private readonly visited: Set<string>,
  ) {}

  parse(): number {
    const value = this.parseExpression();
    this.expect("eof");

    return value;
  }

  private parseExpression(): number {
    return this.parseAddition();
  }

  private parseAddition(): number {
    let value = this.parseMultiplication();

    while (this.current().type === "operator") {
      const operator = this.current().value;

      if (operator !== "+" && operator !== "-") break;

      this.index += 1;
      const right = this.parseMultiplication();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  private parseMultiplication(): number {
    let value = this.parsePower();

    while (this.current().type === "operator") {
      const operator = this.current().value;

      if (operator !== "*" && operator !== "/") break;

      this.index += 1;
      const right = this.parsePower();

      if (operator === "/" && right === 0) {
        throw new FormulaError("#DIV/0!");
      }

      value = operator === "*" ? value * right : value / right;
    }

    return value;
  }

  private parsePower(): number {
    let value = this.parseUnary();

    while (this.matchOperator("^")) {
      value = value ** this.parseUnary();
    }

    return value;
  }

  private parseUnary(): number {
    if (this.matchOperator("+")) return this.parseUnary();
    if (this.matchOperator("-")) return -this.parseUnary();

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.current();

    if (token.type === "number") {
      this.index += 1;

      return Number.parseFloat(token.value);
    }

    if (this.matchParen("(")) {
      const value = this.parseExpression();
      this.expect("paren", ")");

      return value;
    }

    if (token.type === "identifier") {
      this.index += 1;

      if (this.matchParen("(")) {
        return this.parseFunctionCall(token.value);
      }

      return this.readCellReference(token.value, "strict") ?? 0;
    }

    throw new FormulaError("#ERROR!");
  }

  private parseFunctionCall(name: string): number {
    const args: number[][] = [];

    if (!this.matchParen(")")) {
      do {
        args.push(this.parseFunctionArgument());
      } while (this.matchOperator(","));

      this.expect("paren", ")");
    }

    const values = args.flat();
    const normalizedName = name.toUpperCase();

    if (normalizedName === "SUM") return sum(values);
    if (normalizedName === "AVERAGE") return values.length ? sum(values) / values.length : 0;
    if (normalizedName === "MIN") return values.length ? Math.min(...values) : 0;
    if (normalizedName === "MAX") return values.length ? Math.max(...values) : 0;
    if (normalizedName === "COUNT") return values.length;

    if (normalizedName === "ROUND") {
      const value = args[0]?.[0] ?? 0;
      const precision = Math.max(-6, Math.min(6, Math.round(args[1]?.[0] ?? 0)));
      const factor = 10 ** precision;

      return Math.round(value * factor) / factor;
    }

    throw new FormulaError("#NAME?");
  }

  private parseFunctionArgument(): number[] {
    const token = this.current();
    const nextToken = this.tokens[this.index + 1];
    const endToken = this.tokens[this.index + 2];

    if (
      token.type === "identifier" &&
      nextToken?.type === "operator" &&
      nextToken.value === ":" &&
      endToken?.type === "identifier"
    ) {
      this.index += 3;

      return this.readRange(token.value, endToken.value);
    }

    return [this.parseExpression()];
  }

  private readRange(startReference: string, endReference: string) {
    const start = parseCellReference(startReference);
    const end = parseCellReference(endReference, start?.sheetName);

    if (!start || !end) throw new FormulaError("#REF!");

    const startSheet = this.resolveSheet(start.sheetName);
    const endSheet = this.resolveSheet(end.sheetName);

    if (!startSheet || !endSheet || startSheet.id !== endSheet.id) {
      throw new FormulaError("#REF!");
    }

    const rowStart = Math.min(start.rowIndex, end.rowIndex);
    const rowEnd = Math.max(start.rowIndex, end.rowIndex);
    const columnStart = Math.min(start.columnIndex, end.columnIndex);
    const columnEnd = Math.max(start.columnIndex, end.columnIndex);
    const values: number[] = [];

    for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
      for (
        let columnIndex = columnStart;
        columnIndex <= columnEnd;
        columnIndex += 1
      ) {
        const value = this.readCellByIndex(
          startSheet.id,
          rowIndex,
          columnIndex,
          "range",
        );

        if (typeof value === "number") values.push(value);
      }
    }

    return values;
  }

  private readCellReference(
    reference: string,
    mode: "strict" | "range",
  ) {
    const parsed = parseCellReference(reference);

    if (!parsed) throw new FormulaError("#REF!");

    const sheet = this.resolveSheet(parsed.sheetName);

    if (!sheet) throw new FormulaError("#REF!");

    return this.readCellByIndex(sheet.id, parsed.rowIndex, parsed.columnIndex, mode);
  }

  private readCellByIndex(
    sheetId: string,
    rowIndex: number,
    columnIndex: number,
    mode: "strict" | "range",
  ) {
    const sheet = getFormulaSheetById(this.context, sheetId);

    if (!sheet) throw new FormulaError("#REF!");

    if (
      rowIndex < 0 ||
      rowIndex >= sheet.rows ||
      columnIndex < 0 ||
      columnIndex >= sheet.columns
    ) {
      throw new FormulaError("#REF!");
    }

    const key = createCellKey(sheet.id, rowIndex, columnIndex);

    if (this.visited.has(key)) throw new FormulaError("#CYCLE!");

    const rawValue = getTableCell(
      sheet.cells,
      sheet.columns,
      rowIndex,
      columnIndex,
    );

    if (!isFormulaCell(rawValue)) {
      const coerced = coerceCellNumber(rawValue);

      if (coerced.ok) return coerced.value;
      if (mode === "range") return undefined;

      throw new FormulaError(coerced.error);
    }

    const nextVisited = new Set(this.visited);
    nextVisited.add(key);
    const result = evaluateFormulaCell(
      this.context,
      sheet.id,
      rowIndex,
      columnIndex,
      nextVisited,
    );

    if (!result.ok) throw new FormulaError(result.error);

    return result.value;
  }

  private resolveSheet(sheetName: string | undefined) {
    if (!sheetName) return getFormulaSheetById(this.context, this.activeSheetId);

    const normalizedName = normalizeSheetName(sheetName);

    return this.context.sheets.find(
      (sheet) =>
        normalizeSheetName(sheet.name) === normalizedName ||
        normalizeSheetName(sheet.id) === normalizedName,
    );
  }

  private current() {
    return (this.tokens[this.index] ??
      this.tokens[this.tokens.length - 1]) as Token;
  }

  private matchOperator(value: FormulaOperator) {
    if (this.current().type !== "operator" || this.current().value !== value) {
      return false;
    }

    this.index += 1;

    return true;
  }

  private matchParen(value: "(" | ")") {
    if (this.current().type !== "paren" || this.current().value !== value) {
      return false;
    }

    this.index += 1;

    return true;
  }

  private expect(type: Token["type"], value?: Token["value"]) {
    const token = this.current();

    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new FormulaError("#ERROR!");
    }

    this.index += 1;
  }
}

function tokenizeFormula(input: string) {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const character = input[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(character)) {
      const start = index;
      index += 1;

      while (index < input.length && /[0-9.]/.test(input[index])) {
        index += 1;
      }

      const value = input.slice(start, index);

      if (!/^\d*\.?\d+$/.test(value)) throw new FormulaError("#VALUE!");

      tokens.push({ type: "number", value });
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      const start = index;
      index += 1;

      while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) {
        index += 1;
      }

      if (input[index] === "!") {
        index += 1;
        index = readCellReferenceEnd(input, index);
      }

      tokens.push({
        type: "identifier",
        value: input.slice(start, index),
      });
      continue;
    }

    if (character === "'") {
      const start = index;
      index += 1;

      while (index < input.length && input[index] !== "'") {
        index += 1;
      }

      if (input[index] !== "'" || input[index + 1] !== "!") {
        throw new FormulaError("#REF!");
      }

      index += 2;
      index = readCellReferenceEnd(input, index);

      tokens.push({
        type: "identifier",
        value: input.slice(start, index),
      });
      continue;
    }

    if (isOperator(character)) {
      tokens.push({
        type: "operator",
        value: character,
      });
      index += 1;
      continue;
    }

    if (character === "(" || character === ")") {
      tokens.push({
        type: "paren",
        value: character,
      });
      index += 1;
      continue;
    }

    throw new FormulaError("#ERROR!");
  }

  tokens.push({
    type: "eof",
    value: "",
  });

  return tokens;
}

function coerceCellNumber(
  value: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) return { ok: true, value: 0 };

  const number = Number(normalized);

  if (Number.isFinite(number)) return { ok: true, value: number };

  return {
    ok: false,
    error: "#VALUE!",
  };
}

function parseCellReference(reference: string, defaultSheetName?: string) {
  const match = reference.match(
    /^(?:(?:'([^']+)'|([^!']+))!)?([A-Z]+)([1-9]\d*)$/i,
  );

  if (!match) return null;

  return {
    sheetName: match[1] ?? match[2] ?? defaultSheetName,
    columnIndex: getColumnIndex(match[3]),
    rowIndex: Number.parseInt(match[4], 10) - 1,
  };
}

function readCellReferenceEnd(input: string, start: number) {
  let index = start;

  while (index < input.length && /[A-Za-z]/.test(input[index])) {
    index += 1;
  }

  const digitStart = index;

  while (index < input.length && /\d/.test(input[index])) {
    index += 1;
  }

  if (digitStart === start || digitStart === index) {
    throw new FormulaError("#REF!");
  }

  return index;
}

function getColumnIndex(columnLetters: string) {
  return (
    columnLetters
      .toUpperCase()
      .split("")
      .reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) -
    1
  );
}

function createCellLabel(rowIndex: number, columnIndex: number) {
  return `${getColumnName(columnIndex + 1)}${rowIndex + 1}`;
}

function getColumnName(columnNumber: number) {
  let value = columnNumber;
  let name = "";

  while (value > 0) {
    const modulo = (value - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    value = Math.floor((value - modulo) / 26);
  }

  return name;
}

function createCellKey(sheetId: string, rowIndex: number, columnIndex: number) {
  return `${sheetId}:${rowIndex}:${columnIndex}`;
}

function formatFormulaNumber(value: number) {
  const normalized = Object.is(value, -0) ? 0 : value;

  if (Number.isInteger(normalized)) return String(normalized);

  return normalized.toFixed(6).replace(/\.?0+$/, "");
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function createFormulaContext(element: TableElement): FormulaContext {
  const sheets = getTableSheets(element);
  const activeSheet = getActiveTableSheet(element);

  return {
    activeSheetId: activeSheet.id,
    sheets: sheets.map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      rows: sheet.rows,
      columns: sheet.columns,
      cells: sheet.cells,
    })),
  };
}

function getFormulaSheetById(context: FormulaContext, sheetId: string) {
  return context.sheets.find((sheet) => sheet.id === sheetId);
}

function normalizeSheetName(name: string) {
  return name.trim().toLowerCase();
}

function isOperator(character: string): character is FormulaOperator {
  return ["+", "-", "*", "/", "^", ":", ","].includes(character);
}

class FormulaError extends Error {}
