import { createHash } from "node:crypto";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import type { BoardEvidenceReleasePromotionGateReport } from "@/features/projects/board-evidence-release-promotion-gate";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";

export type BoardReleaseOperationsHistoryStatus = "archived" | "blocked" | "ready" | "watch";

export interface BoardReleaseOperationsHistoryRecord {
  archiveHash: string | null;
  archivedAt: string | null;
  gateScore: number;
  historyHash: string;
  historyId: string;
  notificationEligibleRouteCount: number;
  notificationSuppressedCount: number;
  promotionAllowed: boolean;
  recordedAt: string;
  releasePromotionId: string | null;
  status: BoardReleaseOperationsHistoryStatus;
  varianceBlockerCount: number;
  varianceCount: number;
  workspaceId: string;
}

export interface BoardReleaseOperationsHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  records: BoardReleaseOperationsHistoryRecord[];
  summary: {
    archivedCount: number;
    blockedCount: number;
    historyCount: number;
    latestHistoryHash: string | null;
    latestReleasePromotionId: string | null;
    nextAction: string;
    readyCount: number;
    status: BoardReleaseOperationsHistoryStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseOperationsHistoryReportInput {
  archive: BoardEvidenceReleaseArchiveRecordReport;
  generatedAt?: string;
  notifications: BoardEvidenceReleaseCloseoutNotificationReport;
  promotionGate: BoardEvidenceReleasePromotionGateReport;
  variance: BoardEvidenceReleaseVarianceReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseOperationsHistoryStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
  archived: 3,
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

function csvCell(value: string | number | boolean | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function historyStatus(input: CreateBoardReleaseOperationsHistoryReportInput): BoardReleaseOperationsHistoryStatus {
  if (!input.promotionGate.summary.promotionAllowed || input.variance.summary.blockerCount > 0) {
    return "blocked";
  }

  if (input.promotionGate.summary.status === "watch" || input.variance.summary.watchCount > 0 || input.notifications.summary.status === "watch") {
    return "watch";
  }

  return input.archive.summary.status === "archived" ? "archived" : "ready";
}

function historyId(input: {
  generatedAt: string;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-release-operations-history:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${dateStamp(input.generatedAt)}`;
}

function createRecord(input: CreateBoardReleaseOperationsHistoryReportInput & { generatedAt: string; workspaceId: string }): BoardReleaseOperationsHistoryRecord {
  const archiveRecord = input.archive.records[0] ?? null;
  const releasePromotionId = input.promotionGate.releasePromotionId ?? archiveRecord?.releasePromotionId ?? null;
  const notificationSuppressedCount = input.notifications.summary.suppressedByPreferenceCount + input.notifications.summary.suppressedByRoleCount;
  const status = historyStatus(input);
  const base = {
    archiveHash: archiveRecord?.archiveHash ?? input.archive.summary.latestArchiveHash,
    gateScore: input.promotionGate.summary.gateScore,
    notificationEligibleRouteCount: input.notifications.summary.eligibleRouteCount,
    promotionAllowed: input.promotionGate.summary.promotionAllowed,
    releasePromotionId,
    status,
    varianceBlockerCount: input.variance.summary.blockerCount,
    varianceCount: input.variance.summary.varianceCount,
    workspaceId: input.workspaceId,
  };

  return {
    archiveHash: base.archiveHash,
    archivedAt: archiveRecord?.archivedAt ?? null,
    gateScore: base.gateScore,
    historyHash: sha256(base),
    historyId: historyId({
      generatedAt: input.generatedAt,
      releasePromotionId,
      workspaceId: input.workspaceId,
    }),
    notificationEligibleRouteCount: base.notificationEligibleRouteCount,
    notificationSuppressedCount,
    promotionAllowed: base.promotionAllowed,
    recordedAt: input.generatedAt,
    releasePromotionId,
    status,
    varianceBlockerCount: base.varianceBlockerCount,
    varianceCount: base.varianceCount,
    workspaceId: input.workspaceId,
  };
}

function summarize(records: BoardReleaseOperationsHistoryRecord[]): BoardReleaseOperationsHistoryReport["summary"] {
  const firstAttention = records.find((record) => record.status === "blocked" || record.status === "watch") ?? null;
  const latest = records[0] ?? null;
  const blockedCount = records.filter((record) => record.status === "blocked").length;
  const watchCount = records.filter((record) => record.status === "watch").length;
  const readyCount = records.filter((record) => record.status === "ready").length;
  const archivedCount = records.filter((record) => record.status === "archived").length;

  return {
    archivedCount,
    blockedCount,
    historyCount: records.length,
    latestHistoryHash: latest?.historyHash ?? null,
    latestReleasePromotionId: latest?.releasePromotionId ?? null,
    nextAction:
      firstAttention?.status === "blocked"
        ? "Resolve blocked board release operations before promotion."
        : firstAttention?.status === "watch"
          ? "Review watched board release operations before closeout."
          : "Board release operations history is ready for review.",
    readyCount,
    status: records.reduce<BoardReleaseOperationsHistoryStatus>((worst, record) => (statusRank[record.status] < statusRank[worst] ? record.status : worst), "archived"),
    watchCount,
  };
}

function createCsv(records: BoardReleaseOperationsHistoryRecord[]) {
  const header = [
    "history_id",
    "release_promotion_id",
    "status",
    "gate_score",
    "archive_hash",
    "variance_count",
    "notification_routes",
    "history_hash",
    "next_action",
  ];
  const body = records.map((record) =>
    [
      record.historyId,
      record.releasePromotionId,
      record.status,
      record.gateScore,
      record.archiveHash,
      record.varianceCount,
      record.notificationEligibleRouteCount,
      record.historyHash,
      record.status === "blocked" ? "Resolve blocked board release operations before promotion." : "Review board release operations history.",
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  records: BoardReleaseOperationsHistoryRecord[];
  summary: BoardReleaseOperationsHistoryReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      records: input.records,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseOperationsHistoryReport(input: CreateBoardReleaseOperationsHistoryReportInput): BoardReleaseOperationsHistoryReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.promotionGate.workspaceId;
  const records = [
    createRecord({
      ...input,
      generatedAt,
      workspaceId,
    }),
  ];
  const summary = summarize(records);
  const csvContent = createCsv(records);
  const jsonContent = createJson({
    generatedAt,
    records,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-operations-history-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    records,
    summary,
    workspaceId,
  };
}
