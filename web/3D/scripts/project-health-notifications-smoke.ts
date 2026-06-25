import { strict as assert } from "node:assert";
import { createSceneObject, createDefaultDocument } from "@/features/editor/scene/default-document";
import { createProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = new Date("2026-05-15T14:00:00.000Z");
const readyReviewWorkflow = updateProjectReviewWorkflow(
  updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
      updatedAt: "2026-05-15T13:00:00.000Z",
    }),
    "desktopRelease",
    "approved",
    {
      updatedAt: "2026-05-15T13:01:00.000Z",
    },
  ),
  "appPackage",
  "approved",
  {
    updatedAt: "2026-05-15T13:02:00.000Z",
  },
);
const imageScene = createDefaultDocument("Asset review");

imageScene.objects.push(createSceneObject("image", "Missing campaign image"));

const center = createProjectHealthNotificationCenter({
  comments: [
    {
      createdAt: "2026-05-01T10:00:00.000Z",
      projectId: "project-assets",
      resolvedAt: null,
      updatedAt: "2026-05-04T10:00:00.000Z",
    },
    {
      createdAt: "2026-05-10T10:00:00.000Z",
      projectId: "project-invalid",
      resolvedAt: null,
      updatedAt: "2026-05-14T10:00:00.000Z",
    },
  ],
  now,
  projects: [
    {
      archivedAt: null,
      id: "project-invalid",
      name: "Broken export",
      publishedAt: now,
      sceneData: { id: "bad-scene" },
      shareSettings: defaultShareSettings,
      updatedAt: "2026-05-15T12:00:00.000Z",
    },
    {
      archivedAt: null,
      id: "project-assets",
      name: "Asset handoff",
      publishedAt: null,
      sceneData: imageScene,
      shareSettings: {
        ...defaultShareSettings,
        reviewWorkflow: readyReviewWorkflow,
      },
      updatedAt: "2026-05-15T11:00:00.000Z",
    },
  ],
  staleCommentDays: 7,
});

const kinds = new Set(center.notifications.map((notification) => notification.kind));

assert.equal(center.generatedAt, "2026-05-15T14:00:00.000Z");
assert.equal(kinds.has("failed-export"), true);
assert.equal(kinds.has("blocked-review"), true);
assert.equal(kinds.has("release-readiness"), true);
assert.equal(kinds.has("stale-comments"), true);
assert.equal(kinds.has("missing-assets"), true);
assert.ok(center.summary.criticalCount >= 1);
assert.ok(center.summary.totalCount >= 5);
assert.equal(center.notifications[0].severity, "critical");

console.log("project health notifications smoke passed");
