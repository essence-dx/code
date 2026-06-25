import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createWorkspacePackageOperations } from "@/features/operations/workspace-package-operations";

describe("workspace package operations", () => {
  test("reports ready package operations for versioned, exported, and approved work", () => {
    const project = createProject({
      id: "project-1",
      updatedAt: "2026-05-16T10:00:00.000Z",
    });
    const operations = createWorkspacePackageOperations({
      projects: [project],
      templates: [createTemplate()],
      projectVersions: [
        createVersion({
          projectId: project.id,
          createdAt: "2026-05-16T10:05:00.000Z",
        }),
      ],
      serverExportJobs: [createExportJob({ projectId: project.id })],
      projectHandoffPackets: [createHandoffPacket({ projectId: project.id })],
    });

    assert.equal(operations.status, "ready");
    assert.equal(operations.totals.readyBundles, 1);
    assert.equal(operations.totals.componentKits, 4);
    assert.equal(operations.totals.blockedDependencies, 0);
    assert.equal(operations.nextActions.length, 0);
  });

  test("surfaces blocked package work when snapshots and source links are missing", () => {
    const operations = createWorkspacePackageOperations({
      projects: [
        createProject({
          id: "variant-project",
          sourceProjectId: "missing-source",
          variantProfileId: "instagram-story",
          approvalStatus: "changes-requested",
        }),
      ],
      templates: [],
      projectVersions: [],
      serverExportJobs: [],
      projectHandoffPackets: [],
    });

    assert.equal(operations.status, "blocked");
    assert.ok(operations.totals.blockedDependencies > 0);
    assert.ok(operations.nextActions.length > 0);
    assert.equal(
      operations.sections.find((section) => section.id === "project-bundles")
        ?.status,
      "blocked",
    );
    assert.equal(
      operations.sections.find((section) => section.id === "dependency-health")
        ?.metricValue,
      2,
    );
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch system",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: "public-1",
    editShareId: "edit-1",
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-15T10:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch kit",
    creatorName: "Essence",
    creatorEmail: "admin@mail.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "Launch",
    marketplaceSeason: "Evergreen",
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T10:00:00.000Z",
    marketplaceUseCount: 3,
    marketplaceViewCount: 12,
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Launch snapshot",
    thumbnail: null,
    createdAt: "2026-05-16T10:05:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Launch system",
    format: "png",
    formatLabel: "PNG",
    fileName: "launch.png",
    status: "completed",
    progress: 100,
    artifactName: "launch.png",
    artifactMimeType: "image/png",
    artifactSizeBytes: 1200,
    artifactDataUrl: "data:image/png;base64,aGVsbG8=",
    failureMessage: null,
    createdAt: "2026-05-16T10:00:00.000Z",
    updatedAt: "2026-05-16T10:06:00.000Z",
    completedAt: "2026-05-16T10:06:00.000Z",
    ...overrides,
  };
}

function createHandoffPacket(
  overrides: Partial<ProjectHandoffPacket> = {},
): ProjectHandoffPacket {
  return {
    projectId: "project-1",
    projectName: "Launch system",
    updatedAt: "2026-05-16T10:06:00.000Z",
    approvalStatus: "approved",
    packetScore: 100,
    status: "ready",
    nextAction: "Ready for package handoff.",
    readinessReport: null,
    exportBundle: {
      status: "ready",
      completedCount: 1,
      storedArtifactCount: 1,
      failedCount: 0,
      latestFormatLabel: "PNG",
      latestArtifactName: "launch.png",
      latestCompletedAt: "2026-05-16T10:06:00.000Z",
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
