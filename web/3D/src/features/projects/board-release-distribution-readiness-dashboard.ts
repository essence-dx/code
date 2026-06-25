import { createHash } from "node:crypto";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import type { BoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";

export type BoardReleaseDistributionReadinessStatus = "blocked" | "ready" | "watch";
export type BoardReleaseDistributionReadinessFilterKind = "acknowledgement" | "recipient" | "retry" | "route" | "timeline";

export interface BoardReleaseDistributionReadinessFilter {
  blockedCount: number;
  evidenceHash: string;
  filterId: string;
  filterKind: BoardReleaseDistributionReadinessFilterKind;
  nextAction: string;
  readyCount: number;
  status: BoardReleaseDistributionReadinessStatus;
  title: string;
  totalCount: number;
  watchCount: number;
  workspaceId: string;
}

export interface BoardReleaseDistributionReadinessDashboardReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  filters: BoardReleaseDistributionReadinessFilter[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockedCount: number;
    filterCount: number;
    nextAction: string;
    readyCount: number;
    readinessScore: number;
    status: BoardReleaseDistributionReadinessStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseDistributionReadinessDashboardReportInput {
  acknowledgements: BoardReleaseDistributionAcknowledgementReport;
  auditTimeline: BoardReleaseDistributionAuditTimelineReport;
  generatedAt?: string;
  manifests: BoardReleaseDistributionRecipientManifestReport;
  retries: BoardReleaseDistributionRetryPlanningReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseDistributionReadinessStatus, number> = {
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

function filterStatus(input: {
  blockedCount: number;
  watchCount: number;
}): BoardReleaseDistributionReadinessStatus {
  if (input.blockedCount > 0) {
    return "blocked";
  }

  return input.watchCount > 0 ? "watch" : "ready";
}

function createFilter(input: Omit<BoardReleaseDistributionReadinessFilter, "evidenceHash" | "filterId" | "status">): BoardReleaseDistributionReadinessFilter {
  const status = filterStatus({
    blockedCount: input.blockedCount,
    watchCount: input.watchCount,
  });
  const filterId = `board-release-distribution-readiness:${slug(input.workspaceId)}:${input.filterKind}`;
  const evidenceHash = sha256({
    blockedCount: input.blockedCount,
    filterKind: input.filterKind,
    readyCount: input.readyCount,
    status,
    totalCount: input.totalCount,
    watchCount: input.watchCount,
    workspaceId: input.workspaceId,
  });

  return {
    ...input,
    evidenceHash,
    filterId,
    status,
  };
}

function createFilters(input: CreateBoardReleaseDistributionReadinessDashboardReportInput & { workspaceId: string }) {
  return [
    createFilter({
      blockedCount: input.manifests.summary.missingRecipientCount,
      filterKind: "recipient",
      nextAction:
        input.manifests.summary.missingRecipientCount > 0
          ? "Add missing recipient contacts before release distribution closeout."
          : "Recipient coverage is ready for release distribution.",
      readyCount: input.manifests.summary.grantedAccessCount,
      title: "Recipient readiness",
      totalCount: input.manifests.summary.manifestCount,
      watchCount: input.manifests.summary.suppressedCount,
      workspaceId: input.workspaceId,
    }),
    createFilter({
      blockedCount: input.manifests.summary.blockedCount,
      filterKind: "route",
      nextAction:
        input.manifests.summary.blockedCount > 0
          ? "Resolve blocked delivery routes before distribution closeout."
          : "Delivery routes are ready for acknowledgement tracking.",
      readyCount: input.manifests.summary.readyCount,
      title: "Route health",
      totalCount: input.manifests.summary.manifestCount,
      watchCount: input.manifests.summary.watchCount,
      workspaceId: input.workspaceId,
    }),
    createFilter({
      blockedCount: input.acknowledgements.summary.blockedCount,
      filterKind: "acknowledgement",
      nextAction:
        input.acknowledgements.summary.pendingCount > 0
          ? "Capture pending acknowledgement evidence before closeout."
          : input.acknowledgements.summary.blockedCount > 0
            ? "Repair blocked acknowledgement routes before closeout."
            : "Acknowledgements are ready for release distribution closeout.",
      readyCount: input.acknowledgements.summary.signedCount + input.acknowledgements.summary.waivedCount,
      title: "Acknowledgement health",
      totalCount: input.acknowledgements.summary.acknowledgementCount,
      watchCount: input.acknowledgements.summary.pendingCount + input.acknowledgements.summary.overdueCount,
      workspaceId: input.workspaceId,
    }),
    createFilter({
      blockedCount: input.retries.summary.blockedCount,
      filterKind: "retry",
      nextAction: input.retries.summary.retryCount > 0 ? input.retries.summary.nextAction : "No retry work is currently needed.",
      readyCount: input.retries.summary.readyCount,
      title: "Retry load",
      totalCount: input.retries.summary.retryCount,
      watchCount: input.retries.summary.scheduledCount,
      workspaceId: input.workspaceId,
    }),
    createFilter({
      blockedCount: input.auditTimeline.summary.blockedCount,
      filterKind: "timeline",
      nextAction: input.auditTimeline.summary.nextAction,
      readyCount: input.auditTimeline.summary.closedCount,
      title: "Audit timeline",
      totalCount: input.auditTimeline.summary.eventCount,
      watchCount: input.auditTimeline.summary.watchCount + input.auditTimeline.summary.openCount,
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.filterKind.localeCompare(second.filterKind));
}

function readinessScore(filters: BoardReleaseDistributionReadinessFilter[]) {
  const total = filters.reduce((sum, filter) => sum + filter.totalCount, 0);

  if (total === 0) {
    return 100;
  }

  const penalty = filters.reduce((sum, filter) => sum + filter.blockedCount * 18 + filter.watchCount * 8, 0);

  return Math.max(0, Math.min(100, Math.round(100 - (penalty / total) * 5)));
}

function summarize(filters: BoardReleaseDistributionReadinessFilter[]): BoardReleaseDistributionReadinessDashboardReport["summary"] {
  const blockedCount = filters.reduce((sum, filter) => sum + filter.blockedCount, 0);
  const watchCount = filters.reduce((sum, filter) => sum + filter.watchCount, 0);
  const firstAttention = filters.find((filter) => filter.status === "blocked" || filter.status === "watch") ?? null;

  return {
    blockedCount,
    filterCount: filters.length,
    nextAction: firstAttention?.nextAction ?? "Board release distribution is ready for closeout.",
    readinessScore: readinessScore(filters),
    readyCount: filters.reduce((sum, filter) => sum + filter.readyCount, 0),
    status: filters.reduce<BoardReleaseDistributionReadinessStatus>((worst, filter) => (statusRank[filter.status] < statusRank[worst] ? filter.status : worst), "ready"),
    watchCount,
  };
}

function createCsv(filters: BoardReleaseDistributionReadinessFilter[]) {
  const header = ["filter_id", "filter_kind", "title", "status", "total_count", "blocked_count", "watch_count", "ready_count", "evidence_hash", "next_action"];
  const body = filters.map((filter) =>
    [
      filter.filterId,
      filter.filterKind,
      filter.title,
      filter.status,
      filter.totalCount,
      filter.blockedCount,
      filter.watchCount,
      filter.readyCount,
      filter.evidenceHash,
      filter.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  filters: BoardReleaseDistributionReadinessFilter[];
  generatedAt: string;
  summary: BoardReleaseDistributionReadinessDashboardReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      filters: input.filters,
      generatedAt: input.generatedAt,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseDistributionReadinessDashboardReport(
  input: CreateBoardReleaseDistributionReadinessDashboardReportInput,
): BoardReleaseDistributionReadinessDashboardReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.manifests.workspaceId;
  const filters = createFilters({
    ...input,
    workspaceId,
  });
  const summary = summarize(filters);
  const csvContent = createCsv(filters);
  const jsonContent = createJson({
    filters,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-distribution-readiness-dashboard-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    filters,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
