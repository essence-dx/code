import { Buffer } from "node:buffer";
import type { AdminRollbackDatabaseSummary } from "@/features/admin/admin-rollback-readiness";
import type { AdminRealtimeHealthReport } from "@/features/admin/admin-realtime-health-monitor";
import type { AdminPublicRouteAnalyticsReport } from "@/features/admin/admin-public-route-analytics-types";
import type { AdminWorkspaceOperationsReport } from "@/features/admin/admin-workspace-operations";

export type AdminWorkspaceCapacityStatus = "ready" | "review" | "blocked";

export type AdminWorkspaceCapacityDimension =
  | "collaboration-rooms"
  | "comments"
  | "database-growth"
  | "files"
  | "route-analytics"
  | "storage"
  | "versions";

export type AdminWorkspaceCapacityFile = {
  id: string;
  name: string;
  ownerEmail: string;
  updatedAt: string;
  trashedAt: string | null;
  versionCount: number;
  document: unknown;
};

export type AdminWorkspaceCapacityForecastRow = {
  id: string;
  dimension: AdminWorkspaceCapacityDimension;
  status: AdminWorkspaceCapacityStatus;
  label: string;
  current: number;
  projected30Day: number;
  projected90Day: number;
  capacityLimit: number;
  utilizationPercent: number;
  growthRate30Day: number;
  detail: string;
  recommendation: string;
  owner: string;
  latestAt: string | null;
};

export type AdminWorkspaceCapacityForecastReport = {
  generatedAt: string;
  status: AdminWorkspaceCapacityStatus;
  score: number;
  rowCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  storageUsedBytes: number;
  storageUsedPercent: number;
  projected30DayStorageBytes: number;
  projected90DayStorageBytes: number;
  activeFileCount: number;
  versionCount: number;
  commentCount: number;
  routeEventCount: number;
  collaborationRoomCount: number;
  databaseRowEstimate: number;
  rows: AdminWorkspaceCapacityForecastRow[];
  commands: string[];
};

export type AdminWorkspaceCapacityForecastInput = {
  generatedAt?: string;
  files: AdminWorkspaceCapacityFile[];
  database: AdminRollbackDatabaseSummary;
  publicRouteAnalytics: Pick<
    AdminPublicRouteAnalyticsReport,
    | "eventCount"
    | "last7dEventCount"
    | "missingCoverageCount"
    | "retentionDays"
    | "routeCount"
    | "storageAvailable"
  >;
  realtimeHealth: Pick<
    AdminRealtimeHealthReport,
    | "eventDriftCount"
    | "monitoredRoomCount"
    | "offlineReplayQueueCount"
    | "pendingSaveSignalCount"
  >;
  workspaceOperations: Pick<
    AdminWorkspaceOperationsReport,
    | "activeFileCount"
    | "databaseKind"
    | "storageBudgetBytes"
    | "storageUsedBytes"
    | "storageUsedPercent"
    | "versionCount"
  >;
};

type DocumentMetrics = {
  byteSize: number;
  collaborationRoomCount: number;
  collaborationReplayCount: number;
  commentCount: number;
  layerCount: number;
  latestAt: string | null;
  replyCount: number;
};

const FILE_CAPACITY_LIMIT = 1000;
const VERSION_CAPACITY_LIMIT = 10000;
const COMMENT_CAPACITY_LIMIT = 25000;
const ROUTE_EVENT_CAPACITY_LIMIT = 100000;
const COLLABORATION_ROOM_CAPACITY_LIMIT = 2000;
const DATABASE_ROW_CAPACITY_LIMIT = 250000;

