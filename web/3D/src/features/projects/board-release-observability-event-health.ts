import { createHash } from "node:crypto";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionAuditTimelineEvent, BoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

export type BoardReleaseObservabilityEventHealthStatus = "blocked" | "healthy" | "watch";
export type BoardReleaseObservabilityEventHealthSignal = "delayed-retry" | "stale-packet" | "stuck-acknowledgement" | "unresolved-variance";
export type BoardReleaseObservabilityEventHealthSeverity = "critical" | "info" | "warning";

export interface BoardReleaseObservabilityEventHealthMonitor {
  evidenceHash: string | null;
  lastSeenAt: string;
  monitorHash: string;
  monitorId: string;
  nextAction: string;
  releasePromotionId: string | null;
  severity: BoardReleaseObservabilityEventHealthSeverity;
  signal: BoardReleaseObservabilityEventHealthSignal;
  status: BoardReleaseObservabilityEventHealthStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseObservabilityEventHealthReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  monitors: BoardReleaseObservabilityEventHealthMonitor[];
  summary: {
    blockedCount: number;
    criticalCount: number;
    healthyCount: number;
    monitorCount: number;
    nextAction: string;
    status: BoardReleaseObservabilityEventHealthStatus;
    warningCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseObservabilityEventHealthReportInput {
  acknowledgements: BoardReleaseDistributionAcknowledgementReport;
  auditTimeline: BoardReleaseDistributionAuditTimelineReport;
  exportPackets: BoardReleaseOperationsExportPacketReport;
  generatedAt?: string;
  readinessDashboard: BoardReleaseDistributionReadinessDashboardReport;
  retries: BoardReleaseDistributionRetryPlanningReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseObservabilityEventHealthStatus, number> = {
  blocked: 0,
  watch: 1,
  healthy: 2,
};

const severityRank: Record<BoardReleaseObservabilityEventHealthSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
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

function hoursBetween(first: string, second: string) {
  const firstDate = new Date(first);
  const secondDate = new Date(second);

  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(secondDate.getTime())) {
    return 0;
  }

  return Math.max(0, (secondDate.getTime() - firstDate.getTime()) / (60 * 60 * 1000));
}

function latestEvent(events: BoardReleaseDistributionAuditTimelineEvent[], eventType: BoardReleaseDistributionAuditTimelineEvent["eventType"]) {
  return events
    .filter((event) => event.eventType === eventType)
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))[0] ?? null;
}

function createMonitor(input: Omit<BoardReleaseObservabilityEventHealthMonitor, "monitorHash" | "monitorId">): BoardReleaseObservabilityEventHealthMonitor {
  const monitorId = `board-release-observability-event-health:${slug(input.workspaceId)}:${input.signal}`;
  const core = {
    evidenceHash: input.evidenceHash,
    lastSeenAt: input.lastSeenAt,
    releasePromotionId: input.releasePromotionId,
    severity: input.severity,
    signal: input.signal,
    status: input.status,
    workspaceId: input.workspaceId,
  };

  return {
    ...input,
    monitorHash: sha256(core),
    monitorId,
  };
}

function stalePacketMonitor(input: CreateBoardReleaseObservabilityEventHealthReportInput & { generatedAt: string; workspaceId: string }) {
  const latestPacket = [...input.exportPackets.packets].sort((first, second) => second.signedAt.localeCompare(first.signedAt))[0] ?? null;
  const ageHours = latestPacket ? hoursBetween(latestPacket.signedAt, input.generatedAt) : 0;
  const blocked = !latestPacket || latestPacket.status === "blocked";
  const stale = ageHours > 72;

  return createMonitor({
    evidenceHash: latestPacket?.packetHash ?? null,
    lastSeenAt: latestPacket?.signedAt ?? input.generatedAt,
    nextAction: blocked
      ? "Restore a healthy signed export packet before release observability closeout."
      : stale
        ? "Refresh the signed export packet before relying on distribution evidence."
        : "Signed export packet health is current.",
    releasePromotionId: latestPacket?.releasePromotionId ?? null,
    severity: blocked ? "critical" : stale ? "warning" : "info",
    signal: "stale-packet",
    status: blocked ? "blocked" : stale ? "watch" : "healthy",
    title: "Signed packet freshness",
    workspaceId: input.workspaceId,
  });
}

function stuckAcknowledgementMonitor(input: CreateBoardReleaseObservabilityEventHealthReportInput & { generatedAt: string; workspaceId: string }) {
  const latestAcknowledgement = latestEvent(input.auditTimeline.events, "acknowledgement");
  const pending = input.acknowledgements.summary.pendingCount;
  const blocked = input.acknowledgements.summary.blockedCount;
  const overdue = input.acknowledgements.summary.overdueCount;

  return createMonitor({
    evidenceHash: latestAcknowledgement?.evidenceHash ?? null,
    lastSeenAt: latestAcknowledgement?.occurredAt ?? input.acknowledgements.generatedAt,
    nextAction:
      blocked > 0
        ? "Repair blocked acknowledgement routes before release observability closeout."
        : pending > 0 || overdue > 0
          ? "Capture pending acknowledgement evidence before release observability closeout."
          : "Acknowledgement health is current.",
    releasePromotionId: latestAcknowledgement?.releasePromotionId ?? null,
    severity: blocked > 0 ? "critical" : pending > 0 || overdue > 0 ? "warning" : "info",
    signal: "stuck-acknowledgement",
    status: blocked > 0 ? "blocked" : pending > 0 || overdue > 0 ? "watch" : "healthy",
    title: "Acknowledgement progress",
    workspaceId: input.workspaceId,
  });
}

