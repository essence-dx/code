import { strict as assert } from "node:assert";
import type { SceneDocument } from "@/features/editor/types";
import { createProjectDashboardAnalytics } from "@/features/projects/project-dashboard-analytics";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = new Date("2026-05-15T03:00:00.000Z");
const sceneData: SceneDocument = {
  createdAt: "2026-05-15T00:00:00.000Z",
  id: "analytics-scene",
  name: "Analytics scene",
  objects: [],
  updatedAt: "2026-05-15T01:00:00.000Z",
};
const approvedSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(
      updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
        updatedAt: "2026-05-15T00:10:00.000Z",
      }),
      "embed",
      "approved",
      {
        updatedAt: "2026-05-15T00:20:00.000Z",
      },
    ),
    "desktopRelease",
    "approved",
    {
      updatedAt: "2026-05-15T00:30:00.000Z",
    },
  ),
};
approvedSettings.reviewWorkflow = updateProjectReviewWorkflow(approvedSettings.reviewWorkflow, "appPackage", "approved", {
  updatedAt: "2026-05-15T00:40:00.000Z",
});
const analytics = createProjectDashboardAnalytics({
  comments: [
    {
      createdAt: "2026-05-15T01:15:00.000Z",
      projectId: "project-ready",
      resolvedAt: "2026-05-15T01:45:00.000Z",
      updatedAt: "2026-05-15T01:45:00.000Z",
    },
    {
      createdAt: "2026-05-15T02:15:00.000Z",
      projectId: "project-blocked",
      resolvedAt: null,
      updatedAt: "2026-05-15T02:15:00.000Z",
    },
  ],
  now,
  projects: [
    {
      archivedAt: null,
      createdAt: "2026-05-14T00:00:00.000Z",
      id: "project-ready",
      name: "Ready project",
      publishedAt: "2026-05-15T01:00:00.000Z",
      sceneData,
      shareSettings: approvedSettings,
      updatedAt: "2026-05-15T02:00:00.000Z",
    },
    {
      archivedAt: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      id: "project-blocked",
      name: "Blocked project",
      publishedAt: null,
      sceneData,
      shareSettings: defaultShareSettings,
      updatedAt: "2026-04-20T00:00:00.000Z",
    },
    {
      archivedAt: "2026-05-10T00:00:00.000Z",
      createdAt: "2026-03-01T00:00:00.000Z",
      id: "project-archived",
      name: "Archived project",
      publishedAt: null,
      sceneData,
      shareSettings: defaultShareSettings,
      updatedAt: "2026-05-10T00:00:00.000Z",
    },
  ],
});

assert.equal(analytics.activity.activeProjectCount, 2);
assert.equal(analytics.activity.archivedProjectCount, 1);
assert.equal(analytics.activity.publishedProjectCount, 1);
assert.equal(analytics.activity.updatedLast7Days, 1);
assert.equal(analytics.comments.totalCommentCount, 2);
assert.equal(analytics.comments.openCommentCount, 1);
assert.equal(analytics.comments.closureRate, 50);
assert.equal(analytics.exports.invalidSceneCount, 0);
assert.equal(analytics.exports.formatReadiness.find((entry) => entry.format === "web")?.readyCount, 2);
assert.equal(analytics.release.readyProjectCount, 1);
assert.ok(analytics.release.blockerCount > 0);
assert.equal(analytics.health.projectsNeedingAttention[0]?.id, "project-blocked");

console.log("project dashboard analytics smoke passed");
