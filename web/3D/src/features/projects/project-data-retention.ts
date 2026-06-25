import type { ProjectAuditEvent } from "@/features/projects/types";

type DateLike = Date | string | null | undefined;

export type ProjectDataRetentionSubjectKind = "audit-log" | "comments" | "deleted-asset-tombstones" | "versions";
export type ProjectDataRetentionPurgeReviewStatus = "approved" | "changesRequested" | "draft" | "requested";

export interface ProjectDataRetentionPolicySettings {
  auditLogDays: number;
  commentDays: number;
  deletedAssetTombstoneDays: number;
  versionDays: number;
}

export interface ProjectDataRetentionPolicy extends ProjectDataRetentionPolicySettings {
  createdAt: string | null;
  id: string | null;
  projectId: string;
  purgeApprovalNote: string | null;
  purgeApprovedAt: string | null;
  purgeApprovedByUserId: string | null;
  purgeReviewRequestedAt: string | null;
  purgeReviewStatus: ProjectDataRetentionPurgeReviewStatus;
  updatedAt: string | null;
  updatedByUserId: string | null;
}

export interface ProjectDataRetentionCommentSource {
  createdAt: DateLike;
  id: string;
  resolvedAt?: DateLike;
  updatedAt?: DateLike;
}

export interface ProjectDataRetentionVersionSource {
  createdAt: DateLike;
  id: string;
  name: string;
}

export interface ProjectDataRetentionRow {
  cutoffAt: string;
  expiredCount: number;
  newestExpiredAt: string | null;
  oldestRetainedAt: string | null;
  retentionDays: number;
  retainedCount: number;
  subject: ProjectDataRetentionSubjectKind;
  title: string;
  totalCount: number;
}

export interface ProjectDataRetentionReport {
  generatedAt: string;
  policy: ProjectDataRetentionPolicy;
  rows: ProjectDataRetentionRow[];
  summary: {
    expiredCount: number;
    nextReviewAt: string;
    retainedCount: number;
    totalCount: number;
  };
}

export type ProjectDataRetentionPurgeAction = "delete-audit-event" | "delete-comment" | "delete-version" | "redact-asset-tombstone";

export interface ProjectDataRetentionPurgeManifestItem {
  action: ProjectDataRetentionPurgeAction;
  cutoffAt: string;
  id: string;
  occurredAt: string;
  reason: string;
  resourceId: string | null;
  resourceType: string;
  retentionDays: number;
  subject: ProjectDataRetentionSubjectKind;
  title: string;
}

export interface ProjectDataRetentionPurgeManifest {
  approvalGate: {
    approved: boolean;
    blocker: string | null;
    destructiveExecutionAllowed: boolean;
    note: string | null;
    requestedAt: string | null;
    reviewedAt: string | null;
    reviewedByUserId: string | null;
    status: ProjectDataRetentionPurgeReviewStatus;
  };
  generatedAt: string;
  id: string;
  items: ProjectDataRetentionPurgeManifestItem[];
  policy: ProjectDataRetentionPolicy;
  project: {
    id: string;
    name: string;
  };
  summary: {
    auditEventDeleteCount: number;
    commentDeleteCount: number;
    totalItemCount: number;
    tombstoneRedactionCount: number;
    versionDeleteCount: number;
  };
}

export interface ProjectDataRetentionPurgeManifestInput {
  auditEvents: ProjectAuditEvent[];
  comments: ProjectDataRetentionCommentSource[];
  now?: Date;
  policy: ProjectDataRetentionPolicy;
  project: {
    id: string;
    name: string;
  };
  versions: ProjectDataRetentionVersionSource[];
}

export const defaultProjectDataRetentionPolicySettings: ProjectDataRetentionPolicySettings = {
  auditLogDays: 730,
  commentDays: 365,
  deletedAssetTombstoneDays: 730,
  versionDays: 180,
};

const retentionTitles: Record<ProjectDataRetentionSubjectKind, string> = {
  "audit-log": "Audit logs",
  comments: "Comments",
  "deleted-asset-tombstones": "Deleted asset tombstones",
  versions: "Versions",
};

function toDate(value: DateLike) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: DateLike) {
  return toDate(value)?.toISOString() ?? null;
}

function clampRetentionDays(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value ?? NaN)) {
    return fallback;
  }

  return Math.min(3650, Math.max(7, Math.round(value ?? fallback)));
}

