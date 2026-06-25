import { strict as assert } from "node:assert";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import type { SceneDocument } from "@/features/editor/types";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { createProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import {
  applyProjectPublicSurfaceScreenshotCaptureArtifacts,
  runProjectPublicSurfaceScreenshotCapture,
  type ProjectPublicSurfaceScreenshotCaptureArtifact,
} from "@/features/projects/public-surface-screenshot-capture";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = "2026-05-17T02:00:00.000Z";
const defaultDocument = createDefaultDocument("Screenshot worker scene");
const sceneData: SceneDocument = {
  ...defaultDocument,
  activeSceneId: "scene-screenshot",
  createdAt: now,
  id: "document-screenshot",
  objects: [],
  scenes: [
    {
      createdAt: now,
      id: "scene-screenshot",
      name: "Main",
      objects: [],
      updatedAt: now,
    },
  ],
  updatedAt: now,
};
const approvedShareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
      updatedAt: "2026-05-17T02:01:00.000Z",
    }),
    "embed",
    "approved",
    {
      updatedAt: "2026-05-17T02:02:00.000Z",
    },
  ),
};
const lineage = createProjectExportLineageReport({
  generatedAt: "2026-05-17T02:03:00.000Z",
  origin: "https://essence.example",
  project: {
    id: "project-screenshot",
    name: "Screenshot Project",
    publishedAt: "2026-05-17T02:04:00.000Z",
    shareId: "share-screenshot",
    shareSettings: approvedShareSettings,
    updatedAt: "2026-05-17T02:05:00.000Z",
  },
  sceneData,
});
const report = createProjectPublicSurfaceHealthReport({
  batchId: "batch-screenshot",
  generatedAt: "2026-05-17T02:06:00.000Z",
  lineageReports: [lineage],
});
const firstJobSourceKey = report.snapshots.find((snapshot) => snapshot.surface === "public-viewer")?.sourceKey ?? "";
const embedJobSourceKey = report.snapshots.find((snapshot) => snapshot.surface === "embed")?.sourceKey ?? "";
const baselineArtifacts: ProjectPublicSurfaceScreenshotCaptureArtifact[] = [
  {
    byteSize: 2048,
    capturedAt: "2026-05-17T01:00:00.000Z",
    contentHash: "stable-hash",
    diffScore: 0,
    diffStatus: "stable",
    diffSummary: "Previous baseline.",
    height: 768,
    id: "baseline-viewer",
    path: ".surface-health/baseline-viewer.png",
    sourceKey: firstJobSourceKey,
    width: 1365,
  },
  {
    byteSize: 2048,
    capturedAt: "2026-05-17T01:00:00.000Z",
    contentHash: "old-embed-hash",
    diffScore: 0,
    diffStatus: "stable",
    diffSummary: "Previous embed baseline.",
    height: 768,
    id: "baseline-embed",
    path: ".surface-health/baseline-embed.png",
    sourceKey: embedJobSourceKey,
    width: 1365,
  },
];
const captureRun = await runProjectPublicSurfaceScreenshotCapture({
  adapter: {
    async capture(job) {
      const stable = job.sourceKey === firstJobSourceKey;

      return {
        byteSize: stable ? 2048 : 3072,
        capturedAt: "2026-05-17T02:07:00.000Z",
        contentHash: stable ? "stable-hash" : `changed-${job.surface}`,
        height: stable ? 768 : 800,
        id: `artifact-${job.surface}`,
        path: `.surface-health/${job.surface}.png`,
        width: stable ? 1365 : 1440,
      };
    },
  },
  baselineArtifacts,
  completedAt: "2026-05-17T02:08:00.000Z",
  report,
});
const updatedReport = applyProjectPublicSurfaceScreenshotCaptureArtifacts(report, captureRun.artifacts);

assert.equal(captureRun.summary.jobCount, 2);
assert.equal(captureRun.summary.capturedCount, 2);
assert.equal(captureRun.summary.stableCount, 1);
assert.equal(captureRun.summary.changedCount, 1);
assert.equal(updatedReport.summary.screenshotCapturedCount, 2);
assert.equal(updatedReport.summary.screenshotPendingCount, 0);
assert.equal(updatedReport.summary.screenshotDiffCount, 2);
assert.equal(updatedReport.snapshots.some((snapshot) => snapshot.screenshotState === "captured" && snapshot.screenshotPath?.endsWith(".png")), true);
assert.equal(updatedReport.snapshots.some((snapshot) => snapshot.screenshotDiffSummary?.includes("baseline")), true);

console.log("public surface screenshot capture smoke passed");
