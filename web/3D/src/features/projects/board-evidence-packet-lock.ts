import { createHash } from "node:crypto";
import type {
  BoardAuditEvidenceAcceptanceRow,
  BoardAuditEvidenceAcceptanceStatus,
  BoardAuditEvidenceAcceptanceWorkflow,
} from "@/features/projects/board-audit-evidence-acceptance";

export type BoardEvidencePacketLockState = "blocked" | "locked" | "open";
export type BoardEvidencePacketLockStatus = "blocked" | "locked" | "partial";

export interface BoardEvidencePacketLockActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardEvidencePacketLockRow {
  acceptanceStatus: BoardAuditEvidenceAcceptanceStatus;
  acknowledgedAt: string | null;
  lockHash: string | null;
  lockState: BoardEvidencePacketLockState;
  nextAction: string;
  ownerName: string;
  taskId: string;
  title: string;
  verificationStatus: string;
}

export interface BoardEvidencePacketLockReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  lockActor: BoardEvidencePacketLockActor;
  releasePromotionId: string | null;
  rows: BoardEvidencePacketLockRow[];
  summary: {
    blockedCount: number;
    lockScore: number;
    lockedCount: number;
    nextAction: string;
    openCount: number;
    promotionBlocked: boolean;
    status: BoardEvidencePacketLockStatus;
    taskCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardEvidencePacketLockReportInput {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt?: string;
  lockActor: BoardEvidencePacketLockActor;
  releasePromotionId?: string | null;
  workspaceId?: string;
}

const lockStateRank: Record<BoardEvidencePacketLockState, number> = {
  blocked: 0,
  open: 1,
  locked: 2,
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

function csvCell(value: string | number | boolean | null) {
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

function lockState(row: BoardAuditEvidenceAcceptanceRow): BoardEvidencePacketLockState {
  if (row.status === "accepted") {
    return "locked";
  }

  return row.status === "pending" ? "open" : "blocked";
}

function rowLockHash(input: {
  generatedAt: string;
  lockActor: BoardEvidencePacketLockActor;
  releasePromotionId: string | null;
  row: BoardAuditEvidenceAcceptanceRow;
  workspaceId: string;
}) {
  return sha256({
    acknowledgedAt: input.row.acknowledgedAt,
    acceptanceStatus: input.row.status,
    lockActor: input.lockActor,
    releasePromotionId: input.releasePromotionId,
    taskId: input.row.taskId,
    title: input.row.title,
    verificationScore: input.row.verificationScore,
    verificationStatus: input.row.verificationStatus,
    workspaceId: input.workspaceId,
  });
}

function createRows(input: {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt: string;
  lockActor: BoardEvidencePacketLockActor;
  releasePromotionId: string | null;
  workspaceId: string;
}): BoardEvidencePacketLockRow[] {
  return input.acceptance.rows
    .map((row) => {
      const state = lockState(row);

      return {
        acceptanceStatus: row.status,
        acknowledgedAt: row.acknowledgedAt,
        lockHash:
          state === "locked"
            ? rowLockHash({
                generatedAt: input.generatedAt,
                lockActor: input.lockActor,
                releasePromotionId: input.releasePromotionId,
                row,
                workspaceId: input.workspaceId,
              })
            : null,
        lockState: state,
        nextAction: state === "locked" ? "Accepted evidence row is frozen for release promotion." : row.nextAction,
        ownerName: row.ownerName,
        taskId: row.taskId,
        title: row.title,
        verificationStatus: row.verificationStatus,
      };
    })
    .sort((first, second) => lockStateRank[first.lockState] - lockStateRank[second.lockState] || first.title.localeCompare(second.title));
}

function summarize(rows: BoardEvidencePacketLockRow[]): BoardEvidencePacketLockReport["summary"] {
  const lockedCount = rows.filter((row) => row.lockState === "locked").length;
  const blockedCount = rows.filter((row) => row.lockState === "blocked").length;
  const openCount = rows.filter((row) => row.lockState === "open").length;
  const firstBlocked = rows.find((row) => row.lockState === "blocked") ?? null;
  const firstOpen = rows.find((row) => row.lockState === "open") ?? null;

  return {
    blockedCount: blockedCount + openCount,
    lockScore: rows.length > 0 ? Math.round((lockedCount / rows.length) * 100) : 100,
    lockedCount,
    nextAction: firstBlocked?.nextAction ?? firstOpen?.nextAction ?? "Board evidence packet is locked for release promotion.",
    openCount,
    promotionBlocked: blockedCount + openCount > 0,
    status: blockedCount > 0 ? "blocked" : openCount > 0 ? "partial" : "locked",
    taskCount: rows.length,
  };
}

function createCsv(rows: BoardEvidencePacketLockRow[]) {
  const header = ["task_id", "lock_state", "acceptance_status", "owner", "verification_status", "lock_hash", "next_action"];
  const body = rows.map((row) =>
    [row.taskId, row.lockState, row.acceptanceStatus, row.ownerName, row.verificationStatus, row.lockHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  lockActor: BoardEvidencePacketLockActor;
  releasePromotionId: string | null;
  rows: BoardEvidencePacketLockRow[];
  summary: BoardEvidencePacketLockReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      lockActor: input.lockActor,
      releasePromotionId: input.releasePromotionId,
      rows: input.rows,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidencePacketLockReport(input: CreateBoardEvidencePacketLockReportInput): BoardEvidencePacketLockReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.acceptance.workspaceId;
  const releasePromotionId = input.releasePromotionId ?? null;
  const rows = createRows({
    acceptance: input.acceptance,
    generatedAt,
    lockActor: input.lockActor,
    releasePromotionId,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    lockActor: input.lockActor,
    releasePromotionId,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-packet-lock-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    lockActor: input.lockActor,
    releasePromotionId,
    rows,
    summary,
    workspaceId,
  };
}
