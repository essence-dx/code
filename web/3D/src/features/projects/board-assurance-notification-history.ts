import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  BoardAssuranceNotificationChannel,
  BoardAssuranceNotificationRoute,
  BoardAssuranceNotificationRouteStatus,
  BoardAssuranceNotificationRoutingReport,
  BoardAssuranceNotificationSeverity,
} from "@/features/projects/board-assurance-notification-routing";

export type BoardAssuranceNotificationDeliveryFormat = "csv" | "json";
export type BoardAssuranceNotificationDeliveryState = "queued" | "ready" | "retry-needed" | "suppressed";
export type BoardAssuranceNotificationAcknowledgementState = "acknowledged" | "not-required" | "pending";
export type BoardAssuranceNotificationRouteDiffState = "changed" | "new" | "unchanged";
export type BoardAssuranceNotificationDeliveryStatus = BoardAssuranceNotificationSeverity;

export interface BoardAssuranceNotificationHistoryActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardAssuranceNotificationRetryEvidence {
  attemptCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  providerMessageId: string | null;
}

export interface BoardAssuranceNotificationRouteHistoryState {
  acknowledgementState: BoardAssuranceNotificationAcknowledgementState;
  acknowledgedAt: string | null;
  deliveryState: BoardAssuranceNotificationDeliveryState;
  diffState: BoardAssuranceNotificationRouteDiffState;
  retryEvidence: BoardAssuranceNotificationRetryEvidence | null;
  route: BoardAssuranceNotificationRoute;
}

export interface BoardAssuranceNotificationDeliveryRecord {
  acknowledgedRouteCount: number;
  actor: BoardAssuranceNotificationHistoryActor;
  changedRouteCount: number;
  contentHash: string;
  createdAt: string;
  eligibleRouteCount: number;
  emailEligibleCount: number;
  historyId: string;
  id: string;
  inAppEligibleCount: number;
  newRouteCount: number;
  notificationCount: number;
  pendingAcknowledgementCount: number;
  removedRouteCount: number;
  removedRouteDedupeKeys: string[];
  report: BoardAssuranceNotificationRoutingReport;
  retryNeededCount: number;
  routeCount: number;
  routes: BoardAssuranceNotificationRouteHistoryState[];
  status: BoardAssuranceNotificationDeliveryStatus;
  suppressedRouteCount: number;
  workspaceId: string;
}

export interface BoardAssuranceNotificationDeliveryHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  records: BoardAssuranceNotificationDeliveryRecord[];
  summary: {
    latestChangedRouteCount: number;
    latestContentHash: string | null;
    latestEligibleRouteCount: number;
    latestRemovedRouteCount: number;
    latestRetryNeededCount: number;
    latestSavedAt: string | null;
    latestStatus: BoardAssuranceNotificationDeliveryStatus | null;
    pendingAcknowledgementCount: number;
    routeDelta: number;
    totalRecordCount: number;
  };
}

export interface CreateBoardAssuranceNotificationDeliveryRecordInput {
  acknowledgedRouteDedupeKeys?: Iterable<string>;
  actor: BoardAssuranceNotificationHistoryActor;
  createdAt?: string;
  existingRecords?: BoardAssuranceNotificationDeliveryRecord[];
  id?: string;
  report: BoardAssuranceNotificationRoutingReport;
  retryEvidenceByDedupeKey?: Map<string, BoardAssuranceNotificationRetryEvidence>;
  workspaceId: string;
}

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

  return JSON.stringify(value);
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

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function deliveryStateForRoute(route: BoardAssuranceNotificationRoute, retryEvidence: BoardAssuranceNotificationRetryEvidence | null): BoardAssuranceNotificationDeliveryState {
  if (route.status !== "eligible") {
    return "suppressed";
  }

  if (retryEvidence?.lastError) {
    return "retry-needed";
  }

  return route.channel === "email" ? "queued" : "ready";
}

function acknowledgementStateForRoute(input: {
  acknowledgedAt: string | null;
  acknowledgedRouteKeys: Set<string>;
  previousRoute: BoardAssuranceNotificationRouteHistoryState | null;
  route: BoardAssuranceNotificationRoute;
}) {
  if (input.route.status !== "eligible" || input.route.channel !== "in-app") {
    return {
      acknowledgedAt: null,
      acknowledgementState: "not-required" as const,
    };
  }

  if (input.acknowledgedRouteKeys.has(input.route.dedupeKey)) {
    return {
      acknowledgedAt: input.acknowledgedAt,
      acknowledgementState: "acknowledged" as const,
    };
  }

  if (input.previousRoute?.acknowledgementState === "acknowledged") {
    return {
      acknowledgedAt: input.previousRoute.acknowledgedAt,
      acknowledgementState: "acknowledged" as const,
    };
  }

  return {
    acknowledgedAt: null,
    acknowledgementState: "pending" as const,
  };
}

