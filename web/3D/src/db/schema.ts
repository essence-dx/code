import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { SceneCollaborationOperation } from "../features/editor/scene/scene-collaboration-operations";
import type { SceneDocument } from "../features/editor/types";
import type { AppPackagePresetId } from "../features/projects/app-package-export";
import type { ProjectAccessRole } from "../features/projects/access-types";
import type {
  ProjectAppPackageCertificateMetadata,
  ProjectAppPackageCertificatePlatform,
} from "../features/projects/app-package-certificates";
import type {
  CadConversionWorkerAdapterId,
  ProjectCadConversionJobLogEntry,
  ProjectCadConversionJobMetadata,
  ProjectCadConversionJobStatus,
} from "../features/projects/cad-conversion-worker";
import type { CadConversionTarget, CadConversionValidationReport, CadSourceKind } from "../features/editor/utils/cad-conversion-validation";
import type {
  ProjectArtifactRegistryKind,
  ProjectArtifactRegistryMetadata,
  ProjectArtifactRegistrySignatureState,
  ProjectArtifactRegistryStatus,
  ProjectArtifactRegistryVisibility,
} from "../features/projects/project-artifact-registry";
import type { ProjectDataRetentionPurgeReviewStatus } from "../features/projects/project-data-retention";
import type { ProjectPresenceCursor } from "../features/projects/presence-types";
import type {
  ProjectPublicSurfaceHealthStatus,
  ProjectPublicSurfaceHealthSurface,
  ProjectPublicSurfaceScreenshotState,
} from "../features/projects/public-surface-health";
import type { ProjectExportPresetId, ProjectReviewPolicyPresetId } from "../features/projects/project-templates";
import type { SceneQaSnapshotStatus, SceneQaSnapshotSurface } from "../features/projects/scene-qa-snapshots";
import type { ShareSettings } from "../features/projects/share-settings";
import type { ProjectAuditCategory } from "../features/projects/types";
import type { ProjectVersionActivityData } from "../features/projects/version-activity-types";
import type { SignedCompliancePacketShareAuditEvent } from "../features/projects/compliance-packet-sharing";
import type {
  SignedAuditEvidencePacketKind,
  SignedAuditEvidencePacketStatus,
  SignedAuditEvidenceVerificationState,
} from "../features/projects/signed-audit-evidence-packets";
import type { WorkspaceRiskDigestLevel, WorkspaceRiskDigestReport } from "../features/projects/workspace-risk-digest";
import type { ExecutiveReleaseIntelligenceDomain, ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceStatus } from "../features/projects/executive-release-intelligence";
import type { BoardApprovalPacketReport, BoardApprovalPacketSignOffRole, BoardApprovalPacketStatus } from "../features/projects/board-approval-packet";
import type { BoardApprovalPacketHistoryAuditEvent, BoardApprovalPacketHistoryRecordStatus } from "../features/projects/board-approval-packet-history";
import type { BoardApprovalPostApprovalActionAuditEvent } from "../features/projects/board-approval-post-approval-history";
import type { BoardApprovalPostApprovalAction, BoardApprovalPostApprovalActionStatus } from "../features/projects/board-approval-post-approval-tracker";
import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditStatus } from "../features/projects/board-decision-replay-audit";
import type { BoardReleaseArchiveIntelligencePacketReport } from "../features/projects/board-release-archive-intelligence-packet";
import type { BoardReleaseCloseoutReadinessGateStatus } from "../features/projects/board-release-closeout-readiness-gates";
import type {
  BoardAuditTaskCloseoutState,
  BoardAuditTaskCloseoutStatus,
  PersistedBoardAuditFollowUpTasksReport,
} from "../features/projects/board-audit-follow-up-tasks";
import type {
  BoardAssuranceNotificationDeliveryStatus,
  BoardAssuranceNotificationRouteHistoryState,
} from "../features/projects/board-assurance-notification-history";
import type { BoardAssuranceNotificationRoutingReport } from "../features/projects/board-assurance-notification-routing";
import type {
  BoardOperationsReviewCycleCloseoutState,
  BoardOperationsReviewCycleHistoryActor,
} from "../features/projects/board-operations-review-cycle-history";
import type { BoardOperationsControlCenterReport, BoardOperationsControlStatus, BoardOperationsReviewCycle } from "../features/projects/board-operations-control-center";
import type {
  ProjectRegressionWatchlistItemTriageState,
  ProjectRegressionWatchlistReport,
  ProjectRegressionWatchlistTriageStatus,
} from "../features/projects/regression-watchlist";
import type { ReleaseDrillHistoryScenarioRecord } from "../features/projects/release-drill-history";
import type { ReleaseDrillSimulationReport } from "../features/projects/release-drill-simulation";
import type { ReleaseReadinessWebhookDeliveryState, ReleaseReadinessWebhookReplayState } from "../features/projects/release-readiness-webhook-history";
import type {
  ReleaseReadinessWebhookProvider,
  ReleaseReadinessWebhookRow,
  ReleaseReadinessWebhookSignatureState,
  ReleaseReadinessWebhookStatus,
  ReleaseReadinessWebhookSurface,
} from "../features/projects/release-readiness-webhooks";
import type {
  RoleAccessReviewPersistedAttestationStatus,
  RoleAccessReviewReminderDeliveryChannel,
  RoleAccessReviewReminderDeliveryStatus,
} from "../features/projects/role-access-review-history";
import type {
  WorkspaceInviteRole,
  WorkspaceNotificationEmailDeliverySource,
  WorkspaceNotificationEmailDeliveryStatus,
  WorkspaceNotificationTopic,
  WorkspaceReleaseCalendarMilestoneKind,
  WorkspaceReleaseCalendarMilestoneSource,
  WorkspaceReleaseCalendarMilestoneStatus,
  WorkspaceRole,
} from "../features/workspaces/types";
import type {
  WorkspaceReleaseRunbookAttachment,
  WorkspaceReleaseRunbookComment,
  WorkspaceReleaseRunbookRecordStatus,
  WorkspaceReleaseRunbookTransition,
} from "../features/workspaces/release-runbook";

export type ProjectAuditEventMetadata = Record<string, boolean | number | string | null>;
export type ProjectTemplateVersionAction = "cloned" | "created" | "refreshed" | "updated";
export interface ProjectTemplateVersionEntry {
  action: ProjectTemplateVersionAction;
  actorUserId: string | null;
  at: string;
  sourceProjectId?: string | null;
  sourceTemplateId?: string | null;
  version: number;
}

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("user_email_idx").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("session_token_idx").on(table.token), index("session_user_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspace = sqliteTable(
  "workspace",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("workspace_owner_idx").on(table.ownerUserId)],
);

export const workspaceMember = sqliteTable(
  "workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<WorkspaceRole>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_member_workspace_idx").on(table.workspaceId),
    index("workspace_member_user_idx").on(table.userId),
    uniqueIndex("workspace_member_workspace_user_idx").on(table.workspaceId, table.userId),
  ],
);

export const workspaceInvite = sqliteTable(
  "workspace_invite",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").$type<WorkspaceInviteRole>().notNull(),
    token: text("token").notNull().unique(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_invite_workspace_idx").on(table.workspaceId),
    index("workspace_invite_email_idx").on(table.email),
    uniqueIndex("workspace_invite_token_idx").on(table.token),
  ],
);

export const workspaceNotificationDeliveryPreference = sqliteTable(
  "workspace_notification_delivery_preference",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topic: text("topic").$type<WorkspaceNotificationTopic>().notNull(),
    inAppEnabled: integer("in_app_enabled", { mode: "boolean" }).notNull().default(true),
    emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_notification_delivery_preference_workspace_idx").on(table.workspaceId),
    index("workspace_notification_delivery_preference_user_idx").on(table.userId),
    uniqueIndex("workspace_notification_delivery_preference_workspace_user_topic_idx").on(table.workspaceId, table.userId, table.topic),
  ],
);

export const workspaceNotificationEmailDelivery = sqliteTable(
  "workspace_notification_email_delivery",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    dedupeKey: text("dedupe_key").notNull(),
    notificationId: text("notification_id").notNull(),
    source: text("source").$type<WorkspaceNotificationEmailDeliverySource>().notNull(),
    topic: text("topic").$type<WorkspaceNotificationTopic>().notNull(),
    recipientRole: text("recipient_role").$type<WorkspaceRole>().notNull(),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    subject: text("subject").notNull(),
    previewText: text("preview_text").notNull(),
    textContent: text("text_content").notNull(),
    htmlContent: text("html_content").notNull(),
    status: text("status").$type<WorkspaceNotificationEmailDeliveryStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp" }),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_notification_email_delivery_workspace_idx").on(table.workspaceId),
    index("workspace_notification_email_delivery_user_idx").on(table.userId),
    index("workspace_notification_email_delivery_status_idx").on(table.workspaceId, table.status),
    index("workspace_notification_email_delivery_next_attempt_idx").on(table.nextAttemptAt),
    uniqueIndex("workspace_notification_email_delivery_dedupe_idx").on(table.dedupeKey),
  ],
);

