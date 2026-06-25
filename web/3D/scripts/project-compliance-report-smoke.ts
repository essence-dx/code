import { strict as assert } from "node:assert";
import type { SceneDocument } from "@/features/editor/types";
import { createProjectAuditLog } from "@/features/projects/project-audit-log";
import { createProjectComplianceReport, getProjectComplianceFileName } from "@/features/projects/project-compliance-report";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = "2026-05-15T01:00:00.000Z";
const sceneData: SceneDocument = {
  createdAt: now,
  id: "scene-compliance",
  name: "Compliance scene",
  objects: [],
  updatedAt: now,
};
const shareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
      updatedAt: "2026-05-15T01:01:00.000Z",
    }),
    "appPackage",
    "approved",
    {
      updatedAt: "2026-05-15T01:02:00.000Z",
    },
  ),
};
const project = {
  archivedAt: null,
  createdAt: now,
  description: "Compliance export fixture",
  id: "project-compliance",
  name: "Compliance Project",
  publishedAt: "2026-05-15T01:03:00.000Z",
  shareId: "share-compliance",
  shareSettings,
  updatedAt: "2026-05-15T01:04:00.000Z",
  userId: "owner",
};
const accessGrants = [
  {
    createdAt: "2026-05-15T01:05:00.000Z",
    createdByUserId: "owner",
    email: "editor@mail.com",
    id: "grant-compliance",
    name: "Editor",
    role: "editor" as const,
    updatedAt: "2026-05-15T01:05:00.000Z",
    userId: "editor",
  },
];
const auditLog = createProjectAuditLog({
  accessGrants,
  comments: [],
  project,
  sceneData,
  versions: [],
});
const report = createProjectComplianceReport({
  accessGrants,
  auditLog,
  generatedAt: "2026-05-15T01:06:00.000Z",
  origin: "https://essence.example",
  project,
  sceneData,
  versions: [{ createdAt: "2026-05-15T01:05:30.000Z", id: "version-compliance", name: "Compliance snapshot", objectCount: 0 }],
});

assert.equal(report.schemaVersion, 1);
assert.equal(report.project.id, "project-compliance");
assert.equal(report.permissions.accessGrantCount, 1);
assert.equal(report.publishing.published, true);
assert.equal(report.exports.available, true);
assert.equal(report.exports.summary?.objectCount, 0);
assert.equal(report.review.approvedCount, 2);
assert.equal(report.release.appPackage.allowed, true);
assert.equal(report.release.desktopRelease.allowed, false);
assert.equal(report.audit.eventCount, auditLog.events.length);
assert.equal(report.lineage.sourceVersion.id, "version-compliance");
assert.ok(report.lineage.artifacts.some((artifact) => artifact.kind === "compliance-report" && artifact.requiresAuth));
assert.equal(getProjectComplianceFileName("Compliance Project"), "compliance-project-compliance-report.json");

console.log("project compliance report smoke passed");
