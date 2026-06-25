import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceBoardAssuranceNotificationDelivery } from "@/db/schema";
import {
  createBoardAssuranceNotificationDeliveryHistoryReport,
  createBoardAssuranceNotificationDeliveryRecord,
  getBoardAssuranceNotificationDeliveryDownload,
  type BoardAssuranceNotificationDeliveryFormat,
  type BoardAssuranceNotificationDeliveryHistoryReport,
  type BoardAssuranceNotificationDeliveryRecord,
  type BoardAssuranceNotificationHistoryActor,
  type BoardAssuranceNotificationRouteHistoryState,
} from "@/features/projects/board-assurance-notification-history";
import type { BoardAssuranceNotificationRoutingReport } from "@/features/projects/board-assurance-notification-routing";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardAssuranceNotificationHistorySchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_assurance_notification_delivery (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        history_id text NOT NULL,
        content_hash text NOT NULL,
        status text NOT NULL,
        notification_count integer NOT NULL,
        route_count integer NOT NULL,
        eligible_route_count integer NOT NULL,
        email_eligible_count integer NOT NULL,
        in_app_eligible_count integer NOT NULL,
        acknowledged_route_count integer NOT NULL,
        pending_acknowledgement_count integer NOT NULL,
        retry_needed_count integer NOT NULL,
        changed_route_count integer NOT NULL,
        new_route_count integer NOT NULL,
        removed_route_count integer NOT NULL,
        suppressed_route_count integer NOT NULL,
        removed_route_dedupe_keys text NOT NULL DEFAULT '[]',
        report text NOT NULL,
        routes text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_assurance_notification_delivery_workspace_idx ON workspace_board_assurance_notification_delivery(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_assurance_notification_delivery_actor_idx ON workspace_board_assurance_notification_delivery(actor_user_id)");
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_board_assurance_notification_delivery_created_idx ON workspace_board_assurance_notification_delivery(workspace_id, created_at)",
    );
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_board_assurance_notification_delivery_hash_idx ON workspace_board_assurance_notification_delivery(workspace_id, content_hash)",
    );
  })();

  await schemaReady;
}

async function requireBoardReviewManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board assurance notification history.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<BoardAssuranceNotificationHistoryActor> {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mapHistoryRow(row: typeof workspaceBoardAssuranceNotificationDelivery.$inferSelect): BoardAssuranceNotificationDeliveryRecord {
  return {
    acknowledgedRouteCount: row.acknowledgedRouteCount,
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    changedRouteCount: row.changedRouteCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    eligibleRouteCount: row.eligibleRouteCount,
    emailEligibleCount: row.emailEligibleCount,
    historyId: row.historyId,
    id: row.id,
    inAppEligibleCount: row.inAppEligibleCount,
    newRouteCount: row.newRouteCount,
    notificationCount: row.notificationCount,
    pendingAcknowledgementCount: row.pendingAcknowledgementCount,
    removedRouteCount: row.removedRouteCount,
    removedRouteDedupeKeys: parseJsonValue<string[]>(row.removedRouteDedupeKeys, []),
    report: parseJsonValue<BoardAssuranceNotificationRoutingReport>(row.report, {
      csvContent: "",
      csvDataUri: "",
      csvFileName: "",
      generatedAt: row.createdAt.toISOString(),
      notifications: [],
      routes: [],
      summary: {
        criticalCount: 0,
        eligibleRouteCount: row.eligibleRouteCount,
        emailEligibleCount: row.emailEligibleCount,
        inAppEligibleCount: row.inAppEligibleCount,
        nextAction: "Review saved board assurance notification routing history.",
        notificationCount: row.notificationCount,
        routeCount: row.routeCount,
        routingScore: 0,
        status: row.status,
        suppressedByPreferenceCount: 0,
        suppressedByRoleCount: 0,
        warningCount: 0,
      },
      workspaceId: row.workspaceId,
    }),
    retryNeededCount: row.retryNeededCount,
    routeCount: row.routeCount,
    routes: parseJsonValue<BoardAssuranceNotificationRouteHistoryState[]>(row.routes, []),
    status: row.status,
    suppressedRouteCount: row.suppressedRouteCount,
    workspaceId: row.workspaceId,
  };
}

async function loadWorkspaceNotificationHistory(workspaceId: string, limit = 12) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardAssuranceNotificationDelivery)
    .where(eq(workspaceBoardAssuranceNotificationDelivery.workspaceId, workspaceId))
    .orderBy(desc(workspaceBoardAssuranceNotificationDelivery.createdAt))
    .limit(limit);

  return rows.map(mapHistoryRow);
}

