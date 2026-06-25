import { cellKey } from "@/features/workbooks/addresses";
import { createBlankSheet } from "@/features/workbooks/default-workbook";
import {
  applyImportConnectorTransformSteps,
  normalizeImportConnectorTransformSteps,
  type ImportConnectorTransformStep,
} from "@/features/workbooks/import-connector-transforms";
import type { SheetData } from "@/features/workbooks/types";

export type ImportConnectorFormat = "auto" | "csv" | "tsv" | "json" | "html";
export type ImportConnectorSourceType = "url" | "database";

export type ImportConnectorResult = {
  format: Exclude<ImportConnectorFormat, "auto">;
  sheet: SheetData;
  sourceName: string;
  sourceType: ImportConnectorSourceType;
};

export type ImportConnectorParseResult =
  | ({ ok: true } & ImportConnectorResult)
  | {
      error: string;
      ok: false;
    };

const maxConnectorRows = 10_000;
const maxConnectorColumns = 250;
export const maxConnectorTextLength = 1_000_000;

function cleanSheetName(name: string, fallback: string) {
  return name.trim().replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").slice(0, 31) ||
    fallback;
}

function rowsToSheet(rows: string[][], name: string): SheetData {
  const sheet = createBlankSheet(cleanSheetName(name, "Imported data"));
  const clippedRows = rows
    .filter((row) => row.some((cell) => cell.trim()))
    .slice(0, maxConnectorRows)
    .map((row) => row.slice(0, maxConnectorColumns));

  clippedRows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value.trim()) {
        sheet.cells[cellKey(rowIndex, columnIndex)] = { raw: value };
      }
    });
  });

  sheet.rowCount = Math.max(sheet.rowCount, clippedRows.length);
  sheet.columnCount = Math.max(
    sheet.columnCount,
    ...clippedRows.map((row) => Math.max(row.length, 1)),
  );

  return sheet;
}

function parseDelimitedRows(text: string, delimiter: "," | "\t") {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoted) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function formatJsonCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function rowsFromObjectArray(items: Record<string, unknown>[]) {
  const headers = Array.from(
    items.reduce<Set<string>>((keys, item) => {
      Object.keys(item).forEach((key) => keys.add(key));
      return keys;
    }, new Set()),
  ).slice(0, maxConnectorColumns);

  return [
    headers,
    ...items.map((item) => headers.map((header) => formatJsonCell(item[header]))),
  ];
}

function rowsFromJsonValue(value: unknown): string[][] {
  if (Array.isArray(value)) {
    if (value.every((item) => Array.isArray(item))) {
      return value.map((row) => row.map(formatJsonCell));
    }

    if (
      value.every(
        (item) => typeof item === "object" && item !== null && !Array.isArray(item),
      )
    ) {
      return rowsFromObjectArray(value as Record<string, unknown>[]);
    }

    return [["Value"], ...value.map((item) => [formatJsonCell(item)])];
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    const tableEntry = entries.find(([, item]) => Array.isArray(item));

    if (tableEntry) {
      return rowsFromJsonValue(tableEntry[1]);
    }

    return [
      ["Field", "Value"],
      ...entries.map(([key, item]) => [key, formatJsonCell(item)]),
    ];
  }

  return [["Value"], [formatJsonCell(value)]];
}

function decodeHtmlEntity(entity: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  if (entity.startsWith("#x")) {
    const codePoint = Number.parseInt(entity.slice(2), 16);

    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
  }

  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10);

    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
  }

  return namedEntities[entity] ?? `&${entity};`;
}

function cleanHtmlCell(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&([^;\s]+);/g, (_, entity: string) => decodeHtmlEntity(entity))
    .replace(/\s+/g, " ")
    .trim();
}

function parseHtmlTableRows(text: string) {
  const table = text.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .match(/<table[\s\S]*?<\/table>/i)?.[0];

  if (!table) {
    return [];
  }

  return Array.from(table.matchAll(/<tr[\s\S]*?<\/tr>/gi))
    .map((rowMatch) =>
      Array.from(rowMatch[0].matchAll(/<(?:th|td)\b[\s\S]*?<\/(?:th|td)>/gi))
        .map((cellMatch) => cleanHtmlCell(cellMatch[0])),
    )
    .filter((row) => row.length > 0);
}

function detectConnectorFormat({
  contentType,
  format,
  text,
  url,
}: {
  contentType?: string;
  format: ImportConnectorFormat;
  text: string;
  url?: string;
}): Exclude<ImportConnectorFormat, "auto"> {
  if (format !== "auto") {
    return format;
  }

  const normalizedType = contentType?.toLowerCase() ?? "";
  const normalizedUrl = url?.toLowerCase() ?? "";
  const trimmed = text.trimStart();

  if (normalizedType.includes("json") || /\.json(?:$|[?#])/.test(normalizedUrl)) {
    return "json";
  }

  if (
    normalizedType.includes("html") ||
    /\.html?(?:$|[?#])/.test(normalizedUrl) ||
    /^<!doctype html|^<html|^<table/i.test(trimmed)
  ) {
    return "html";
  }

  if (
    normalizedType.includes("tab-separated-values") ||
    /\.tsv(?:$|[?#])/.test(normalizedUrl)
  ) {
    return "tsv";
  }

  if (normalizedType.includes("csv") || /\.csv(?:$|[?#])/.test(normalizedUrl)) {
    return "csv";
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return "json";
  }

  return text.includes("\t") ? "tsv" : "csv";
}

export function parseImportConnectorText({
  contentType,
  format = "auto",
  name,
  sourceType,
  text,
  transformSteps,
  url,
}: {
  contentType?: string;
  format?: ImportConnectorFormat;
  name: string;
  sourceType: ImportConnectorSourceType;
  text: string;
  transformSteps?: ImportConnectorTransformStep[];
  url?: string;
}): ImportConnectorParseResult {
  if (text.length > maxConnectorTextLength) {
    return {
      ok: false,
      error: "Connector response is too large.",
    };
  }

  const detectedFormat = detectConnectorFormat({ contentType, format, text, url });
  let rows: string[][];

  try {
    if (detectedFormat === "json") {
      rows = rowsFromJsonValue(JSON.parse(text));
    } else if (detectedFormat === "html") {
      rows = parseHtmlTableRows(text);
    } else {
      rows = parseDelimitedRows(text, detectedFormat === "tsv" ? "\t" : ",");
    }
  } catch {
    return {
      ok: false,
      error: `Could not parse ${detectedFormat.toUpperCase()} connector data.`,
    };
  }

  if (rows.length === 0 || rows.every((row) => row.length === 0)) {
    return {
      ok: false,
      error: "Connector data did not contain an importable table.",
    };
  }

  const transformedRows = applyImportConnectorTransformSteps(
    rows,
    normalizeImportConnectorTransformSteps(transformSteps),
  );

  if (
    transformedRows.length === 0 ||
    transformedRows.every((row) => row.length === 0)
  ) {
    return {
      ok: false,
      error: "Transform steps removed every importable row.",
    };
  }

  return {
    ok: true,
    format: detectedFormat,
    sheet: rowsToSheet(transformedRows, name),
    sourceName: name,
    sourceType,
  };
}