function routeSignature(route: BoardAssuranceNotificationRoute, deliveryState: BoardAssuranceNotificationDeliveryState) {
  return [route.status, route.channel, route.topic, route.recipientRole, deliveryState].join(":");
}

function routeDiffState(input: {
  deliveryState: BoardAssuranceNotificationDeliveryState;
  previousRoute: BoardAssuranceNotificationRouteHistoryState | null;
  route: BoardAssuranceNotificationRoute;
}): BoardAssuranceNotificationRouteDiffState {
  if (!input.previousRoute) {
    return "new";
  }

  return routeSignature(input.previousRoute.route, input.previousRoute.deliveryState) === routeSignature(input.route, input.deliveryState) ? "unchanged" : "changed";
}

function latestRecord(records: BoardAssuranceNotificationDeliveryRecord[]) {
  return [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0] ?? null;
}

function createHistoryId(workspaceId: string, generatedAt: string) {
  return `board-assurance-notifications-${workspaceId}-${dateStamp(generatedAt)}`;
}

function recordPayload(record: Omit<BoardAssuranceNotificationDeliveryRecord, "contentHash">) {
  return {
    actor: record.actor,
    createdAt: record.createdAt,
    report: record.report,
    routes: record.routes,
    workspaceId: record.workspaceId,
  };
}

export function createBoardAssuranceNotificationDeliveryRecord(
  input: CreateBoardAssuranceNotificationDeliveryRecordInput,
): BoardAssuranceNotificationDeliveryRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const previousRecord = latestRecord(input.existingRecords ?? []);
  const previousRoutes = new Map((previousRecord?.routes ?? []).map((route) => [route.route.dedupeKey, route]));
  const currentDedupeKeys = new Set(input.report.routes.map((route) => route.dedupeKey));
  const acknowledgedRouteKeys = new Set(input.acknowledgedRouteDedupeKeys ?? []);
  const routes = input.report.routes.map((route) => {
    const previousRoute = previousRoutes.get(route.dedupeKey) ?? null;
    const retryEvidence = input.retryEvidenceByDedupeKey?.get(route.dedupeKey) ?? null;
    const deliveryState = deliveryStateForRoute(route, retryEvidence);
    const acknowledgement = acknowledgementStateForRoute({
      acknowledgedAt: createdAt,
      acknowledgedRouteKeys,
      previousRoute,
      route,
    });

    return {
      ...acknowledgement,
      deliveryState,
      diffState: routeDiffState({
        deliveryState,
        previousRoute,
        route,
      }),
      retryEvidence,
      route,
    };
  });
  const removedRouteDedupeKeys = [...previousRoutes.keys()].filter((dedupeKey) => !currentDedupeKeys.has(dedupeKey));
  const suppressedRouteCount = routes.filter((route) => route.route.status !== "eligible").length;
  const baseRecord: Omit<BoardAssuranceNotificationDeliveryRecord, "contentHash"> = {
    acknowledgedRouteCount: routes.filter((route) => route.acknowledgementState === "acknowledged").length,
    actor: input.actor,
    changedRouteCount: routes.filter((route) => route.diffState === "changed").length,
    createdAt,
    eligibleRouteCount: input.report.summary.eligibleRouteCount,
    emailEligibleCount: input.report.summary.emailEligibleCount,
    historyId: createHistoryId(input.workspaceId, input.report.generatedAt),
    id: input.id ?? nanoid(),
    inAppEligibleCount: input.report.summary.inAppEligibleCount,
    newRouteCount: routes.filter((route) => route.diffState === "new").length,
    notificationCount: input.report.summary.notificationCount,
    pendingAcknowledgementCount: routes.filter((route) => route.acknowledgementState === "pending").length,
    removedRouteCount: removedRouteDedupeKeys.length,
    removedRouteDedupeKeys,
    report: input.report,
    retryNeededCount: routes.filter((route) => route.deliveryState === "retry-needed").length,
    routeCount: input.report.summary.routeCount,
    routes,
    status: input.report.summary.status,
    suppressedRouteCount,
    workspaceId: input.workspaceId,
  };

  return {
    ...baseRecord,
    contentHash: sha256(recordPayload(baseRecord)),
  };
}

