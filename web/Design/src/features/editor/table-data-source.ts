import { parseCsvRows } from "@/features/editor/csv-import";
import {
  clampTableColumns,
  clampTableRows,
  maxTableColumns,
  maxTableRows,
} from "@/features/editor/table";

export const maxCsvUrlBytes = 512 * 1024;

export type TableDataSourceKind = "csv-url" | "google-sheets" | "json-url";

export type TableUrlDataResult =
  | {
      ok: true;
      cells: string[];
      columns: number;
      importedColumns: number;
      importedRows: number;
      rows: number;
      sourceKind: TableDataSourceKind;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export type TableUrlFetchOptions = {
  bearerToken?: string;
  customHeaderName?: string;
  customHeaderValue?: string;
};

export async function fetchTableUrlAsTableData(
  sourceUrl: string,
  options: TableUrlFetchOptions = {},
): Promise<TableUrlDataResult> {
  const parsedUrl = parseDataSourceUrl(sourceUrl);

  if (!parsedUrl.ok) return parsedUrl;
  const requestHeaders = createRequestHeaders(options);

  if (!requestHeaders.ok) return requestHeaders;

  const response = await fetch(parsedUrl.fetchUrl, {
    cache: "no-store",
    headers: requestHeaders.headers,
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `Data source returned ${response.status}.`,
    };
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxCsvUrlBytes) {
    return {
      ok: false,
      message: "Data source is larger than 512 KB.",
    };
  }

  const text = await response.text();

  if (new Blob([text]).size > maxCsvUrlBytes) {
    return {
      ok: false,
      message: "Data source is larger than 512 KB.",
    };
  }

  const sourceKind = resolveFetchedSourceKind(
    parsedUrl.fetchUrl,
    parsedUrl.sourceKind,
    response.headers.get("content-type"),
    text,
  );
  const tableData =
    sourceKind === "json-url"
      ? createTableDataFromJsonText(text)
      : createTableDataFromCsvText(text);

  if (!tableData.ok) return tableData;

  return {
    ...tableData,
    sourceKind: parsedUrl.sourceKind,
  };
}

export const fetchCsvUrlAsTableData = fetchTableUrlAsTableData;

function createRequestHeaders(options: TableUrlFetchOptions) {
  const bearerToken = options.bearerToken?.trim();
  const customHeaderName = options.customHeaderName?.trim();
  const customHeaderValue = options.customHeaderValue?.trim();
  const headers: Record<string, string> = {};

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (customHeaderName || customHeaderValue) {
    if (!customHeaderName || !customHeaderValue) {
      return {
        ok: false as const,
        message: "Custom header sync needs both a header name and value.",
      };
    }

    if (!isValidHeaderName(customHeaderName)) {
      return {
        ok: false as const,
        message: "Custom header name contains unsupported characters.",
      };
    }

    headers[customHeaderName] = customHeaderValue;
  }

  return {
    ok: true as const,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };
}

function isValidHeaderName(name: string) {
  return /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name);
}

export function createTableDataFromCsvText(
  csvText: string,
): TableUrlDataResult {
  const dataRows = parseCsvRows(csvText).filter((row) =>
    row.some((cell) => cell.trim()),
  );

  return createTableDataFromRows({
    emptyMessage: "This CSV source does not contain any table rows.",
    rows: dataRows,
    sourceKind: "csv-url",
  });
}

export function createTableDataFromJsonText(
  jsonText: string,
): TableUrlDataResult {
  try {
    const rows = createRowsFromJson(JSON.parse(jsonText));

    return createTableDataFromRows({
      emptyMessage: "This JSON source does not contain any table rows.",
      rows,
      sourceKind: "json-url",
    });
  } catch {
    return {
      ok: false,
      message: "This JSON source could not be parsed.",
    };
  }
}

function createTableDataFromRows({
  emptyMessage,
  rows: dataRows,
  sourceKind,
}: {
  emptyMessage: string;
  rows: string[][];
  sourceKind: TableDataSourceKind;
}): TableUrlDataResult {
  if (dataRows.length === 0) {
    return {
      ok: false,
      message: emptyMessage,
    };
  }

  const rows = clampTableRows(dataRows.length);
  const columns = clampTableColumns(
    Math.max(...dataRows.map((row) => row.length)),
  );
  const cells = Array.from({ length: rows * columns }, (_, index) => {
    const rowIndex = Math.floor(index / columns);
    const columnIndex = index % columns;

    return dataRows[rowIndex]?.[columnIndex]?.trim() ?? "";
  });

  return {
    ok: true,
    cells,
    columns,
    importedColumns: columns,
    importedRows: rows,
    rows,
    sourceKind,
    truncated:
      dataRows.length > maxTableRows ||
      dataRows.some((row) => row.length > maxTableColumns),
  };
}