export function getAdminWorkspaceCapacityForecastReport({
  database,
  files,
  generatedAt = new Date().toISOString(),
  publicRouteAnalytics,
  realtimeHealth,
  workspaceOperations,
}: AdminWorkspaceCapacityForecastInput): AdminWorkspaceCapacityForecastReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const metrics = activeFiles.map((file) => ({
    file,
    metrics: getDocumentMetrics(file.document),
  }));
  const storageUsedBytes =
    workspaceOperations.storageUsedBytes ||
    metrics.reduce((total, item) => total + item.metrics.byteSize, 0);
  const activeFileCount = Math.max(
    activeFiles.length,
    workspaceOperations.activeFileCount,
    database.activeFiles,
  );
  const versionCount = Math.max(
    database.versions,
    workspaceOperations.versionCount,
    activeFiles.reduce((total, file) => total + file.versionCount, 0),
  );
  const commentCount = metrics.reduce(
    (total, item) => total + item.metrics.commentCount + item.metrics.replyCount,
    0,
  );
  const collaborationRoomCount = Math.max(
    realtimeHealth.monitoredRoomCount,
    metrics.reduce(
      (total, item) => total + item.metrics.collaborationRoomCount,
      0,
    ),
  );
  const collaborationReplayCount =
    realtimeHealth.offlineReplayQueueCount +
    realtimeHealth.eventDriftCount +
    realtimeHealth.pendingSaveSignalCount +
    metrics.reduce(
      (total, item) => total + item.metrics.collaborationReplayCount,
      0,
    );
  const databaseRowEstimate =
    database.users +
    database.sessions +
    database.accounts +
    database.activeFiles +
    database.activeShares +
    database.versions +
    publicRouteAnalytics.eventCount;
  const averageFileBytes =
    activeFileCount > 0 ? Math.ceil(storageUsedBytes / activeFileCount) : 0;
  const fileGrowth30 = Math.max(1, Math.ceil(activeFileCount * 0.08));
  const versionGrowth30 = Math.max(activeFileCount, Math.ceil(versionCount * 0.18));
  const commentGrowth30 = Math.max(
    activeFileCount * 2,
    Math.ceil(commentCount * 0.35),
  );
  const routeGrowth30 = Math.max(
    publicRouteAnalytics.last7dEventCount * 4,
    publicRouteAnalytics.routeCount * 25,
  );
  const collaborationGrowth30 = Math.max(
    collaborationRoomCount > 0 ? 1 : 0,
    Math.ceil(collaborationRoomCount * 0.25),
  );
  const storageGrowth30 = Math.max(
    averageFileBytes * fileGrowth30,
    Math.ceil(storageUsedBytes * 0.12),
  );
  const databaseGrowth30 =
    fileGrowth30 +
    versionGrowth30 +
    routeGrowth30 +
    commentGrowth30 +
    collaborationGrowth30;
  const rows = [
    createForecastRow({
      id: "capacity-files",
      dimension: "files",
      label: "Design files",
      current: activeFileCount,
      growthRate30Day: fileGrowth30,
      capacityLimit: FILE_CAPACITY_LIMIT,
      detail: `${activeFileCount} active files across ${database.users} users and ${database.activeShares} live shares.`,
      recommendation:
        "Review project/team ownership and archive stale drafts before file count growth pushes search and dashboard load.",
      owner: "Workspace operator",
      latestAt: getLatestAt(activeFiles.map((file) => file.updatedAt)),
    }),
    createForecastRow({
      id: "capacity-versions",
      dimension: "versions",
      label: "Named versions",
      current: versionCount,
      growthRate30Day: versionGrowth30,
      capacityLimit: VERSION_CAPACITY_LIMIT,
      detail: `${versionCount} named versions with an expected ${versionGrowth30} new restore anchors per 30 days.`,
      recommendation:
        "Keep release-critical files versioned, then prune stale low-value checkpoints after retention review.",
      owner: "Release operator",
      latestAt: getLatestAt(activeFiles.map((file) => file.updatedAt)),
    }),
    createForecastRow({
      id: "capacity-comments",
      dimension: "comments",
      label: "Comments and replies",
      current: commentCount,
      growthRate30Day: commentGrowth30,
      capacityLimit: COMMENT_CAPACITY_LIMIT,
      detail: `${commentCount} comment/reply records are stored in active design documents.`,
      recommendation:
        "Resolve stale review threads and keep comment export bundles attached to release approvals.",
      owner: "Review operator",
      latestAt: getLatestAt(
        metrics.map((item) => item.metrics.latestAt).filter(Boolean),
      ),
    }),
    createForecastRow({
      id: "capacity-route-analytics",
      dimension: "route-analytics",
      label: "Public route analytics",
      current: publicRouteAnalytics.eventCount,
      growthRate30Day: routeGrowth30,
      capacityLimit: ROUTE_EVENT_CAPACITY_LIMIT,
      detail: `${publicRouteAnalytics.eventCount} retained events, ${publicRouteAnalytics.last7dEventCount} in the last 7 days, ${publicRouteAnalytics.missingCoverageCount} routes missing coverage, retention ${publicRouteAnalytics.retentionDays} days.`,
      recommendation: publicRouteAnalytics.storageAvailable
        ? "Watch route analytics growth before increasing public share, prototype, or embed traffic."
        : "Enable public route analytics storage before relying on capacity forecasts.",
      owner: "Analytics operator",
      latestAt: generatedAt,
    }),
    createForecastRow({
      id: "capacity-collaboration-rooms",
      dimension: "collaboration-rooms",
      label: "Collaboration rooms",
      current: collaborationRoomCount,
      growthRate30Day: collaborationGrowth30,
      capacityLimit: COLLABORATION_ROOM_CAPACITY_LIMIT,
      detail: `${collaborationRoomCount} monitored rooms with ${collaborationReplayCount} replay, drift, or pending-save signals.`,
      recommendation:
        "Archive stale room evidence and purge replay queues before realtime storage grows silently.",
      owner: "Collaboration operator",
      latestAt: generatedAt,
    }),
    createForecastRow({
      id: "capacity-storage",
      dimension: "storage",
      label: "Document storage",
      current: storageUsedBytes,
      growthRate30Day: storageGrowth30,
      capacityLimit: workspaceOperations.storageBudgetBytes,
      detail: `${formatBytes(storageUsedBytes)} stored now, projected ${formatBytes(storageUsedBytes + storageGrowth30 * 3)} in 90 days at current file growth.`,
      recommendation:
        "Compress oversized documents, prune stale media, and raise the storage budget before projected usage crosses the review threshold.",
      owner: "Storage operator",
      latestAt: generatedAt,
    }),
    createForecastRow({
      id: "capacity-database-growth",
      dimension: "database-growth",
      label: "Database rows",
      current: databaseRowEstimate,
      growthRate30Day: databaseGrowth30,
      capacityLimit: DATABASE_ROW_CAPACITY_LIMIT,
      detail: `${database.databaseKind} estimate includes users, sessions, accounts, files, shares, versions, and public route events.`,
      recommendation:
        "Track database row growth beside route analytics retention and named-version creation.",
      owner: "Database operator",
      latestAt: generatedAt,
    }),
  ].sort(sortRows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const projected30DayStorageBytes = storageUsedBytes + storageGrowth30;
  const projected90DayStorageBytes = storageUsedBytes + storageGrowth30 * 3;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    rowCount: rows.length,
    readyCount,
    reviewCount,
    blockedCount,
    storageUsedBytes,
    storageUsedPercent: getUtilizationPercent(
      storageUsedBytes,
      workspaceOperations.storageBudgetBytes,
    ),
    projected30DayStorageBytes,
    projected90DayStorageBytes,
    activeFileCount,
    versionCount,
    commentCount,
    routeEventCount: publicRouteAnalytics.eventCount,
    collaborationRoomCount,
    databaseRowEstimate,
    rows,
    commands: [
      "Export Admin > Workspace capacity forecast JSON.",
      "Export Admin > Workspace capacity forecast CSV.",
      "Review storage budget, route analytics retention, named-version growth, and collaboration replay queues before major releases.",
    ],
  };
}

