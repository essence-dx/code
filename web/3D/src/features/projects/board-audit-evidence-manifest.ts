import { createHash } from "node:crypto";
import type { PersistedBoardAuditFollowUpTask, PersistedBoardAuditFollowUpTasksReport } from "@/features/projects/board-audit-follow-up-tasks";
import type { BoardAssuranceEvidenceBundleFileKind, BoardAssuranceEvidenceBundleStatus } from "@/features/projects/board-assurance-evidence-bundle";

export type BoardAuditEvidenceAttachmentKind = "closeout-note" | "exported-file" | "source-reference";
export type BoardAuditEvidenceManifestStatus = "blocked" | "ready" | "watch";

export interface BoardAuditEvidenceFileReference {
  byteSize: number;
  contentHash: string;
  kind: BoardAssuranceEvidenceBundleFileKind | string;
  label: string;
  path: string;
  status: BoardAssuranceEvidenceBundleStatus;
}

export interface BoardAuditEvidenceAttachment {
  byteSize: number;
  contentHash: string;
  kind: BoardAuditEvidenceAttachmentKind;
  label: string;
  path: string | null;
  sourceKind: string;
  status: BoardAuditEvidenceManifestStatus;
}

export interface BoardAuditEvidenceManifestRow {
  attachments: BoardAuditEvidenceAttachment[];
  closeoutNote: string | null;
  linkedFileCount: number;
  nextAction: string;
  ownerName: string;
  sourceHash: string;
  status: BoardAuditEvidenceManifestStatus;
  taskId: string;
  title: string;
}

