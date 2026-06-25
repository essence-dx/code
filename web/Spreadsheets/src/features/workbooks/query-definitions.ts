import { parseCellKey } from "@/features/workbooks/addresses";
import type { ImportConnectorTransformStep } from "@/features/workbooks/import-connector-transform-types";
import type {
  SheetData,
  WorkbookQueryCredentialMetadata,
  WorkbookQueryCredentialStatus,
  WorkbookQueryDefinition,
  WorkbookQueryFormat,
  WorkbookQueryRefreshDiagnosticCode,
  WorkbookQueryRefreshHistoryEntry,
  WorkbookQuerySource,
} from "@/features/workbooks/types";

const maxRefreshHistory = 20;
const defaultRetryAfterMs = 30_000;
const sensitiveUrlKeys = [
  "access_token",
  "api_key",
  "apikey",
  "auth",
  "client_secret",
  "code",
  "key",
  "password",
  "secret",
  "sig",
  "signature",
  "token",
];

export type QueryRefreshDiagnostics = {
  code: WorkbookQueryRefreshDiagnosticCode;
  message: string;
  retryAfterMs?: number;
  retryable: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function cleanQueryName(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80) || fallback;
}

function hasSensitiveUrlMetadata(url: URL) {
  if (url.username || url.password) {
    return true;
  }

  return Array.from(url.searchParams.keys()).some((key) => {
    const normalizedKey = key.toLowerCase();

    return sensitiveUrlKeys.some((sensitiveKey) =>
      normalizedKey.includes(sensitiveKey),
    );
  });
}

function redactUrl(url: URL) {
  const redacted = new URL(url.toString());

  redacted.username = "";
  redacted.password = "";
  sensitiveUrlKeys.forEach((key) => {
    Array.from(redacted.searchParams.keys()).forEach((paramKey) => {
      if (paramKey.toLowerCase().includes(key)) {
        redacted.searchParams.set(paramKey, "redacted");
      }
    });
  });

  return redacted.toString();
}

function createCredentialMetadata(
  kind: WorkbookQueryCredentialMetadata["kind"],
  label: string,
  status?: WorkbookQueryCredentialStatus,
): WorkbookQueryCredentialMetadata {
  return {
    kind,
    label,
    hasStoredSecret: false,
    status:
      status ??
      (kind === "none"
        ? "notRequired"
        : kind === "environment"
          ? "environment"
          : "required"),
    updatedAt: nowIso(),
  };
}

function createNextRetryAt(retryAfterMs: number) {
  return new Date(Date.now() + retryAfterMs).toISOString();
}

export function createQueryRefreshDiagnostics(
  message: string,
): QueryRefreshDiagnostics {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("credential") ||
    normalizedMessage.includes("authentication") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("forbidden")
  ) {
    return {
      code: "auth",
      message,
      retryable: false,
    };
  }

  if (
    normalizedMessage.includes("public http") ||
    normalizedMessage.includes("private") ||
    normalizedMessage.includes("redirect") ||
    normalizedMessage.includes("blocked")
  ) {
    return {
      code: "blocked",
      message,
      retryable: false,
    };
  }

  if (normalizedMessage.includes("too large")) {
    return {
      code: "tooLarge",
      message,
      retryable: false,
    };
  }

  if (
    normalizedMessage.includes("parse") ||
    normalizedMessage.includes("importable") ||
    normalizedMessage.includes("transform")
  ) {
    return {
      code: "parse",
      message,
      retryable: false,
    };
  }

  if (normalizedMessage.includes("rate") || normalizedMessage.includes("429")) {
    return {
      code: "rateLimit",
      message,
      retryAfterMs: 60_000,
      retryable: true,
    };
  }

  if (
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("timeout")
  ) {
    return {
      code: "network",
      message,
      retryAfterMs: defaultRetryAfterMs,
      retryable: true,
    };
  }

  if (normalizedMessage.includes("server") || /\b5\d\d\b/.test(normalizedMessage)) {
    return {
      code: "server",
      message,
      retryAfterMs: defaultRetryAfterMs,
      retryable: true,
    };
  }

  return {
    code: "unknown",
    message,
    retryAfterMs: defaultRetryAfterMs,
    retryable: true,
  };
}

export function getNextQueryRefreshAttempt(query: WorkbookQueryDefinition) {
  const latest = query.refreshHistory?.[0];

  return latest?.status === "error" ? latest.attempt + 1 : 1;
}

export function getWorkbookQueryCredentialSummary(query: WorkbookQueryDefinition) {
  const credential = query.source.credential;

  if (credential.status === "notRequired") {
    return "No credentials needed";
  }

  if (credential.status === "environment") {
    return "Environment-managed credential";
  }

  if (credential.status === "invalid") {
    return "Credential metadata needs review";
  }

  return query.refreshMode === "url"
    ? "Manual credentials not stored"
    : "Manual refresh required";
}

