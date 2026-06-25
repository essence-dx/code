import assert from "node:assert/strict";
import { cellKey } from "../src/features/workbooks/addresses";
import { createBlankSheet } from "../src/features/workbooks/default-workbook";
import {
  appendQueryRefreshHistory,
  createQueryRefreshDiagnostics,
  createQueryRefreshHistoryEntry,
  createWorkbookQueryDefinition,
  getNextQueryRefreshAttempt,
  getWorkbookQueryCredentialSummary,
} from "../src/features/workbooks/query-definitions";
import { normalizeWorkbookDocument } from "../src/features/workbooks/serialization";

const sheet = createBlankSheet("Imported sales");

sheet.cells[cellKey(0, 0)] = { raw: "Region" };
sheet.cells[cellKey(0, 1)] = { raw: "Amount" };
sheet.cells[cellKey(1, 0)] = { raw: "North" };
sheet.cells[cellKey(1, 1)] = { raw: "10" };

const safeUrlQuery = createWorkbookQueryDefinition({
  format: "auto",
  name: "Sales feed",
  sheet,
  sourceType: "url",
  transformSteps: [],
  url: "https://example.com/sales.csv",
});

assert.equal(safeUrlQuery.refreshMode, "url");
assert.equal(safeUrlQuery.source.type, "url");

if (safeUrlQuery.source.type === "url") {
  assert.equal(safeUrlQuery.source.refreshUrl, "https://example.com/sales.csv");
  assert.equal(safeUrlQuery.source.credential.hasStoredSecret, false);
  assert.equal(safeUrlQuery.source.credential.status, "notRequired");
}

const tokenUrlQuery = createWorkbookQueryDefinition({
  format: "csv",
  name: "Private feed",
  sheet,
  sourceType: "url",
  transformSteps: [],
  url: "https://example.com/sales.csv?access_token=secret-value",
});

assert.equal(tokenUrlQuery.refreshMode, "manual");

if (tokenUrlQuery.source.type === "url") {
  assert.equal(tokenUrlQuery.source.refreshUrl, undefined);
  assert.match(tokenUrlQuery.source.displayUrl, /access_token=redacted/);
  assert.equal(tokenUrlQuery.source.credential.hasStoredSecret, false);
  assert.equal(tokenUrlQuery.source.credential.status, "required");
}

const refreshEntry = createQueryRefreshHistoryEntry({
  durationMs: 124.4,
  message: "Refresh completed.",
  sheet,
  status: "success",
});

assert.equal(refreshEntry.rowCount, 2);
assert.equal(refreshEntry.columnCount, 2);
assert.equal(refreshEntry.durationMs, 124);
assert.equal(refreshEntry.attempt, 1);
assert.equal(refreshEntry.retryable, false);

const networkDiagnostics = createQueryRefreshDiagnostics(
  "Connector fetch failed or returned a non-success status.",
);
const failedRefreshEntry = createQueryRefreshHistoryEntry({
  attempt: getNextQueryRefreshAttempt(safeUrlQuery),
  diagnostics: networkDiagnostics,
  durationMs: 955.1,
  message: networkDiagnostics.message,
  status: "error",
});

assert.equal(failedRefreshEntry.diagnosticCode, "network");
assert.equal(failedRefreshEntry.retryable, true);
assert.ok(failedRefreshEntry.nextRetryAt, "retryable errors include retry time");
appendQueryRefreshHistory(safeUrlQuery, failedRefreshEntry);
assert.equal(safeUrlQuery.lastRefreshDiagnosticCode, "network");
assert.equal(safeUrlQuery.nextRetryAt, failedRefreshEntry.nextRetryAt);
assert.equal(getNextQueryRefreshAttempt(safeUrlQuery), 2);
assert.equal(
  getWorkbookQueryCredentialSummary(tokenUrlQuery),
  "Manual refresh required",
);

const normalized = normalizeWorkbookDocument({
  activeSheetId: sheet.id,
  sheets: [sheet],
  queries: [
    safeUrlQuery,
    {
      ...tokenUrlQuery,
      source:
        tokenUrlQuery.source.type === "url"
          ? {
              ...tokenUrlQuery.source,
              refreshUrl: "https://example.com/sales.csv?access_token=secret-value",
            }
          : tokenUrlQuery.source,
    },
  ],
});

assert.equal(normalized.queries.length, 2);
assert.equal(normalized.queries[0]?.source.credential.hasStoredSecret, false);
assert.equal(normalized.queries[0]?.refreshHistory[0]?.diagnosticCode, "network");
assert.equal(normalized.queries[0]?.refreshHistory[0]?.retryable, true);

const normalizedTokenQuery = normalized.queries[1];

assert.equal(normalizedTokenQuery?.refreshMode, "manual");

if (normalizedTokenQuery?.source.type === "url") {
  assert.equal(normalizedTokenQuery.source.refreshUrl, undefined);
}

console.log("Query definition checks passed.");
