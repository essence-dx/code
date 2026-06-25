import type { WorkbookDocument } from "@/features/workbooks/types";
import { HISTORY_LIMIT } from "@/features/spreadsheet/state/constants";

export function pushUndoHistory(
  history: WorkbookDocument[],
  document: WorkbookDocument,
) {
  return [...history.slice(-(HISTORY_LIMIT - 1)), document];
}

export function pushRedoFuture(
  future: WorkbookDocument[],
  document: WorkbookDocument,
) {
  return [document, ...future].slice(0, HISTORY_LIMIT);
}

export function getUndoHistoryState(history: WorkbookDocument[]) {
  const previous = history.at(-1);

  if (!previous) {
    return null;
  }

  return {
    previous,
    history: history.slice(0, -1),
  };
}

export function getRedoFutureState(future: WorkbookDocument[]) {
  const next = future[0];

  if (!next) {
    return null;
  }

  return {
    next,
    future: future.slice(1),
  };
}
