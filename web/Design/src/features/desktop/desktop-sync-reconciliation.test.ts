import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { createDesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import { createDesktopSyncReconciliationCenter } from "@/features/desktop/desktop-sync-reconciliation";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

const now = new Date("2026-05-16T12:00:00.000Z");

describe("desktop sync reconciliation", () => {
  test("blocks reconciliation when local edits, stale assets, and failed exports diverge", () => {
    const projects = [
      createProject({
        id: "project-risk",
        name: "Huge campaign",
        editShareId: "edit-risk",
        editSharePermission: "edit",
        approvalStatus: "changes-requested",
        updatedAt: "2026-05-16T11:30:00.000Z",
      }),
    ];
    const assetAudit = createAssetLibraryAudit({
      uploads: [],
      brandLogos: [],
      projectManifests: [
        {
          projectId: "project-risk",
          projectName: "Huge campaign",
          totalBytes: 64_000_000,
          entryCount: 16,
          skippedReferenceCount: 2,
          updatedAt: "2026-05-14T10:00:00.000Z",
        },
      ],
    });
    const serverExportJobs = [
      createExportJob({
        id: "export-risk",
        projectId: "project-risk",
        projectName: "Huge campaign",
        status: "failed",
        progress: 10,
        failureMessage: "Renderer stopped before handoff.",
        updatedAt: "2026-05-16T11:40:00.000Z",
        completedAt: null,
      }),
    ];
    const offlineSyncCenter = createDesktopOfflineSyncCenter({
      projects,
      assetAudit,
      serverExportJobs,
      auditLogs: [
        createAuditLog({ action: "project.renamed", targetId: "project-risk" }),
      ],
      now,
    });

    const center = createDesktopSyncReconciliationCenter({
      projects,
      projectVersions: [
        createVersion({
          projectId: "project-risk",
          createdAt: "2026-05-15T10:00:00.000Z",
        }),
      ],
      serverExportJobs,
      assetAudit,
      auditLogs: [
        createAuditLog({ action: "project.renamed", targetId: "project-risk" }),
        createAuditLog({ id: "audit-2", action: "asset.deleted" }),
      ],
      offlineSyncCenter,
      now,
    });

    assert.equal(center.status, "blocked");
    assert.ok(center.conflictDiffs.length > 0);
    assert.equal(center.conflictDiffs[0]?.recommendedChoice, "merge-review");
    assert.ok(
      center.recoveryChoices.some((choice) => choice.kind === "repair-assets"),
    );
    assert.ok(
      center.recoveryChoices.some((choice) => choice.kind === "retry-export"),
    );
    assert.equal(center.staleAssetRepairs[0]?.status, "blocked");
    assert.equal(center.auditTrail.length, 2);
    assert.equal(center.totals.failedExports, 1);
    assert.match(center.packet.dataUrl, /^data:application\/json/);
  });

  test("reports ready when project versions, exports, manifests, and audits align", () => {
    const projects = [createProject({ updatedAt: "2026-05-16T10:00:00.000Z" })];
    const assetAudit = createAssetLibraryAudit({
      uploads: [],
      brandLogos: [],
      projectManifests: [
        {
          projectId: "project-1",
          projectName: "Launch",
          totalBytes: 10_000,
          entryCount: 2,
          skippedReferenceCount: 0,
          updatedAt: "2026-05-16T10:06:00.000Z",
        },
      ],
    });
    const serverExportJobs = [
      createExportJob({
        updatedAt: "2026-05-16T10:10:00.000Z",
        completedAt: "2026-05-16T10:10:00.000Z",
      }),
    ];
    const auditLogs = [createAuditLog({ action: "project.created" })];
    const offlineSyncCenter = createDesktopOfflineSyncCenter({
      projects,
      assetAudit,
      serverExportJobs,
      auditLogs,
      now,
    });

    const center = createDesktopSyncReconciliationCenter({
      projects,
      projectVersions: [
        createVersion({ createdAt: "2026-05-16T10:05:00.000Z" }),
      ],
      serverExportJobs,
      assetAudit,
      auditLogs,
      offlineSyncCenter,
      now,
    });

    assert.equal(center.status, "ready");
    assert.equal(center.conflictDiffs.length, 0);
    assert.equal(center.staleAssetRepairs.length, 0);
    assert.equal(center.recoveryChoices.length, 0);
    assert.equal(
      center.nextActions[0],
      "Desktop and cloud copies are aligned.",
    );
    assert.match(center.packet.json, /project-1/);
  });

  test("surfaces cloud restore choices when the newest cloud version is ahead of local metadata", () => {
    const projects = [createProject({ updatedAt: "2026-05-16T10:00:00.000Z" })];
    const assetAudit = createAssetLibraryAudit({
      uploads: [],
      brandLogos: [],
      projectManifests: [
        {
          projectId: "project-1",
          projectName: "Launch",
          totalBytes: 10_000,
          entryCount: 2,
          skippedReferenceCount: 0,
          updatedAt: "2026-05-16T10:02:00.000Z",
        },
      ],
    });
    const serverExportJobs = [createExportJob()];
    const auditLogs = [createAuditLog({ action: "project.restored" })];
    const offlineSyncCenter = createDesktopOfflineSyncCenter({
      projects,
      assetAudit,
      serverExportJobs,
      auditLogs,
      now,
    });

    const center = createDesktopSyncReconciliationCenter({
      projects,
      projectVersions: [
        createVersion({ createdAt: "2026-05-16T11:00:00.000Z" }),
      ],
      serverExportJobs,
      assetAudit,
      auditLogs,
      offlineSyncCenter,
      now,
    });

    assert.equal(center.status, "review");
    assert.equal(center.conflictDiffs[0]?.recommendedChoice, "restore-cloud");
    assert.ok(
      center.recoveryChoices.some((choice) => choice.kind === "restore-cloud"),
    );
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
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

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Autosave",
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
