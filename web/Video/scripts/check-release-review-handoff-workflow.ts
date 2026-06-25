import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import type { ExportQaSnapshot, MediaAttributionSummary } from "../src/lib/editor/types";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import { createExportProofBundle } from "../src/lib/projects/export-proof-bundle";
import { createReleaseReviewHandoffComparison } from "../src/lib/projects/release-review-handoff";
import type { ExportReviewPackage } from "../src/lib/projects/collaboration-store";

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
  id: "review-1",
  projectId: "project-1",
  exportJobId: "export-1",
  outputName: "creator-export.mp4",
  format: "mp4",
  preset: "YouTube 1080p",
  reviewStatus: "needs-review",
  exportQaSnapshot,
  mediaAttributionSummary,
  renderedFile: {
    filename: "creator-export.mp4",
    format: "mp4",
    mimeType: "video/mp4",
    size: 4_200_000,
    savedAt: capturedAt,
  },
  createdAt: capturedAt,
  updatedAt: capturedAt,
};
const bundle = createExportProofBundle({
  review,
  downloads: [{ id: "download-1", reviewId: review.id, filename: "creator-export.mp4", size: 4_200_000, createdAt: capturedAt }],
  releaseEvidenceSummary,
  desktopProofSummary,
  generatedAt: capturedAt,
});
const matching = createReleaseReviewHandoffComparison({
  bundle,
  releaseEvidenceSummary,
  releaseEvidenceUpdatedAt: "2026-05-16T05:20:00.000Z",
  desktopProofSummary,
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T05:25:00.000Z"),
});
const stale = createReleaseReviewHandoffComparison({
  bundle,
  releaseEvidenceSummary,
  releaseEvidenceUpdatedAt: "2026-05-16T05:40:00.000Z",
  desktopProofSummary: { ...desktopProofSummary, status: "failed", failedCount: 1, readyCount: 8 },
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T05:45:00.000Z"),
});

assert.equal(matching.status, "match");
assert.equal(matching.mismatchCount, 0);
assert.equal(matching.items.find((item) => item.id === "release-freshness")?.status, "match");
assert.equal(stale.status, "mismatch");
assert.equal(stale.items.find((item) => item.id === "release-freshness")?.status, "mismatch");
assert.equal(stale.items.find((item) => item.id === "desktop-status")?.status, "mismatch");

const handoffModule = read("src/lib/projects/release-review-handoff.ts");
const handoffPanel = read("src/features/review/components/release-review-handoff-panel.tsx");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(handoffModule, /createReleaseReviewHandoffComparison/);
assert.match(handoffModule, /Release proof freshness/);
assert.match(handoffModule, /Desktop proof freshness/);
assert.match(handoffPanel, /Release Handoff/);
assert.match(handoffPanel, /latest local release and desktop evidence/);
assert.match(reviewClient, /ReleaseReviewHandoffPanel/);
assert.match(reviewClient, /createReleaseReviewHandoffComparison/);
assert.match(packageJson, /check:release-review-handoff-workflow/);
assert.match(lightweight, /check:release-review-handoff-workflow/);
assert.match(todo, /\[x\] Add release-to-review handoff comparison/);
assert.match(changelog, /Release Review Handoff Comparison/);

console.log("Release review handoff workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
