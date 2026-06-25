import {
  appendQueryRefreshHistory,
  createQueryRefreshHistoryEntry,
  createQueryRefreshDiagnostics,
  getNextQueryRefreshAttempt,
} from "@/features/workbooks/query-definitions";
import type {
  SheetData,
  WorkbookDocument,
  WorkbookQueryDefinition,
} from "@/features/workbooks/types";

export function addQuerySheetToDocument(
  document: WorkbookDocument,
  sheet: SheetData,
  query: WorkbookQueryDefinition,
) {
  document.sheets.push(sheet);
  document.activeSheetId = sheet.id;
  document.queries = [
    ...(document.queries ?? []).filter((item) => item.id !== query.id),
    query,
  ];
}

export function deleteWorkbookQueryFromDocument(
  document: WorkbookDocument,
  queryId: string,
) {
  document.queries = (document.queries ?? []).filter(
    (query) => query.id !== queryId,
  );
}

export function replaceWorkbookQuerySheetInDocument({
  document,
  durationMs,
  queryId,
  sheet,
}: {
  document: WorkbookDocument;
  durationMs: number;
  queryId: string;
  sheet: SheetData;
}) {
  const query = (document.queries ?? []).find((item) => item.id === queryId);

  if (!query) {
    return;
  }

  const sheetIndex = document.sheets.findIndex((item) => item.id === query.sheetId);

  if (sheetIndex < 0) {
    return;
  }

  const existingSheet = document.sheets[sheetIndex];
  const nextSheet = {
    ...sheet,
    id: existingSheet.id,
    name: existingSheet.name,
    tabColor: existingSheet.tabColor,
  };
  const entry = createQueryRefreshHistoryEntry({
    attempt: 1,
    durationMs,
    message: "Refresh completed.",
    sheet: nextSheet,
    status: "success",
  });

  document.sheets[sheetIndex] = nextSheet;
  appendQueryRefreshHistory(query, entry);
}

export function recordWorkbookQueryRefreshFailureInDocument({
  document,
  durationMs,
  message,
  queryId,
}: {
  document: WorkbookDocument;
  durationMs: number;
  message: string;
  queryId: string;
}) {
  const query = (document.queries ?? []).find((item) => item.id === queryId);

  if (!query) {
    return;
  }

  const diagnostics = createQueryRefreshDiagnostics(message);

  appendQueryRefreshHistory(
    query,
    createQueryRefreshHistoryEntry({
      attempt: getNextQueryRefreshAttempt(query),
      diagnostics,
      durationMs,
      message: diagnostics.message,
      status: "error",
    }),
  );
}