export interface BoardAuditEvidenceAttachmentManifest {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardAuditEvidenceManifestRow[];
  summary: {
    attachmentCount: number;
    closeoutNoteCount: number;
    linkedFileCount: number;
    manifestScore: number;
    missingEvidenceCount: number;
    status: BoardAuditEvidenceManifestStatus;
    taskCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAuditEvidenceAttachmentManifestInput {
  evidenceFiles?: BoardAuditEvidenceFileReference[];
  generatedAt?: string;
  report: PersistedBoardAuditFollowUpTasksReport;
  workspaceId?: string;
}

const taskKindToEvidenceKinds: Record<PersistedBoardAuditFollowUpTask["kind"], string[]> = {
  control: ["bundle-manifest", "runbook-proof"],
  decision: ["replay-audit", "replay-snapshots"],
  evidence: ["bundle-manifest"],
  workload: ["bundle-manifest", "exception-workflow"],
};

const statusRank: Record<BoardAuditEvidenceManifestStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function attachmentStatus(fileStatus: BoardAssuranceEvidenceBundleStatus): BoardAuditEvidenceManifestStatus {
  return fileStatus;
}

function sourceAttachment(task: PersistedBoardAuditFollowUpTask): BoardAuditEvidenceAttachment {
  const payload = {
    sourceId: task.sourceId,
    sourceLabel: task.sourceLabel,
    taskId: task.id,
    title: task.title,
  };

  return {
    byteSize: byteSize(stableJson(payload)),
    contentHash: sha256(payload),
    kind: "source-reference",
    label: `${task.sourceLabel} source reference`,
    path: null,
    sourceKind: task.sourceLabel,
    status: "ready",
  };
}

function closeoutNoteAttachment(task: PersistedBoardAuditFollowUpTask): BoardAuditEvidenceAttachment | null {
  const note = task.closeout.closeoutNote?.trim();

  if (!note) {
    return null;
  }

  return {
    byteSize: byteSize(note),
    contentHash: sha256({
      closeoutNote: note,
      taskId: task.id,
      updatedAt: task.closeout.updatedAt,
    }),
    kind: "closeout-note",
    label: `${task.title} closeout note`,
    path: null,
    sourceKind: "closeout-note",
    status: task.closeout.status === "closed" ? "ready" : "watch",
  };
}

function fileMatchesTask(task: PersistedBoardAuditFollowUpTask, file: BoardAuditEvidenceFileReference) {
  const allowedKinds = taskKindToEvidenceKinds[task.kind];
  const haystack = `${file.kind} ${file.label} ${file.path}`.toLowerCase();
  const sourceLabel = task.sourceLabel.toLowerCase();

  return allowedKinds.includes(file.kind) || haystack.includes(sourceLabel) || haystack.includes(task.kind);
}

function fileAttachment(file: BoardAuditEvidenceFileReference): BoardAuditEvidenceAttachment {
  return {
    byteSize: file.byteSize,
    contentHash: file.contentHash,
    kind: "exported-file",
    label: file.label,
    path: file.path,
    sourceKind: file.kind,
    status: attachmentStatus(file.status),
  };
}

function rowStatus(input: {
  linkedFileCount: number;
  task: PersistedBoardAuditFollowUpTask;
}): BoardAuditEvidenceManifestStatus {
  if (input.linkedFileCount === 0 && input.task.closeout.status !== "closed") {
    return "blocked";
  }

  if (input.linkedFileCount === 0 || input.task.closeout.status !== "closed") {
    return "watch";
  }

  return "ready";
}

function nextAction(input: {
  linkedFileCount: number;
  status: BoardAuditEvidenceManifestStatus;
  task: PersistedBoardAuditFollowUpTask;
}) {
  if (input.linkedFileCount === 0) {
    return `Attach exported evidence file for ${input.task.title}.`;
  }

  if (input.task.closeout.status !== "closed") {
    return `Close ${input.task.title} after reviewing attached evidence.`;
  }

  return "Keep source hash, closeout note, and exported files with the board audit packet.";
}

function createRows(report: PersistedBoardAuditFollowUpTasksReport, evidenceFiles: BoardAuditEvidenceFileReference[]): BoardAuditEvidenceManifestRow[] {
  return report.tasks
    .map((task) => {
      const linkedFiles = evidenceFiles.filter((file) => fileMatchesTask(task, file));
      const attachments = [
        sourceAttachment(task),
        closeoutNoteAttachment(task),
        ...linkedFiles.map(fileAttachment),
      ].filter((attachment): attachment is BoardAuditEvidenceAttachment => Boolean(attachment));
      const linkedFileCount = linkedFiles.length;
      const status = rowStatus({ linkedFileCount, task });

      return {
        attachments,
        closeoutNote: task.closeout.closeoutNote,
        linkedFileCount,
        nextAction: nextAction({ linkedFileCount, status, task }),
        ownerName: task.closeout.ownerName,
        sourceHash: sha256({
          sourceId: task.sourceId,
          sourceLabel: task.sourceLabel,
          taskId: task.id,
        }),
        status,
        taskId: task.id,
        title: task.title,
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.title.localeCompare(second.title));
}

function summarize(rows: BoardAuditEvidenceManifestRow[]): BoardAuditEvidenceAttachmentManifest["summary"] {
  const attachmentCount = rows.reduce((sum, row) => sum + row.attachments.length, 0);
  const closeoutNoteCount = rows.filter((row) => row.closeoutNote).length;
  const linkedFileCount = rows.reduce((sum, row) => sum + row.linkedFileCount, 0);
  const missingEvidenceCount = rows.filter((row) => row.linkedFileCount === 0).length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const firstBlocked = rows.find((row) => row.status === "blocked") ?? null;
  const firstWatch = rows.find((row) => row.status === "watch") ?? null;

  return {
    attachmentCount,
    closeoutNoteCount,
    linkedFileCount,
    manifestScore: Math.max(0, Math.min(100, 100 - missingEvidenceCount * 18 - watchCount * 8 - blockedCount * 15)),
    missingEvidenceCount,
    nextAction: firstBlocked?.nextAction ?? firstWatch?.nextAction ?? "Board audit evidence manifest is ready for verification.",
    status: blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready",
    taskCount: rows.length,
  };
}

function createCsv(rows: BoardAuditEvidenceManifestRow[]) {
  const header = ["task_id", "status", "owner", "source_hash", "attachment_count", "linked_file_count", "next_action"];
  const body = rows.map((row) =>
    [row.taskId, row.status, row.ownerName, row.sourceHash, row.attachments.length, row.linkedFileCount, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardAuditEvidenceManifestRow[];
  summary: BoardAuditEvidenceAttachmentManifest["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      rows: input.rows,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardAuditEvidenceAttachmentManifest(
  input: CreateBoardAuditEvidenceAttachmentManifestInput,
): BoardAuditEvidenceAttachmentManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.report.workspaceId;
  const rows = createRows(input.report, input.evidenceFiles ?? []);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-audit-evidence-manifest-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
