import { strict as assert } from "node:assert";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { createSceneQaSnapshotReport, type SceneQaProjectSource } from "@/features/projects/scene-qa-snapshots";
import { defaultShareSettings, projectReviewSurfaceKeys, updateProjectReviewWorkflow, type ShareSettings } from "@/features/projects/share-settings";

function approveAllReviewSurfaces(settings: ShareSettings) {
  return {
    ...settings,
    reviewWorkflow: projectReviewSurfaceKeys.reduce(
      (workflow, surface) =>
        updateProjectReviewWorkflow(workflow, surface, "approved", {
          reviewerName: "QA Lead",
          updatedAt: "2026-05-16T13:30:00.000Z",
        }),
      settings.reviewWorkflow,
    ),
  };
}

const now = new Date("2026-05-16T14:00:00.000Z");
const approvedShareSettings = approveAllReviewSurfaces(defaultShareSettings);
const publishedProject: SceneQaProjectSource = {
  archivedAt: null,
  id: "project-ready",
  name: "Published Launch",
  publishedAt: "2026-05-16T12:00:00.000Z",
  sceneData: createDefaultDocument("Published Launch"),
  shareId: "share-ready",
  shareSettings: approvedShareSettings,
  updatedAt: "2026-05-16T12:30:00.000Z",
};
const apiDisabledProject: SceneQaProjectSource = {
  archivedAt: null,
  id: "project-api-disabled",
  name: "Embed Only",
  publishedAt: "2026-05-16T12:00:00.000Z",
  sceneData: createDefaultDocument("Embed Only"),
  shareId: "share-embed",
  shareSettings: {
    ...approvedShareSettings,
    allowPublicApi: false,
  },
  updatedAt: "2026-05-16T12:45:00.000Z",
};
const invalidProject: SceneQaProjectSource = {
  archivedAt: null,
  id: "project-invalid",
  name: "Broken Public Scene",
  publishedAt: "2026-05-16T12:00:00.000Z",
  sceneData: { broken: true },
  shareId: "share-broken",
  shareSettings: approvedShareSettings,
  updatedAt: "2026-05-16T13:00:00.000Z",
};

const report = createSceneQaSnapshotReport({
  now,
  projects: [publishedProject, apiDisabledProject, invalidProject],
  templateIds: ["product-launch-review"],
});

assert.equal(report.generatedAt, "2026-05-16T14:00:00.000Z");
assert.equal(report.summary.publicViewerCount, 3);
assert.equal(report.summary.embedCount, 3);
assert.equal(report.summary.apiPayloadCount, 3);
assert.equal(report.summary.templateLaunchCount, 1);
assert.equal(report.summary.templateCount, 1);
assert.equal(report.summary.warningCount, 1);
assert.equal(report.summary.failedCount, 3);
assert.ok(report.comparisons.some((comparison) => comparison.projectId === "project-ready" && comparison.surface === "api-payload" && comparison.status === "pass"));
assert.ok(report.comparisons.some((comparison) => comparison.projectId === "project-api-disabled" && comparison.surface === "api-payload" && comparison.status === "warn"));
assert.ok(report.comparisons.some((comparison) => comparison.projectId === "project-invalid" && comparison.surface === "embed" && comparison.status === "fail"));
assert.ok(report.comparisons.some((comparison) => comparison.templateId === "product-launch-review" && comparison.status === "pass"));

console.log("scene QA snapshots smoke passed");
