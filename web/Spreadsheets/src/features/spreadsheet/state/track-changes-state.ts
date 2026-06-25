import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import type {
  CellRecord,
  WorkbookDocument,
  WorkbookTrackedChange,
} from "@/features/workbooks/types";

const TRACKED_CHANGE_LIMIT = 300;
const MAX_CHANGES_PER_COMMIT = 100;

export type WorkbookChangeActor = {
  name: string;
  email: string;
};

export type WorkbookTrackedChangeDecision = "accepted" | "rejected";

function normalizeActor(actor: WorkbookChangeActor): WorkbookChangeActor {
  return {
    name: actor.name.trim().slice(0, 80) || "Workbook collaborator",
    email: actor.email.trim().toLowerCase().slice(0, 160),
  };
}

function cellSnapshot(cell?: CellRecord) {
  return cell ? structuredClone(cell) : undefined;
}

function cellFingerprint(cell?: CellRecord) {
  return JSON.stringify(cell ?? null);
}

function cellSummary(beforeCell?: CellRecord, afterCell?: CellRecord) {
  if (!beforeCell && afterCell) {
    return `Added ${afterCell.raw || "formatted cell"}`;
  }

  if (beforeCell && !afterCell) {
    return `Cleared ${beforeCell.raw || "formatted cell"}`;
  }

  if (beforeCell?.raw !== afterCell?.raw) {
    return `${beforeCell?.raw || "blank"} -> ${afterCell?.raw || "blank"}`;
  }

  return "Changed formatting";
}

function collectCellKeys(before: WorkbookDocument, after: WorkbookDocument) {
  const keys = new Set<string>();
  const beforeSheets = new Map(before.sheets.map((sheet) => [sheet.id, sheet]));

  for (const sheet of after.sheets) {
    const beforeSheet = beforeSheets.get(sheet.id);

    Object.keys(beforeSheet?.cells ?? {}).forEach((key) => {
      keys.add(`${sheet.id}:${key}`);
    });
    Object.keys(sheet.cells ?? {}).forEach((key) => {
      keys.add(`${sheet.id}:${key}`);
    });
  }

  return Array.from(keys);
}

export function recordTrackedChangesForDocuments({
  actor,
  after,
  before,
}: {
  actor: WorkbookChangeActor;
  after: WorkbookDocument;
  before: WorkbookDocument;
}) {
  const normalizedActor = normalizeActor(actor);

  if (!normalizedActor.email) {
    return;
  }

  const beforeSheets = new Map(before.sheets.map((sheet) => [sheet.id, sheet]));
  const afterSheets = new Map(after.sheets.map((sheet) => [sheet.id, sheet]));
  const createdAt = new Date().toISOString();
  const changes: WorkbookTrackedChange[] = [];

  for (const scopedKey of collectCellKeys(before, after)) {
    const [sheetId, key] = scopedKey.split(":");
    const position = parseCellKey(key);
    const beforeSheet = beforeSheets.get(sheetId);
    const afterSheet = afterSheets.get(sheetId);
    const afterCell = afterSheet?.cells[key];
    const beforeCell = beforeSheet?.cells[key];

    if (
      !position ||
      !afterSheet ||
      cellFingerprint(beforeCell) === cellFingerprint(afterCell)
    ) {
      continue;
    }

    changes.push({
      id: `tracked_change_${crypto.randomUUID()}`,
      sheetId,
      sheetName: afterSheet.name,
      cellKey: cellKey(position.rowIndex, position.columnIndex),
      summary: cellSummary(beforeCell, afterCell).slice(0, 240),
      beforeCell: cellSnapshot(beforeCell),
      afterCell: cellSnapshot(afterCell),
      actorName: normalizedActor.name,
      actorEmail: normalizedActor.email,
      createdAt,
      status: "pending",
    });

    if (changes.length >= MAX_CHANGES_PER_COMMIT) {
      break;
    }
  }

  if (!changes.length) {
    return;
  }

  after.trackedChanges = [
    ...changes,
    ...(after.trackedChanges ?? []),
  ].slice(0, TRACKED_CHANGE_LIMIT);
}

export function reviewTrackedChangeInDocument({
  actor,
  decision,
  document,
  trackedChangeId,
}: {
  actor: WorkbookChangeActor;
  decision: WorkbookTrackedChangeDecision;
  document: WorkbookDocument;
  trackedChangeId: string;
}) {
  const change = (document.trackedChanges ?? []).find(
    (item) => item.id === trackedChangeId,
  );

  if (!change || change.status !== "pending") {
    return false;
  }

  if (decision === "rejected") {
    const sheet = document.sheets.find((item) => item.id === change.sheetId);

    if (sheet) {
      if (change.beforeCell) {
        sheet.cells[change.cellKey] = structuredClone(change.beforeCell);
      } else {
        delete sheet.cells[change.cellKey];
      }
    }
  }

  const normalizedActor = normalizeActor(actor);

  change.status = decision;
  change.reviewedAt = new Date().toISOString();
  change.reviewedByName = normalizedActor.name;
  change.reviewedByEmail = normalizedActor.email;

  return true;
}
