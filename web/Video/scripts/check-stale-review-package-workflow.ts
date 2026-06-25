import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ExportReviewPackage } from "../src/lib/projects/collaboration-store";
import { createStaleReviewPackageReport, staleReviewPackageStatusLabel } from "../src/lib/projects/stale-review-package";

const createdAt = "2026-05-16T06:00:00.000Z";
const baseReview: ExportReviewPackage = {
  id: "review-1",
  projectId: "project-1",
  exportJobId: "export-1",
  outputName: "handoff.mp4",
  format: "mp4",
  preset: "YouTube 1080p",
  reviewStatus: "needs-review",
  exportQaSnapshot: {
    status: "ready",
    readyCount: 6,
    reviewCount: 0,
    blockedCount: 0,
    capturedAt: "2026-05-16T05:55:00.000Z",
    preset: "YouTube 1080p",
    format: "mp4",
    renderRouteLabel: "Browser route",
    renderRouteStatus: "browser-ready",
    sections: [{ id: "format", label: "Format", status: "ready", summary: "Ready", detail: "Format is ready." }],
  },
  mediaAttributionSummary: {
    status: "ready",
    itemCount: 1,
    stockCount: 1,
    selfHostedCount: 0,
    browserCount: 0,
    desktopCount: 0,
    reviewCount: 0,
    generatedAt: "2026-05-16T05:58:00.000Z",
    items: [
      {
        assetId: "asset-1",
        assetName: "clip.mp4",
        sourceType: "stock",
        sourceLabel: "Stock",
        status: "ready",
        detail: "Source is credited.",
      },
    ],
  },
  createdAt,
  updatedAt: createdAt,
};

const readyReport = createStaleReviewPackageReport({
  review: baseReview,
  releaseEvidenceUpdatedAt: "2026-05-16T05:59:00.000Z",
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T05:59:30.000Z"),
});
const staleReport = createStaleReviewPackageReport({
  review: {
    ...baseReview,
    exportQaSnapshot: { ...baseReview.exportQaSnapshot!, capturedAt: "2026-05-16T06:05:00.000Z" },
  },
  releaseEvidenceUpdatedAt: "2026-05-16T06:10:00.000Z",
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T05:59:30.000Z"),
});
const reviewReport = createStaleReviewPackageReport({
  review: { ...baseReview, exportQaSnapshot: undefined, mediaAttributionSummary: undefined },
  releaseEvidenceUpdatedAt: null,
  desktopEvidenceCheckedAt: null,
});

assert.equal(readyReport.status, "ready");
assert.equal(readyReport.currentCount, 4);
assert.equal(staleReport.status, "stale");
assert.equal(staleReport.staleCount, 2);
assert.equal(staleReport.items.find((item) => item.id === "export-qa")?.status, "stale");
assert.equal(staleReport.items.find((item) => item.id === "release-evidence")?.status, "stale");
assert.equal(staleReport.items.find((item) => item.id === "desktop-proof")?.status, "current");
assert.equal(reviewReport.status, "review");
assert.equal(reviewReport.reviewCount, 4);
assert.equal(staleReviewPackageStatusLabel("current"), "Current");
assert.equal(staleReviewPackageStatusLabel("ready"), "Ready");

const staleModule = read("src/lib/projects/stale-review-package.ts");
const stalePanel = read("src/features/review/components/stale-review-package-panel.tsx");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(staleModule, /createStaleReviewPackageReport/);
assert.match(staleModule, /export-qa/);
assert.match(staleModule, /media-attribution/);
assert.match(staleModule, /release-evidence/);
assert.match(staleModule, /desktop-proof/);
assert.match(stalePanel, /Review freshness/);
assert.match(stalePanel, /Refresh the review package/);
assert.match(reviewClient, /StaleReviewPackagePanel/);
assert.match(reviewClient, /createStaleReviewPackageReport/);
assert.match(packageJson, /check:stale-review-package-workflow/);
assert.match(lightweight, /check:stale-review-package-workflow/);
assert.match(todo, /\[x\] Add stale review package detection/);
assert.match(changelog, /Stale Review Package Detection/);

console.log("Stale review package workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
