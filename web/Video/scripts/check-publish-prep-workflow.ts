import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublishPrepPlan, publishPrepTargets } from "../src/lib/publishing/publish-prep";
import type { ExportReviewPackage } from "../src/lib/projects/collaboration-store";

const review: ExportReviewPackage = {
  id: "review_a",
  projectId: "project_a",
  exportJobId: "export_a",
  outputName: "launch.mp4",
  format: "mp4",
  preset: "mp4-1080p",
  reviewStatus: "approved",
  renderedFile: {
    filename: "launch.mp4",
    format: "mp4",
    mimeType: "video/mp4",
    size: 1024,
    savedAt: "2026-05-15T00:00:00.000Z",
  },
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
};

assert.equal(publishPrepTargets.length, 5);
for (const expected of ["youtube", "tiktok", "instagram", "linkedin", "cloud-drive"]) {
  assert.equal(publishPrepTargets.some((target) => target.id === expected && target.credentialMode === "user-owned"), true);
}

const youtubePlan = createPublishPrepPlan(review, "youtube");
assert.equal(youtubePlan.status, "needs-credentials");
assert.equal(youtubePlan.checklist.some((item) => item.id === "credentials" && !item.complete), true);
assert.equal(youtubePlan.checklist.some((item) => item.id === "format" && item.complete), true);

const blockedPlan = createPublishPrepPlan({ ...review, format: "wav", reviewStatus: "changes-requested" }, "youtube");
assert.equal(blockedPlan.status, "needs-changes");
assert.equal(blockedPlan.checklist.some((item) => item.id === "format" && !item.complete), true);
assert.equal(blockedPlan.checklist.some((item) => item.id === "approval" && !item.complete), true);

const store = read("src/lib/projects/collaboration-store.ts");
assert.match(store, /ExportPublishPrep/);
assert.match(store, /createExportPublishPrep/);
assert.match(store, /listExportPublishPreps/);
assert.match(store, /exportPublishPreps/);

const panel = read("src/features/review/components/publish-prep-panel.tsx");
assert.match(panel, /publishPrepTargets/);
assert.match(panel, /createExportPublishPrep/);
assert.match(panel, /Needs credentials/);

const reviewPage = read("src/features/review/components/export-review-page-client.tsx");
assert.match(reviewPage, /PublishPrepPanel/);

console.log("Publish prep workflow guard passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
