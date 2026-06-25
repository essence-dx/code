import type { BoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import type {
  BoardAuditEvidenceVerificationReport,
  BoardAuditEvidenceVerificationRow,
  BoardAuditEvidenceVerificationStatus,
} from "@/features/projects/board-audit-evidence-verification";

export type BoardAuditEvidenceAcceptanceStatus = "accepted" | "blocked" | "pending" | "rejected";

export interface BoardAuditEvidenceAcceptanceState {
  acknowledgedAt: string | null;
  note: string | null;
  ownerEmail: string | null;
  ownerName: string;
  ownerUserId: string | null;
  rejectionReason: string | null;
  status: Exclude<BoardAuditEvidenceAcceptanceStatus, "blocked" | "pending">;
  taskId: string;
}

export interface BoardAuditEvidenceAcceptanceRow {
  acknowledgedAt: string | null;
  nextAction: string;
  note: string | null;
  ownerEmail: string | null;
  ownerName: string;
  rejectionReason: string | null;
  status: BoardAuditEvidenceAcceptanceStatus;
  taskId: string;
  title: string;
  verificationScore: number;
  verificationStatus: BoardAuditEvidenceVerificationStatus;
}

export interface BoardAuditEvidenceAcceptanceAuditTrailEntry {
  acknowledgedAt: string | null;
  ownerName: string;
  status: BoardAuditEvidenceAcceptanceStatus;
  summary: string;
  taskId: string;
}

export interface BoardAuditEvidenceAcceptanceWorkflow {
  auditTrail: BoardAuditEvidenceAcceptanceAuditTrailEntry[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardAuditEvidenceAcceptanceRow[];
  summary: {
    acceptedCount: number;
    acceptanceScore: number;
    auditTrailCount: number;
    blockedCount: number;
    pendingCount: number;
    rejectedCount: number;
    status: "blocked" | "ready" | "watch";
    taskCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAuditEvidenceAcceptanceWorkflowInput {
  acceptances?: BoardAuditEvidenceAcceptanceState[];
  generatedAt?: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  verification: BoardAuditEvidenceVerificationReport;
  workspaceId?: string;
}

const statusRank: Record<BoardAuditEvidenceAcceptanceStatus, number> = {
  blocked: 0,
  rejected: 1,
  pending: 2,
  accepted: 3,
};

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

function defaultOwner(input: {
  manifest: BoardAuditEvidenceAttachmentManifest;
  verificationRow: BoardAuditEvidenceVerificationRow;
}) {
  const manifestRow = input.manifest.rows.find((row) => row.taskId === input.verificationRow.taskId);

  return {
    ownerEmail: null,
    ownerName: manifestRow?.ownerName ?? "Unassigned reviewer",
    ownerUserId: null,
  };
}

function rowStatus(input: {
  acceptance: BoardAuditEvidenceAcceptanceState | null;
  verificationRow: BoardAuditEvidenceVerificationRow;
}): BoardAuditEvidenceAcceptanceStatus {
  if (input.acceptance?.status === "rejected") {
    return "rejected";
  }

  if (input.verificationRow.status === "blocked") {
    return "blocked";
  }

  if (input.acceptance?.status === "accepted") {
    return "accepted";
  }

  return "pending";
}

function rowNextAction(input: {
  acceptance: BoardAuditEvidenceAcceptanceState | null;
  rowStatus: BoardAuditEvidenceAcceptanceStatus;
  verificationRow: BoardAuditEvidenceVerificationRow;
}) {
  if (input.acceptance?.status === "rejected") {
    return input.acceptance.rejectionReason ?? "Resolve reviewer rejection before evidence readiness.";
  }

  if (input.verificationRow.status === "blocked") {
    return input.verificationRow.nextAction;
  }

  if (input.rowStatus === "accepted") {
    return "Keep reviewer acknowledgement with the board audit evidence packet.";
  }

  return `Collect reviewer acknowledgement for ${input.verificationRow.title}.`;
}

function createRows(input: CreateBoardAuditEvidenceAcceptanceWorkflowInput): BoardAuditEvidenceAcceptanceRow[] {
  const acceptanceByTaskId = new Map((input.acceptances ?? []).map((acceptance) => [acceptance.taskId, acceptance]));

  return input.verification.rows
    .map((verificationRow) => {
      const acceptance = acceptanceByTaskId.get(verificationRow.taskId) ?? null;
      const owner = acceptance ?? defaultOwner({ manifest: input.manifest, verificationRow });
      const status = rowStatus({ acceptance, verificationRow });

      return {
        acknowledgedAt: acceptance?.acknowledgedAt ?? null,
        nextAction: rowNextAction({
          acceptance,
          rowStatus: status,
          verificationRow,
        }),
        note: acceptance?.note ?? null,
        ownerEmail: owner.ownerEmail,
        ownerName: owner.ownerName,
        rejectionReason: acceptance?.rejectionReason ?? null,
        status,
        taskId: verificationRow.taskId,
        title: verificationRow.title,
        verificationScore: verificationRow.score,
        verificationStatus: verificationRow.status,
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.title.localeCompare(second.title));
}

function createAuditTrail(rows: BoardAuditEvidenceAcceptanceRow[]): BoardAuditEvidenceAcceptanceAuditTrailEntry[] {
  return rows
    .filter((row) => row.status === "accepted" || row.status === "rejected")
    .map((row) => ({
      acknowledgedAt: row.acknowledgedAt,
      ownerName: row.ownerName,
      status: row.status,
      summary:
        row.status === "accepted"
          ? `${row.ownerName} accepted evidence for ${row.title}.`
          : `${row.ownerName} rejected evidence for ${row.title}: ${row.rejectionReason ?? "No rejection reason provided."}`,
      taskId: row.taskId,
    }))
    .sort((first, second) => (first.acknowledgedAt ?? "").localeCompare(second.acknowledgedAt ?? "") || first.taskId.localeCompare(second.taskId));
}

function summarize(rows: BoardAuditEvidenceAcceptanceRow[], auditTrail: BoardAuditEvidenceAcceptanceAuditTrailEntry[]): BoardAuditEvidenceAcceptanceWorkflow["summary"] {
  const acceptedCount = rows.filter((row) => row.status === "accepted").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const rejectedCount = rows.filter((row) => row.status === "rejected").length;
  const firstRejected = rows.find((row) => row.status === "rejected") ?? null;
  const firstBlocked = rows.find((row) => row.status === "blocked") ?? null;
  const firstPending = rows.find((row) => row.status === "pending") ?? null;

  return {
    acceptedCount,
    acceptanceScore: rows.length > 0 ? Math.round((acceptedCount / rows.length) * 100) : 100,
    auditTrailCount: auditTrail.length,
    blockedCount,
    nextAction: firstRejected?.nextAction ?? firstBlocked?.nextAction ?? firstPending?.nextAction ?? "Board audit evidence acceptance is ready for readiness digest.",
    pendingCount,
    rejectedCount,
    status: rejectedCount > 0 || blockedCount > 0 ? "blocked" : pendingCount > 0 ? "watch" : "ready",
    taskCount: rows.length,
  };
}

function createCsv(rows: BoardAuditEvidenceAcceptanceRow[]) {
  const header = ["task_id", "status", "owner", "verification_status", "rejection_reason", "acknowledged_at", "next_action"];
  const body = rows.map((row) =>
    [row.taskId, row.status, row.ownerName, row.verificationStatus, row.rejectionReason, row.acknowledgedAt, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  auditTrail: BoardAuditEvidenceAcceptanceAuditTrailEntry[];
  generatedAt: string;
  rows: BoardAuditEvidenceAcceptanceRow[];
  summary: BoardAuditEvidenceAcceptanceWorkflow["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      auditTrail: input.auditTrail,
      generatedAt: input.generatedAt,
      rows: input.rows,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardAuditEvidenceAcceptanceWorkflow(
  input: CreateBoardAuditEvidenceAcceptanceWorkflowInput,
): BoardAuditEvidenceAcceptanceWorkflow {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.verification.workspaceId;
  const rows = createRows(input);
  const auditTrail = createAuditTrail(rows);
  const summary = summarize(rows, auditTrail);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    auditTrail,
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-audit-evidence-acceptance-${dateStamp(generatedAt)}`;

  return {
    auditTrail,
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
