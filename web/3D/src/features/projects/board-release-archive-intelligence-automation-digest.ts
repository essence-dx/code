import { createHash } from "node:crypto";
import type { BoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";
import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import type { BoardReleaseArchiveIntelligenceCommandCenterReport } from "@/features/projects/board-release-archive-intelligence-command-center";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";

export type BoardReleaseArchiveIntelligenceAutomationDigestStatus = "blocked" | "ready" | "watch";
export type BoardReleaseArchiveIntelligenceAutomationDigestKind = "approval" | "notification" | "remediation" | "trend";

export interface BoardReleaseArchiveIntelligenceAutomationDigestRow {
  detail: string;
  digestHash: string;
  id: string;
  kind: BoardReleaseArchiveIntelligenceAutomationDigestKind;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveIntelligenceAutomationDigestStatus;
  title: string;
}

export interface BoardReleaseArchiveIntelligenceAutomationDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveIntelligenceAutomationDigestRow[];
  summary: {
    blockedCount: number;
    digestHash: string;
    digestScore: number;
    followThroughCount: number;
    nextAction: string;
    packetHash: string;
    readyCount: number;
    rowCount: number;
    status: BoardReleaseArchiveIntelligenceAutomationDigestStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveIntelligenceAutomationDigestInput {
  approvalWorkflow: BoardReleaseArchiveIntelligenceApprovalWorkflowReport | null;
  commandCenter: BoardReleaseArchiveIntelligenceCommandCenterReport | null;
  generatedAt?: string;
  notificationRouting: BoardReleaseArchiveIntelligenceNotificationRoutingReport | null;
  packet: BoardReleaseArchiveIntelligencePacketReport;
  trendDigest: BoardReleaseArchiveTrendDigestReport | null;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveIntelligenceAutomationDigestStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const kindRank: Record<BoardReleaseArchiveIntelligenceAutomationDigestKind, number> = {
  approval: 0,
  remediation: 1,
  notification: 2,
  trend: 3,
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function row(input: Omit<BoardReleaseArchiveIntelligenceAutomationDigestRow, "digestHash">) {
  const digestHash = sha256(input);

  return {
    ...input,
    digestHash,
  };
}

function normalizeTrendStatus(status: "blocked" | "ready" | "watch" | undefined): BoardReleaseArchiveIntelligenceAutomationDigestStatus {
  return status ?? "blocked";
}

function notificationStatus(status: BoardReleaseArchiveIntelligenceNotificationRoutingReport["summary"]["status"] | undefined): BoardReleaseArchiveIntelligenceAutomationDigestStatus {
  if (!status || status === "critical") {
    return "blocked";
  }

  return status === "warning" ? "watch" : "ready";
}

function approvalStatus(status: BoardReleaseArchiveIntelligenceApprovalWorkflowReport["summary"]["status"] | undefined): BoardReleaseArchiveIntelligenceAutomationDigestStatus {
  if (!status || status === "exception-needed" || status === "hash-mismatch" || status === "rejected") {
    return "blocked";
  }

  return status === "pending" ? "watch" : "ready";
}

function trendRow(input: CreateBoardReleaseArchiveIntelligenceAutomationDigestInput) {
  const summary = input.trendDigest?.summary;
  const status = normalizeTrendStatus(summary?.status);

  return row({
    detail: summary
      ? `${summary.trendScore}/100 trend score, ${summary.closeoutScoreMovement} closeout movement, ${summary.recurringBlockerCategoryCount} recurring blocker categories.`
      : "No archive trend digest is attached.",
    id: "automation-digest:trend",
    kind: "trend",
    metric: `${summary?.trendScore ?? 0}/100 trend`,
    nextAction: summary?.nextAction ?? "Create the archive trend digest before automation closeout.",
    score: summary?.trendScore ?? 30,
    status,
    title: "Trend summary",
  });
}

function approvalRow(input: CreateBoardReleaseArchiveIntelligenceAutomationDigestInput) {
  const summary = input.approvalWorkflow?.summary;
  const status = approvalStatus(summary?.status);

  return row({
    detail: summary
      ? `${summary.approvedCount}/${summary.totalCount} approvals complete, ${summary.exceptionNeededCount} exception notes needed, ${summary.hashMismatchCount} hash mismatches.`
      : "No approval workflow is attached.",
    id: "automation-digest:approval",
    kind: "approval",
    metric: `${summary?.workflowScore ?? 0}/100 approvals`,
    nextAction: summary?.nextAction ?? "Create approval workflow evidence before automation closeout.",
    score: summary?.workflowScore ?? 30,
    status,
    title: "Approval summary",
  });
}

function notificationRow(input: CreateBoardReleaseArchiveIntelligenceAutomationDigestInput) {
  const summary = input.notificationRouting?.summary;
  const status = notificationStatus(summary?.status);
  const suppressed = (summary?.suppressedByPreferenceCount ?? 0) + (summary?.suppressedByRoleCount ?? 0);

  return row({
    detail: summary
      ? `${summary.eligibleRouteCount} eligible route${summary.eligibleRouteCount === 1 ? "" : "s"}, ${suppressed} suppressed, ${summary.notificationCount} notifications.`
      : "No notification routing report is attached.",
    id: "automation-digest:notification",
    kind: "notification",
    metric: `${summary?.routingScore ?? 0}/100 routing`,
    nextAction: summary?.nextAction ?? "Create notification routing evidence before automation closeout.",
    score: summary?.routingScore ?? 30,
    status,
    title: "Notification summary",
  });
}

function remediationRow(input: CreateBoardReleaseArchiveIntelligenceAutomationDigestInput) {
  const commandSummary = input.commandCenter?.summary;
  const openRecommendations = input.packet.recommendations.filter((recommendation) => recommendation.status !== "ready");
  const blockedCount = openRecommendations.filter((recommendation) => recommendation.status === "blocked").length;
  const watchCount = openRecommendations.filter((recommendation) => recommendation.status === "watch").length;
  const status: BoardReleaseArchiveIntelligenceAutomationDigestStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";

  return row({
    detail: `${openRecommendations.length} follow-through item${openRecommendations.length === 1 ? "" : "s"} with ${blockedCount} blocked and ${watchCount} watch recommendations.`,
    id: "automation-digest:remediation",
    kind: "remediation",
    metric: `${commandSummary?.commandScore ?? clamp(100 - blockedCount * 28 - watchCount * 12)}/100 command`,
    nextAction: commandSummary?.nextAction ?? openRecommendations[0]?.action ?? "No remediation follow-through remains.",
    score: commandSummary?.commandScore ?? clamp(100 - blockedCount * 28 - watchCount * 12),
    status: commandSummary?.status ?? status,
    title: "Remediation follow-through",
  });
}

function sortRows(rows: BoardReleaseArchiveIntelligenceAutomationDigestRow[]) {
  return [...rows].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.score - second.score ||
      kindRank[first.kind] - kindRank[second.kind],
  );
}

function createCsv(rows: BoardReleaseArchiveIntelligenceAutomationDigestRow[]) {
  const header = ["digest_id", "kind", "title", "status", "score", "metric", "digest_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.metric, entry.digestHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(
  rows: BoardReleaseArchiveIntelligenceAutomationDigestRow[],
  packet: BoardReleaseArchiveIntelligencePacketReport,
): BoardReleaseArchiveIntelligenceAutomationDigestReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const status: BoardReleaseArchiveIntelligenceAutomationDigestStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    blockedCount,
    digestHash: sha256(rows.map((entry) => entry.digestHash)),
    digestScore: rows.length > 0 ? Math.round(rows.reduce((sum, entry) => sum + entry.score, 0) / rows.length) : 100,
    followThroughCount: packet.recommendations.filter((recommendation) => recommendation.status !== "ready").length,
    nextAction: status === "ready" ? "Archive the final archive intelligence automation digest." : (nextRow?.nextAction ?? packet.summary.nextAction),
    packetHash: packet.summary.packetHash,
    readyCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: BoardReleaseArchiveIntelligenceAutomationDigestReport) {
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

export function createBoardReleaseArchiveIntelligenceAutomationDigestReport(
  input: CreateBoardReleaseArchiveIntelligenceAutomationDigestInput,
): BoardReleaseArchiveIntelligenceAutomationDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.packet.workspaceId;
  const rows = sortRows([trendRow(input), approvalRow(input), notificationRow(input), remediationRow(input)]);
  const summary = summarize(rows, input.packet);
  const csvContent = createCsv(rows);
  const fileBase = `${slug(workspaceId)}-board-release-archive-intelligence-automation-digest-${dateStamp(generatedAt)}`;
  const report = {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
  const jsonContent = createJson(report);

  return {
    ...report,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
  };
}