function createReport(records: BoardAssuranceNotificationDeliveryRecord[]): BoardAssuranceNotificationDeliveryHistoryReport {
  return createBoardAssuranceNotificationDeliveryHistoryReport(records);
}

export async function listWorkspaceBoardAssuranceNotificationHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<BoardAssuranceNotificationDeliveryHistoryReport>> {
  await ensureWorkspaceBoardAssuranceNotificationHistorySchema();

  const access = await requireBoardReviewManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createReport(await loadWorkspaceNotificationHistory(input.workspaceId, input.limit));
}

export async function recordWorkspaceBoardAssuranceNotificationHistory(input: {
  acknowledgedRouteDedupeKeys?: string[];
  currentUserId: string;
  report: BoardAssuranceNotificationRoutingReport;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardAssuranceNotificationDeliveryHistoryReport; record: BoardAssuranceNotificationDeliveryRecord }>> {
  await ensureWorkspaceBoardAssuranceNotificationHistorySchema();

  const access = await requireBoardReviewManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  if (input.report.workspaceId !== input.workspaceId) {
    return { error: "Board assurance notification report workspace does not match the requested workspace.", status: 400 };
  }

  const existingRecords = await loadWorkspaceNotificationHistory(input.workspaceId, 24);
  const record = createBoardAssuranceNotificationDeliveryRecord({
    acknowledgedRouteDedupeKeys: input.acknowledgedRouteDedupeKeys,
    actor: await getActor(input.currentUserId),
    existingRecords,
    report: input.report,
    workspaceId: input.workspaceId,
  });

  await getDb().insert(workspaceBoardAssuranceNotificationDelivery).values({
    acknowledgedRouteCount: record.acknowledgedRouteCount,
    actorEmail: record.actor.email,
    actorName: record.actor.name,
    actorUserId: record.actor.userId,
    changedRouteCount: record.changedRouteCount,
    contentHash: record.contentHash,
    createdAt: toDate(record.createdAt),
    eligibleRouteCount: record.eligibleRouteCount,
    emailEligibleCount: record.emailEligibleCount,
    historyId: record.historyId,
    id: record.id,
    inAppEligibleCount: record.inAppEligibleCount,
    newRouteCount: record.newRouteCount,
    notificationCount: record.notificationCount,
    pendingAcknowledgementCount: record.pendingAcknowledgementCount,
    removedRouteCount: record.removedRouteCount,
    removedRouteDedupeKeys: record.removedRouteDedupeKeys,
    report: record.report,
    retryNeededCount: record.retryNeededCount,
    routeCount: record.routeCount,
    routes: record.routes,
    status: record.status,
    suppressedRouteCount: record.suppressedRouteCount,
    workspaceId: record.workspaceId,
  });

  return {
    history: createReport(await loadWorkspaceNotificationHistory(input.workspaceId)),
    record,
  };
}

export async function getWorkspaceBoardAssuranceNotificationHistoryDownloadResponse(input: {
  currentUserId: string;
  format: BoardAssuranceNotificationDeliveryFormat;
  recordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceBoardAssuranceNotificationHistorySchema();

  const access = await requireBoardReviewManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardAssuranceNotificationDelivery)
    .where(and(eq(workspaceBoardAssuranceNotificationDelivery.workspaceId, input.workspaceId), eq(workspaceBoardAssuranceNotificationDelivery.id, input.recordId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Board assurance notification history record not found.", status: 404 };
  }

  return getBoardAssuranceNotificationDeliveryDownload(mapHistoryRow(row), input.format);
}
