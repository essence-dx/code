import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type { MixedFormatWorkspaceOrchestration } from "@/features/visual-suite/mixed-format-orchestration";
import { createWorkspaceIntegrationSurface } from "@/features/visual-suite/workspace-integration-surface";

describe("workspace integration surface", () => {
  test("marks complete handoffs, shelves, and review queues as ready", () => {
    const project = createProject();
    const surface = createWorkspaceIntegrationSurface({
      projects: [project],
      templates: [createTemplate()],
      projectAudits: [],
      projectHandoffPackets: [createHandoffPacket(project)],
      reviewTasks: [],
      serverExportJobs: [createExportJob(project)],
      mixedFormatOrchestration: createMixedFormatOrchestration(),
    });

    assert.equal(surface.status, "ready");
    assert.equal(surface.score, 100);
    assert.equal(surface.totals.handoffReady, 1);
    assert.equal(surface.totals.templateShelves, 3);
    assert.equal(surface.totals.reviewItems, 0);
  });

  test("prioritizes blocked handoffs and overdue review work", () => {
    const project = createProject({ id: "project-review", name: "Launch kit" });
    const surface = createWorkspaceIntegrationSurface({
      projects: [project],
      templates: [
        createTemplate({
          id: "template-review",
          approvalStatus: "changes-requested",
          marketplaceStatus: "review",
          marketplaceReviewNote: "Missing preview thumbnail.",
        }),
      ],
      projectAudits: [
        {
          projectId: project.id,
          projectName: project.name,
          updatedAt: "2026-05-16T00:00:00.000Z",
          overallScore: 42,
          status: "fix",
          dimensions: [
            {
              id: "brand",
              label: "Brand",
              status: "fix",
              score: 20,
              detail: "Brand colors need review.",
            },
          ],
        } satisfies ProjectAuditSummary,
      ],
      projectHandoffPackets: [
        createHandoffPacket(project, {
          status: "blocked",
          packetScore: 35,
          nextAction: "Resolve readiness audit issues.",
        }),
      ],
      reviewTasks: [
        {
          id: "task-1",
          projectId: project.id,
          pageId: "page-1",
          elementId: null,
          authorName: "Reviewer",
          body: "Fix the export copy.",
          resolved: false,
          taskStatus: "todo",
          taskAssigneeName: "Design",
          taskDueAt: "2026-05-10T00:00:00.000Z",
          createdAt: "2026-05-09T00:00:00.000Z",
          updatedAt: "2026-05-09T00:00:00.000Z",
          projectName: project.name,
        } satisfies ReviewTaskSummary,
      ],
      serverExportJobs: [],
      mixedFormatOrchestration: createMixedFormatOrchestration(),
      now: new Date("2026-05-16T12:00:00.000Z"),
    });

    assert.equal(surface.status, "blocked");
    assert.ok(surface.score < 85);
    assert.equal(surface.totals.reviewItems, 3);
    assert.ok(
      surface.nextActions.some((action) =>
        action.includes("Production review queue"),
      ),
    );
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch campaign",
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
    updatedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch social pack",
    creatorName: "Studio",
    creatorEmail: null,
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "social",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T00:00:00.000Z",
    marketplaceUseCount: 4,
    marketplaceViewCount: 10,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createHandoffPacket(
  project: ProjectSummary,
  overrides: Partial<ProjectHandoffPacket> = {},
): ProjectHandoffPacket {
  return {
    projectId: project.id,
    projectName: project.name,
    updatedAt: project.updatedAt,
    approvalStatus: project.approvalStatus,
    packetScore: 100,
    status: "ready",
    nextAction: "Ready for handoff.",
    readinessReport: null,
    exportBundle: {
      status: "ready",
      completedCount: 1,
      storedArtifactCount: 1,
      failedCount: 0,
      latestFormatLabel: "PDF",
      latestArtifactName: "launch.pdf",
      latestCompletedAt: "2026-05-16T00:00:00.000Z",
      totalStoredBytes: 1000,
    },
    stakeholderNotes: {
      totalCount: 0,
      unresolvedCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      latestNoteAt: null,
    },
    approvalHistory: [],
    checklist: [],
    ...overrides,
  };
}

function createExportJob(project: ProjectSummary): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: project.id,
    projectName: project.name,
    format: "pdf",
    formatLabel: "PDF",
    fileName: "launch.pdf",
    status: "completed",
    progress: 100,
    artifactName: "launch.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 1000,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    completedAt: "2026-05-16T00:00:00.000Z",
  };
}

function createMixedFormatOrchestration(): MixedFormatWorkspaceOrchestration {
  return {
    projects: [],
    suiteCoverage: [],
    totals: {
      projects: 1,
      mixedFormatProjects: 1,
      pageCount: 3,
      averageReadiness: 95,
    },
  };
}
