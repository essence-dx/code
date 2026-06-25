import { strict as assert } from "node:assert";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import type { SceneDocument } from "@/features/editor/types";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { createProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = "2026-05-17T00:00:00.000Z";
const defaultDocument = createDefaultDocument("Public surface scene");
const sceneData: SceneDocument = {
  ...defaultDocument,
  activeSceneId: "scene-public",
  createdAt: now,
  id: "document-public",
  objects: [],
  scenes: [
    {
      createdAt: now,
      id: "scene-public",
      name: "Main",
      objects: [],
      updatedAt: now,
    },
  ],
  updatedAt: now,
};
const approvedWorkflow = updateProjectReviewWorkflow(
  updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
      updatedAt: "2026-05-17T00:01:00.000Z",
    }),
    "embed",
    "approved",
    {
      updatedAt: "2026-05-17T00:02:00.000Z",
    },
  ),
  "appPackage",
  "approved",
  {
    updatedAt: "2026-05-17T00:03:00.000Z",
  },
);
const approvedShareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: approvedWorkflow,
};
const publishedLineage = createProjectExportLineageReport({
  generatedAt: "2026-05-17T00:04:00.000Z",
  origin: "https://essence.example",
  project: {
    id: "project-public",
    name: "Published Project",
    publishedAt: "2026-05-17T00:05:00.000Z",
    shareId: "share-public",
    shareSettings: approvedShareSettings,
    updatedAt: "2026-05-17T00:06:00.000Z",
  },
  sceneData,
});
const draftLineage = createProjectExportLineageReport({
  generatedAt: "2026-05-17T00:07:00.000Z",
  origin: "https://essence.example",
  project: {
    id: "project-draft",
    name: "Draft Project",
    publishedAt: null,
    shareId: null,
    shareSettings: defaultShareSettings,
    updatedAt: "2026-05-17T00:08:00.000Z",
  },
  sceneData,
});
const report = createProjectPublicSurfaceHealthReport({
  batchId: "batch-public-health",
  generatedAt: "2026-05-17T00:09:00.000Z",
  lineageReports: [publishedLineage, draftLineage],
});

assert.equal(report.summary.publicViewerCount, 2);
assert.equal(report.summary.embedCount, 2);
assert.equal(report.summary.apiPayloadCount, 2);
assert.equal(report.summary.appPackageCount, publishedLineage.summary.appPackageCount + draftLineage.summary.appPackageCount);
assert.ok(report.summary.passCount > 0);
assert.ok(report.summary.warnCount > 0);
assert.equal(report.summary.failCount, 0);
assert.ok(report.summary.screenshotPendingCount >= 2);
assert.equal(report.history.batchCount, 1);
assert.equal(report.history.recentBatches[0]?.batchId, "batch-public-health");
assert.equal(report.snapshots.some((snapshot) => snapshot.surface === "app-package" && snapshot.screenshotState === "not-applicable"), true);
assert.equal(report.snapshots.some((snapshot) => snapshot.surface === "public-viewer" && snapshot.screenshotState === "pending"), true);

console.log("public surface health smoke passed");