function createUrlQuerySource(url: string): {
  refreshMode: WorkbookQueryDefinition["refreshMode"];
  source: WorkbookQuerySource;
} {
  try {
    const parsedUrl = new URL(url);
    const hasSensitiveMetadata = hasSensitiveUrlMetadata(parsedUrl);

    return {
      refreshMode: hasSensitiveMetadata ? "manual" : "url",
      source: {
        type: "url",
        displayUrl: hasSensitiveMetadata ? redactUrl(parsedUrl) : parsedUrl.toString(),
        refreshUrl: hasSensitiveMetadata ? undefined : parsedUrl.toString(),
        credential: createCredentialMetadata(
          hasSensitiveMetadata ? "manual" : "none",
          hasSensitiveMetadata
            ? "URL contained credential-like parameters; refresh URL was not stored."
            : "No stored credentials.",
          hasSensitiveMetadata ? "required" : "notRequired",
        ),
      },
    };
  } catch {
    return {
      refreshMode: "manual",
      source: {
        type: "url",
        displayUrl: url.trim().slice(0, 500),
        credential: createCredentialMetadata(
          "manual",
          "Invalid URL metadata retained for manual refresh only.",
          "invalid",
        ),
      },
    };
  }
}

function createDatabaseQuerySource(name: string): WorkbookQuerySource {
  return {
    type: "database",
    connectionName: cleanQueryName(name, "Database result"),
    credential: createCredentialMetadata(
      "manual",
      "Pasted query result; no credentials or query text are stored.",
      "required",
    ),
  };
}

export function getImportedSheetShape(sheet: SheetData) {
  const positions = Object.keys(sheet.cells).flatMap((key) => {
    const position = parseCellKey(key);

    return position ? [position] : [];
  });

  if (positions.length === 0) {
    return { columnCount: 0, rowCount: 0 };
  }

  return {
    columnCount:
      Math.max(...positions.map((position) => position.columnIndex)) + 1,
    rowCount: Math.max(...positions.map((position) => position.rowIndex)) + 1,
  };
}

export function createWorkbookQueryDefinition({
  format,
  name,
  sheet,
  sourceType,
  transformSteps,
  url,
}: {
  format: WorkbookQueryFormat;
  name: string;
  sheet: SheetData;
  sourceType: "url" | "database";
  transformSteps: ImportConnectorTransformStep[];
  url?: string;
}): WorkbookQueryDefinition {
  const createdAt = nowIso();
  const source =
    sourceType === "url"
      ? createUrlQuerySource(url ?? "")
      : {
          refreshMode: "manual" as const,
          source: createDatabaseQuerySource(name),
        };
  const shape = getImportedSheetShape(sheet);

  return {
    id: `query_${crypto.randomUUID()}`,
    name: cleanQueryName(name, sourceType === "url" ? "URL query" : "Database query"),
    sheetId: sheet.id,
    sourceName: cleanQueryName(sheet.name, "Imported data"),
    source: source.source,
    format,
    transformSteps,
    refreshMode: source.refreshMode,
    lastRefreshAt: createdAt,
    lastRefreshStatus: "success",
    lastRefreshMessage: `Imported ${shape.rowCount} rows and ${shape.columnCount} columns.`,
    refreshHistory: [
      {
        id: `refresh_${crypto.randomUUID()}`,
        attempt: 1,
        refreshedAt: createdAt,
        status: "success",
        message: "Initial import completed.",
        retryable: false,
        rowCount: shape.rowCount,
        columnCount: shape.columnCount,
        durationMs: 0,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}

export function createQueryRefreshHistoryEntry({
  attempt = 1,
  diagnostics,
  durationMs,
  message,
  sheet,
  status,
}: {
  attempt?: number;
  diagnostics?: QueryRefreshDiagnostics;
  durationMs: number;
  message: string;
  sheet?: SheetData;
  status: WorkbookQueryRefreshHistoryEntry["status"];
}) {
  const shape = sheet ? getImportedSheetShape(sheet) : { columnCount: 0, rowCount: 0 };

  return {
    id: `refresh_${crypto.randomUUID()}`,
    attempt: Math.max(1, Math.floor(attempt)),
    diagnosticCode: diagnostics?.code,
    nextRetryAt:
      diagnostics?.retryable && diagnostics.retryAfterMs
        ? createNextRetryAt(diagnostics.retryAfterMs)
        : undefined,
    refreshedAt: nowIso(),
    status,
    message: message.slice(0, 240),
    retryable: diagnostics?.retryable ?? false,
    rowCount: shape.rowCount,
    columnCount: shape.columnCount,
    durationMs: Math.max(0, Math.round(durationMs)),
  } satisfies WorkbookQueryRefreshHistoryEntry;
}

export function appendQueryRefreshHistory(
  query: WorkbookQueryDefinition,
  entry: WorkbookQueryRefreshHistoryEntry,
) {
  query.lastRefreshAt = entry.refreshedAt;
  query.lastRefreshStatus = entry.status;
  query.lastRefreshMessage = entry.message;
  query.lastRefreshDiagnosticCode = entry.diagnosticCode;
  query.nextRetryAt = entry.status === "error" ? entry.nextRetryAt : undefined;
  query.updatedAt = entry.refreshedAt;
  query.refreshHistory = [entry, ...(query.refreshHistory ?? [])].slice(
    0,
    maxRefreshHistory,
  );
}
