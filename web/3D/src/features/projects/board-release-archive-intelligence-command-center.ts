import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import type { BoardReleaseArchiveIntelligencePacketHistoryReport } from "@/features/projects/board-release-archive-intelligence-packet-history";

export type BoardReleaseArchiveIntelligenceCommandCenterStatus = "blocked" | "ready" | "watch";
export type BoardReleaseArchiveIntelligenceCommandCenterRowId = "approval-workflow" | "notification-routes" | "packet-history" | "remediation-work";

export interface BoardReleaseArchiveIntelligenceCommandCenterRow {
  detail: string;
  id: BoardReleaseArchiveIntelligenceCommandCenterRowId;
  label: string;
  nextAction: string;
  owner: string;
  score: number;
  status: BoardReleaseArchiveIntelligenceCommandCenterStatus;
}

export interface BoardReleaseArchiveIntelligenceCommandCenterReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardReleaseArchiveIntelligenceCommandCenterRow[];
  summary: {
    blockedCount: number;
    commandScore: number;
    nextAction: string;
    packetHash: string;
    readyCount: number;
    remediationWorkCount: number;
    rowCount: number;
    status: BoardReleaseArchiveIntelligenceCommandCenterStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveIntelligenceCommandCenterInput {
  approvalWorkflow: BoardReleaseArchiveIntelligenceApprovalWorkflowReport | null;
  generatedAt?: string;
  packet: BoardReleaseArchiveIntelligencePacketReport;
  packetHistory: BoardReleaseArchiveIntelligencePacketHistoryReport | null;
  notificationRouting: BoardReleaseArchiveIntelligenceNotificationRoutingReport | null;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveIntelligenceCommandCenterStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const rowRank: Record<BoardReleaseArchiveIntelligenceCommandCenterRowId, number> = {
  "approval-workflow": 0,
  "packet-history": 1,
  "notification-routes": 2,
  "remediation-work": 3,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function routingStatus(status: BoardReleaseArchiveIntelligenceNotificationRoutingReport["summary"]["status"] | undefined): BoardReleaseArchiveIntelligenceCommandCenterStatus {
  if (status === "critical" || !status) {
    return "blocked";
  }

  return status === "warning" ? "watch" : "ready";
}

function approvalStatus(status: BoardReleaseArchiveIntelligenceApprovalWorkflowReport["summary"]["status"] | undefined): BoardReleaseArchiveIntelligenceCommandCenterStatus {
  if (!status || status === "hash-mismatch" || status === "rejected" || status === "exception-needed") {
    return "blocked";
  }

  return status === "pending" ? "watch" : "ready";
}

function packetHistoryRow(input: CreateBoardReleaseArchiveIntelligenceCommandCenterInput): BoardReleaseArchiveIntelligenceCommandCenterRow {
  const summary = input.packetHistory?.summary;
  const latestMatches = summary?.latestPacketHash === input.packet.summary.packetHash;
  const total = summary?.totalPacketCount ?? 0;
  const status: BoardReleaseArchiveIntelligenceCommandCenterStatus = !summary || total === 0 ? "blocked" : latestMatches ? "ready" : "watch";

  return {
    detail: summary
      ? `${total} saved packet${total === 1 ? "" : "s"}, latest ${summary.latestPacketHash ?? "none"}, saved ${summary.latestSavedAt ?? "never"}.`
      : "No archive intelligence packet history is attached.",
    id: "packet-history",
    label: "Packet history",
    nextAction:
      status === "blocked"
        ? "Save the current archive intelligence packet before command-center closeout."
        : status === "watch"
          ? "Refresh packet history so the latest saved hash matches the current packet."
          : "Keep the latest packet history attached to archive automation.",
    owner: "Archive owner",
    score: status === "ready" ? 100 : status === "watch" ? 70 : 35,
    status,
  };
}

function notificationRoutesRow(input: CreateBoardReleaseArchiveIntelligenceCommandCenterInput): BoardReleaseArchiveIntelligenceCommandCenterRow {
  const summary = input.notificationRouting?.summary;
  const suppressed = (summary?.suppressedByPreferenceCount ?? 0) + (summary?.suppressedByRoleCount ?? 0);
  const status = routingStatus(summary?.status);

  return {
    detail: summary
      ? `${summary.eligibleRouteCount} eligible route${summary.eligibleRouteCount === 1 ? "" : "s"}, ${suppressed} suppressed, ${summary.notificationCount} notification${summary.notificationCount === 1 ? "" : "s"}.`
      : "No archive intelligence notification routing report is attached.",
    id: "notification-routes",
    label: "Notification routes",
    nextAction: status === "blocked" ? "Resolve critical archive intelligence routing before approvals close." : "Archive route evidence with the command center.",
    owner: "Notification owner",
    score: input.notificationRouting ? clamp(summary?.routingScore ?? 0) : 30,
    status,
  };
}

function approvalWorkflowRow(input: CreateBoardReleaseArchiveIntelligenceCommandCenterInput): BoardReleaseArchiveIntelligenceCommandCenterRow {
  const summary = input.approvalWorkflow?.summary;
  const status = approvalStatus(summary?.status);

  return {
    detail: summary
      ? `${summary.approvedCount}/${summary.totalCount} approvals complete, ${summary.exceptionNeededCount} need exception notes, ${summary.hashMismatchCount} stale hash sign-off.`
      : "No archive intelligence approval workflow is attached.",
    id: "approval-workflow",
    label: "Approval workflow",
    nextAction: summary?.nextAction ?? "Create archive intelligence approval workflow rows before command-center closeout.",
    owner: "Approval owner",
    score: input.approvalWorkflow ? summary?.workflowScore ?? 0 : 30,
    status,
  };
}

function remediationWorkRow(input: CreateBoardReleaseArchiveIntelligenceCommandCenterInput): BoardReleaseArchiveIntelligenceCommandCenterRow {
  const openRecommendations = input.packet.recommendations.filter((recommendation) => recommendation.status !== "ready");
  const blockedCount = openRecommendations.filter((recommendation) => recommendation.status === "blocked").length;
  const watchCount = openRecommendations.filter((recommendation) => recommendation.status === "watch").length;
  const status: BoardReleaseArchiveIntelligenceCommandCenterStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const firstAction = openRecommendations[0]?.action ?? "No remediation work remains for this archive intelligence packet.";

  return {
    detail: `${openRecommendations.length} remediation item${openRecommendations.length === 1 ? "" : "s"}: ${blockedCount} blocked and ${watchCount} watch.`,
    id: "remediation-work",
    label: "Remediation work",
    nextAction: firstAction,
    owner: "Remediation owner",
    score: clamp(100 - blockedCount * 28 - watchCount * 12),
    status,
  };
}

function createCsv(rows: BoardReleaseArchiveIntelligenceCommandCenterRow[]) {
  const header = ["row_id", "label", "status", "score", "owner", "next_action"];
  const body = rows.map((row) => [row.id, row.label, row.status, row.score, row.owner, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(
  rows: BoardReleaseArchiveIntelligenceCommandCenterRow[],
  packet: BoardReleaseArchiveIntelligencePacketReport,
): BoardReleaseArchiveIntelligenceCommandCenterReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BoardReleaseArchiveIntelligenceCommandCenterStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    blockedCount,
    commandScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    nextAction: status === "ready" ? "Archive the command center with the final archive intelligence automation record." : (nextRow?.nextAction ?? packet.summary.nextAction),
    packetHash: packet.summary.packetHash,
    readyCount,
    remediationWorkCount: packet.recommendations.filter((recommendation) => recommendation.status !== "ready").length,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function sortRows(rows: BoardReleaseArchiveIntelligenceCommandCenterRow[]) {
  return [...rows].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.score - second.score ||
      rowRank[first.id] - rowRank[second.id],
  );
}

export function createBoardReleaseArchiveIntelligenceCommandCenterReport(
  input: CreateBoardReleaseArchiveIntelligenceCommandCenterInput,
): BoardReleaseArchiveIntelligenceCommandCenterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.packet.workspaceId;
  const rows = sortRows([packetHistoryRow(input), notificationRoutesRow(input), approvalWorkflowRow(input), remediationWorkRow(input)]);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-release-archive-intelligence-command-center-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary: summarize(rows, input.packet),
    workspaceId,
  };
}
