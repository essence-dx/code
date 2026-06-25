import { strict as assert } from "node:assert";
import { getProjectReviewGate, getSharePermissionReviewGate } from "@/features/projects/project-review-gates";
import {
  defaultShareSettings,
  projectReviewSurfaceKeys,
  resolveShareSettings,
  summarizeProjectReviewWorkflow,
  updateProjectReviewWorkflow,
} from "@/features/projects/share-settings";

const legacySettings = resolveShareSettings({
  allowCodeExport: true,
  allowEmbed: true,
  allowPublicApi: true,
  allowView: true,
  allowViewerDownload: true,
  embedCameraControls: "orbit",
  embedHeight: 640,
  embedLayout: "fixed",
  embedRadius: 12,
  embedShowGrid: true,
  embedShowNavigation: true,
  embedTransparentBackground: false,
});

assert.equal(legacySettings.reviewWorkflow.publicLink.status, "draft");
assert.equal(projectReviewSurfaceKeys.length, 4);

let workflow = legacySettings.reviewWorkflow;

workflow = updateProjectReviewWorkflow(workflow, "publicLink", "approved", {
  updatedAt: "2026-05-15T00:00:00.000Z",
});
workflow = updateProjectReviewWorkflow(workflow, "embed", "requested", {
  updatedAt: "2026-05-15T00:01:00.000Z",
});
workflow = updateProjectReviewWorkflow(workflow, "desktopRelease", "changesRequested", {
  updatedAt: "2026-05-15T00:02:00.000Z",
});
workflow = updateProjectReviewWorkflow(workflow, "appPackage", "approved", {
  updatedAt: "2026-05-15T00:03:00.000Z",
});

const summary = summarizeProjectReviewWorkflow(workflow);

assert.equal(summary.approvedCount, 2);
assert.equal(summary.requestedCount, 1);
assert.equal(summary.blockedCount, 1);
assert.equal(summary.surfaceCount, 4);
assert.equal(defaultShareSettings.reviewWorkflow.publicLink.status, "draft");

const repairedSettings = resolveShareSettings({
  ...defaultShareSettings,
  reviewWorkflow: workflow,
});

assert.equal(repairedSettings.reviewWorkflow.desktopRelease.status, "changesRequested");
assert.equal(getProjectReviewGate(defaultShareSettings, "publicLink").allowed, false);
assert.equal(getProjectReviewGate(repairedSettings, "publicLink").allowed, true);
assert.equal(getSharePermissionReviewGate(repairedSettings, "allowViewerDownload").surface, "appPackage");
assert.equal(getSharePermissionReviewGate(repairedSettings, "allowViewerDownload").allowed, true);
assert.equal(getSharePermissionReviewGate(repairedSettings, "allowCodeExport").surface, "embed");

console.log("project review workflow smoke passed");
