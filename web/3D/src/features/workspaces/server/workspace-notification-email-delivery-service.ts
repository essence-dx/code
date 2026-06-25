import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import {
  user,
  workspaceMember,
  workspaceNotificationDeliveryPreference,
  workspaceNotificationEmailDelivery,
  workspaceNotificationEmailDeliveryAttempt,
  type WorkspaceNotificationEmailDeliveryAttemptRecord,
  type WorkspaceNotificationEmailDeliveryRecord,
} from "@/db/schema";
import type { BoardApprovalSlaReminderReport } from "@/features/projects/board-approval-sla-reminders";
import type { ProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import type { ProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import {
  createWorkspaceNotificationEmailDeliveryReport,
  createWorkspaceNotificationEmailPlan,
  type WorkspaceNotificationEmailDeliveryReport,
  type WorkspaceNotificationEmailJobDraft,
  type WorkspaceNotificationEmailMember,
} from "@/features/workspaces/notification-email-delivery";
import { normalizeWorkspaceNotificationDeliveryPreferences } from "@/features/workspaces/notification-delivery-preferences";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceNotificationDeliveryPreference, WorkspaceNotificationEmailDeliveryStatus, WorkspaceNotificationTopic } from "@/features/workspaces/types";
import { sendBrevoEmail, type BrevoEmailResult } from "@/lib/email/brevo";

type ServiceResult<T> = T | { error: string; status: number };

export type WorkspaceNotificationEmailSender = (input: {
  htmlContent: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  textContent: string;
}) => Promise<BrevoEmailResult>;

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceNotificationEmailDeliverySchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_notification_email_delivery (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        project_id text REFERENCES project(id) ON DELETE SET NULL,
        dedupe_key text NOT NULL UNIQUE,
        notification_id text NOT NULL,
        source text NOT NULL,
        topic text NOT NULL,
        recipient_role text NOT NULL,
        recipient_email text NOT NULL,
        recipient_name text,
        subject text NOT NULL,
        preview_text text NOT NULL,
        text_content text NOT NULL,
        html_content text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0,
        max_attempts integer NOT NULL DEFAULT 3,
        last_error text,
        next_attempt_at integer,
        sent_at integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_workspace_idx ON workspace_notification_email_delivery(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_user_idx ON workspace_notification_email_delivery(user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_status_idx ON workspace_notification_email_delivery(workspace_id, status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_next_attempt_idx ON workspace_notification_email_delivery(next_attempt_at)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS workspace_notification_email_delivery_dedupe_idx ON workspace_notification_email_delivery(dedupe_key)");
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_notification_email_delivery_attempt (
        id text PRIMARY KEY NOT NULL,
        delivery_id text NOT NULL REFERENCES workspace_notification_email_delivery(id) ON DELETE CASCADE,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        status text NOT NULL,
        attempt_number integer NOT NULL,
        provider_message_id text,
        error text,
        attempted_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_attempt_delivery_idx ON workspace_notification_email_delivery_attempt(delivery_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_attempt_workspace_idx ON workspace_notification_email_delivery_attempt(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_email_delivery_attempt_attempted_idx ON workspace_notification_email_delivery_attempt(attempted_at)");
  })();

  await schemaReady;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDeliveryRow(row: WorkspaceNotificationEmailDeliveryRecord) {
  return {
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    lastError: row.lastError,
    nextAttemptAt: toIso(row.nextAttemptAt),
    notificationId: row.notificationId,
    projectId: row.projectId,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    recipientRole: row.recipientRole,
    sentAt: toIso(row.sentAt),
    source: row.source,
    status: row.status,
    subject: row.subject,
    topic: row.topic,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAttemptRow(row: WorkspaceNotificationEmailDeliveryAttemptRecord) {
  return {
    attemptNumber: row.attemptNumber,
    attemptedAt: row.attemptedAt.toISOString(),
    deliveryId: row.deliveryId,
    error: row.error,
    id: row.id,
    providerMessageId: row.providerMessageId,
    status: row.status,
  };
}

async function loadWorkspaceMembers(workspaceId: string): Promise<WorkspaceNotificationEmailMember[]> {
  const rows = await getDb()
    .select({
      email: user.email,
      name: user.name,
      role: workspaceMember.role,
      userId: user.id,
    })
    .from(workspaceMember)
    .innerJoin(user, eq(workspaceMember.userId, user.id))
    .where(eq(workspaceMember.workspaceId, workspaceId));

  return rows;
}

async function loadPreferencesByUserId(workspaceId: string) {
  const rows = await getDb()
    .select()
    .from(workspaceNotificationDeliveryPreference)
    .where(eq(workspaceNotificationDeliveryPreference.workspaceId, workspaceId));
  const byUser = new Map<string, WorkspaceNotificationDeliveryPreference[]>();

  for (const row of rows) {
    const entries = byUser.get(row.userId) ?? [];

    entries.push({
      emailEnabled: row.emailEnabled,
      inAppEnabled: row.inAppEnabled,
      topic: row.topic,
    });
    byUser.set(row.userId, entries);
  }

  for (const [userId, preferences] of byUser.entries()) {
    byUser.set(userId, normalizeWorkspaceNotificationDeliveryPreferences(preferences));
  }

  return byUser;
}

export async function listWorkspaceNotificationEmailDeliveryReport(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<{ report: WorkspaceNotificationEmailDeliveryReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceNotificationEmailDeliverySchema();

  const jobs = await getDb()
    .select()
    .from(workspaceNotificationEmailDelivery)
    .where(eq(workspaceNotificationEmailDelivery.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceNotificationEmailDelivery.updatedAt))
    .limit(input.limit ?? 80);
  const jobIds = jobs.map((job) => job.id);
  const attempts =
    jobIds.length > 0
      ? await getDb()
          .select()
          .from(workspaceNotificationEmailDeliveryAttempt)
          .where(inArray(workspaceNotificationEmailDeliveryAttempt.deliveryId, jobIds))
          .orderBy(desc(workspaceNotificationEmailDeliveryAttempt.attemptedAt))
          .limit(input.limit ?? 80)
      : [];

  return {
    report: createWorkspaceNotificationEmailDeliveryReport({
      attempts: attempts.map(toAttemptRow),
      jobs: jobs.map(toDeliveryRow),
    }),
  };
}

async function enqueueWorkspaceNotificationEmailJobDrafts(input: {
  currentUserId: string;
  jobs: WorkspaceNotificationEmailJobDraft[];
  workspaceId: string;
}): Promise<ServiceResult<{ createdCount: number; report: WorkspaceNotificationEmailDeliveryReport }>> {
  const existing = input.jobs.length
    ? await getDb()
        .select({ dedupeKey: workspaceNotificationEmailDelivery.dedupeKey })
        .from(workspaceNotificationEmailDelivery)
        .where(inArray(workspaceNotificationEmailDelivery.dedupeKey, input.jobs.map((job) => job.dedupeKey)))
    : [];
  const existingKeys = new Set(existing.map((row) => row.dedupeKey));
  const createdJobs = input.jobs.filter((job) => !existingKeys.has(job.dedupeKey));
  const now = new Date();

  if (createdJobs.length > 0) {
    await getDb()
      .insert(workspaceNotificationEmailDelivery)
      .values(
        createdJobs.map((job) => ({
          attempts: 0,
          createdAt: now,
          dedupeKey: job.dedupeKey,
          htmlContent: job.htmlContent,
          id: nanoid(),
          lastError: null,
          maxAttempts: 3,
          nextAttemptAt: now,
          notificationId: job.notificationId,
          previewText: job.previewText,
          projectId: job.projectId,
          recipientEmail: job.recipientEmail,
          recipientName: job.recipientName,
          recipientRole: job.recipientRole,
          sentAt: null,
          source: job.source,
          status: "pending" as const,
          subject: job.subject,
          textContent: job.textContent,
          topic: job.topic,
          updatedAt: now,
          userId: job.userId,
          workspaceId: job.workspaceId,
        })),
      );
  }

  const reportResult = await listWorkspaceNotificationEmailDeliveryReport({
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in reportResult) {
    return reportResult;
  }

  return {
    createdCount: createdJobs.length,
    report: reportResult.report,
  };
}

export async function enqueueWorkspaceNotificationEmailDeliveries(input: {
  boardApprovalSlaReminders?: BoardApprovalSlaReminderReport | null;
  currentUserId: string;
  healthCenter: ProjectHealthNotificationCenter;
  inbox: ProjectCollaborationInbox;
  workspaceId: string;
}): Promise<ServiceResult<{ createdCount: number; report: WorkspaceNotificationEmailDeliveryReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceNotificationEmailDeliverySchema();

  const members = await loadWorkspaceMembers(input.workspaceId);
  const preferencesByUserId = await loadPreferencesByUserId(input.workspaceId);
  const plan = createWorkspaceNotificationEmailPlan({
    boardApprovalSlaReminders: input.boardApprovalSlaReminders,
    healthCenter: input.healthCenter,
    inbox: input.inbox,
    members,
    preferencesByUserId,
    workspaceId: input.workspaceId,
  });

  return enqueueWorkspaceNotificationEmailJobDrafts({
    currentUserId: input.currentUserId,
    jobs: plan.jobs,
    workspaceId: input.workspaceId,
  });
}

function createEmptyProjectCollaborationInbox(generatedAt: string): ProjectCollaborationInbox {
  return {
    generatedAt,
    notifications: [],
    summary: {
      mentionCount: 0,
      remoteConflictCount: 0,
      resolvedCommentCount: 0,
      reviewRequestCount: 0,
      totalCount: 0,
      urgentCount: 0,
      warningCount: 0,
    },
  };
}

function createEmptyProjectHealthNotificationCenter(generatedAt: string): ProjectHealthNotificationCenter {
  return {
    generatedAt,
    notifications: [],
    summary: {
      criticalCount: 0,
      failedExportCount: 0,
      missingAssetCount: 0,
      releaseReadinessCount: 0,
      reviewBlockerCount: 0,
      staleCommentCount: 0,
      totalCount: 0,
      warningCount: 0,
    },
  };
}

export async function enqueueWorkspaceBoardApprovalSlaReminderEmailDeliveries(input: {
  currentUserId: string;
  reminders: BoardApprovalSlaReminderReport;
  workspaceId: string;
}): Promise<ServiceResult<{ createdCount: number; report: WorkspaceNotificationEmailDeliveryReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceNotificationEmailDeliverySchema();

  const members = await loadWorkspaceMembers(input.workspaceId);
  const preferencesByUserId = await loadPreferencesByUserId(input.workspaceId);
  const plan = createWorkspaceNotificationEmailPlan({
    boardApprovalSlaReminders: input.reminders,
    healthCenter: createEmptyProjectHealthNotificationCenter(input.reminders.generatedAt),
    inbox: createEmptyProjectCollaborationInbox(input.reminders.generatedAt),
    members,
    preferencesByUserId,
    workspaceId: input.workspaceId,
  });

  return enqueueWorkspaceNotificationEmailJobDrafts({
    currentUserId: input.currentUserId,
    jobs: plan.jobs,
    workspaceId: input.workspaceId,
  });
}

function retryDelay(attempts: number) {
  return Math.min(60, 5 * Math.max(attempts, 1)) * 60 * 1000;
}

async function recordAttempt(input: {
  delivery: WorkspaceNotificationEmailDeliveryRecord;
  error?: string | null;
  providerMessageId?: string | null;
  status: Extract<WorkspaceNotificationEmailDeliveryStatus, "failed" | "sent">;
}) {
  const attemptedAt = new Date();
  const attemptNumber = input.delivery.attempts + 1;

  await getDb().insert(workspaceNotificationEmailDeliveryAttempt).values({
    attemptNumber,
    attemptedAt,
    deliveryId: input.delivery.id,
    error: input.error ?? null,
    id: nanoid(),
    providerMessageId: input.providerMessageId ?? null,
    status: input.status,
    workspaceId: input.delivery.workspaceId,
  });

  if (input.status === "sent") {
    await getDb()
      .update(workspaceNotificationEmailDelivery)
      .set({
        attempts: attemptNumber,
        lastError: null,
        nextAttemptAt: null,
        sentAt: attemptedAt,
        status: "sent",
        updatedAt: attemptedAt,
      })
      .where(eq(workspaceNotificationEmailDelivery.id, input.delivery.id));

    return;
  }

  const exhausted = attemptNumber >= input.delivery.maxAttempts;

  await getDb()
    .update(workspaceNotificationEmailDelivery)
    .set({
      attempts: attemptNumber,
      lastError: input.error ?? "Email delivery failed.",
      nextAttemptAt: exhausted ? null : new Date(attemptedAt.getTime() + retryDelay(attemptNumber)),
      status: exhausted ? "failed" : "pending",
      updatedAt: attemptedAt,
    })
    .where(eq(workspaceNotificationEmailDelivery.id, input.delivery.id));
}

export async function sendPendingWorkspaceNotificationEmails(input: {
  currentUserId: string;
  limit?: number;
  now?: Date;
  sender?: WorkspaceNotificationEmailSender;
  workspaceId: string;
}): Promise<ServiceResult<{ attemptedCount: number; report: WorkspaceNotificationEmailDeliveryReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access || (access.role !== "owner" && access.role !== "admin")) {
    return { error: "Workspace admin access is required.", status: 403 };
  }

  await ensureWorkspaceNotificationEmailDeliverySchema();

  const now = input.now ?? new Date();
  const pendingJobs = await getDb()
    .select()
    .from(workspaceNotificationEmailDelivery)
    .where(
      and(
        eq(workspaceNotificationEmailDelivery.workspaceId, input.workspaceId),
        eq(workspaceNotificationEmailDelivery.status, "pending"),
        or(isNull(workspaceNotificationEmailDelivery.nextAttemptAt), lte(workspaceNotificationEmailDelivery.nextAttemptAt, now)),
      ),
    )
    .orderBy(workspaceNotificationEmailDelivery.createdAt)
    .limit(input.limit ?? 20);
  const sender =
    input.sender ??
    ((delivery) =>
      sendBrevoEmail({
        htmlContent: delivery.htmlContent,
        subject: delivery.subject,
        textContent: delivery.textContent,
        to: [
          {
            email: delivery.recipientEmail,
            name: delivery.recipientName ?? undefined,
          },
        ],
      }));

  for (const delivery of pendingJobs) {
    try {
      const result = await sender({
        htmlContent: delivery.htmlContent,
        recipientEmail: delivery.recipientEmail,
        recipientName: delivery.recipientName,
        subject: delivery.subject,
        textContent: delivery.textContent,
      });

      await recordAttempt({
        delivery,
        providerMessageId: result.messageId,
        status: "sent",
      });
    } catch (error) {
      await recordAttempt({
        delivery,
        error: error instanceof Error ? error.message : "Email delivery failed.",
        status: "failed",
      });
    }
  }

  const reportResult = await listWorkspaceNotificationEmailDeliveryReport({
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in reportResult) {
    return reportResult;
  }

  return {
    attemptedCount: pendingJobs.length,
    report: reportResult.report,
  };
}
