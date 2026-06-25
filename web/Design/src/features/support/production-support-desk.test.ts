import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createProductionSupportDesk } from "@/features/support/production-support-desk";

describe("production support desk", () => {
  test("builds user-reported issue views with project links, audit context, reproduction notes, and resolution packets", () => {
    const project = createProject({
      id: "project-launch",
      name: "Launch page",
      approvalStatus: "changes-requested",
    });
    const desk = createProductionSupportDesk({
      projects: [project],
      reviewTasks: [
        createReviewTask({
          id: "task-1",
          projectId: project.id,
          projectName: project.name,
          body: "Button alignment breaks on mobile checkout.",
          taskStatus: "todo",
          taskDueAt: "2026-05-17T10:00:00.000Z",
        }),
      ],
      projectAudits: [
        createProjectAudit({
          projectId: project.id,
          projectName: project.name,
          overallScore: 62,
          status: "fix",
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: project.id,
          projectName: project.name,
          status: "blocked",
          packetScore: 55,
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-failed",
          projectId: project.id,
          projectName: project.name,
          status: "failed",
          failureMessage: "Renderer timed out",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "site-1",
          projectId: project.id,
          title: "Launch site",
          customDomains: [
            createDomain({
              id: "domain-1",
              domain: "launch.example.com",
              status: "pending",
              platformStatus: "error",
              platformError: "DNS record missing",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-approval",
          action: "approval.updated",
          targetType: "project",
          targetId: project.id,
          summary: "Updated project approval to changes-requested",
        }),
        createAuditLog({
          id: "audit-domain",
          action: "website.domain.refreshed",
          targetType: "website_domain",
          targetId: "domain-1",
          summary: "Domain refresh failed",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(desk.status, "urgent");
    assert.equal(desk.totals.userReportedIssues, 1);
    assert.equal(desk.totals.urgentIssues >= 1, true);

    const userReported = desk.views.find((view) => view.id === "user-reported");
    assert.equal(userReported?.issues.length, 1);
    assert.equal(
      userReported?.issues[0]?.affectedProjectHref,
      `/editor/${project.id}`,
    );
    assert.equal(
      userReported?.issues[0]?.auditContext[0]?.id,
      "audit-approval",
    );
    assert.equal(
      userReported?.issues[0]?.reproductionNotes.some((note) =>
        note.includes("Open /editor/project-launch"),
      ),
      true,
    );

    const packet = desk.resolutionPackets.find(
      (item) => item.issueId === "support-task-task-1",
    );
    assert.equal(packet?.projectId, project.id);
    assert.equal(packet?.status, "blocked");
    assert.equal(packet?.auditLogIds.includes("audit-approval"), true);
    assert.equal(
      packet?.download.fileName,
      "support-resolution-project-launch.json",
    );
    assert.equal(
      packet?.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      desk.nextActions.some((action) => action.includes("Launch page")),
      true,
    );
  });

  test("keeps a clean workspace ready when no support tickets or production failures exist", () => {
    const project = createProject({ id: "project-ready", name: "Ready page" });
    const desk = createProductionSupportDesk({
      projects: [project],
      reviewTasks: [
        createReviewTask({
          projectId: project.id,
          projectName: project.name,
          resolved: true,
          taskStatus: "done",
        }),
      ],
      projectAudits: [
        createProjectAudit({
          projectId: project.id,
          projectName: project.name,
          overallScore: 95,
          status: "ready",
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: project.id,
          projectName: project.name,
          status: "ready",
          packetScore: 96,
        }),
      ],
      serverExportJobs: [createExportJob({ projectId: project.id })],
      websitePublishes: [
        createWebsitePublish({
          projectId: project.id,
          customDomains: [
            createDomain({
              status: "verified",
              platformStatus: "attached",
            }),
          ],
        }),
      ],
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(desk.status, "ready");
    assert.equal(desk.totals.openIssues, 0);
    assert.equal(desk.resolutionPackets.length, 0);
    assert.deepEqual(desk.nextActions, []);
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
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
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
    pageId: "page-1",
    elementId: null,
    authorName: "Client",
    body: "Something needs attention.",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Studio",
    taskDueAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createProjectAudit(
  overrides: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  return {
    projectId: "project",
    projectName: "Project",
    updatedAt: "2026-05-18T09:00:00.000Z",
    overallScore: 92,
    status: "ready",
    dimensions: [
      {
        id: "accessibility",
        label: "Accessibility",
        status: "ready",
        score: 96,
        detail: "Ready.",
      },
    ],
    ...overrides,
  };
}

function createHandoffPacket(
  overrides: Partial<ProjectHandoffPacket> = {},
): ProjectHandoffPacket {
  return {
    projectId: "project",
    projectName: "Project",
    updatedAt: "2026-05-18T09:00:00.000Z",
    approvalStatus: "approved",
    packetScore: 94,
    status: "ready",
    nextAction: "Ready for support handoff.",
    readinessReport: {
      score: 94,
      status: "ready",
      dimensions: [],
    },
    exportBundle: {
      status: "ready",
      completedCount: 1,
      storedArtifactCount: 1,
      failedCount: 0,
      latestFormatLabel: "PDF",
      latestArtifactName: "project.pdf",
      latestCompletedAt: "2026-05-18T09:00:00.000Z",
      totalStoredBytes: 1200,
    },
    stakeholderNotes: {
      totalCount: 0,
      unresolvedCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      latestNoteAt: null,
    },
    approvalHistory: [],
    checklist: [
      {
        id: "readiness",
        label: "Readiness",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "exports",
        label: "Exports",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "notes",
        label: "Notes",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "approval",
        label: "Approval",
        complete: true,
        detail: "Ready.",
      },
    ],
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
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    completedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "site",
    projectId: "project",
    projectName: "Project",
    slug: "project",
    title: "Project site",
    seoTitle: "Project",
    seoDescription: "Project website",
    status: "published",
    publishedAt: "2026-05-18T08:30:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createDomain(
  overrides: Partial<WebsitePublishSummary["customDomains"][number]> = {},
): WebsitePublishSummary["customDomains"][number] {
  return {
    id: "domain",
    publishId: "site",
    projectId: "project",
    domain: "project.example.com",
    status: "pending",
    verificationName: "_essence",
    verificationValue: "verify",
    verifiedAt: null,
    platformStatus: "manual",
    platformError: null,
    platformAttachedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "project.created",
    targetType: "project",
    targetId: "project",
    summary: "Project changed",
    actorEmail: "studio@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
