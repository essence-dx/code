import { strict as assert } from "node:assert";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import {
  createSceneQaBaselineRecordsFromReport,
  createSceneQaBaselineTrendReport,
} from "@/features/projects/scene-qa-baseline-trends";
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

function createProject(shareSettings: ShareSettings): SceneQaProjectSource {
  return {
    archivedAt: null,
    id: "project-ready",
    name: "Published Launch",
    publishedAt: "2026-05-16T12:00:00.000Z",
    sceneData: createDefaultDocument("Published Launch"),
    shareId: "share-ready",
    shareSettings,
    updatedAt: "2026-05-16T12:30:00.000Z",
  };
}

const approvedShareSettings = approveAllReviewSurfaces(defaultShareSettings);
const firstReport = createSceneQaSnapshotReport({
  now: new Date("2026-05-16T14:00:00.000Z"),
  projects: [createProject(approvedShareSettings)],
  templateIds: ["product-launch-review"],
});
const secondReport = createSceneQaSnapshotReport({
  now: new Date("2026-05-16T15:00:00.000Z"),
  projects: [
    createProject({
      ...approvedShareSettings,
      allowPublicApi: false,
    }),
  ],
  templateIds: ["product-launch-review"],
});
const records = [
  ...createSceneQaBaselineRecordsFromReport({
    deploymentId: "deployment-a",
    report: firstReport,
    workspaceId: "workspace-a",
  }),
  ...createSceneQaBaselineRecordsFromReport({
    deploymentId: "deployment-b",
    report: secondReport,
    workspaceId: "workspace-a",
  }),
];
const trendReport = createSceneQaBaselineTrendReport(records);
const latest = trendReport.latestTrend;

assert.equal(firstReport.summary.totalCount, 4);
assert.equal(secondReport.summary.warningCount, 1);
assert.equal(records.length, 8);
assert.equal(trendReport.summary.deploymentCount, 2);
assert.equal(trendReport.summary.latestDeploymentId, "deployment-b");
assert.ok(latest, "latest deployment trend should exist");
assert.equal(latest?.deploymentId, "deployment-b");
assert.equal(latest?.warningCount, 1);
assert.equal(latest?.changedStatusCount, 1);
assert.equal(latest?.newComparisonCount, 0);
assert.equal(latest?.removedComparisonCount, 0);
assert.ok(latest?.topDrifts.some((drift) => drift.comparisonId === "project:project-ready:api-payload" && drift.type === "status"));

console.log("scene QA baseline trends smoke passed");
