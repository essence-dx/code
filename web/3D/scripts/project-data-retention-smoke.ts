import { strict as assert } from "node:assert";
import {
  createDefaultProjectDataRetentionPolicy,
  createProjectDataRetentionPurgeManifest,
  createProjectDataRetentionReport,
  normalizeProjectDataRetentionPolicySettings,
} from "@/features/projects/project-data-retention";
import type { ProjectAuditEvent } from "@/features/projects/types";

const now = new Date("2026-05-16T20:00:00.000Z");
const auditEvents: ProjectAuditEvent[] = [
  {
    action: "project.published",
    category: "publishing",
    description: "Published",
    id: "audit-new",
    occurredAt: "2026-05-01T00:00:00.000Z",
    resourceId: "project-1",
    resourceType: "project",
    status: "success",
    title: "Published",
  },
  {
    action: "access.revoked",
    category: "permissions",
    description: "Old audit event",
    id: "audit-old",
    occurredAt: "2025-01-01T00:00:00.000Z",
    resourceId: "grant-1",
    resourceType: "accessGrant",
    status: "warning",
    title: "Access revoked",
  },
  {
    action: "asset.deleted",
    category: "exports",
    description: "Deleted asset tombstone",
    id: "asset-stale",
    metadata: {
      assetId: "asset-1",
    },
    occurredAt: "2026-01-01T00:00:00.000Z",
    resourceId: "asset-1",
    resourceType: "asset",
    status: "warning",
    title: "Asset deleted",
    tombstone: {
      fileName: "hero.glb",
    },
  },
];
const policy = {
  ...createDefaultProjectDataRetentionPolicy("project-1"),
  auditLogDays: 300,
  commentDays: 60,
  deletedAssetTombstoneDays: 100,
  versionDays: 90,
};
const report = createProjectDataRetentionReport({
  auditEvents,
  comments: [
    {
      createdAt: "2026-05-10T00:00:00.000Z",
      id: "comment-new",
      updatedAt: "2026-05-10T00:00:00.000Z",
    },
    {
      createdAt: "2025-12-01T00:00:00.000Z",
      id: "comment-old",
      updatedAt: "2025-12-01T00:00:00.000Z",
    },
  ],
  now,
  policy,
  versions: [
    {
      createdAt: "2026-04-01T00:00:00.000Z",
      id: "version-new",
      name: "Recent",
    },
    {
      createdAt: "2025-11-01T00:00:00.000Z",
      id: "version-old",
      name: "Old",
    },
  ],
});

assert.equal(report.policy.auditLogDays, 300);
assert.equal(report.rows.find((row) => row.subject === "audit-log")?.expiredCount, 1);
assert.equal(report.rows.find((row) => row.subject === "comments")?.expiredCount, 1);
assert.equal(report.rows.find((row) => row.subject === "versions")?.expiredCount, 1);
assert.equal(report.rows.find((row) => row.subject === "deleted-asset-tombstones")?.expiredCount, 1);
assert.equal(report.summary.expiredCount, 4);
assert.equal(report.summary.totalCount, 8);

const blockedManifest = createProjectDataRetentionPurgeManifest({
  auditEvents,
  comments: [
    {
      createdAt: "2026-05-10T00:00:00.000Z",
      id: "comment-new",
      updatedAt: "2026-05-10T00:00:00.000Z",
    },
    {
      createdAt: "2025-12-01T00:00:00.000Z",
      id: "comment-old",
      updatedAt: "2025-12-01T00:00:00.000Z",
    },
  ],
  now,
  policy,
  project: {
    id: "project-1",
    name: "Retention Project",
  },
  versions: [
    {
      createdAt: "2026-04-01T00:00:00.000Z",
      id: "version-new",
      name: "Recent",
    },
    {
      createdAt: "2025-11-01T00:00:00.000Z",
      id: "version-old",
      name: "Old",
    },
  ],
});

assert.equal(blockedManifest.approvalGate.destructiveExecutionAllowed, false);
assert.equal(blockedManifest.summary.totalItemCount, 4);
assert.equal(blockedManifest.summary.auditEventDeleteCount, 1);
assert.equal(blockedManifest.summary.commentDeleteCount, 1);
assert.equal(blockedManifest.summary.versionDeleteCount, 1);
assert.equal(blockedManifest.summary.tombstoneRedactionCount, 1);
assert.ok(blockedManifest.id.startsWith("retention-purge-project-1-"));

const approvedManifest = createProjectDataRetentionPurgeManifest({
  auditEvents,
  comments: [],
  now,
  policy: {
    ...policy,
    purgeApprovedAt: "2026-05-16T20:01:00.000Z",
    purgeApprovedByUserId: "admin-1",
    purgeReviewRequestedAt: "2026-05-16T20:00:00.000Z",
    purgeReviewStatus: "approved",
  },
  project: {
    id: "project-1",
    name: "Retention Project",
  },
  versions: [],
});

assert.equal(approvedManifest.approvalGate.approved, true);
assert.equal(approvedManifest.approvalGate.destructiveExecutionAllowed, true);

const clamped = normalizeProjectDataRetentionPolicySettings({
  auditLogDays: 2,
  commentDays: 5000,
  deletedAssetTombstoneDays: Number.NaN,
  versionDays: 365.8,
});

assert.equal(clamped.auditLogDays, 7);
assert.equal(clamped.commentDays, 3650);
assert.equal(clamped.deletedAssetTombstoneDays, 730);
assert.equal(clamped.versionDays, 366);

console.log("project data retention smoke passed");
