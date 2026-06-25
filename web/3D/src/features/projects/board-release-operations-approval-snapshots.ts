import { createHash } from "node:crypto";
import type {
  BoardEvidenceReleasePromotionGateReport,
  BoardEvidenceReleasePromotionGateStatus,
} from "@/features/projects/board-evidence-release-promotion-gate";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import type { BoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";

export type BoardReleaseOperationsApprovalSnapshotStatus = "blocked" | "ready" | "watch";
export type BoardReleaseOperationsGateDrift = "improved" | "regressed" | "stable";
export type BoardReleaseOperationsApprovalRecommendation = "approve" | "hold" | "review";

export interface BoardReleaseOperationsApprovalSnapshot {
  approvalRecommendation: BoardReleaseOperationsApprovalRecommendation;
  currentGateScore: number;
  currentGateStatus: BoardEvidenceReleasePromotionGateStatus;
  gateDrift: BoardReleaseOperationsGateDrift;
  nextAction: string;
  priorGateScore: number;
  priorHistoryHash: string | null;
  priorStatus: string | null;
  releasePromotionId: string | null;
  scoreDelta: number;
  snapshotHash: string;
  snapshotId: string;
  status: BoardReleaseOperationsApprovalSnapshotStatus;
  workspaceId: string;
}

export interface BoardReleaseOperationsApprovalSnapshotReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  snapshots: BoardReleaseOperationsApprovalSnapshot[];
  summary: {
    approvalReadyCount: number;
    blockedCount: number;
    currentGateScore: number;
    improvedCount: number;
    nextAction: string;
    regressedCount: number;
    snapshotCount: number;
    status: BoardReleaseOperationsApprovalSnapshotStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseOperationsApprovalSnapshotReportInput {
  currentGate: BoardEvidenceReleasePromotionGateReport;
  generatedAt?: string;
  history: BoardReleaseOperationsHistoryReport;
  queue: BoardReleaseOperationsReviewQueueReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseOperationsApprovalSnapshotStatus, number> = {
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function snapshotStatus(input: {
  currentGate: BoardEvidenceReleasePromotionGateReport;
  queue: BoardReleaseOperationsReviewQueueReport;
}): BoardReleaseOperationsApprovalSnapshotStatus {
  if (!input.currentGate.summary.promotionAllowed || input.queue.summary.blockedCount > 0) {
    return "blocked";
  }

  return input.currentGate.summary.status === "watch" || input.queue.summary.inReviewCount > 0 ? "watch" : "ready";
}

function gateDrift(delta: number): BoardReleaseOperationsGateDrift {
  if (delta > 0) {
    return "improved";
  }

  return delta < 0 ? "regressed" : "stable";
}

function recommendation(status: BoardReleaseOperationsApprovalSnapshotStatus, drift: BoardReleaseOperationsGateDrift): BoardReleaseOperationsApprovalRecommendation {
  if (status === "ready") {
    return "approve";
  }

  return status === "blocked" ? "hold" : drift === "regressed" ? "hold" : "review";
}

function snapshotId(input: {
  generatedAt: string;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-release-operations-approval:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${dateStamp(input.generatedAt)}`;
}

function createSnapshot(input: CreateBoardReleaseOperationsApprovalSnapshotReportInput & { generatedAt: string; workspaceId: string }) {
  const prior = input.history.records.find((record) => record.releasePromotionId === input.currentGate.releasePromotionId) ?? input.history.records[0] ?? null;
  const priorGateScore = prior?.gateScore ?? input.currentGate.summary.gateScore;
  const scoreDelta = input.currentGate.summary.gateScore - priorGateScore;
  const drift = gateDrift(scoreDelta);
  const status = snapshotStatus({
    currentGate: input.currentGate,
    queue: input.queue,
  });
  const releasePromotionId = input.currentGate.releasePromotionId ?? prior?.releasePromotionId ?? null;
  const core = {
    currentGateScore: input.currentGate.summary.gateScore,
    currentGateStatus: input.currentGate.summary.status,
    priorGateScore,
    priorHistoryHash: prior?.historyHash ?? null,
    releasePromotionId,
    scoreDelta,
    status,
    workspaceId: input.workspaceId,
  };

  return {
    approvalRecommendation: recommendation(status, drift),
    currentGateScore: input.currentGate.summary.gateScore,
    currentGateStatus: input.currentGate.summary.status,
    gateDrift: drift,
    nextAction: input.currentGate.summary.nextAction,
    priorGateScore,
    priorHistoryHash: prior?.historyHash ?? null,
    priorStatus: prior?.status ?? null,
    releasePromotionId,
    scoreDelta,
    snapshotHash: sha256(core),
    snapshotId: snapshotId({
      generatedAt: input.generatedAt,
      releasePromotionId,
      workspaceId: input.workspaceId,
    }),
    status,
    workspaceId: input.workspaceId,
  } satisfies BoardReleaseOperationsApprovalSnapshot;
}

function summarize(snapshots: BoardReleaseOperationsApprovalSnapshot[]): BoardReleaseOperationsApprovalSnapshotReport["summary"] {
  const blockedCount = snapshots.filter((snapshot) => snapshot.status === "blocked").length;
  const watchCount = snapshots.filter((snapshot) => snapshot.status === "watch").length;
  const approvalReadyCount = snapshots.filter((snapshot) => snapshot.approvalRecommendation === "approve").length;
  const firstAttention = snapshots.find((snapshot) => snapshot.status === "blocked" || snapshot.status === "watch" || snapshot.gateDrift === "regressed") ?? null;

  return {
    approvalReadyCount,
    blockedCount,
    currentGateScore: snapshots[0]?.currentGateScore ?? 0,
    improvedCount: snapshots.filter((snapshot) => snapshot.gateDrift === "improved").length,
    nextAction: firstAttention?.nextAction ?? "Board release operations approval snapshot is ready for approval.",
    regressedCount: snapshots.filter((snapshot) => snapshot.gateDrift === "regressed").length,
    snapshotCount: snapshots.length,
    status: snapshots.reduce<BoardReleaseOperationsApprovalSnapshotStatus>(
      (worst, snapshot) => (statusRank[snapshot.status] < statusRank[worst] ? snapshot.status : worst),
      "ready",
    ),
    watchCount,
  };
}

function createCsv(snapshots: BoardReleaseOperationsApprovalSnapshot[]) {
  const header = [
    "snapshot_id",
    "release_promotion_id",
    "status",
    "gate_drift",
    "current_score",
    "prior_score",
    "score_delta",
    "recommendation",
    "snapshot_hash",
    "next_action",
  ];
  const body = snapshots.map((snapshot) =>
    [
      snapshot.snapshotId,
      snapshot.releasePromotionId,
      snapshot.status,
      snapshot.gateDrift,
      snapshot.currentGateScore,
      snapshot.priorGateScore,
      snapshot.scoreDelta,
      snapshot.approvalRecommendation,
      snapshot.snapshotHash,
      snapshot.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  snapshots: BoardReleaseOperationsApprovalSnapshot[];
  summary: BoardReleaseOperationsApprovalSnapshotReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      snapshots: input.snapshots,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseOperationsApprovalSnapshotReport(
  input: CreateBoardReleaseOperationsApprovalSnapshotReportInput,
): BoardReleaseOperationsApprovalSnapshotReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.currentGate.workspaceId;
  const snapshots = [
    createSnapshot({
      ...input,
      generatedAt,
      workspaceId,
    }),
  ];
  const summary = summarize(snapshots);
  const csvContent = createCsv(snapshots);
  const jsonContent = createJson({
    generatedAt,
    snapshots,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-operations-approval-snapshots-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    snapshots,
    summary,
    workspaceId,
  };
}
