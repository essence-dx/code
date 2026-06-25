import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type { WorkbookDocument } from "@/features/workbooks/types";

const BACKUP_KIND = "essence-excel-backup";
const BACKUP_VERSION = 1;

type WorkbookBackupEnvelope = {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  workbookName: string;
  document: WorkbookDocument;
};

function safeBackupName(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "workbook"
  );
}

export function createWorkbookBackupFileName(workbookName: string) {
  const date = new Date().toISOString().slice(0, 10);

  return `${safeBackupName(workbookName)}-${date}.essence-backup.json`;
}

export function workbookDocumentToBackupJson({
  workbookName,
  document,
}: {
  workbookName: string;
  document: WorkbookDocument;
}) {
  const envelope: WorkbookBackupEnvelope = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    workbookName: workbookName.trim() || "Untitled workbook",
    document: normalizeWorkbookDocument(document),
  };

  return JSON.stringify(envelope, null, 2);
}

export function parseWorkbookBackup(value: string) {
  const parsed = JSON.parse(value) as Partial<WorkbookBackupEnvelope>;

  if (
    parsed.kind !== BACKUP_KIND ||
    parsed.version !== BACKUP_VERSION ||
    !parsed.document
  ) {
    throw new Error("Invalid Essence Excel backup.");
  }

  return {
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
    workbookName:
      typeof parsed.workbookName === "string" ? parsed.workbookName : "",
    document: normalizeWorkbookDocument(parsed.document),
  };
}