function cutoffDate(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function newestDate(dates: Date[]) {
  return dates.reduce<Date | null>((newest, date) => (!newest || date.getTime() > newest.getTime() ? date : newest), null);
}

function oldestDate(dates: Date[]) {
  return dates.reduce<Date | null>((oldest, date) => (!oldest || date.getTime() < oldest.getTime() ? date : oldest), null);
}

function createRetentionRow(input: {
  dates: Date[];
  now: Date;
  retentionDays: number;
  subject: ProjectDataRetentionSubjectKind;
}): ProjectDataRetentionRow {
  const cutoff = cutoffDate(input.now, input.retentionDays);
  const expired = input.dates.filter((date) => date.getTime() < cutoff.getTime());
  const retained = input.dates.filter((date) => date.getTime() >= cutoff.getTime());

  return {
    cutoffAt: cutoff.toISOString(),
    expiredCount: expired.length,
    newestExpiredAt: toIso(newestDate(expired)),
    oldestRetainedAt: toIso(oldestDate(retained)),
    retentionDays: input.retentionDays,
    retainedCount: retained.length,
    subject: input.subject,
    title: retentionTitles[input.subject],
    totalCount: input.dates.length,
  };
}

function compactDates(values: DateLike[]) {
  return values.map(toDate).filter((date): date is Date => Boolean(date));
}

function isAssetTombstone(event: ProjectAuditEvent) {
  const metadata = event.metadata ?? {};
  const tombstone = event.tombstone ?? {};
  const resourceType = event.resourceType?.toLowerCase() ?? "";

  return (
    Boolean(event.tombstone) &&
    (resourceType.includes("asset") ||
      typeof metadata.assetId === "string" ||
      typeof metadata.fileName === "string" ||
      typeof tombstone.assetId === "string" ||
      typeof tombstone.fileName === "string" ||
      typeof tombstone.url === "string")
  );
}

function stableHash(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isBeforeCutoff(value: DateLike, cutoff: Date) {
  const date = toDate(value);

  return Boolean(date && date.getTime() < cutoff.getTime());
}

function persistedAuditEventId(event: ProjectAuditEvent) {
  return event.id.startsWith("persisted:") ? event.id.slice("persisted:".length) : event.id;
}

export function normalizeProjectDataRetentionPolicySettings(
  input: Partial<ProjectDataRetentionPolicySettings> | null | undefined,
): ProjectDataRetentionPolicySettings {
  return {
    auditLogDays: clampRetentionDays(input?.auditLogDays, defaultProjectDataRetentionPolicySettings.auditLogDays),
    commentDays: clampRetentionDays(input?.commentDays, defaultProjectDataRetentionPolicySettings.commentDays),
    deletedAssetTombstoneDays: clampRetentionDays(
      input?.deletedAssetTombstoneDays,
      defaultProjectDataRetentionPolicySettings.deletedAssetTombstoneDays,
    ),
    versionDays: clampRetentionDays(input?.versionDays, defaultProjectDataRetentionPolicySettings.versionDays),
  };
}

export function createDefaultProjectDataRetentionPolicy(projectId: string): ProjectDataRetentionPolicy {
  return {
    ...defaultProjectDataRetentionPolicySettings,
    createdAt: null,
    id: null,
    projectId,
    purgeApprovalNote: null,
    purgeApprovedAt: null,
    purgeApprovedByUserId: null,
    purgeReviewRequestedAt: null,
    purgeReviewStatus: "draft",
    updatedAt: null,
    updatedByUserId: null,
  };
}

export function createProjectDataRetentionReport(input: {
  auditEvents: ProjectAuditEvent[];
  comments: ProjectDataRetentionCommentSource[];
  now?: Date;
  policy: ProjectDataRetentionPolicy;
  versions: ProjectDataRetentionVersionSource[];
}): ProjectDataRetentionReport {
  const now = input.now ?? new Date();
  const settings = normalizeProjectDataRetentionPolicySettings(input.policy);
  const rows = [
    createRetentionRow({
      dates: compactDates(input.auditEvents.map((event) => event.occurredAt)),
      now,
      retentionDays: settings.auditLogDays,
      subject: "audit-log",
    }),
    createRetentionRow({
      dates: compactDates(input.comments.map((comment) => comment.updatedAt ?? comment.resolvedAt ?? comment.createdAt)),
      now,
      retentionDays: settings.commentDays,
      subject: "comments",
    }),
    createRetentionRow({
      dates: compactDates(input.versions.map((version) => version.createdAt)),
      now,
      retentionDays: settings.versionDays,
      subject: "versions",
    }),
    createRetentionRow({
      dates: compactDates(input.auditEvents.filter(isAssetTombstone).map((event) => event.occurredAt)),
      now,
      retentionDays: settings.deletedAssetTombstoneDays,
      subject: "deleted-asset-tombstones",
    }),
  ];
  return {
    generatedAt: now.toISOString(),
    policy: {
      ...input.policy,
      ...settings,
    },
    rows,
    summary: {
      expiredCount: rows.reduce((sum, row) => sum + row.expiredCount, 0),
      nextReviewAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      retainedCount: rows.reduce((sum, row) => sum + row.retainedCount, 0),
      totalCount: rows.reduce((sum, row) => sum + row.totalCount, 0),
    },
  };
}

export function createProjectDataRetentionPurgeManifest(input: ProjectDataRetentionPurgeManifestInput): ProjectDataRetentionPurgeManifest {
  const now = input.now ?? new Date();
  const settings = normalizeProjectDataRetentionPolicySettings(input.policy);
  const auditCutoff = cutoffDate(now, settings.auditLogDays);
  const commentCutoff = cutoffDate(now, settings.commentDays);
  const versionCutoff = cutoffDate(now, settings.versionDays);
  const assetTombstoneCutoff = cutoffDate(now, settings.deletedAssetTombstoneDays);
  const auditItems = input.auditEvents
    .filter((event) => isBeforeCutoff(event.occurredAt, auditCutoff))
    .map<ProjectDataRetentionPurgeManifestItem>((event) => ({
      action: "delete-audit-event",
      cutoffAt: auditCutoff.toISOString(),
      id: `audit:${persistedAuditEventId(event)}`,
      occurredAt: event.occurredAt,
      reason: `${settings.auditLogDays} day audit log retention window expired.`,
      resourceId: event.resourceId ?? null,
      resourceType: event.resourceType ?? "auditEvent",
      retentionDays: settings.auditLogDays,
      subject: "audit-log",
      title: event.title,
    }));
  const auditDeleteIds = new Set(auditItems.map((item) => item.id.replace(/^audit:/, "")));
  const commentItems = input.comments
    .filter((comment) => isBeforeCutoff(comment.updatedAt ?? comment.resolvedAt ?? comment.createdAt, commentCutoff))
    .map<ProjectDataRetentionPurgeManifestItem>((comment) => ({
      action: "delete-comment",
      cutoffAt: commentCutoff.toISOString(),
      id: `comment:${comment.id}`,
      occurredAt: toIso(comment.updatedAt ?? comment.resolvedAt ?? comment.createdAt) ?? commentCutoff.toISOString(),
      reason: `${settings.commentDays} day comment retention window expired.`,
      resourceId: comment.id,
      resourceType: "comment",
      retentionDays: settings.commentDays,
      subject: "comments",
      title: "Project comment",
    }));
  const versionItems = input.versions
    .filter((version) => isBeforeCutoff(version.createdAt, versionCutoff))
    .map<ProjectDataRetentionPurgeManifestItem>((version) => ({
      action: "delete-version",
      cutoffAt: versionCutoff.toISOString(),
      id: `version:${version.id}`,
      occurredAt: toIso(version.createdAt) ?? versionCutoff.toISOString(),
      reason: `${settings.versionDays} day version retention window expired.`,
      resourceId: version.id,
      resourceType: "projectVersion",
      retentionDays: settings.versionDays,
      subject: "versions",
      title: version.name,
    }));
  const tombstoneItems = input.auditEvents
    .filter((event) => isAssetTombstone(event))
    .filter((event) => !auditDeleteIds.has(persistedAuditEventId(event)))
    .filter((event) => isBeforeCutoff(event.occurredAt, assetTombstoneCutoff))
    .map<ProjectDataRetentionPurgeManifestItem>((event) => ({
      action: "redact-asset-tombstone",
      cutoffAt: assetTombstoneCutoff.toISOString(),
      id: `asset-tombstone:${persistedAuditEventId(event)}`,
      occurredAt: event.occurredAt,
      reason: `${settings.deletedAssetTombstoneDays} day deleted asset tombstone retention window expired.`,
      resourceId: event.resourceId ?? null,
      resourceType: event.resourceType ?? "asset",
      retentionDays: settings.deletedAssetTombstoneDays,
      subject: "deleted-asset-tombstones",
      title: event.title,
    }));
  const items = [...auditItems, ...commentItems, ...versionItems, ...tombstoneItems].sort((first, second) => first.occurredAt.localeCompare(second.occurredAt));
  const approved = input.policy.purgeReviewStatus === "approved";
  const blocker = approved
    ? null
    : input.policy.purgeReviewStatus === "requested"
      ? "Retention purge dry run is waiting for admin approval."
      : input.policy.purgeReviewStatus === "changesRequested"
        ? "Retention purge dry run has requested changes."
        : "Retention purge dry run must be requested and approved before destructive cleanup can run.";
  const manifestCore = {
    itemIds: items.map((item) => item.id),
    policyUpdatedAt: input.policy.updatedAt,
    projectId: input.project.id,
    status: input.policy.purgeReviewStatus,
  };

  return {
    approvalGate: {
      approved,
      blocker,
      destructiveExecutionAllowed: approved && items.length > 0,
      note: input.policy.purgeApprovalNote,
      requestedAt: input.policy.purgeReviewRequestedAt,
      reviewedAt: input.policy.purgeApprovedAt,
      reviewedByUserId: input.policy.purgeApprovedByUserId,
      status: input.policy.purgeReviewStatus,
    },
    generatedAt: now.toISOString(),
    id: `retention-purge-${input.project.id}-${stableHash(manifestCore)}`,
    items,
    policy: {
      ...input.policy,
      ...settings,
    },
    project: input.project,
    summary: {
      auditEventDeleteCount: auditItems.length,
      commentDeleteCount: commentItems.length,
      totalItemCount: items.length,
      tombstoneRedactionCount: tombstoneItems.length,
      versionDeleteCount: versionItems.length,
    },
  };
}