export function getAdminWorkspaceCapacityForecastJson(
  report: AdminWorkspaceCapacityForecastReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminWorkspaceCapacityForecastCsv(
  report: AdminWorkspaceCapacityForecastReport,
) {
  return [
    [
      "id",
      "dimension",
      "status",
      "label",
      "current",
      "projected_30_day",
      "projected_90_day",
      "capacity_limit",
      "utilization_percent",
      "growth_rate_30_day",
      "detail",
      "recommendation",
      "owner",
      "latest_at",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.dimension,
        row.status,
        row.label,
        row.current,
        row.projected30Day,
        row.projected90Day,
        row.capacityLimit,
        row.utilizationPercent,
        row.growthRate30Day,
        row.detail,
        row.recommendation,
        row.owner,
        row.latestAt ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminWorkspaceCapacityForecastMarkdown(
  report: AdminWorkspaceCapacityForecastReport,
) {
  return [
    "# Workspace Capacity Forecast",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Storage: ${formatBytes(report.storageUsedBytes)} (${report.storageUsedPercent}%)`,
    `Projected storage: ${formatBytes(report.projected30DayStorageBytes)} in 30 days, ${formatBytes(report.projected90DayStorageBytes)} in 90 days`,
    "",
    "## Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.dimension}: ${row.label}`,
        `  - Current: ${formatCount(row.dimension, row.current)}`,
        `  - 30-day: ${formatCount(row.dimension, row.projected30Day)}`,
        `  - 90-day: ${formatCount(row.dimension, row.projected90Day)}`,
        `  - Utilization: ${row.utilizationPercent}% of ${formatCount(row.dimension, row.capacityLimit)}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ].join("\n");
}

function createForecastRow({
  capacityLimit,
  current,
  detail,
  dimension,
  growthRate30Day,
  id,
  label,
  latestAt,
  owner,
  recommendation,
}: Omit<
  AdminWorkspaceCapacityForecastRow,
  "projected30Day" | "projected90Day" | "status" | "utilizationPercent"
>) {
  const projected30Day = current + growthRate30Day;
  const projected90Day = current + growthRate30Day * 3;
  const utilizationPercent = getUtilizationPercent(projected90Day, capacityLimit);

  return {
    id,
    dimension,
    status:
      utilizationPercent >= 100
        ? "blocked"
        : utilizationPercent >= 75
          ? "review"
          : "ready",
    label,
    current,
    projected30Day,
    projected90Day,
    capacityLimit,
    utilizationPercent,
    growthRate30Day,
    detail,
    recommendation,
    owner,
    latestAt,
  } satisfies AdminWorkspaceCapacityForecastRow;
}

function getDocumentMetrics(document: unknown): DocumentMetrics {
  const record = isRecord(document) ? document : {};
  const pages = Array.isArray(record.pages) ? record.pages : [];
  const collaborationRoom = isRecord(record.collaborationRoom)
    ? record.collaborationRoom
    : null;
  const roomChatMessages = Array.isArray(collaborationRoom?.chatMessages)
    ? collaborationRoom.chatMessages
    : [];
  const roomPresenceEvents = Array.isArray(collaborationRoom?.presenceEvents)
    ? collaborationRoom.presenceEvents
    : [];
  const pageMetrics = pages.map(getPageMetrics);

  return {
    byteSize: getByteSize(document),
    collaborationRoomCount: collaborationRoom ? 1 : 0,
    collaborationReplayCount: roomChatMessages.length + roomPresenceEvents.length,
    commentCount: pageMetrics.reduce((total, item) => total + item.commentCount, 0),
    layerCount: pageMetrics.reduce((total, item) => total + item.layerCount, 0),
    latestAt: getLatestAt([
      typeof record.updatedAt === "string" ? record.updatedAt : null,
      typeof collaborationRoom?.updatedAt === "string"
        ? collaborationRoom.updatedAt
        : null,
      ...pageMetrics.flatMap((item) => item.timestamps),
    ]),
    replyCount: pageMetrics.reduce((total, item) => total + item.replyCount, 0),
  };
}

function getPageMetrics(page: unknown) {
  const record = isRecord(page) ? page : {};
  const comments = Array.isArray(record.comments) ? record.comments : [];

  return {
    commentCount: comments.length,
    layerCount: Array.isArray(record.layers) ? record.layers.length : 0,
    replyCount: comments.reduce((total, comment) => {
      const commentRecord = isRecord(comment) ? comment : {};
      const replies = Array.isArray(commentRecord.replies)
        ? commentRecord.replies
        : [];

      return total + replies.length;
    }, 0),
    timestamps: comments
      .flatMap((comment) => {
        const commentRecord = isRecord(comment) ? comment : {};

        return [commentRecord.createdAt, commentRecord.updatedAt];
      })
      .filter((value): value is string => typeof value === "string"),
  };
}

function getByteSize(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return 0;
  }
}

function getUtilizationPercent(value: number, capacityLimit: number) {
  if (capacityLimit <= 0) {
    return 100;
  }

  return Math.round((value / capacityLimit) * 100);
}

function sortRows(
  left: AdminWorkspaceCapacityForecastRow,
  right: AdminWorkspaceCapacityForecastRow,
) {
  const statusDelta = getStatusWeight(right.status) - getStatusWeight(left.status);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  return right.utilizationPercent - left.utilizationPercent;
}

function getStatusWeight(status: AdminWorkspaceCapacityStatus) {
  if (status === "blocked") {
    return 3;
  }

  return status === "review" ? 2 : 1;
}

function getLatestAt(values: Array<string | null>) {
  const timestamps = values
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter(Number.isFinite)
    .sort((left, right) => right - left);

  return timestamps[0] ? new Date(timestamps[0]).toISOString() : null;
}

function formatCount(
  dimension: AdminWorkspaceCapacityDimension,
  value: number,
) {
  return dimension === "storage" ? formatBytes(value) : `${value}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
