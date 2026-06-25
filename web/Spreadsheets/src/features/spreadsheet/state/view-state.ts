import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  SheetSplitPaneMode,
  SheetViewMode,
  WorkbookCustomView,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type CustomViewSnapshotInput = {
  name: string;
  viewMode: SheetViewMode;
  zoomPercent: number;
  frozenColumnCount: number;
  frozenRowCount: number;
  splitPaneMode: SheetSplitPaneMode;
  rightToLeft: boolean;
  showPageBreaks: boolean;
  selectedRange: CellRange;
};

export type CustomViewApplyResult = Pick<
  WorkbookCustomView,
  | "viewMode"
  | "zoomPercent"
  | "frozenColumnCount"
  | "frozenRowCount"
  | "splitPaneMode"
  | "rightToLeft"
  | "showPageBreaks"
  | "selectedRange"
> | null;

function id() {
  return `view_${crypto.randomUUID()}`;
}

function normalizeName(name: string, fallback: string) {
  const normalized = name.trim().slice(0, 80);

  return normalized || fallback;
}

function clampCount(value: number, maxValue: number) {
  return Math.min(Math.max(Math.round(value), 0), Math.max(0, maxValue));
}

export function saveCustomViewToDocument(
  document: WorkbookDocument,
  input: CustomViewSnapshotInput,
) {
  document.customViews ??= [];

  const sheet = document.sheets.find(
    (item) => item.id === document.activeSheetId,
  );

  if (!sheet) {
    return null;
  }

  const now = new Date().toISOString();
  const name = normalizeName(
    input.name,
    `View ${document.customViews.length + 1}`,
  );
  const existingIndex = document.customViews.findIndex(
    (view) =>
      view.sheetId === document.activeSheetId &&
      view.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  const existing = existingIndex >= 0 ? document.customViews[existingIndex] : null;
  const nextView: WorkbookCustomView = {
    id: existing?.id ?? id(),
    sheetId: document.activeSheetId,
    name,
    viewMode: input.viewMode,
    zoomPercent: Math.min(Math.max(Math.round(input.zoomPercent), 75), 150),
    frozenColumnCount: clampCount(input.frozenColumnCount, sheet.columnCount - 1),
    frozenRowCount: clampCount(input.frozenRowCount, sheet.rowCount - 1),
    splitPaneMode: input.splitPaneMode,
    rightToLeft: input.rightToLeft,
    showPageBreaks: input.showPageBreaks,
    selectedRange: input.selectedRange,
    hiddenRows: [...(sheet.hiddenRows ?? [])],
    hiddenColumns: [...(sheet.hiddenColumns ?? [])],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    document.customViews[existingIndex] = nextView;
  } else {
    document.customViews.push(nextView);
  }

  return nextView;
}

export function deleteCustomViewFromDocument(
  document: WorkbookDocument,
  viewId: string,
) {
  document.customViews = (document.customViews ?? []).filter(
    (view) => view.id !== viewId,
  );
}

export function applyCustomViewToDocument(
  document: WorkbookDocument,
  viewId: string,
): CustomViewApplyResult {
  const view = (document.customViews ?? []).find((item) => item.id === viewId);

  if (!view) {
    return null;
  }

  const sheet = document.sheets.find((item) => item.id === view.sheetId);

  if (!sheet) {
    return null;
  }

  document.activeSheetId = view.sheetId;
  sheet.hiddenRows = [...view.hiddenRows];
  sheet.hiddenColumns = [...view.hiddenColumns];

  return {
    viewMode: view.viewMode,
    zoomPercent: view.zoomPercent,
    frozenColumnCount: view.frozenColumnCount,
    frozenRowCount: view.frozenRowCount,
    splitPaneMode: view.splitPaneMode,
    rightToLeft: view.rightToLeft,
    showPageBreaks: view.showPageBreaks,
    selectedRange: view.selectedRange,
  };
}
