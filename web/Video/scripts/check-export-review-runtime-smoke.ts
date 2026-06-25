import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import type { ExportQaSnapshot, MediaAttributionSummary } from "../src/lib/editor/types";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import type { ExportReviewPackage } from "../src/lib/projects/collaboration-store";
import {
  createInMemoryExportReviewRuntimeStore,
  runExportReviewRuntimeSmoke,
} from "../src/lib/projects/export-review-runtime-smoke";

const capturedAt = "2026-05-16T05:30:00.000Z";
const exportQaSnapshot: ExportQaSnapshot = {
  status: "ready",
  readyCount: 6,
  reviewCount: 0,
  blockedCount: 0,
  capturedAt,
  preset: "YouTube 1080p",
  format: "mp4",
  renderRouteLabel: "Browser route",
  renderRouteStatus: "browser-ready",
  sections: [
    { id: "format", label: "Format", status: "ready", summary: "MP4 / 1920x1080", detail: "30 FPS timeline composite." },
    { id: "safe-zones", label: "Safe zones", status: "ready", summary: "YouTube safe zones", detail: "Title and action safe zones match." },
    { id: "subtitles", label: "Subtitles", status: "ready", summary: "4 cues burned in", detail: "One subtitle layer will be included." },
    { id: "audio-loudness", label: "Audio", status: "ready", summary: "2 audible layers", detail: "No loud layers detected." },
    { id: "missing-media", label: "Missing media", status: "ready", summary: "3 media assets available", detail: "All media sources are present." },
    { id: "render-route", label: "Render route", status: "ready", summary: "Browser route", detail: "This export is within the browser render budget." },
  ],
};
const mediaAttributionSummary: MediaAttributionSummary = {
  status: "ready",
  itemCount: 1,
  stockCount: 1,
  selfHostedCount: 0,
  browserCount: 0,
  desktopCount: 0,
  reviewCount: 0,
  generatedAt: capturedAt,
  items: [
    {
      assetId: "asset-stock",
      assetName: "commons-broll.mp4",
      sourceType: "stock",
      sourceLabel: "Wikimedia Commons",
      status: "ready",
      licenseLabel: "CC BY-SA 4.0",
      attributionText: "Example Creator",
      detail: "Stock asset includes license and source data.",
    },
  ],
};
const releaseEvidenceSummary: ReleaseEvidenceSummary = {
  score: 100,
  status: "ready",
  readyCount: 3,
  total: 3,
  requirements: [
    { id: "deployment-url", label: "Deployment URL", status: "ready", detail: "Deployment URL is saved." },
    { id: "deployment-screenshot", label: "Screenshot proof", status: "ready", detail: "Screenshot proof is saved." },
    { id: "desktop-proof", label: "Desktop proof", status: "ready", detail: "Desktop proof is saved." },
  ],
};
const desktopProofSummary: DesktopLaunchProofSummary = {
  status: "ready",
  readyCount: 9,
  limitedCount: 0,
  failedCount: 0,
  missingCount: 0,
  total: 9,
  requirements: [],
};
const review: ExportReviewPackage = {
  id: "review-runtime-smoke",
  projectId: "project-runtime-smoke",
  exportJobId: "export-runtime-smoke",
  outputName: "runtime-smoke.mp4",
  format: "mp4",
  preset: "YouTube 1080p",
  reviewStatus: "needs-review",
  exportQaSnapshot,
  mediaAttributionSummary,
  renderedFile: {
    filename: "runtime-smoke.mp4",
    format: "mp4",
    mimeType: "video/mp4",
    size: 4_200_000,
    savedAt: capturedAt,
  },
  createdAt: capturedAt,
  updatedAt: capturedAt,
};

const report = await runExportReviewRuntimeSmoke({
  reviewId: review.id,
  store: createInMemoryExportReviewRuntimeStore(review),
  releaseEvidenceSummary,
  releaseEvidenceUpdatedAt: "2026-05-16T05:20:00.000Z",
  desktopProofSummary,
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T05:25:00.000Z"),
});

assert.equal(report.status, "ready");
assert.equal(report.blockedCount, 0);
assert.deepEqual(
  report.checks.map((check) => check.id),
  [
    "review-load",
    "status-update",
    "comment-add",
    "comment-resolve",
    "download-record",
    "proof-export",
    "proof-import",
    "release-handoff",
  ],
);
assert.equal(report.checks.every((check) => check.status === "ready"), true);

const smokeModule = read("src/lib/projects/export-review-runtime-smoke.ts");
const storeAdapter = read("src/lib/projects/export-review-runtime-store.ts");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(smokeModule, /runExportReviewRuntimeSmoke/);
assert.match(smokeModule, /setStatus/);
assert.match(smokeModule, /addComment/);
assert.match(smokeModule, /setCommentResolved/);
assert.match(smokeModule, /recordDownload/);
assert.match(smokeModule, /serializeExportProofBundle/);
assert.match(smokeModule, /importExportProofBundle/);
assert.match(smokeModule, /createReleaseReviewHandoffComparison/);
assert.match(storeAdapter, /createCollaborationExportReviewRuntimeStore/);
assert.match(storeAdapter, /getExportReviewPackage/);
assert.match(reviewClient, /ReleaseReviewHandoffPanel/);
assert.match(packageJson, /check:export-review-runtime-smoke/);
assert.match(lightweight, /check:export-review-runtime-smoke/);
assert.match(todo, /\[x\] Add a local review-page runtime smoke/);
assert.match(changelog, /Export Review Runtime Smoke/);

console.log("Export review runtime smoke checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
