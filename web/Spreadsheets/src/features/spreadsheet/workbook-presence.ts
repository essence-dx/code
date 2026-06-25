import { cellKey } from "@/features/workbooks/addresses";
import type {
  CellRange,
  CellSelection,
} from "@/features/spreadsheet/state/selection-state";

export type WorkbookPresenceUser = {
  email: string;
  name: string;
};

export type WorkbookPresenceSnapshot = {
  activeCellLabel: string;
  clientId: string;
  color: string;
  isDirty: boolean;
  lastSeenAt: number;
  rangeLabel: string;
  sheetId: string;
  sheetName: string;
  user: WorkbookPresenceUser;
};

export type WorkbookPresenceMessage =
  | {
      type: "presence";
      snapshot: WorkbookPresenceSnapshot;
    }
  | {
      type: "leave";
      clientId: string;
    };

export const workbookPresenceTtlMs = 15_000;

const presenceColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#c2410c",
  "#be185d",
  "#4f46e5",
];

export function createWorkbookPresenceChannelName(workbookId: string) {
  return `essence-excel:workbook-presence:${workbookId}`;
}

export function createWorkbookPresenceClientId() {
  return crypto.randomUUID();
}

export function getPresenceColor(value: string) {
  const hash = Array.from(value).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return presenceColors[Math.abs(hash) % presenceColors.length] ?? presenceColors[0];
}

export function getPresenceDisplayName(user: WorkbookPresenceUser) {
  return user.name.trim() || user.email.split("@")[0] || "Collaborator";
}

export function formatPresenceRange(
  selection: CellSelection,
  selectedRange: CellRange | null,
) {
  const activeCellLabel = cellKey(selection.rowIndex, selection.columnIndex);

  if (!selectedRange) {
    return {
      activeCellLabel,
      rangeLabel: activeCellLabel,
    };
  }

  const startCellLabel = cellKey(
    selectedRange.startRowIndex,
    selectedRange.startColumnIndex,
  );
  const endCellLabel = cellKey(
    selectedRange.endRowIndex,
    selectedRange.endColumnIndex,
  );

  return {
    activeCellLabel,
    rangeLabel:
      startCellLabel === endCellLabel ? startCellLabel : `${startCellLabel}:${endCellLabel}`,
  };
}

export function pruneStalePresence(
  snapshots: WorkbookPresenceSnapshot[],
  now = Date.now(),
) {
  return snapshots
    .filter((snapshot) => now - snapshot.lastSeenAt <= workbookPresenceTtlMs)
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt);
}