export function getTableDataSourceKind(
  sourceUrl: string,
): TableDataSourceKind | undefined {
  const parsedUrl = parseDataSourceUrl(sourceUrl);

  return parsedUrl.ok ? parsedUrl.sourceKind : undefined;
}

function parseDataSourceUrl(sourceUrl: string) {
  const trimmedUrl = sourceUrl.trim();

  if (!trimmedUrl) {
    return {
      ok: false as const,
      message: "Add a CSV URL before syncing.",
    };
  }

  try {
    const url = new URL(trimmedUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return {
        ok: false as const,
        message: "Data source URL must start with http or https.",
      };
    }

    const googleSheet = createGoogleSheetCsvUrl(url);

    if (googleSheet) {
      return {
        ok: true as const,
        fetchUrl: googleSheet,
        sourceKind: "google-sheets" as const,
      };
    }

    return {
      ok: true as const,
      fetchUrl: url.toString(),
      sourceKind: getUrlSourceKind(url),
    };
  } catch {
    return {
      ok: false as const,
      message: "Enter a valid CSV, JSON, or Google Sheets URL.",
    };
  }
}

function resolveFetchedSourceKind(
  fetchUrl: string,
  sourceKind: TableDataSourceKind,
  contentType: string | null,
  text: string,
) {
  if (sourceKind === "google-sheets") return sourceKind;
  if (sourceKind === "json-url") return sourceKind;
  if (contentType?.toLowerCase().includes("json")) return "json-url";

  const trimmedText = text.trimStart();

  if (trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
    return "json-url";
  }

  return getUrlSourceKind(new URL(fetchUrl));
}

function getUrlSourceKind(url: URL): TableDataSourceKind {
  return url.pathname.toLowerCase().endsWith(".json") ? "json-url" : "csv-url";
}

function createRowsFromJson(value: unknown) {
  const records = getJsonRecords(value);

  if (records.length === 0) return [];

  const arrayRecords = records.filter(isArrayRecord);

  if (arrayRecords.length === records.length) {
    return arrayRecords.map((record) => record.map(formatJsonCell));
  }

  const objectRecords = records.filter(isRecordObject);

  if (objectRecords.length === records.length) {
    return createRowsFromObjectRecords(objectRecords);
  }

  return [["Value"], ...records.map((record) => [formatJsonCell(record)])];
}

function getJsonRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (!isRecordObject(value)) return [value];

  const preferredKeys = ["data", "items", "results", "records", "rows"];
  const preferredArray = preferredKeys
    .map((key) => value[key])
    .find(isArrayRecord);

  if (preferredArray) return preferredArray;

  const firstArray = Object.values(value).find(isArrayRecord);

  return firstArray ?? [value];
}

function createRowsFromObjectRecords(records: Record<string, unknown>[]) {
  const keys = Array.from(
    records.reduce((set, record) => {
      Object.keys(record).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return [
    keys,
    ...records.map((record) => keys.map((key) => formatJsonCell(record[key]))),
  ];
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isArrayRecord(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function formatJsonCell(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function createGoogleSheetCsvUrl(url: URL) {
  if (url.hostname !== "docs.google.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const spreadsheetIndex = segments.indexOf("spreadsheets");

  if (spreadsheetIndex < 0) return null;

  const kindSegment = segments[spreadsheetIndex + 1];
  const idSegment = segments[spreadsheetIndex + 2];
  const gid = getGoogleSheetGid(url);

  if (kindSegment === "d" && idSegment === "e") {
    const publishedId = segments[spreadsheetIndex + 3];

    if (!publishedId) return null;

    const csvUrl = new URL(
      `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub`,
    );
    csvUrl.searchParams.set("output", "csv");

    if (gid) csvUrl.searchParams.set("gid", gid);

    return csvUrl.toString();
  }

  if (kindSegment !== "d" || !idSegment) return null;

  const csvUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${idSegment}/export`,
  );
  csvUrl.searchParams.set("format", "csv");

  if (gid) csvUrl.searchParams.set("gid", gid);

  return csvUrl.toString();
}

function getGoogleSheetGid(url: URL) {
  const queryGid = url.searchParams.get("gid");

  if (queryGid) return queryGid;

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  return hashParams.get("gid");
}
