import { strict as assert } from "node:assert";
import { createWorkspaceMaintenanceCommandCenterReport } from "@/features/projects/workspace-maintenance-command-center";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ReleaseArchiveExplorerReport } from "@/features/projects/release-archive-explorer";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-05-16T08:00:00.000Z";

const members: WorkspaceMemberRow[] = [
  {
    email: "owner@example.com",
    id: "member-owner",
    joinedAt: "2026-01-01T00:00:00.000Z",
    name: "Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "admin@example.com",
    id: "member-admin",
    joinedAt: "2026-01-05T00:00:00.000Z",
    name: "Admin",
    role: "admin",
    userId: "user-admin",
  },
  {
    email: "viewer@example.com",
    id: "member-viewer",
    joinedAt: "2026-04-20T00:00:00.000Z",
    name: "Viewer",
    role: "viewer",
    userId: "user-viewer",
  },
];

const artifactRegistryReport: ProjectArtifactRegistryReport = {
  entries: [
    {
      artifactId: "artifact-blocked",
      kind: "public-asset",
      label: "Old preview",
      metadata: null,
      path: "/public/old-preview.png",
      projectId: "project-stale",
      projectName: "Stale published scene",
      registeredAt: "2026-01-01T00:00:00.000Z",
      requiresAuth: false,
      signatureState: "not-required",
      sourceKey: "project-stale:asset:old-preview",
      sourceVersionId: "version-1",
      status: "blocked",
      updatedAt: "2026-02-01T00:00:00.000Z",
      url: "https://example.com/old-preview.png",
      visibility: "public",
    },
    {
      artifactId: "artifact-draft",
      kind: "lineage-snapshot",
      label: "Old lineage snapshot",
      metadata: null,
      path: null,
      projectId: "project-draft",
      projectName: "Draft scene",
      registeredAt: "2026-01-01T00:00:00.000Z",
      requiresAuth: true,
      signatureState: "not-required",
      sourceKey: "project-draft:lineage:old",
      sourceVersionId: "version-2",
      status: "draft",
      updatedAt: "2026-02-15T00:00:00.000Z",
      url: null,
      visibility: "private",
    },
  ],
  generatedAt,
  summary: {
    availableCount: 0,
    blockedCount: 1,
    complianceExportCount: 0,
    draftCount: 1,
    lineageSnapshotCount: 1,
    privateCount: 1,
    publicAssetCount: 1,
    publicCount: 1,
    signedBundleCount: 0,
    totalCount: 2,
  },
};

const releaseArchiveExplorer: ReleaseArchiveExplorerReport = {
  generatedAt,
  rows: [
    {
      downloadHref: "/api/workspaces/workspace-1/release-evidence-bundle",
      evidence: "10 files, 4 projects, 20 audit events, 0 release blockers.",
      id: "release-evidence-bundles",
      label: "Release evidence bundles",
      latestActivityAt: "2026-02-10T00:00:00.000Z",
      nextAction: "Download the current evidence bundle.",
      ownerHint: "Launch owner",
      recordCount: 10,
      status: "watch",
    },
    {
      downloadHref: null,
      evidence: "5/5 restore scopes ready.",
      id: "restore-rehearsals",
      label: "Restore rehearsals",
      latestActivityAt: "2026-05-16T07:30:00.000Z",
      nextAction: "Keep notes current.",
      ownerHint: "Workspace owner",
      recordCount: 5,
      status: "ready",
    },
  ],
  summary: {
    blockedCount: 0,
    downloadableCount: 1,
    evidenceRecordCount: 15,
    governanceScore: 83,
    latestActivityAt: "2026-05-16T07:30:00.000Z",
    readyCount: 1,
    totalCount: 2,
    watchCount: 1,
    worstStatus: "watch",
  },
};

const mixedReport = createWorkspaceMaintenanceCommandCenterReport({
  activeSessionsByUserId: {
    "user-owner": 1,
  },
  artifactRegistryReport,
  generatedAt,
  members,
  projects: [
    {
      archivedAt: null,
      id: "project-stale",
      name: "Stale published scene",
      publishedAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      archivedAt: null,
      id: "project-draft",
      name: "Draft scene",
      publishedAt: null,
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  ],
  releaseArchiveExplorer,
});

assert.equal(mixedReport.summary.totalCount, 5);
assert.equal(mixedReport.summary.blockedCount, 3);
assert.equal(mixedReport.summary.watchCount, 1);
assert.equal(mixedReport.summary.readyCount, 1);
assert.equal(mixedReport.summary.maintenanceScore, 33);
assert.equal(mixedReport.summary.cleanupTaskCount, 7);
assert.equal(mixedReport.rows.find((row) => row.id === "stale-projects")?.status, "blocked");
assert.equal(mixedReport.rows.find((row) => row.id === "inactive-members")?.status, "blocked");
assert.equal(mixedReport.rows.find((row) => row.id === "old-artifacts")?.status, "blocked");
assert.equal(mixedReport.rows.find((row) => row.id === "expiring-evidence")?.status, "watch");
assert.equal(mixedReport.actions[0]?.priority, "high");

const readyReport = createWorkspaceMaintenanceCommandCenterReport({
  activeSessionsByUserId: {
    "user-owner": 1,
    "user-admin": 1,
    "user-viewer": 1,
  },
  artifactRegistryReport: {
    ...artifactRegistryReport,
    entries: [],
    summary: {
      ...artifactRegistryReport.summary,
      blockedCount: 0,
      draftCount: 0,
      totalCount: 0,
    },
  },
  generatedAt,
  members,
  projects: [
    {
      archivedAt: null,
      id: "project-fresh",
      name: "Fresh scene",
      publishedAt: null,
      updatedAt: "2026-05-15T00:00:00.000Z",
    },
  ],
  releaseArchiveExplorer: {
    ...releaseArchiveExplorer,
    rows: releaseArchiveExplorer.rows.map((row) => ({
      ...row,
      latestActivityAt: generatedAt,
      status: "ready",
    })),
    summary: {
      ...releaseArchiveExplorer.summary,
      blockedCount: 0,
      governanceScore: 100,
      watchCount: 0,
      worstStatus: "ready",
    },
  },
});

assert.equal(readyReport.summary.maintenanceScore, 100);
assert.equal(readyReport.summary.cleanupTaskCount, 0);
assert.equal(readyReport.summary.readyCount, 5);
assert.equal(readyReport.actions.length, 0);

console.log("workspace maintenance command center smoke passed");
