import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { ContentScheduleSummary } from "@/db/content-planner";
import {
  createWorkspaceCommandCenter,
  filterWorkspaceCommandItems,
} from "@/features/search/workspace-command-center";

describe("workspace command center", () => {
  test("indexes projects, assets, templates, tasks, exports, and saved filters", () => {
    const center = createWorkspaceCommandCenter({
      projects: [createProject()],
      assetAudit: createAssetAudit(),
      templates: [createTemplate()],
      reviewTasks: [createReviewTask()],
      serverExportJobs: [createExportJob()],
      contentScheduleItems: [createPlannerItem()],
    });

    assert.equal(center.totals.projects, 1);
    assert.equal(center.totals.assets, 1);
    assert.equal(center.totals.templates, 1);
    assert.equal(center.totals.tasks, 1);
    assert.equal(center.totals.exports, 1);
    assert.equal(center.totals.savedFilters, 5);
    assert.ok(center.totals.searchableItems >= 10);
    assert.ok(center.recommendedCommands.length > 0);
  });

  test("filters workspace commands by meaningful query tokens", () => {
    const center = createWorkspaceCommandCenter({
      projects: [createProject({ name: "Launch Campaign" })],
      assetAudit: createAssetAudit({
        records: [
          {
            id: "asset-1",
            name: "Logo.png",
            scope: "uploads",
            scopeLabel: "Uploads",
            mimeType: "image/png",
            sizeBytes: 2048,
            updatedAt: "2026-05-16T10:00:00.000Z",
            previewUrl: null,
            href: null,
            referenceCount: null,
            skippedReferenceCount: null,
            duplicateKey: "dup-1",
            sourceProvider: null,
            sourceUrl: null,
            authorName: null,
            licenseName: null,
            licenseUrl: null,
          },
        ],
      }),
      templates: [createTemplate({ name: "Launch Template" })],
      reviewTasks: [createReviewTask({ body: "Update launch headline" })],
      serverExportJobs: [createExportJob({ status: "failed" })],
      contentScheduleItems: [],
    });

    const launchResults = filterWorkspaceCommandItems(center.items, "launch");
    const blockedResults = filterWorkspaceCommandItems(center.items, "failed");

    assert.ok(launchResults.some((item) => item.kind === "project"));
    assert.ok(launchResults.some((item) => item.kind === "template"));
    assert.ok(launchResults.some((item) => item.kind === "task"));
    assert.ok(blockedResults.some((item) => item.kind === "export"));
    assert.ok(blockedResults.some((item) => item.kind === "filter"));
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch design",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: "public-1",
    editShareId: "edit-1",
    editSharePermission: "comment",
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
    marketplaceCollection: "social",
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

function createAssetAudit(
  overrides: Partial<AssetLibraryAudit> = {},
): AssetLibraryAudit {
  return {
    quotaBytes: 1024 * 1024,
    totalBytes: 2048,
    usagePercent: 0.2,
    assetCount: 1,
    duplicateCount: 0,
    duplicateBytes: 0,
    projectManifestCount: 0,
    skippedProjectReferenceCount: 0,
    scopes: [],
    records: [
      {
        id: "asset-1",
        name: "Launch logo",
        scope: "uploads",
        scopeLabel: "Uploads",
        mimeType: "image/png",
        sizeBytes: 2048,
        updatedAt: "2026-05-16T10:00:00.000Z",
        previewUrl: null,
        href: null,
        referenceCount: null,
        skippedReferenceCount: null,
        duplicateKey: null,
        sourceProvider: "Upload",
        sourceUrl: null,
        authorName: null,
        licenseName: null,
        licenseUrl: null,
      },
    ],
    largestAssets: [],
    duplicateGroups: [],
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "task-1",
    projectId: "project-1",
    projectName: "Launch design",
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: "Review launch headline",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Designer",
    taskDueAt: "2026-05-17T10:00:00.000Z",
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Launch design",
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

function createPlannerItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "planner-1",
    projectId: "project-1",
    projectName: "Launch design",
    title: "Launch post",
    channel: "Instagram",
    caption: "Launch caption",
    status: "planned",
    scheduledAt: "2026-05-18T10:00:00.000Z",
    createdAt: "2026-05-16T10:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}