export const workspaceNotificationEmailDeliveryAttempt = sqliteTable(
  "workspace_notification_email_delivery_attempt",
  {
    id: text("id").primaryKey(),
    deliveryId: text("delivery_id")
      .notNull()
      .references(() => workspaceNotificationEmailDelivery.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    status: text("status").$type<Extract<WorkspaceNotificationEmailDeliveryStatus, "failed" | "sent">>().notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    attemptedAt: integer("attempted_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_notification_email_delivery_attempt_delivery_idx").on(table.deliveryId),
    index("workspace_notification_email_delivery_attempt_workspace_idx").on(table.workspaceId),
    index("workspace_notification_email_delivery_attempt_attempted_idx").on(table.attemptedAt),
  ],
);

export const workspaceReleaseReadinessWebhookEvent = sqliteTable(
  "workspace_release_readiness_webhook_event",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    provider: text("provider").$type<ReleaseReadinessWebhookProvider>().notNull(),
    eventType: text("event_type").notNull(),
    surface: text("surface").$type<ReleaseReadinessWebhookSurface>().notNull(),
    status: text("status").$type<ReleaseReadinessWebhookStatus>().notNull(),
    subject: text("subject").notNull(),
    evidence: text("evidence").notNull(),
    nextAction: text("next_action").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    rawBodyDigest: text("raw_body_digest").notNull(),
    signatureDigest: text("signature_digest"),
    signatureState: text("signature_state").$type<ReleaseReadinessWebhookSignatureState>().notNull(),
    replayKey: text("replay_key").notNull(),
    replayState: text("replay_state").$type<ReleaseReadinessWebhookReplayState>().notNull(),
    replayReason: text("replay_reason"),
    deliveryState: text("delivery_state").$type<ReleaseReadinessWebhookDeliveryState>().notNull(),
    deliveryAttempt: text("delivery_attempt", { mode: "json" }).$type<{
      attemptNumber: number;
      lastError?: string | null;
      maxAttempts: number;
      nextAttemptAt?: string | null;
      providerMessageId?: string | null;
    } | null>(),
    readinessRow: text("readiness_row", { mode: "json" }).$type<ReleaseReadinessWebhookRow>().notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    receivedAt: integer("received_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_release_readiness_webhook_event_workspace_idx").on(table.workspaceId),
    index("workspace_release_readiness_webhook_event_provider_idx").on(table.workspaceId, table.provider),
    index("workspace_release_readiness_webhook_event_received_idx").on(table.workspaceId, table.receivedAt),
    index("workspace_release_readiness_webhook_event_replay_idx").on(table.workspaceId, table.provider, table.replayKey),
    index("workspace_release_readiness_webhook_event_status_idx").on(table.workspaceId, table.status),
  ],
);

export const workspaceReleaseCalendarMilestone = sqliteTable(
  "workspace_release_calendar_milestone",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    sourceKey: text("source_key").notNull(),
    kind: text("kind").$type<WorkspaceReleaseCalendarMilestoneKind>().notNull(),
    source: text("source").$type<WorkspaceReleaseCalendarMilestoneSource>().notNull(),
    status: text("status").$type<WorkspaceReleaseCalendarMilestoneStatus>().notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    actionLabel: text("action_label").notNull(),
    blockerCount: integer("blocker_count").notNull().default(0),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_release_calendar_milestone_workspace_idx").on(table.workspaceId),
    index("workspace_release_calendar_milestone_project_idx").on(table.projectId),
    index("workspace_release_calendar_milestone_status_idx").on(table.workspaceId, table.status),
    index("workspace_release_calendar_milestone_due_idx").on(table.workspaceId, table.dueAt),
    uniqueIndex("workspace_release_calendar_milestone_workspace_source_idx").on(table.workspaceId, table.sourceKey),
  ],
);

export const workspaceReleaseRunbookRecord = sqliteTable(
  "workspace_release_runbook_record",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    projectName: text("project_name"),
    batchId: text("batch_id").notNull(),
    sourceKey: text("source_key").notNull(),
    milestoneId: text("milestone_id").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    status: text("status").$type<WorkspaceReleaseRunbookRecordStatus>().notNull(),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    ownerName: text("owner_name").notNull(),
    ownerEmail: text("owner_email"),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    checklistEvidence: text("checklist_evidence", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    comments: text("comments", { mode: "json" }).$type<WorkspaceReleaseRunbookComment[]>().notNull().default(sql`'[]'`),
    attachments: text("attachments", { mode: "json" }).$type<WorkspaceReleaseRunbookAttachment[]>().notNull().default(sql`'[]'`),
    transitionHistory: text("transition_history", { mode: "json" }).$type<WorkspaceReleaseRunbookTransition[]>().notNull().default(sql`'[]'`),
    auditLogHref: text("audit_log_href").notNull(),
    blockerCount: integer("blocker_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_release_runbook_record_workspace_idx").on(table.workspaceId),
    index("workspace_release_runbook_record_project_idx").on(table.projectId),
    index("workspace_release_runbook_record_owner_idx").on(table.ownerUserId),
    index("workspace_release_runbook_record_status_idx").on(table.workspaceId, table.status),
    index("workspace_release_runbook_record_due_idx").on(table.workspaceId, table.dueAt),
    uniqueIndex("workspace_release_runbook_record_batch_source_idx").on(table.workspaceId, table.batchId, table.sourceKey),
  ],
);

export const workspaceRiskDigestPacket = sqliteTable(
  "workspace_risk_digest_packet",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    packetId: text("packet_id").notNull(),
    contentHash: text("content_hash").notNull(),
    riskLevel: text("risk_level").$type<WorkspaceRiskDigestLevel>().notNull(),
    score: integer("score").notNull(),
    workspaceName: text("workspace_name").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    auditCsvFileName: text("audit_csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    auditCsvByteSize: integer("audit_csv_byte_size").notNull(),
    auditEventCount: integer("audit_event_count").notNull(),
    digest: text("digest", { mode: "json" }).$type<WorkspaceRiskDigestReport>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_risk_digest_packet_workspace_idx").on(table.workspaceId),
    index("workspace_risk_digest_packet_actor_idx").on(table.actorUserId),
    index("workspace_risk_digest_packet_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_risk_digest_packet_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceCompliancePacketShare = sqliteTable(
  "workspace_compliance_packet_share",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    createdByEmail: text("created_by_email"),
    packetId: text("packet_id").notNull(),
    packetKind: text("packet_kind").$type<SignedAuditEvidencePacketKind>().notNull(),
    sourceLabel: text("source_label").notNull(),
    contentHash: text("content_hash").notNull(),
    packetBody: text("packet_body"),
    keyId: text("key_id"),
    signedAt: integer("signed_at", { mode: "timestamp" }),
    signer: text("signer"),
    verificationState: text("verification_state").$type<SignedAuditEvidenceVerificationState>().notNull(),
    packetStatus: text("packet_status").$type<SignedAuditEvidencePacketStatus>().notNull(),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    accessPurpose: text("access_purpose").notNull(),
    tokenDigest: text("token_digest").notNull(),
    shareUrl: text("share_url").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, { onDelete: "set null" }),
    revokedByName: text("revoked_by_name"),
    revokedByEmail: text("revoked_by_email"),
    revokeReason: text("revoke_reason"),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
    accessCount: integer("access_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    auditTrail: text("audit_trail", { mode: "json" }).$type<SignedCompliancePacketShareAuditEvent[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_compliance_packet_share_workspace_idx").on(table.workspaceId),
    index("workspace_compliance_packet_share_packet_idx").on(table.workspaceId, table.packetId),
    index("workspace_compliance_packet_share_recipient_idx").on(table.workspaceId, table.recipientEmail),
    index("workspace_compliance_packet_share_expires_idx").on(table.workspaceId, table.expiresAt),
    uniqueIndex("workspace_compliance_packet_share_token_idx").on(table.tokenDigest),
  ],
);

