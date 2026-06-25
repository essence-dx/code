import assert from "node:assert/strict";
import {
  activateWorkbookWindow,
  closeWorkbookWindow,
  createInitialWorkbookWindowState,
  createWorkbookWindowViewModels,
  MAX_WORKBOOK_WINDOW_VIEWS,
  openWorkbookWindow,
  setWorkbookWindowSheet,
} from "@/features/spreadsheet/workbook-window-views";

const sheets = [
  { id: "sheet-a", name: "Revenue" },
  { id: "sheet-b", name: "Forecast" },
  { id: "sheet-c", name: "Actuals" },
  { id: "sheet-d", name: "Audit" },
  { id: "sheet-e", name: "Archive" },
];

let windowState = createInitialWorkbookWindowState(sheets, "sheet-a");

assert.equal(windowState.views.length, 1, "initial state starts with one view");
assert.equal(
  windowState.views[0]?.sheetId,
  "sheet-a",
  "initial view follows the active sheet",
);

windowState = openWorkbookWindow({
  ...windowState,
  sheetId: "sheet-b",
  sheets,
});

assert.equal(windowState.views.length, 2, "opening a second sheet adds a view");
assert.equal(
  windowState.activeWindowId,
  windowState.views[1]?.id,
  "newly opened sheet becomes active",
);

windowState = openWorkbookWindow({
  ...windowState,
  sheetId: "sheet-b",
  sheets,
});

assert.equal(
  windowState.views.length,
  2,
  "opening an already visible sheet activates it instead of duplicating it",
);

windowState = setWorkbookWindowSheet({
  ...windowState,
  sheetId: "sheet-a",
  sheets,
  windowId: windowState.activeWindowId,
});

assert.equal(
  windowState.activeWindowId,
  windowState.views[0]?.id,
  "switching a window to an already open sheet activates that existing window",
);

for (const sheet of sheets.slice(2)) {
  windowState = openWorkbookWindow({
    ...windowState,
    sheetId: sheet.id,
    sheets,
  });
}

assert.equal(
  windowState.views.length,
  MAX_WORKBOOK_WINDOW_VIEWS,
  "window state is capped at the Excel-style four-pane limit",
);
assert.deepEqual(
  windowState.views.map((view) => view.sheetId),
  ["sheet-a", "sheet-b", "sheet-c", "sheet-d"],
  "the oldest four valid sheet views are preserved when the cap is reached",
);

const activeBeforeClose = windowState.activeWindowId;

windowState = closeWorkbookWindow({
  ...windowState,
  sheets,
  windowId: activeBeforeClose,
});

assert.equal(windowState.views.length, 3, "closing a window removes the view");
assert.notEqual(
  windowState.activeWindowId,
  activeBeforeClose,
  "closing the active window moves focus to a remaining view",
);

windowState = activateWorkbookWindow({
  ...windowState,
  sheets,
  windowId: windowState.views[1]?.id ?? "",
});

const viewModels = createWorkbookWindowViewModels({
  ...windowState,
  sheets,
});

assert.equal(
  viewModels.filter((view) => view.isActive).length,
  1,
  "view models expose one active workbook window",
);
assert.equal(
  viewModels[1]?.sheetName,
  "Forecast",
  "view models include display sheet names for the toolbar",
);

console.log("Workbook window view checks passed.");
