import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import { createDesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

const now = new Date("2026-05-16T12:00:00.000Z");

describe("desktop offline sync center", () => {
  test("reports a ready sync center when manifests and handoffs are healthy", () => {
    const center = createDesktopOfflineSyncCenter({
      projects: [createProject({ updatedAt: "2026-05-10T12:00:00.000Z" })],
      assetAudit: createAssetLibraryAudit({
        uploads: [],
        brandLogos: [],
        projectManifests: [
          {
            projectId: "project-1",
            projectName: "Launch",
            totalBytes: 10_000,
            entryCount: 2,
            skippedReferenceCount: 0,
            updatedAt: "2026-05-16T10:00:00.000Z",
          },
        ],
      }),
      serverExportJobs: [createExportJob()],
      auditLogs: [createAuditLog({ action: "asset.duplicates_deleted" })],
      now,
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.queueItems, 0);
    assert.equal(center.totals.localToCloudHandoffs, 0);
    assert.equal(center.totals.batchExports, 0);
    assert.equal(center.totals.watchedFolders, 0);
    assert.equal(center.totals.integrityIssues, 0);
    assert.equal(center.totals.auditEvents, 1);
  });

  test("blocks sync when conflicts, skipped assets, and failed exports exist", () => {
    const center = createDesktopOfflineSyncCenter({
      projects: [
        createProject({
          editShareId: "edit-1",
          editSharePermission: "edit",
          approvalStatus: "changes-requested",
          updatedAt: "2026-05-16T11:30:00.000Z",
        }),
      ],
      assetAudit: createAssetLibraryAudit({
        uploads: [],
        brandLogos: [],
        projectManifests: [
          {
            projectId: "project-2",
            projectName: "Huge campaign",
            totalBytes: 32_000_000,
            entryCount: 20,
            skippedReferenceCount: 3,
            updatedAt: "2026-05-16T11:00:00.000Z",
          },
        ],
      }),
      serverExportJobs: [
        createExportJob({
          status: "failed",
          progress: 10,
          failureMessage: "Renderer stopped.",
        }),
      ],
      auditLogs: [],
      now,
    });

    assert.equal(center.status, "blocked");
    assert.ok(center.totals.conflicts > 0);
    assert.ok(center.totals.resumableUploads > 0);
    assert.ok(center.totals.exportHandoffs > 0);
    assert.ok(center.totals.batchExports > 0);
    assert.ok(center.totals.integrityIssues > 0);
    assert.ok(center.nextActions.length > 0);
  });

  test("adds watched folder work when project manifests do not cover active work", () => {
    const center = createDesktopOfflineSyncCenter({
      projects: [
        createProject({ id: "project-1", updatedAt: "2026-05-15T12:00:00.000Z" }),
        createProject({ id: "project-2", updatedAt: "2026-05-15T12:00:00.000Z" }),
      ],
      assetAudit: createAssetLibraryAudit({
        uploads: [],
        brandLogos: [],
        projectManifests: [
          {
            projectId: "project-1",
            projectName: "Launch",
            totalBytes: 10_000,
            entryCount: 2,
            skippedReferenceCount: 0,
            updatedAt: "2026-05-16T10:00:00.000Z",
          },
        ],
      }),
      serverExportJobs: [createExportJob({ projectId: "project-1" })],
      auditLogs: [createAuditLog({ action: "project.updated" })],
      now,
    });

    assert.ok(center.totals.watchedFolders > 0);
    assert.ok(
      center.diagnostics.some((diagnostic) => diagnostic.id === "watched-folders"),
    );
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch",
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
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-15T10:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Launch",
    format: "png",
    formatLabel: "PNG",
    fileName: "launch.png",
    status: "completed",
    progress: 100,
    artifactName: "launch.png",
    artifactMimeType: "image/png",
    artifactSizeBytes: 100,
    artifactDataUrl: "data:image/png;base64,aGVsbG8=",
    failureMessage: null,
    createdAt: "2026-05-16T10:00:00.000Z",
    updatedAt: "2026-05-16T10:30:00.000Z",
    completedAt: "2026-05-16T10:30:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "project.created",
    targetType: "project",
    targetId: "project-1",
    summary: "Created project.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}