export const workspaceReleaseDrillHistory = sqliteTable(
  "workspace_release_drill_history",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    drillId: text("drill_id").notNull(),
    contentHash: text("content_hash").notNull(),
    workspaceName: text("workspace_name").notNull(),
    score: integer("score").notNull(),
    totalCount: integer("total_count").notNull(),
    readyCount: integer("ready_count").notNull(),
    watchCount: integer("watch_count").notNull(),
    missingCount: integer("missing_count").notNull(),
    blockedCount: integer("blocked_count").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    report: text("report", { mode: "json" }).$type<ReleaseDrillSimulationReport>().notNull(),
    drillRows: text("drill_rows", { mode: "json" }).$type<ReleaseDrillHistoryScenarioRecord[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_release_drill_history_workspace_idx").on(table.workspaceId),
    index("workspace_release_drill_history_actor_idx").on(table.actorUserId),
    index("workspace_release_drill_history_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_release_drill_history_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceExecutiveReleaseSnapshot = sqliteTable(
  "workspace_executive_release_snapshot",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    snapshotId: text("snapshot_id").notNull(),
    contentHash: text("content_hash").notNull(),
    workspaceName: text("workspace_name").notNull(),
    status: text("status").$type<ExecutiveReleaseIntelligenceStatus>().notNull(),
    executiveScore: integer("executive_score").notNull(),
    blockedCount: integer("blocked_count").notNull(),
    watchCount: integer("watch_count").notNull(),
    readyCount: integer("ready_count").notNull(),
    criticalPathCount: integer("critical_path_count").notNull(),
    lowestDomain: text("lowest_domain").$type<ExecutiveReleaseIntelligenceDomain>().notNull(),
    topAction: text("top_action").notNull(),
    domainScores: text("domain_scores", { mode: "json" }).$type<Record<ExecutiveReleaseIntelligenceDomain, number>>().notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    report: text("report", { mode: "json" }).$type<ExecutiveReleaseIntelligenceReport>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_executive_release_snapshot_workspace_idx").on(table.workspaceId),
    index("workspace_executive_release_snapshot_actor_idx").on(table.actorUserId),
    index("workspace_executive_release_snapshot_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_executive_release_snapshot_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceBoardApprovalPacket = sqliteTable(
  "workspace_board_approval_packet",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    createdByEmail: text("created_by_email"),
    packetId: text("packet_id").notNull(),
    contentHash: text("content_hash").notNull(),
    recordStatus: text("record_status").$type<BoardApprovalPacketHistoryRecordStatus>().notNull().default("active"),
    approvalStatus: text("approval_status").$type<BoardApprovalPacketStatus>().notNull(),
    approvalScore: integer("approval_score").notNull(),
    blockedSignOffCount: integer("blocked_sign_off_count").notNull(),
    watchSignOffCount: integer("watch_sign_off_count").notNull(),
    readySignOffCount: integer("ready_sign_off_count").notNull(),
    criticalPathCount: integer("critical_path_count").notNull(),
    recipientEmail: text("recipient_email"),
    recipientName: text("recipient_name"),
    recipientPurpose: text("recipient_purpose").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    packet: text("packet", { mode: "json" }).$type<BoardApprovalPacketReport>().notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, { onDelete: "set null" }),
    revokedByName: text("revoked_by_name"),
    revokedByEmail: text("revoked_by_email"),
    revokeReason: text("revoke_reason"),
    downloadCount: integer("download_count").notNull().default(0),
    auditTrail: text("audit_trail", { mode: "json" }).$type<BoardApprovalPacketHistoryAuditEvent[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_approval_packet_workspace_idx").on(table.workspaceId),
    index("workspace_board_approval_packet_created_by_idx").on(table.createdByUserId),
    index("workspace_board_approval_packet_packet_idx").on(table.workspaceId, table.packetId),
    index("workspace_board_approval_packet_status_idx").on(table.workspaceId, table.recordStatus),
    index("workspace_board_approval_packet_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_board_approval_packet_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceBoardReleaseArchiveIntelligencePacket = sqliteTable(
  "workspace_board_release_archive_intelligence_packet",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    contentHash: text("content_hash").notNull(),
    packetHash: text("packet_hash").notNull(),
    packetStatus: text("packet_status").$type<BoardReleaseCloseoutReadinessGateStatus>().notNull(),
    packetScore: integer("packet_score").notNull(),
    sectionCount: integer("section_count").notNull(),
    recommendationCount: integer("recommendation_count").notNull(),
    blockedSectionCount: integer("blocked_section_count").notNull(),
    blockedRecommendationCount: integer("blocked_recommendation_count").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    packet: text("packet", { mode: "json" }).$type<BoardReleaseArchiveIntelligencePacketReport>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_release_archive_intelligence_packet_workspace_idx").on(table.workspaceId),
    index("workspace_board_release_archive_intelligence_packet_actor_idx").on(table.actorUserId),
    index("workspace_board_release_archive_intelligence_packet_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_board_release_archive_intelligence_packet_hash_idx").on(table.workspaceId, table.packetHash),
  ],
);

export const workspaceBoardPostApprovalAction = sqliteTable(
  "workspace_board_post_approval_action",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    createdByEmail: text("created_by_email"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
    updatedByName: text("updated_by_name"),
    updatedByEmail: text("updated_by_email"),
    sourceKey: text("source_key").notNull(),
    runbookSourceKey: text("runbook_source_key").notNull(),
    calendarSourceKey: text("calendar_source_key").notNull(),
    role: text("role").$type<BoardApprovalPacketSignOffRole>().notNull(),
    status: text("status").$type<BoardApprovalPostApprovalActionStatus>().notNull(),
    title: text("title").notNull(),
    action: text("action").notNull(),
    ownerName: text("owner_name").notNull(),
    ownerEmail: text("owner_email"),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    trackerGeneratedAt: integer("tracker_generated_at", { mode: "timestamp" }).notNull(),
    contentHash: text("content_hash").notNull(),
    refreshCount: integer("refresh_count").notNull().default(0),
    generatedAction: text("generated_action", { mode: "json" }).$type<BoardApprovalPostApprovalAction>().notNull(),
    auditTrail: text("audit_trail", { mode: "json" }).$type<BoardApprovalPostApprovalActionAuditEvent[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("workspace_board_post_approval_action_source_idx").on(table.workspaceId, table.sourceKey),
    index("workspace_board_post_approval_action_workspace_idx").on(table.workspaceId),
    index("workspace_board_post_approval_action_status_idx").on(table.workspaceId, table.status),
    index("workspace_board_post_approval_action_due_idx").on(table.workspaceId, table.dueAt),
    index("workspace_board_post_approval_action_updated_idx").on(table.workspaceId, table.updatedAt),
  ],
);

export const workspaceBoardDecisionReplaySnapshot = sqliteTable(
  "workspace_board_decision_replay_snapshot",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    snapshotId: text("snapshot_id").notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status").$type<BoardDecisionReplayAuditStatus>().notNull(),
    replayScore: integer("replay_score").notNull(),
    blockedRowCount: integer("blocked_row_count").notNull(),
    watchRowCount: integer("watch_row_count").notNull(),
    rowCount: integer("row_count").notNull(),
    activeApprovalCount: integer("active_approval_count").notNull(),
    laterIncidentCount: integer("later_incident_count").notNull(),
    releaseEvidenceDriftCount: integer("release_evidence_drift_count").notNull(),
    runbookBlockedCount: integer("runbook_blocked_count").notNull(),
    runbookIncompleteCount: integer("runbook_incomplete_count").notNull(),
    topAction: text("top_action").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    report: text("report", { mode: "json" }).$type<BoardDecisionReplayAuditReport>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_decision_replay_snapshot_workspace_idx").on(table.workspaceId),
    index("workspace_board_decision_replay_snapshot_actor_idx").on(table.actorUserId),
    index("workspace_board_decision_replay_snapshot_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_board_decision_replay_snapshot_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceBoardAuditFollowUpTaskRecord = sqliteTable(
  "workspace_board_audit_follow_up_task_record",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    recordId: text("record_id").notNull(),
    contentHash: text("content_hash").notNull(),
    taskCount: integer("task_count").notNull(),
    assignedCount: integer("assigned_count").notNull(),
    closedCount: integer("closed_count").notNull(),
    overdueCount: integer("overdue_count").notNull(),
    closureScore: integer("closure_score").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    persisted: text("persisted", { mode: "json" }).$type<PersistedBoardAuditFollowUpTasksReport>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_audit_follow_up_task_record_workspace_idx").on(table.workspaceId),
    index("workspace_board_audit_follow_up_task_record_actor_idx").on(table.actorUserId),
    index("workspace_board_audit_follow_up_task_record_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_board_audit_follow_up_task_record_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceBoardAuditFollowUpTaskState = sqliteTable(
  "workspace_board_audit_follow_up_task_state",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<BoardAuditTaskCloseoutStatus>().notNull().default("open"),
    closeoutNote: text("closeout_note"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    ownerName: text("owner_name").notNull(),
    ownerEmail: text("owner_email"),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    closedAt: integer("closed_at", { mode: "timestamp" }),
    state: text("state", { mode: "json" }).$type<BoardAuditTaskCloseoutState>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_audit_follow_up_task_state_workspace_idx").on(table.workspaceId),
    index("workspace_board_audit_follow_up_task_state_owner_idx").on(table.ownerUserId),
    index("workspace_board_audit_follow_up_task_state_status_idx").on(table.workspaceId, table.status),
    index("workspace_board_audit_follow_up_task_state_due_idx").on(table.workspaceId, table.dueAt),
    uniqueIndex("workspace_board_audit_follow_up_task_state_workspace_task_idx").on(table.workspaceId, table.taskId),
  ],
);

export const workspaceBoardAssuranceNotificationDelivery = sqliteTable(
  "workspace_board_assurance_notification_delivery",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    historyId: text("history_id").notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status").$type<BoardAssuranceNotificationDeliveryStatus>().notNull(),
    notificationCount: integer("notification_count").notNull(),
    routeCount: integer("route_count").notNull(),
    eligibleRouteCount: integer("eligible_route_count").notNull(),
    emailEligibleCount: integer("email_eligible_count").notNull(),
    inAppEligibleCount: integer("in_app_eligible_count").notNull(),
    acknowledgedRouteCount: integer("acknowledged_route_count").notNull(),
    pendingAcknowledgementCount: integer("pending_acknowledgement_count").notNull(),
    retryNeededCount: integer("retry_needed_count").notNull(),
    changedRouteCount: integer("changed_route_count").notNull(),
    newRouteCount: integer("new_route_count").notNull(),
    removedRouteCount: integer("removed_route_count").notNull(),
    suppressedRouteCount: integer("suppressed_route_count").notNull(),
    removedRouteDedupeKeys: text("removed_route_dedupe_keys", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    report: text("report", { mode: "json" }).$type<BoardAssuranceNotificationRoutingReport>().notNull(),
    routes: text("routes", { mode: "json" }).$type<BoardAssuranceNotificationRouteHistoryState[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_assurance_notification_delivery_workspace_idx").on(table.workspaceId),
    index("workspace_board_assurance_notification_delivery_actor_idx").on(table.actorUserId),
    index("workspace_board_assurance_notification_delivery_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_board_assurance_notification_delivery_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceBoardOperationsReviewCycle = sqliteTable(
  "workspace_board_operations_review_cycle",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    reviewCycleId: text("review_cycle_id").notNull(),
    reviewCycle: text("review_cycle", { mode: "json" }).$type<BoardOperationsReviewCycle>().notNull(),
    actor: text("actor", { mode: "json" }).$type<BoardOperationsReviewCycleHistoryActor>().notNull(),
    auditHash: text("audit_hash").notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status").$type<BoardOperationsControlStatus>().notNull(),
    ownerCloseoutState: text("owner_closeout_state").$type<BoardOperationsReviewCycleCloseoutState>().notNull(),
    controlScore: integer("control_score").notNull(),
    blockedControlCount: integer("blocked_control_count").notNull(),
    watchControlCount: integer("watch_control_count").notNull(),
    readyControlCount: integer("ready_control_count").notNull(),
    closeoutReport: text("closeout_report").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    controlCenter: text("control_center", { mode: "json" }).$type<BoardOperationsControlCenterReport>().notNull(),
    jsonContent: text("json_content").notNull(),
    csvContent: text("csv_content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_board_operations_review_cycle_workspace_idx").on(table.workspaceId),
    index("workspace_board_operations_review_cycle_actor_idx").on(table.actorUserId),
    index("workspace_board_operations_review_cycle_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_board_operations_review_cycle_cycle_idx").on(table.workspaceId, table.reviewCycleId),
    index("workspace_board_operations_review_cycle_hash_idx").on(table.workspaceId, table.auditHash),
  ],
);

export const workspaceRegressionWatchlistSnapshot = sqliteTable(
  "workspace_regression_watchlist_snapshot",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    snapshotId: text("snapshot_id").notNull(),
    contentHash: text("content_hash").notNull(),
    workspaceName: text("workspace_name").notNull(),
    itemCount: integer("item_count").notNull(),
    severeCount: integer("severe_count").notNull(),
    recurringCount: integer("recurring_count").notNull(),
    jsonFileName: text("json_file_name").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    jsonByteSize: integer("json_byte_size").notNull(),
    csvByteSize: integer("csv_byte_size").notNull(),
    report: text("report", { mode: "json" }).$type<ProjectRegressionWatchlistReport>().notNull(),
    states: text("states", { mode: "json" }).$type<ProjectRegressionWatchlistItemTriageState[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_regression_watchlist_snapshot_workspace_idx").on(table.workspaceId),
    index("workspace_regression_watchlist_snapshot_actor_idx").on(table.actorUserId),
    index("workspace_regression_watchlist_snapshot_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_regression_watchlist_snapshot_hash_idx").on(table.workspaceId, table.contentHash),
  ],
);

export const workspaceRegressionWatchlistItemState = sqliteTable(
  "workspace_regression_watchlist_item_state",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<ProjectRegressionWatchlistTriageStatus>().notNull().default("open"),
    note: text("note"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    ownerName: text("owner_name"),
    ownerEmail: text("owner_email"),
    snoozedUntil: integer("snoozed_until", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_regression_watchlist_item_state_workspace_idx").on(table.workspaceId),
    index("workspace_regression_watchlist_item_state_project_idx").on(table.projectId),
    index("workspace_regression_watchlist_item_state_owner_idx").on(table.ownerUserId),
    index("workspace_regression_watchlist_item_state_status_idx").on(table.workspaceId, table.status),
    uniqueIndex("workspace_regression_watchlist_item_state_workspace_item_idx").on(table.workspaceId, table.itemId),
  ],
);

export const workspaceRoleAccessReviewAttestation = sqliteTable(
  "workspace_role_access_review_attestation",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    campaignId: text("campaign_id").notNull(),
    scopeHash: text("scope_hash").notNull(),
    memberId: text("member_id").notNull(),
    memberUserId: text("member_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    memberName: text("member_name").notNull(),
    workspaceRole: text("workspace_role").$type<WorkspaceRole>().notNull(),
    status: text("status").$type<RoleAccessReviewPersistedAttestationStatus>().notNull(),
    note: text("note"),
    grantEvidence: text("grant_evidence").notNull(),
    reviewScopeCount: integer("review_scope_count").notNull(),
    attestedAt: integer("attested_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_role_access_review_attestation_workspace_idx").on(table.workspaceId),
    index("workspace_role_access_review_attestation_actor_idx").on(table.actorUserId),
    index("workspace_role_access_review_attestation_member_idx").on(table.memberUserId),
    index("workspace_role_access_review_attestation_campaign_idx").on(table.workspaceId, table.campaignId),
    uniqueIndex("workspace_role_access_review_attestation_member_unique_idx").on(table.workspaceId, table.campaignId, table.memberId),
  ],
);

export const workspaceRoleAccessReviewReminderDelivery = sqliteTable(
  "workspace_role_access_review_reminder_delivery",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    campaignId: text("campaign_id").notNull(),
    scopeHash: text("scope_hash").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    memberId: text("member_id").notNull(),
    memberUserId: text("member_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name").notNull(),
    channel: text("channel").$type<RoleAccessReviewReminderDeliveryChannel>().notNull(),
    subject: text("subject").notNull(),
    previewText: text("preview_text").notNull(),
    status: text("status").$type<RoleAccessReviewReminderDeliveryStatus>().notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_role_access_review_reminder_workspace_idx").on(table.workspaceId),
    index("workspace_role_access_review_reminder_actor_idx").on(table.actorUserId),
    index("workspace_role_access_review_reminder_member_idx").on(table.memberUserId),
    index("workspace_role_access_review_reminder_campaign_idx").on(table.workspaceId, table.campaignId),
    index("workspace_role_access_review_reminder_status_idx").on(table.workspaceId, table.status),
    uniqueIndex("workspace_role_access_review_reminder_dedupe_idx").on(table.dedupeKey),
  ],
);

export const projectFolder = sqliteTable(
  "project_folder",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspace.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("project_folder_user_idx").on(table.userId), index("project_folder_workspace_idx").on(table.workspaceId)],
);

export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspace.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => projectFolder.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sceneData: text("scene_data", { mode: "json" }).notNull(),
    shareId: text("share_id").unique(),
    shareSettings: text("share_settings", { mode: "json" }).$type<ShareSettings | null>(),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("project_user_idx").on(table.userId), index("project_workspace_idx").on(table.workspaceId)],
);

export const projectComment = sqliteTable(
  "project_comment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    objectId: text("object_id"),
    body: text("body").notNull(),
    position: text("position", { mode: "json" }).notNull(),
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("project_comment_project_idx").on(table.projectId), index("project_comment_user_idx").on(table.userId)],
);

export const projectAccessGrant = sqliteTable(
  "project_access_grant",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<ProjectAccessRole>().notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_access_grant_project_idx").on(table.projectId),
    index("project_access_grant_user_idx").on(table.userId),
    uniqueIndex("project_access_grant_project_user_idx").on(table.projectId, table.userId),
  ],
);

export const projectAuditEvent = sqliteTable(
  "project_audit_event",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    category: text("category").$type<ProjectAuditCategory>().notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    summary: text("summary").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<ProjectAuditEventMetadata | null>(),
    tombstone: text("tombstone", { mode: "json" }).$type<ProjectAuditEventMetadata | null>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_audit_event_project_idx").on(table.projectId),
    index("project_audit_event_actor_idx").on(table.actorUserId),
    index("project_audit_event_created_idx").on(table.createdAt),
  ],
);

export const projectTemplate = sqliteTable(
  "project_template",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceProjectId: text("source_project_id").references(() => project.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sceneData: text("scene_data", { mode: "json" }).$type<SceneDocument>().notNull(),
    shareSettings: text("share_settings", { mode: "json" }).$type<ShareSettings | null>(),
    exportPresetId: text("export_preset_id").$type<ProjectExportPresetId>().notNull(),
    reviewPolicyPresetId: text("review_policy_preset_id").$type<ProjectReviewPolicyPresetId>().notNull(),
    folderName: text("folder_name").notNull(),
    useCount: integer("use_count").notNull().default(0),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    lastUsedByUserId: text("last_used_by_user_id").references(() => user.id, { onDelete: "set null" }),
    lastUsedProjectId: text("last_used_project_id").references(() => project.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    versionHistory: text("version_history", { mode: "json" }).$type<ProjectTemplateVersionEntry[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_template_workspace_idx").on(table.workspaceId),
    index("project_template_created_by_idx").on(table.createdByUserId),
    index("project_template_source_project_idx").on(table.sourceProjectId),
    index("project_template_last_used_idx").on(table.lastUsedAt),
  ],
);

export const projectHealthNotificationState = sqliteTable(
  "project_health_notification_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    notificationId: text("notification_id").notNull(),
    readAt: integer("read_at", { mode: "timestamp" }),
    dismissedAt: integer("dismissed_at", { mode: "timestamp" }),
    snoozedUntil: integer("snoozed_until", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_health_notification_state_user_idx").on(table.userId),
    index("project_health_notification_state_project_idx").on(table.projectId),
    index("project_health_notification_state_notification_idx").on(table.notificationId),
    uniqueIndex("project_health_notification_state_user_notification_idx").on(table.userId, table.notificationId),
  ],
);

export const projectDataRetentionPolicy = sqliteTable(
  "project_data_retention_policy",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    auditLogDays: integer("audit_log_days").notNull().default(730),
    commentDays: integer("comment_days").notNull().default(365),
    versionDays: integer("version_days").notNull().default(180),
    deletedAssetTombstoneDays: integer("deleted_asset_tombstone_days").notNull().default(730),
    purgeReviewStatus: text("purge_review_status").$type<ProjectDataRetentionPurgeReviewStatus>().notNull().default("draft"),
    purgeReviewRequestedAt: integer("purge_review_requested_at", { mode: "timestamp" }),
    purgeApprovedAt: integer("purge_approved_at", { mode: "timestamp" }),
    purgeApprovedByUserId: text("purge_approved_by_user_id").references(() => user.id, { onDelete: "set null" }),
    purgeApprovalNote: text("purge_approval_note"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_data_retention_policy_project_idx").on(table.projectId),
    index("project_data_retention_policy_updated_by_idx").on(table.updatedByUserId),
    uniqueIndex("project_data_retention_policy_project_unique_idx").on(table.projectId),
  ],
);

export const projectArtifactRegistryEntry = sqliteTable(
  "project_artifact_registry_entry",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    artifactId: text("artifact_id").notNull(),
    sourceVersionId: text("source_version_id").notNull(),
    kind: text("kind").$type<ProjectArtifactRegistryKind>().notNull(),
    label: text("label").notNull(),
    status: text("status").$type<ProjectArtifactRegistryStatus>().notNull(),
    visibility: text("visibility").$type<ProjectArtifactRegistryVisibility>().notNull(),
    signatureState: text("signature_state").$type<ProjectArtifactRegistrySignatureState>().notNull(),
    path: text("path"),
    url: text("url"),
    requiresAuth: integer("requires_auth", { mode: "boolean" }).notNull().default(false),
    metadata: text("metadata", { mode: "json" }).$type<ProjectArtifactRegistryMetadata | null>(),
    registeredAt: integer("registered_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_artifact_registry_entry_project_idx").on(table.projectId),
    index("project_artifact_registry_entry_kind_idx").on(table.kind),
    index("project_artifact_registry_entry_updated_idx").on(table.updatedAt),
    uniqueIndex("project_artifact_registry_entry_source_key_idx").on(table.sourceKey),
  ],
);

export const projectAppPackageCertificate = sqliteTable(
  "project_app_package_certificate",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    presetId: text("preset_id").$type<AppPackagePresetId | null>(),
    platform: text("platform").$type<ProjectAppPackageCertificatePlatform>().notNull(),
    sourceArtifactId: text("source_artifact_id"),
    subject: text("subject").notNull(),
    issuer: text("issuer").notNull(),
    serialNumber: text("serial_number").notNull(),
    fingerprintSha256: text("fingerprint_sha256").notNull(),
    bundleIdentifier: text("bundle_identifier"),
    teamId: text("team_id"),
    metadata: text("metadata", { mode: "json" }).$type<ProjectAppPackageCertificateMetadata | null>(),
    validFrom: integer("valid_from", { mode: "timestamp" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull(),
    verifiedAt: integer("verified_at", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
  },
  (table) => [
    index("project_app_package_certificate_project_idx").on(table.projectId),
    index("project_app_package_certificate_platform_idx").on(table.projectId, table.platform),
    index("project_app_package_certificate_expires_idx").on(table.expiresAt),
    uniqueIndex("project_app_package_certificate_unique_idx").on(table.projectId, table.presetId, table.platform, table.fingerprintSha256),
  ],
);

export const projectCadConversionJob = sqliteTable(
  "project_cad_conversion_job",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspace.id, { onDelete: "set null" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    sourceFileName: text("source_file_name").notNull(),
    sourceBytes: integer("source_bytes").notNull(),
    sourceKind: text("source_kind").$type<Extract<CadSourceKind, "exchange" | "native-cad">>().notNull(),
    target: text("target").$type<CadConversionTarget>().notNull(),
    adapterId: text("adapter_id").$type<CadConversionWorkerAdapterId>().notNull(),
    command: text("command").notNull(),
    outputFileName: text("output_file_name").notNull(),
    status: text("status").$type<ProjectCadConversionJobStatus>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    diagnostics: text("diagnostics", { mode: "json" }).$type<CadConversionValidationReport>().notNull(),
    logs: text("logs", { mode: "json" }).$type<ProjectCadConversionJobLogEntry[]>().notNull().default(sql`'[]'`),
    metadata: text("metadata", { mode: "json" }).$type<ProjectCadConversionJobMetadata | null>(),
    errorMessage: text("error_message"),
    resultPath: text("result_path"),
    queuedAt: integer("queued_at", { mode: "timestamp" }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_cad_conversion_job_workspace_idx").on(table.workspaceId),
    index("project_cad_conversion_job_project_idx").on(table.projectId),
    index("project_cad_conversion_job_status_idx").on(table.status),
    index("project_cad_conversion_job_updated_idx").on(table.updatedAt),
  ],
);

export const projectPublicSurfaceHealthSnapshot = sqliteTable(
  "project_public_surface_health_snapshot",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    batchId: text("batch_id").notNull(),
    sourceKey: text("source_key").notNull(),
    sourceVersionId: text("source_version_id").notNull(),
    surface: text("surface").$type<ProjectPublicSurfaceHealthSurface>().notNull(),
    label: text("label").notNull(),
    status: text("status").$type<ProjectPublicSurfaceHealthStatus>().notNull(),
    statusCode: integer("status_code"),
    latencyMs: integer("latency_ms"),
    path: text("path"),
    url: text("url"),
    screenshotArtifactId: text("screenshot_artifact_id"),
    screenshotHash: text("screenshot_hash"),
    screenshotWidth: integer("screenshot_width"),
    screenshotHeight: integer("screenshot_height"),
    screenshotByteSize: integer("screenshot_byte_size"),
    screenshotCapturedAt: integer("screenshot_captured_at", { mode: "timestamp" }),
    screenshotPath: text("screenshot_path"),
    screenshotState: text("screenshot_state").$type<ProjectPublicSurfaceScreenshotState>().notNull(),
    screenshotDiffScore: integer("screenshot_diff_score"),
    screenshotDiffSummary: text("screenshot_diff_summary"),
    issues: text("issues", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    checkedAt: integer("checked_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_public_surface_health_snapshot_workspace_idx").on(table.workspaceId),
    index("project_public_surface_health_snapshot_project_idx").on(table.projectId),
    index("project_public_surface_health_snapshot_status_idx").on(table.workspaceId, table.status),
    index("project_public_surface_health_snapshot_checked_idx").on(table.workspaceId, table.checkedAt),
    uniqueIndex("project_public_surface_health_snapshot_batch_source_idx").on(table.workspaceId, table.batchId, table.sourceKey),
  ],
);

export const workspaceSceneQaBaseline = sqliteTable(
  "workspace_scene_qa_baseline",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    templateId: text("template_id"),
    deploymentId: text("deployment_id").notNull(),
    comparisonId: text("comparison_id").notNull(),
    snapshotComparisonId: text("snapshot_comparison_id").notNull(),
    surface: text("surface").$type<SceneQaSnapshotSurface>().notNull(),
    targetName: text("target_name").notNull(),
    status: text("status").$type<SceneQaSnapshotStatus>().notNull(),
    actualSignature: text("actual_signature"),
    expectedSignature: text("expected_signature"),
    issueCount: integer("issue_count").notNull().default(0),
    issues: text("issues", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    path: text("path"),
    capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_scene_qa_baseline_workspace_idx").on(table.workspaceId),
    index("workspace_scene_qa_baseline_deployment_idx").on(table.workspaceId, table.deploymentId),
    index("workspace_scene_qa_baseline_captured_idx").on(table.workspaceId, table.capturedAt),
    index("workspace_scene_qa_baseline_project_idx").on(table.projectId),
    uniqueIndex("workspace_scene_qa_baseline_workspace_deployment_comparison_idx").on(table.workspaceId, table.deploymentId, table.comparisonId),
  ],
);

export const projectFolderAccessGrant = sqliteTable(
  "project_folder_access_grant",
  {
    id: text("id").primaryKey(),
    folderId: text("folder_id")
      .notNull()
      .references(() => projectFolder.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<ProjectAccessRole>().notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_folder_access_grant_folder_idx").on(table.folderId),
    index("project_folder_access_grant_user_idx").on(table.userId),
    uniqueIndex("project_folder_access_grant_folder_user_idx").on(table.folderId, table.userId),
  ],
);

export const projectPresence = sqliteTable(
  "project_presence",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cursor: text("cursor", { mode: "json" }).$type<ProjectPresenceCursor | null>(),
    selectedObjectId: text("selected_object_id"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_presence_project_idx").on(table.projectId),
    index("project_presence_user_idx").on(table.userId),
    uniqueIndex("project_presence_project_user_idx").on(table.projectId, table.userId),
  ],
);

export const projectCollaborationOperationBatch = sqliteTable(
  "project_collaboration_operation_batch",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    batchId: text("batch_id").notNull().unique(),
    clientId: text("client_id").notNull(),
    clientSequence: integer("client_sequence").notNull().default(0),
    causalId: text("causal_id").notNull().default(""),
    baseUpdatedAt: integer("base_updated_at", { mode: "timestamp" }),
    operations: text("operations", { mode: "json" }).$type<SceneCollaborationOperation[]>().notNull(),
    operationCount: integer("operation_count").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_collaboration_operation_batch_project_idx").on(table.projectId),
    index("project_collaboration_operation_batch_user_idx").on(table.userId),
    index("project_collaboration_operation_batch_created_idx").on(table.createdAt),
    index("project_collaboration_operation_batch_causal_idx").on(table.projectId, table.clientId, table.clientSequence),
    uniqueIndex("project_collaboration_operation_batch_batch_idx").on(table.batchId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  projects: many(project),
  projectFolders: many(projectFolder),
  projectComments: many(projectComment),
  projectAccessGrants: many(projectAccessGrant),
  projectAuditEvents: many(projectAuditEvent),
  projectTemplates: many(projectTemplate),
  projectHealthNotificationStates: many(projectHealthNotificationState),
  workspaceSceneQaBaselines: many(workspaceSceneQaBaseline),
  projectFolderAccessGrants: many(projectFolderAccessGrant),
  projectPresence: many(projectPresence),
  projectCollaborationOperationBatches: many(projectCollaborationOperationBatch),
  ownedWorkspaces: many(workspace),
  workspaceMemberships: many(workspaceMember),
  sentWorkspaceInvites: many(workspaceInvite, { relationName: "sentWorkspaceInvites" }),
  acceptedWorkspaceInvites: many(workspaceInvite, { relationName: "acceptedWorkspaceInvites" }),
  workspaceNotificationDeliveryPreferences: many(workspaceNotificationDeliveryPreference),
  workspaceNotificationEmailDeliveries: many(workspaceNotificationEmailDelivery),
  workspaceReleaseReadinessWebhookEvents: many(workspaceReleaseReadinessWebhookEvent),
  workspaceRiskDigestPackets: many(workspaceRiskDigestPacket),
  createdCompliancePacketShares: many(workspaceCompliancePacketShare, { relationName: "createdCompliancePacketShares" }),
  revokedCompliancePacketShares: many(workspaceCompliancePacketShare, { relationName: "revokedCompliancePacketShares" }),
  boardReleaseArchiveIntelligencePackets: many(workspaceBoardReleaseArchiveIntelligencePacket),
  workspaceReleaseDrillHistory: many(workspaceReleaseDrillHistory),
  workspaceBoardAuditFollowUpTaskRecords: many(workspaceBoardAuditFollowUpTaskRecord),
  workspaceBoardAuditFollowUpTaskStates: many(workspaceBoardAuditFollowUpTaskState),
  workspaceRegressionWatchlistSnapshots: many(workspaceRegressionWatchlistSnapshot),
  workspaceRegressionWatchlistItemStates: many(workspaceRegressionWatchlistItemState),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const projectRelations = relations(project, ({ many, one }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id],
  }),
  folder: one(projectFolder, {
    fields: [project.folderId],
    references: [projectFolder.id],
  }),
  accessGrants: many(projectAccessGrant),
  auditEvents: many(projectAuditEvent),
  templates: many(projectTemplate),
  healthNotificationStates: many(projectHealthNotificationState),
  dataRetentionPolicy: one(projectDataRetentionPolicy),
  artifactRegistryEntries: many(projectArtifactRegistryEntry),
  appPackageCertificates: many(projectAppPackageCertificate),
  cadConversionJobs: many(projectCadConversionJob),
  publicSurfaceHealthSnapshots: many(projectPublicSurfaceHealthSnapshot),
  regressionWatchlistItemStates: many(workspaceRegressionWatchlistItemState),
  releaseRunbookRecords: many(workspaceReleaseRunbookRecord),
  sceneQaBaselines: many(workspaceSceneQaBaseline),
  releaseCalendarMilestones: many(workspaceReleaseCalendarMilestone),
  presence: many(projectPresence),
  collaborationOperationBatches: many(projectCollaborationOperationBatch),
}));

export const workspaceNotificationDeliveryPreferenceRelations = relations(workspaceNotificationDeliveryPreference, ({ one }) => ({
  user: one(user, {
    fields: [workspaceNotificationDeliveryPreference.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceNotificationDeliveryPreference.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceNotificationEmailDeliveryRelations = relations(workspaceNotificationEmailDelivery, ({ many, one }) => ({
  attempts: many(workspaceNotificationEmailDeliveryAttempt),
  project: one(project, {
    fields: [workspaceNotificationEmailDelivery.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [workspaceNotificationEmailDelivery.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceNotificationEmailDelivery.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceNotificationEmailDeliveryAttemptRelations = relations(workspaceNotificationEmailDeliveryAttempt, ({ one }) => ({
  delivery: one(workspaceNotificationEmailDelivery, {
    fields: [workspaceNotificationEmailDeliveryAttempt.deliveryId],
    references: [workspaceNotificationEmailDelivery.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceNotificationEmailDeliveryAttempt.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceReleaseReadinessWebhookEventRelations = relations(workspaceReleaseReadinessWebhookEvent, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceReleaseReadinessWebhookEvent.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceReleaseCalendarMilestoneRelations = relations(workspaceReleaseCalendarMilestone, ({ one }) => ({
  project: one(project, {
    fields: [workspaceReleaseCalendarMilestone.projectId],
    references: [project.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceReleaseCalendarMilestone.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceReleaseRunbookRecordRelations = relations(workspaceReleaseRunbookRecord, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceReleaseRunbookRecord.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [workspaceReleaseRunbookRecord.projectId],
    references: [project.id],
  }),
  owner: one(user, {
    fields: [workspaceReleaseRunbookRecord.ownerUserId],
    references: [user.id],
  }),
}));

export const workspaceRiskDigestPacketRelations = relations(workspaceRiskDigestPacket, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceRiskDigestPacket.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceRiskDigestPacket.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceCompliancePacketShareRelations = relations(workspaceCompliancePacketShare, ({ one }) => ({
  createdBy: one(user, {
    fields: [workspaceCompliancePacketShare.createdByUserId],
    references: [user.id],
    relationName: "createdCompliancePacketShares",
  }),
  revokedBy: one(user, {
    fields: [workspaceCompliancePacketShare.revokedByUserId],
    references: [user.id],
    relationName: "revokedCompliancePacketShares",
  }),
  workspace: one(workspace, {
    fields: [workspaceCompliancePacketShare.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceReleaseDrillHistoryRelations = relations(workspaceReleaseDrillHistory, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceReleaseDrillHistory.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceReleaseDrillHistory.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceExecutiveReleaseSnapshotRelations = relations(workspaceExecutiveReleaseSnapshot, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceExecutiveReleaseSnapshot.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceExecutiveReleaseSnapshot.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardApprovalPacketRelations = relations(workspaceBoardApprovalPacket, ({ one }) => ({
  createdBy: one(user, {
    fields: [workspaceBoardApprovalPacket.createdByUserId],
    references: [user.id],
    relationName: "createdBoardApprovalPackets",
  }),
  revokedBy: one(user, {
    fields: [workspaceBoardApprovalPacket.revokedByUserId],
    references: [user.id],
    relationName: "revokedBoardApprovalPackets",
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardApprovalPacket.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardReleaseArchiveIntelligencePacketRelations = relations(workspaceBoardReleaseArchiveIntelligencePacket, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceBoardReleaseArchiveIntelligencePacket.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardReleaseArchiveIntelligencePacket.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardPostApprovalActionRelations = relations(workspaceBoardPostApprovalAction, ({ one }) => ({
  createdBy: one(user, {
    fields: [workspaceBoardPostApprovalAction.createdByUserId],
    references: [user.id],
    relationName: "createdBoardPostApprovalActions",
  }),
  updatedBy: one(user, {
    fields: [workspaceBoardPostApprovalAction.updatedByUserId],
    references: [user.id],
    relationName: "updatedBoardPostApprovalActions",
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardPostApprovalAction.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardDecisionReplaySnapshotRelations = relations(workspaceBoardDecisionReplaySnapshot, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceBoardDecisionReplaySnapshot.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardDecisionReplaySnapshot.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardAuditFollowUpTaskRecordRelations = relations(workspaceBoardAuditFollowUpTaskRecord, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceBoardAuditFollowUpTaskRecord.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardAuditFollowUpTaskRecord.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardAuditFollowUpTaskStateRelations = relations(workspaceBoardAuditFollowUpTaskState, ({ one }) => ({
  owner: one(user, {
    fields: [workspaceBoardAuditFollowUpTaskState.ownerUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardAuditFollowUpTaskState.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardAssuranceNotificationDeliveryRelations = relations(workspaceBoardAssuranceNotificationDelivery, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceBoardAssuranceNotificationDelivery.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardAssuranceNotificationDelivery.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceBoardOperationsReviewCycleRelations = relations(workspaceBoardOperationsReviewCycle, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceBoardOperationsReviewCycle.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceBoardOperationsReviewCycle.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceRegressionWatchlistSnapshotRelations = relations(workspaceRegressionWatchlistSnapshot, ({ one }) => ({
  actor: one(user, {
    fields: [workspaceRegressionWatchlistSnapshot.actorUserId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceRegressionWatchlistSnapshot.workspaceId],
    references: [workspace.id],
  }),
}));

export const workspaceRegressionWatchlistItemStateRelations = relations(workspaceRegressionWatchlistItemState, ({ one }) => ({
  owner: one(user, {
    fields: [workspaceRegressionWatchlistItemState.ownerUserId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [workspaceRegressionWatchlistItemState.projectId],
    references: [project.id],
  }),
  workspace: one(workspace, {
    fields: [workspaceRegressionWatchlistItemState.workspaceId],
    references: [workspace.id],
  }),
}));

export const projectCommentRelations = relations(projectComment, ({ one }) => ({
  user: one(user, {
    fields: [projectComment.userId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [projectComment.projectId],
    references: [project.id],
  }),
}));

export const projectAccessGrantRelations = relations(projectAccessGrant, ({ one }) => ({
  project: one(project, {
    fields: [projectAccessGrant.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectAccessGrant.userId],
    references: [user.id],
  }),
  createdBy: one(user, {
    fields: [projectAccessGrant.createdByUserId],
    references: [user.id],
  }),
}));

export const projectAuditEventRelations = relations(projectAuditEvent, ({ one }) => ({
  actor: one(user, {
    fields: [projectAuditEvent.actorUserId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [projectAuditEvent.projectId],
    references: [project.id],
  }),
}));

export const projectTemplateRelations = relations(projectTemplate, ({ one }) => ({
  createdBy: one(user, {
    fields: [projectTemplate.createdByUserId],
    references: [user.id],
  }),
  sourceProject: one(project, {
    fields: [projectTemplate.sourceProjectId],
    references: [project.id],
  }),
  workspace: one(workspace, {
    fields: [projectTemplate.workspaceId],
    references: [workspace.id],
  }),
}));

export const projectHealthNotificationStateRelations = relations(projectHealthNotificationState, ({ one }) => ({
  project: one(project, {
    fields: [projectHealthNotificationState.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectHealthNotificationState.userId],
    references: [user.id],
  }),
}));

export const projectDataRetentionPolicyRelations = relations(projectDataRetentionPolicy, ({ one }) => ({
  project: one(project, {
    fields: [projectDataRetentionPolicy.projectId],
    references: [project.id],
  }),
  updatedBy: one(user, {
    fields: [projectDataRetentionPolicy.updatedByUserId],
    references: [user.id],
  }),
  purgeApprovedBy: one(user, {
    fields: [projectDataRetentionPolicy.purgeApprovedByUserId],
    references: [user.id],
  }),
}));

export const projectArtifactRegistryEntryRelations = relations(projectArtifactRegistryEntry, ({ one }) => ({
  project: one(project, {
    fields: [projectArtifactRegistryEntry.projectId],
    references: [project.id],
  }),
}));

export const projectAppPackageCertificateRelations = relations(projectAppPackageCertificate, ({ one }) => ({
  project: one(project, {
    fields: [projectAppPackageCertificate.projectId],
    references: [project.id],
  }),
}));

export const projectCadConversionJobRelations = relations(projectCadConversionJob, ({ one }) => ({
  project: one(project, {
    fields: [projectCadConversionJob.projectId],
    references: [project.id],
  }),
  workspace: one(workspace, {
    fields: [projectCadConversionJob.workspaceId],
    references: [workspace.id],
  }),
}));

export const projectPublicSurfaceHealthSnapshotRelations = relations(projectPublicSurfaceHealthSnapshot, ({ one }) => ({
  workspace: one(workspace, {
    fields: [projectPublicSurfaceHealthSnapshot.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [projectPublicSurfaceHealthSnapshot.projectId],
    references: [project.id],
  }),
}));

export const workspaceSceneQaBaselineRelations = relations(workspaceSceneQaBaseline, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceSceneQaBaseline.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [workspaceSceneQaBaseline.projectId],
    references: [project.id],
  }),
}));

export const projectFolderAccessGrantRelations = relations(projectFolderAccessGrant, ({ one }) => ({
  folder: one(projectFolder, {
    fields: [projectFolderAccessGrant.folderId],
    references: [projectFolder.id],
  }),
  user: one(user, {
    fields: [projectFolderAccessGrant.userId],
    references: [user.id],
  }),
  createdBy: one(user, {
    fields: [projectFolderAccessGrant.createdByUserId],
    references: [user.id],
  }),
}));

export const projectPresenceRelations = relations(projectPresence, ({ one }) => ({
  project: one(project, {
    fields: [projectPresence.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectPresence.userId],
    references: [user.id],
  }),
}));

export const projectCollaborationOperationBatchRelations = relations(projectCollaborationOperationBatch, ({ one }) => ({
  project: one(project, {
    fields: [projectCollaborationOperationBatch.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectCollaborationOperationBatch.userId],
    references: [user.id],
  }),
}));

export const workspaceRelations = relations(workspace, ({ many, one }) => ({
  owner: one(user, {
    fields: [workspace.ownerUserId],
    references: [user.id],
  }),
  members: many(workspaceMember),
  invites: many(workspaceInvite),
  notificationDeliveryPreferences: many(workspaceNotificationDeliveryPreference),
  notificationEmailDeliveries: many(workspaceNotificationEmailDelivery),
  notificationEmailDeliveryAttempts: many(workspaceNotificationEmailDeliveryAttempt),
  releaseReadinessWebhookEvents: many(workspaceReleaseReadinessWebhookEvent),
  releaseCalendarMilestones: many(workspaceReleaseCalendarMilestone),
  releaseRunbookRecords: many(workspaceReleaseRunbookRecord),
  projectTemplates: many(projectTemplate),
  cadConversionJobs: many(projectCadConversionJob),
  publicSurfaceHealthSnapshots: many(projectPublicSurfaceHealthSnapshot),
  sceneQaBaselines: many(workspaceSceneQaBaseline),
  riskDigestPackets: many(workspaceRiskDigestPacket),
  compliancePacketShares: many(workspaceCompliancePacketShare),
  releaseDrillHistory: many(workspaceReleaseDrillHistory),
  executiveReleaseSnapshots: many(workspaceExecutiveReleaseSnapshot),
  boardApprovalPackets: many(workspaceBoardApprovalPacket),
  boardReleaseArchiveIntelligencePackets: many(workspaceBoardReleaseArchiveIntelligencePacket),
  boardPostApprovalActions: many(workspaceBoardPostApprovalAction),
  boardDecisionReplaySnapshots: many(workspaceBoardDecisionReplaySnapshot),
  boardAuditFollowUpTaskRecords: many(workspaceBoardAuditFollowUpTaskRecord),
  boardAuditFollowUpTaskStates: many(workspaceBoardAuditFollowUpTaskState),
  boardAssuranceNotificationDeliveries: many(workspaceBoardAssuranceNotificationDelivery),
  boardOperationsReviewCycles: many(workspaceBoardOperationsReviewCycle),
  regressionWatchlistSnapshots: many(workspaceRegressionWatchlistSnapshot),
  regressionWatchlistItemStates: many(workspaceRegressionWatchlistItemState),
  roleAccessReviewAttestations: many(workspaceRoleAccessReviewAttestation),
  roleAccessReviewReminderDeliveries: many(workspaceRoleAccessReviewReminderDelivery),
}));

export const workspaceMemberRelations = relations(workspaceMember, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceMember.workspaceId],
    references: [workspace.id],
  }),
  user: one(user, {
    fields: [workspaceMember.userId],
    references: [user.id],
  }),
}));

export const workspaceInviteRelations = relations(workspaceInvite, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceInvite.workspaceId],
    references: [workspace.id],
  }),
  invitedBy: one(user, {
    fields: [workspaceInvite.invitedByUserId],
    references: [user.id],
    relationName: "sentWorkspaceInvites",
  }),
  acceptedBy: one(user, {
    fields: [workspaceInvite.acceptedByUserId],
    references: [user.id],
    relationName: "acceptedWorkspaceInvites",
  }),
}));

export const projectVersion = sqliteTable(
  "project_version",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sceneData: text("scene_data", { mode: "json" }).notNull(),
    activityData: text("activity_data", { mode: "json" }).$type<ProjectVersionActivityData | null>(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("project_version_project_idx").on(table.projectId), index("project_version_user_idx").on(table.userId)],
);

export const projectFolderRelations = relations(projectFolder, ({ many, one }) => ({
  user: one(user, {
    fields: [projectFolder.userId],
    references: [user.id],
  }),
  projects: many(project),
  accessGrants: many(projectFolderAccessGrant),
}));

export const projectVersionRelations = relations(projectVersion, ({ one }) => ({
  user: one(user, {
    fields: [projectVersion.userId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [projectVersion.projectId],
    references: [project.id],
  }),
}));

export const authSchema = {
  user,
  session,
  account,
  verification,
};

export type ProjectRecord = typeof project.$inferSelect;
export type NewProjectRecord = typeof project.$inferInsert;
export type ProjectFolderRecord = typeof projectFolder.$inferSelect;
export type NewProjectFolderRecord = typeof projectFolder.$inferInsert;
export type ProjectVersionRecord = typeof projectVersion.$inferSelect;
export type NewProjectVersionRecord = typeof projectVersion.$inferInsert;
export type ProjectCommentRecord = typeof projectComment.$inferSelect;
export type NewProjectCommentRecord = typeof projectComment.$inferInsert;
export type ProjectAccessGrantRecord = typeof projectAccessGrant.$inferSelect;
export type NewProjectAccessGrantRecord = typeof projectAccessGrant.$inferInsert;
export type ProjectAuditEventRecord = typeof projectAuditEvent.$inferSelect;
export type NewProjectAuditEventRecord = typeof projectAuditEvent.$inferInsert;
export type ProjectTemplateRecord = typeof projectTemplate.$inferSelect;
export type NewProjectTemplateRecord = typeof projectTemplate.$inferInsert;
export type ProjectHealthNotificationStateRecord = typeof projectHealthNotificationState.$inferSelect;
export type NewProjectHealthNotificationStateRecord = typeof projectHealthNotificationState.$inferInsert;
export type ProjectDataRetentionPolicyRecord = typeof projectDataRetentionPolicy.$inferSelect;
export type NewProjectDataRetentionPolicyRecord = typeof projectDataRetentionPolicy.$inferInsert;
export type ProjectArtifactRegistryEntryRecord = typeof projectArtifactRegistryEntry.$inferSelect;
export type NewProjectArtifactRegistryEntryRecord = typeof projectArtifactRegistryEntry.$inferInsert;
export type ProjectAppPackageCertificateRecordRow = typeof projectAppPackageCertificate.$inferSelect;
export type NewProjectAppPackageCertificateRecordRow = typeof projectAppPackageCertificate.$inferInsert;
export type ProjectCadConversionJobRecordRow = typeof projectCadConversionJob.$inferSelect;
export type NewProjectCadConversionJobRecordRow = typeof projectCadConversionJob.$inferInsert;
export type ProjectPublicSurfaceHealthSnapshotRecord = typeof projectPublicSurfaceHealthSnapshot.$inferSelect;
export type NewProjectPublicSurfaceHealthSnapshotRecord = typeof projectPublicSurfaceHealthSnapshot.$inferInsert;
export type WorkspaceSceneQaBaselineRecord = typeof workspaceSceneQaBaseline.$inferSelect;
export type NewWorkspaceSceneQaBaselineRecord = typeof workspaceSceneQaBaseline.$inferInsert;
export type WorkspaceNotificationDeliveryPreferenceRecord = typeof workspaceNotificationDeliveryPreference.$inferSelect;
export type NewWorkspaceNotificationDeliveryPreferenceRecord = typeof workspaceNotificationDeliveryPreference.$inferInsert;
export type WorkspaceNotificationEmailDeliveryRecord = typeof workspaceNotificationEmailDelivery.$inferSelect;
export type NewWorkspaceNotificationEmailDeliveryRecord = typeof workspaceNotificationEmailDelivery.$inferInsert;
export type WorkspaceNotificationEmailDeliveryAttemptRecord = typeof workspaceNotificationEmailDeliveryAttempt.$inferSelect;
export type NewWorkspaceNotificationEmailDeliveryAttemptRecord = typeof workspaceNotificationEmailDeliveryAttempt.$inferInsert;
export type WorkspaceReleaseReadinessWebhookEventRecordRow = typeof workspaceReleaseReadinessWebhookEvent.$inferSelect;
export type NewWorkspaceReleaseReadinessWebhookEventRecordRow = typeof workspaceReleaseReadinessWebhookEvent.$inferInsert;
export type WorkspaceReleaseCalendarMilestoneRecord = typeof workspaceReleaseCalendarMilestone.$inferSelect;
export type NewWorkspaceReleaseCalendarMilestoneRecord = typeof workspaceReleaseCalendarMilestone.$inferInsert;
export type WorkspaceReleaseRunbookRecordRow = typeof workspaceReleaseRunbookRecord.$inferSelect;
export type NewWorkspaceReleaseRunbookRecordRow = typeof workspaceReleaseRunbookRecord.$inferInsert;
export type WorkspaceRiskDigestPacketRecordRow = typeof workspaceRiskDigestPacket.$inferSelect;
export type NewWorkspaceRiskDigestPacketRecordRow = typeof workspaceRiskDigestPacket.$inferInsert;
export type WorkspaceCompliancePacketShareRecordRow = typeof workspaceCompliancePacketShare.$inferSelect;
export type NewWorkspaceCompliancePacketShareRecordRow = typeof workspaceCompliancePacketShare.$inferInsert;
export type WorkspaceReleaseDrillHistoryRecordRow = typeof workspaceReleaseDrillHistory.$inferSelect;
export type NewWorkspaceReleaseDrillHistoryRecordRow = typeof workspaceReleaseDrillHistory.$inferInsert;
export type WorkspaceExecutiveReleaseSnapshotRecordRow = typeof workspaceExecutiveReleaseSnapshot.$inferSelect;
export type NewWorkspaceExecutiveReleaseSnapshotRecordRow = typeof workspaceExecutiveReleaseSnapshot.$inferInsert;
export type WorkspaceBoardApprovalPacketRecordRow = typeof workspaceBoardApprovalPacket.$inferSelect;
export type NewWorkspaceBoardApprovalPacketRecordRow = typeof workspaceBoardApprovalPacket.$inferInsert;
export type WorkspaceBoardReleaseArchiveIntelligencePacketRecordRow = typeof workspaceBoardReleaseArchiveIntelligencePacket.$inferSelect;
export type NewWorkspaceBoardReleaseArchiveIntelligencePacketRecordRow = typeof workspaceBoardReleaseArchiveIntelligencePacket.$inferInsert;
export type WorkspaceBoardPostApprovalActionRecordRow = typeof workspaceBoardPostApprovalAction.$inferSelect;
export type NewWorkspaceBoardPostApprovalActionRecordRow = typeof workspaceBoardPostApprovalAction.$inferInsert;
export type WorkspaceBoardDecisionReplaySnapshotRecordRow = typeof workspaceBoardDecisionReplaySnapshot.$inferSelect;
export type NewWorkspaceBoardDecisionReplaySnapshotRecordRow = typeof workspaceBoardDecisionReplaySnapshot.$inferInsert;
export type WorkspaceBoardAuditFollowUpTaskRecordRow = typeof workspaceBoardAuditFollowUpTaskRecord.$inferSelect;
export type NewWorkspaceBoardAuditFollowUpTaskRecordRow = typeof workspaceBoardAuditFollowUpTaskRecord.$inferInsert;
export type WorkspaceBoardAuditFollowUpTaskStateRecordRow = typeof workspaceBoardAuditFollowUpTaskState.$inferSelect;
export type NewWorkspaceBoardAuditFollowUpTaskStateRecordRow = typeof workspaceBoardAuditFollowUpTaskState.$inferInsert;
export type WorkspaceBoardAssuranceNotificationDeliveryRecordRow = typeof workspaceBoardAssuranceNotificationDelivery.$inferSelect;
export type NewWorkspaceBoardAssuranceNotificationDeliveryRecordRow = typeof workspaceBoardAssuranceNotificationDelivery.$inferInsert;
export type WorkspaceBoardOperationsReviewCycleRecordRow = typeof workspaceBoardOperationsReviewCycle.$inferSelect;
export type NewWorkspaceBoardOperationsReviewCycleRecordRow = typeof workspaceBoardOperationsReviewCycle.$inferInsert;
export type WorkspaceRegressionWatchlistSnapshotRecordRow = typeof workspaceRegressionWatchlistSnapshot.$inferSelect;
export type NewWorkspaceRegressionWatchlistSnapshotRecordRow = typeof workspaceRegressionWatchlistSnapshot.$inferInsert;
export type WorkspaceRegressionWatchlistItemStateRecordRow = typeof workspaceRegressionWatchlistItemState.$inferSelect;
export type NewWorkspaceRegressionWatchlistItemStateRecordRow = typeof workspaceRegressionWatchlistItemState.$inferInsert;
export type WorkspaceRoleAccessReviewAttestationRecordRow = typeof workspaceRoleAccessReviewAttestation.$inferSelect;
export type NewWorkspaceRoleAccessReviewAttestationRecordRow = typeof workspaceRoleAccessReviewAttestation.$inferInsert;
export type WorkspaceRoleAccessReviewReminderDeliveryRecordRow = typeof workspaceRoleAccessReviewReminderDelivery.$inferSelect;
export type NewWorkspaceRoleAccessReviewReminderDeliveryRecordRow = typeof workspaceRoleAccessReviewReminderDelivery.$inferInsert;
export type ProjectFolderAccessGrantRecord = typeof projectFolderAccessGrant.$inferSelect;
export type NewProjectFolderAccessGrantRecord = typeof projectFolderAccessGrant.$inferInsert;
export type ProjectPresenceRecord = typeof projectPresence.$inferSelect;
export type NewProjectPresenceRecord = typeof projectPresence.$inferInsert;
export type ProjectCollaborationOperationBatchRecord = typeof projectCollaborationOperationBatch.$inferSelect;
export type NewProjectCollaborationOperationBatchRecord = typeof projectCollaborationOperationBatch.$inferInsert;
export type WorkspaceRecord = typeof workspace.$inferSelect;
export type NewWorkspaceRecord = typeof workspace.$inferInsert;
export type WorkspaceMemberRecord = typeof workspaceMember.$inferSelect;
export type NewWorkspaceMemberRecord = typeof workspaceMember.$inferInsert;
export type WorkspaceInviteRecord = typeof workspaceInvite.$inferSelect;
export type NewWorkspaceInviteRecord = typeof workspaceInvite.$inferInsert;
