import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import type { ExportQaSnapshot, MediaAttributionSummary } from "../src/lib/editor/types";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import { createExportProofBundle } from "../src/lib/projects/export-proof-bundle";
import type { ExportReviewDownload, ExportReviewPackage } from "../src/lib/projects/collaboration-store";

const capturedAt = "2026-05-16T05:09:54.840Z";
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
  requirements: [
    { id: "desktop-launch-session", label: "App relaunch", status: "ready", detail: "Desktop app relaunched." },
    { id: "local-project-persistence", label: "Project reopen", status: "ready", detail: "Project reopened." },
    { id: "desktop-storage", label: "Local storage", status: "ready", detail: "Storage is ready." },
    { id: "media-library", label: "Media library", status: "ready", detail: "Media library is ready." },
    { id: "render-spool", label: "Render spool", status: "ready", detail: "Render spool is ready." },
    { id: "native-media-engine", label: "Media engine", status: "ready", detail: "Native media engine is ready." },
    { id: "native-render-smoke", label: "Render smoke", status: "ready", detail: "Render smoke passed." },
    { id: "file-backed-media", label: "File media", status: "ready", detail: "File media recovered." },
    { id: "native-export-output", label: "Export output", status: "ready", detail: "Native export output exists." },
  ],
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
const downloads: ExportReviewDownload[] = [
  { id: "download-1", reviewId: review.id, filename: "creator-export.mp4", size: 4_200_000, createdAt: capturedAt },
  { id: "download-2", reviewId: review.id, filename: "creator-export-final.mp4", size: 4_250_000, createdAt: "2026-05-16T05:20:00.000Z" },
];

const bundle = createExportProofBundle({
  review,
  downloads,
  releaseEvidenceSummary,
  releaseEvidenceLabel: "Pinned ready release proof saved 5/16/2026.",
  desktopProofSummary,
  desktopEvidenceLabel: "Latest desktop check ready from 5/16/2026.",
  generatedAt: capturedAt,
});

assert.equal(bundle.schemaVersion, 1);
assert.equal(bundle.status, "ready");
assert.equal(bundle.readyCount, 6);
assert.equal(bundle.reviewCount, 0);
assert.equal(bundle.blockedCount, 0);
assert.equal(bundle.downloadCount, 2);
assert.equal(bundle.downloadBytes, 8_450_000);
assert.deepEqual(
  bundle.sections.map((section) => section.id),
  ["export-qa", "render-route", "media-attribution", "release-evidence", "desktop-evidence", "download-history"],
);
assert.equal(bundle.sections.find((section) => section.id === "render-route")?.summary, "Browser route");
assert.equal(bundle.sections.find((section) => section.id === "release-evidence")?.summary, "3 of 3 release checks ready");
assert.match(bundle.sections.find((section) => section.id === "desktop-evidence")?.detail ?? "", /Latest desktop check ready/);
assert.match(bundle.sections.find((section) => section.id === "download-history")?.detail ?? "", /creator-export-final\.mp4/);

const moduleFile = read("src/lib/projects/export-proof-bundle.ts");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const proofCard = read("src/features/review/components/export-proof-bundle-card.tsx");
const proofDownload = read("src/lib/projects/export-proof-bundle-download.ts");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(moduleFile, /createExportProofBundle/);
assert.match(moduleFile, /releaseEvidenceSummary/);
assert.match(moduleFile, /desktopProofSummary/);
assert.match(reviewClient, /ExportProofBundleCard/);
assert.match(reviewClient, /loadReleaseEvidence/);
assert.match(reviewClient, /loadDesktopVerificationHistory/);
assert.match(proofCard, /Download proof bundle/);
assert.match(proofCard, /downloadExportProofBundle/);
assert.match(proofDownload, /JSON\.stringify\(bundle, null, 2\)/);
assert.match(packageJson, /check:export-proof-bundle-workflow/);
assert.match(lightweight, /check:export-proof-bundle-workflow/);
assert.match(todo, /Add reviewer-facing proof bundles/);
assert.match(changelog, /Reviewer Proof Bundles/);

console.log("Export proof bundle workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
