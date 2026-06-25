import { strict as assert } from "node:assert";
import {
  createWorkbookPresenceChannelName,
  formatPresenceRange,
  getPresenceColor,
  getPresenceDisplayName,
  pruneStalePresence,
  workbookPresenceTtlMs,
  type WorkbookPresenceSnapshot,
} from "@/features/spreadsheet/workbook-presence";

assert.equal(
  createWorkbookPresenceChannelName("book_1"),
  "essence-excel:workbook-presence:book_1",
);

assert.equal(
  formatPresenceRange(
    { rowIndex: 0, columnIndex: 0 },
    {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 2,
      endColumnIndex: 1,
    },
  ).rangeLabel,
  "A1:B3",
);

assert.equal(
  formatPresenceRange({ rowIndex: 4, columnIndex: 3 }, null).activeCellLabel,
  "D5",
);

assert.equal(
  getPresenceDisplayName({ email: "editor@example.com", name: "" }),
  "editor",
);

assert.equal(getPresenceColor("a"), getPresenceColor("a"));

const now = Date.now();
const current: WorkbookPresenceSnapshot = {
  activeCellLabel: "A1",
  clientId: "current",
  color: "#2563eb",
  isDirty: false,
  lastSeenAt: now,
  rangeLabel: "A1",
  sheetId: "sheet_1",
  sheetName: "Sheet 1",
  user: {
    email: "current@example.com",
    name: "Current",
  },
};
const stale: WorkbookPresenceSnapshot = {
  ...current,
  clientId: "stale",
  lastSeenAt: now - workbookPresenceTtlMs - 1,
};

assert.deepEqual(
  pruneStalePresence([stale, current], now).map((presence) => presence.clientId),
  ["current"],
);

console.log("Workbook presence checks passed.");