function createHistoryCsv(records: BoardAssuranceNotificationDeliveryRecord[]) {
  const header = [
    "created_at",
    "status",
    "notifications",
    "routes",
    "eligible_routes",
    "pending_acknowledgements",
    "retry_needed",
    "changed_routes",
    "removed_routes",
    "content_hash",
  ];
  const rows = records.map((record) =>
    [
      record.createdAt,
      record.status,
      record.notificationCount,
      record.routeCount,
      record.eligibleRouteCount,
      record.pendingAcknowledgementCount,
      record.retryNeededCount,
      record.changedRouteCount,
      record.removedRouteCount,
      record.contentHash,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardAssuranceNotificationDeliveryHistoryReport(
  records: BoardAssuranceNotificationDeliveryRecord[],
): BoardAssuranceNotificationDeliveryHistoryReport {
  const sorted = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;
  const csvContent = createHistoryCsv(sorted);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: "essence-spline-board-assurance-notification-history.csv",
    records: sorted,
    summary: {
      latestChangedRouteCount: latest?.changedRouteCount ?? 0,
      latestContentHash: latest?.contentHash ?? null,
      latestEligibleRouteCount: latest?.eligibleRouteCount ?? 0,
      latestRemovedRouteCount: latest?.removedRouteCount ?? 0,
      latestRetryNeededCount: latest?.retryNeededCount ?? 0,
      latestSavedAt: latest?.createdAt ?? null,
      latestStatus: latest?.status ?? null,
      pendingAcknowledgementCount: latest?.pendingAcknowledgementCount ?? 0,
      routeDelta: latest && previous ? latest.routeCount - previous.routeCount : 0,
      totalRecordCount: sorted.length,
    },
  };
}

export function getBoardAssuranceNotificationDeliveryDownload(record: BoardAssuranceNotificationDeliveryRecord, format: BoardAssuranceNotificationDeliveryFormat) {
  if (format === "json") {
    return {
      body: JSON.stringify(record, null, 2),
      fileName: `essence-spline-board-assurance-notification-history-${dateStamp(record.createdAt)}.json`,
      mimeType: "application/json;charset=utf-8",
    };
  }

  const header = ["dedupe_key", "recipient_email", "channel", "status", "delivery_state", "acknowledgement_state", "diff_state", "retry_attempts", "last_error"];
  const rows = record.routes.map((route) =>
    [
      route.route.dedupeKey,
      route.route.recipientEmail,
      route.route.channel,
      route.route.status,
      route.deliveryState,
      route.acknowledgementState,
      route.diffState,
      route.retryEvidence?.attemptCount ?? 0,
      route.retryEvidence?.lastError ?? null,
    ]
      .map(csvCell)
      .join(","),
  );

  return {
    body: `${[header.join(","), ...rows].join("\n")}\n`,
    fileName: `essence-spline-board-assurance-notification-history-${dateStamp(record.createdAt)}.csv`,
    mimeType: "text/csv;charset=utf-8",
  };
}

function isRouteStatus(value: unknown): value is BoardAssuranceNotificationRouteStatus {
  return value === "eligible" || value === "suppressed-by-preference" || value === "suppressed-by-role";
}

function isChannel(value: unknown): value is BoardAssuranceNotificationChannel {
  return value === "email" || value === "in-app";
}

function isSeverity(value: unknown): value is BoardAssuranceNotificationSeverity {
  return value === "critical" || value === "info" || value === "warning";
}

function isRoute(value: unknown): value is BoardAssuranceNotificationRoute {
  if (!value || typeof value !== "object") {
    return false;
  }

  const route = value as Partial<BoardAssuranceNotificationRoute>;

  return (
    typeof route.candidateId === "string" &&
    typeof route.dedupeKey === "string" &&
    typeof route.recipientEmail === "string" &&
    typeof route.userId === "string" &&
    isChannel(route.channel) &&
    isRouteStatus(route.status)
  );
}

export function isBoardAssuranceNotificationRoutingReport(value: unknown): value is BoardAssuranceNotificationRoutingReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<BoardAssuranceNotificationRoutingReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.workspaceId === "string" &&
    Array.isArray(report.notifications) &&
    Array.isArray(report.routes) &&
    report.routes.every(isRoute) &&
    !!report.summary &&
    isSeverity(report.summary.status) &&
    typeof report.summary.notificationCount === "number" &&
    typeof report.summary.routeCount === "number" &&
    typeof report.summary.eligibleRouteCount === "number"
  );
}
