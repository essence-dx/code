import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createProjectRetentionCenter } from "@/features/projects/project-retention-center";

describe("project retention center", () => {
  test("blocks deletion packets for active legal holds while building restore previews", () => {
    const center = createProjectRetentionCenter({
      projects: [
        createProject({
          id: "project-stale",
          name: "Evergreen brand kit",
          updatedAt: "2025-12-01T10:00:00.000Z",
        }),
        createProject({
          id: "project-client-launch",
          name: "Client launch",
          publicShareId: "public-client",
          editShareId: "edit-client",
          deletedAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-01T09:00:00.000Z",
        }),
      ],
      projectVersions: [
        createProjectVersion({
          id: "version-client-1",
          projectId: "project-client-launch",
          name: "Client launch restore point",
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-client",
          projectId: "project-client-launch",
          status: "completed",
          completedAt: "2026-03-30T09:00:00.000Z",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "publish-client",
          projectId: "project-client-launch",
          status: "published",
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "task-client",
          projectId: "project-client-launch",
          taskStatus: "todo",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "hold-client",
          action: "project.legal_hold.enabled",
          targetId: "project-client-launch",
          summary: "Legal hold enabled for Client launch",
          metadata: {
            caseId: "CASE-42",
            reason: "Contract dispute",
            ownerEmail: "legal@example.com",
          },
          createdAt: "2026-04-10T09:00:00.000Z",
        }),
        createAuditLog({
          id: "trash-client",
          action: "project.trashed",
          targetId: "project-client-launch",
          summary: "Moved design to trash",
          createdAt: "2026-04-01T09:00:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.legalHolds, 1);
    assert.equal(center.totals.restorePreviews, 1);
    assert.equal(center.totals.deletionPackets, 1);
    assert.equal(center.totals.archiveCandidates, 1);

    const hold = center.legalHolds[0];
    assert.equal(hold?.projectId, "project-client-launch");
    assert.equal(hold?.caseId, "CASE-42");
    assert.equal(hold?.ownerEmail, "legal@example.com");

    const restorePreview = center.restorePreviews[0];
    assert.equal(restorePreview?.projectId, "project-client-launch");
    assert.equal(restorePreview?.latestVersionId, "version-client-1");
    assert.equal(restorePreview?.publicSurfaceCount, 3);
    assert.equal(restorePreview?.openReviewTaskCount, 1);

    const packet = center.deletionPackets[0];
    assert.equal(packet?.status, "blocked");
    assert.equal(packet?.requiresLegalRelease, true);
    assert.equal(
      packet?.reasons.some((reason) => reason.includes("Legal hold")),
      true,
    );
    assert.equal(
      packet?.download.fileName,
      "project-deletion-packet-client-launch.json",
    );
    assert.equal(
      packet?.download.href.startsWith("data:application/json"),
      true,
    );

    assert.equal(
      center.archiveCandidates.some(
        (candidate) =>
          candidate.projectId === "project-stale" &&
          candidate.reason.includes("169 days"),
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) => action.includes("Client launch")),
      true,
    );
  });

  test("stays ready when projects are recent and no retention workflows are needed", () => {
    const center = createProjectRetentionCenter({
      projects: [
        createProject({
          id: "project-ready",
          name: "Fresh social post",
          updatedAt: "2026-05-17T10:00:00.000Z",
        }),
      ],
      projectVersions: [],
      serverExportJobs: [],
      websitePublishes: [],
      reviewTasks: [],
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.archiveCandidates, 0);
    assert.equal(center.totals.legalHolds, 0);
    assert.equal(center.totals.restorePreviews, 0);
    assert.equal(center.totals.deletionPackets, 0);
    assert.deepEqual(center.nextActions, []);
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project",
    name: "Project",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}

function createProjectVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version",
    projectId: "project",
    name: "Restore point",
    thumbnail: null,
    createdAt: "2026-03-30T09:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export",
    projectId: "project",
    projectName: "Project",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "project.pdf",
    status: "completed",
    progress: 100,
    artifactName: "project.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 1200,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-03-30T09:00:00.000Z",
    updatedAt: "2026-03-30T09:00:00.000Z",
    completedAt: "2026-03-30T09:00:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish",
    projectId: "project",
    projectName: "Project",
    slug: "project",
    title: "Project",
    seoTitle: "Project",
    seoDescription: "Project",
    status: "published",
    publishedAt: "2026-03-30T09:00:00.000Z",
    createdAt: "2026-03-30T09:00:00.000Z",
    updatedAt: "2026-03-30T09:00:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "task",
    projectId: "project",
    projectName: "Project",
    pageId: "page",
    elementId: null,
    authorName: "Reviewer",
    body: "Review this before deletion.",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: null,
    taskDueAt: null,
    createdAt: "2026-03-30T09:00:00.000Z",
    updatedAt: "2026-03-30T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "project.trashed",
    targetType: "project",
    targetId: "project",
    summary: "Project audit event",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-03-30T09:00:00.000Z",
    ...overrides,
  };
}
