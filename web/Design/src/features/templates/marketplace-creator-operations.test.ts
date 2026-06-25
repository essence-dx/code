import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
  ReviewTaskStatus,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import { createMarketplaceCreatorOperationsCenter } from "@/features/templates/marketplace-creator-operations";

describe("marketplace creator operations", () => {
  test("builds versioned submissions with trust, license, rollback, and moderation routing", () => {
    const readyTemplate = createTemplate({
      id: "launch-ready",
      name: "Launch Ready Kit",
      creatorName: "Amina Designer",
      creatorEmail: "amina@example.com",
      marketplaceReviewNote:
        "Original assets, CC0 photo sources, and license evidence approved.",
      marketplaceUseCount: 12,
      marketplaceViewCount: 36,
      updatedAt: "2026-05-18T09:00:00.000Z",
      marketplacePublishedAt: "2026-05-18T08:00:00.000Z",
    });
    const blockedTemplate = createTemplate({
      id: "launch-blocked",
      name: "Launch Blocked Kit",
      creatorName: null,
      creatorEmail: null,
      approvalStatus: "changes-requested",
      marketplaceStatus: "review",
      marketplaceCollection: null,
      marketplaceReviewNote: "Needs proof before publish.",
      marketplacePublishedAt: null,
      marketplaceUseCount: 0,
      marketplaceViewCount: 42,
      updatedAt: "2026-05-12T09:00:00.000Z",
    });

    const center = createMarketplaceCreatorOperationsCenter({
      now: new Date("2026-05-18T12:00:00.000Z"),
      templates: [readyTemplate, blockedTemplate],
      projects: [
        createProject({
          id: "ready-project",
          name: "Launch Ready Kit campaign",
          sourceProjectId: readyTemplate.id,
          approvalStatus: "approved",
        }),
        createProject({
          id: "blocked-project",
          name: "Launch Blocked Kit campaign",
          sourceProjectId: blockedTemplate.id,
          approvalStatus: "changes-requested",
        }),
      ],
      projectVersions: [
        createVersion({
          projectId: "ready-project",
          createdAt: "2026-05-18T09:10:00.000Z",
        }),
      ],
      projectAudits: [
        createProjectAudit({
          projectId: "ready-project",
          projectName: "Launch Ready Kit campaign",
          status: "ready",
          overallScore: 94,
        }),
        createProjectAudit({
          projectId: "blocked-project",
          projectName: "Launch Blocked Kit campaign",
          status: "fix",
          overallScore: 54,
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "blocked-license-task",
          projectId: "blocked-project",
          projectName: "Launch Blocked Kit campaign",
          body: "Add source attribution before marketplace release.",
          taskStatus: "in-progress",
          taskDueAt: "2026-05-17T12:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "ready-license-log",
          targetId: readyTemplate.id,
          summary: "License evidence approved for Launch Ready Kit.",
          createdAt: "2026-05-18T08:30:00.000Z",
        }),
        createAuditLog({
          id: "blocked-log",
          targetId: blockedTemplate.id,
          summary: "Marketplace review requested source evidence.",
          createdAt: "2026-05-12T09:15:00.000Z",
        }),
      ],
    });

    const readySubmission = center.submissions.find(
      (submission) => submission.templateId === readyTemplate.id,
    );
    const blockedSubmission = center.submissions.find(
      (submission) => submission.templateId === blockedTemplate.id,
    );

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.versionedSubmissions, 2);
    assert.equal(center.totals.rollbackReady, 1);
    assert.equal(center.totals.moderationRoutes, 1);
    assert.ok(readySubmission);
    assert.ok(blockedSubmission);

    assert.equal(readySubmission.status, "ready");
    assert.match(readySubmission.version, /^1\.\d+\.\d+$/);
    assert.equal(readySubmission.trustScore.status, "ready");
    assert.equal(readySubmission.licenseEvidence.status, "ready");
    assert.equal(readySubmission.rollbackPlan.status, "ready");
    assert.equal(readySubmission.moderationRoute.queue, "release-ready");
    assert.ok(readySubmission.operationPacket.dataUrl.startsWith("data:"));

    assert.equal(blockedSubmission.status, "blocked");
    assert.equal(blockedSubmission.submissionStage, "changes-requested");
    assert.equal(blockedSubmission.trustScore.status, "blocked");
    assert.equal(blockedSubmission.licenseEvidence.status, "blocked");
    assert.equal(blockedSubmission.rollbackPlan.status, "blocked");
    assert.equal(blockedSubmission.moderationRoute.queue, "license-review");
    assert.equal(blockedSubmission.moderationRoute.priority, "high");
    assert.ok(
      blockedSubmission.versionTimeline.some((event) =>
        event.title.includes("Curator note"),
      ),
    );
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Launch Blocked Kit"),
      ),
    );
  });

  test("blocks the center when no creator submissions exist yet", () => {
    const center = createMarketplaceCreatorOperationsCenter({
      templates: [],
      projects: [],
      projectVersions: [],
      projectAudits: [],
      reviewTasks: [],
      auditLogs: [],
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.score, 0);
    assert.equal(center.totals.versionedSubmissions, 0);
    assert.ok(center.nextActions[0]?.includes("Create a marketplace template"));
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Launch Kit",
    creatorName: "Creator",
    creatorEmail: "creator@example.com",
    width: 1080,
    height: 1080,
    thumbnail: "data:image/png;base64,AAAA",
    isBrandTemplate: false,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "social",
    marketplaceSeason: "Evergreen",
    marketplaceReviewNote: "Original assets and license evidence approved.",
    marketplacePublishedAt: "2026-05-18T08:00:00.000Z",
    marketplaceUseCount: 3,
    marketplaceViewCount: 12,
    createdAt: "2026-05-18T07:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project",
    name: "Launch Kit campaign",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T07:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version",
    projectId: "project",
    name: "Marketplace rollback point",
    thumbnail: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createProjectAudit(
  overrides: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  return {
    projectId: "project",
    projectName: "Launch Kit campaign",
    updatedAt: "2026-05-18T10:00:00.000Z",
    overallScore: 92,
    status: "ready",
    dimensions: [
      {
        id: "accessibility",
        label: "Accessibility",
        status: "ready",
        score: 92,
        detail: "Accessibility checks are ready.",
      },
    ],
    ...overrides,
  };
}

function createReviewTask(input: {
  id: string;
  projectId: string;
  projectName: string;
  body: string;
  taskStatus: ReviewTaskStatus;
  taskDueAt: string | null;
}): ReviewTaskSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    projectName: input.projectName,
    pageId: "page",
    elementId: null,
    authorName: "Curator",
    body: input.body,
    resolved: false,
    taskStatus: input.taskStatus,
    taskAssigneeName: "Marketplace",
    taskDueAt: input.taskDueAt,
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T10:00:00.000Z",
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-log",
    action: "template.marketplace.updated",
    targetType: "template",
    targetId: "template",
    summary: "Template marketplace listing updated.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-18T08:30:00.000Z",
    ...overrides,
  };
}