function delayedRetryMonitor(input: CreateBoardReleaseObservabilityEventHealthReportInput & { generatedAt: string; workspaceId: string }) {
  const latestRetry = latestEvent(input.auditTimeline.events, "retry");
  const blocked = input.retries.summary.blockedCount;
  const scheduled = input.retries.summary.scheduledCount;

  return createMonitor({
    evidenceHash: latestRetry?.evidenceHash ?? null,
    lastSeenAt: latestRetry?.occurredAt ?? input.retries.generatedAt,
    nextAction:
      blocked > 0
        ? "Resolve blocked retry plans before release observability closeout."
        : scheduled > 0
          ? "Track scheduled retry completion before release observability closeout."
          : "Retry health is clear.",
    releasePromotionId: latestRetry?.releasePromotionId ?? null,
    severity: blocked > 0 ? "critical" : scheduled > 0 ? "warning" : "info",
    signal: "delayed-retry",
    status: blocked > 0 ? "blocked" : scheduled > 0 ? "watch" : "healthy",
    title: "Retry completion",
    workspaceId: input.workspaceId,
  });
}

function unresolvedVarianceMonitor(input: CreateBoardReleaseObservabilityEventHealthReportInput & { generatedAt: string; workspaceId: string }) {
  const latestVariance = latestEvent(input.auditTimeline.events, "variance-closure");
  const timelineBlocked = input.auditTimeline.summary.blockedCount;
  const readinessBlocked = input.readinessDashboard.summary.blockedCount;
  const timelineWatch = input.auditTimeline.summary.watchCount + input.auditTimeline.summary.openCount;

  return createMonitor({
    evidenceHash: latestVariance?.evidenceHash ?? input.readinessDashboard.jsonContent,
    lastSeenAt: latestVariance?.occurredAt ?? input.readinessDashboard.generatedAt,
    nextAction:
      timelineBlocked > 0 || readinessBlocked > 0
        ? "Resolve blocked variance or readiness evidence before observability closeout."
        : timelineWatch > 0
          ? "Review watched variance closure evidence before observability closeout."
          : "Variance closure health is clear.",
    releasePromotionId: latestVariance?.releasePromotionId ?? null,
    severity: timelineBlocked > 0 || readinessBlocked > 0 ? "critical" : timelineWatch > 0 ? "warning" : "info",
    signal: "unresolved-variance",
    status: timelineBlocked > 0 || readinessBlocked > 0 ? "blocked" : timelineWatch > 0 ? "watch" : "healthy",
    title: "Variance closure",
    workspaceId: input.workspaceId,
  });
}

function createMonitors(input: CreateBoardReleaseObservabilityEventHealthReportInput & { generatedAt: string; workspaceId: string }) {
  return [stalePacketMonitor(input), stuckAcknowledgementMonitor(input), delayedRetryMonitor(input), unresolvedVarianceMonitor(input)].sort(
    (first, second) => statusRank[first.status] - statusRank[second.status] || severityRank[first.severity] - severityRank[second.severity] || first.signal.localeCompare(second.signal),
  );
}

function summarize(monitors: BoardReleaseObservabilityEventHealthMonitor[]): BoardReleaseObservabilityEventHealthReport["summary"] {
  const blockedCount = monitors.filter((monitor) => monitor.status === "blocked").length;
  const watchCount = monitors.filter((monitor) => monitor.status === "watch").length;
  const firstAttention = monitors.find((monitor) => monitor.status === "blocked" || monitor.status === "watch") ?? null;

  return {
    blockedCount,
    criticalCount: monitors.filter((monitor) => monitor.severity === "critical").length,
    healthyCount: monitors.filter((monitor) => monitor.status === "healthy").length,
    monitorCount: monitors.length,
    nextAction: firstAttention?.nextAction ?? "Board release observability event health is clear.",
    status: monitors.reduce<BoardReleaseObservabilityEventHealthStatus>((worst, monitor) => (statusRank[monitor.status] < statusRank[worst] ? monitor.status : worst), "healthy"),
    warningCount: monitors.filter((monitor) => monitor.severity === "warning").length,
    watchCount,
  };
}

function createCsv(monitors: BoardReleaseObservabilityEventHealthMonitor[]) {
  const header = ["monitor_id", "signal", "title", "status", "severity", "release_promotion_id", "last_seen_at", "evidence_hash", "monitor_hash", "next_action"];
  const body = monitors.map((monitor) =>
    [
      monitor.monitorId,
      monitor.signal,
      monitor.title,
      monitor.status,
      monitor.severity,
      monitor.releasePromotionId,
      monitor.lastSeenAt,
      monitor.evidenceHash,
      monitor.monitorHash,
      monitor.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  monitors: BoardReleaseObservabilityEventHealthMonitor[];
  summary: BoardReleaseObservabilityEventHealthReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      monitors: input.monitors,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseObservabilityEventHealthReport(
  input: CreateBoardReleaseObservabilityEventHealthReportInput,
): BoardReleaseObservabilityEventHealthReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readinessDashboard.workspaceId;
  const monitors = createMonitors({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(monitors);
  const csvContent = createCsv(monitors);
  const jsonContent = createJson({
    generatedAt,
    monitors,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-observability-event-health-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    monitors,
    summary,
    workspaceId,
  };
}
