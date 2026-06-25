import { strict as assert } from "node:assert";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import type { SceneDocument } from "@/features/editor/types";
import { createProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";
import { createWorkspaceSecurityComplianceReport } from "@/features/projects/workspace-security-compliance";

const now = "2026-05-16T23:00:00.000Z";
const defaultDocument = createDefaultDocument("Security compliance scene");
const sceneData: SceneDocument = {
  ...defaultDocument,
  activeSceneId: "scene-security",
  createdAt: now,
  id: "document-security",
  objects: [],
  scenes: [
    {
      createdAt: now,
      id: "scene-security",
      name: "Main",
      objects: [],
      updatedAt: now,
    },
  ],
  updatedAt: now,
};
const approvedWorkflow = updateProjectReviewWorkflow(
  updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(
      updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
        updatedAt: "2026-05-16T23:01:00.000Z",
      }),
      "embed",
      "approved",
      {
        updatedAt: "2026-05-16T23:02:00.000Z",
      },
    ),
    "appPackage",
    "approved",
    {
      updatedAt: "2026-05-16T23:03:00.000Z",
    },
  ),
  "desktopRelease",
  "approved",
  {
    updatedAt: "2026-05-16T23:04:00.000Z",
  },
);
const approvedShareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: approvedWorkflow,
};
const launchProject = {
  archivedAt: null,
  id: "project-launch",
  name: "Launch Scene",
  publishedAt: "2026-05-16T23:05:00.000Z",
  shareId: "share-launch",
  shareSettings: approvedShareSettings,
  updatedAt: "2026-05-16T23:06:00.000Z",
};
const draftProject = {
  archivedAt: null,
  id: "project-draft",
  name: "Draft Scene",
  publishedAt: null,
  shareId: null,
  shareSettings: defaultShareSettings,
  updatedAt: "2026-05-16T23:07:00.000Z",
};
const lineageReports = [launchProject, draftProject].map((project) =>
  createProjectExportLineageReport({
    generatedAt: "2026-05-16T23:08:00.000Z",
    origin: "https://essence.example",
    project,
    sceneData,
  }),
);
const artifactRegistryReport = createProjectArtifactRegistryReport({
  generatedAt: "2026-05-16T23:09:00.000Z",
  lineageReports,
});
const report = createWorkspaceSecurityComplianceReport({
  artifactRegistryReport,
  exportLineageReports: lineageReports,
  folderAccessGrants: [{ role: "viewer", userId: "user-viewer" }],
  generatedAt: "2026-05-16T23:10:00.000Z",
  members: [
    {
      email: "owner@example.com",
      id: "member-owner",
      joinedAt: "2026-05-16T23:11:00.000Z",
      name: "Owner",
      role: "owner",
      userId: "user-owner",
    },
    {
      email: "editor@example.com",
      id: "member-editor",
      joinedAt: "2026-05-16T23:12:00.000Z",
      name: "Editor",
      role: "editor",
      userId: "user-editor",
    },
  ],
  projectAccessGrants: [
    { role: "admin", userId: "user-admin" },
    { role: "editor", userId: "user-editor" },
  ],
  projects: [launchProject, draftProject],
  retentionPolicies: [
    {
      projectId: "project-launch",
      purgeReviewStatus: "requested",
      updatedAt: "2026-05-16T23:13:00.000Z",
    },
  ],
  workspace: {
    id: "workspace-security",
    name: "Security Workspace",
    role: "owner",
  },
});

assert.equal(report.summary.activeProjectCount, 2);
assert.equal(report.summary.memberCount, 2);
assert.equal(report.retention.coveragePercent, 50);
assert.equal(report.retention.missingProjectCount, 1);
assert.equal(report.retention.purgeApprovalRequestedCount, 1);
assert.equal(report.grants.totalGrantCount, 3);
assert.equal(report.grants.roleCounts.admin, 1);
assert.equal(report.grants.roleCounts.editor, 1);
assert.equal(report.grants.roleCounts.viewer, 1);
assert.ok(report.reviewSurfaces.some((surface) => surface.surface === "publicLink" && surface.blockedCount === 1));
assert.ok(report.summary.exportDraftCount > 0);
assert.ok(report.summary.signedBundleCertificateRequiredCount > 0);
assert.ok(report.summary.trustScore > 0);
assert.ok(report.summary.trustScore < 100);
assert.equal(report.projectRows[0]?.risk, "blocked");

console.log("workspace security compliance smoke passed");
