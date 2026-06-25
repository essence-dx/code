import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import type { ExportQaSnapshot, MediaAttributionSummary } from "../src/lib/editor/types";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import { createExportProofBundle } from "../src/lib/projects/export-proof-bundle";
import {
  parseDownloadedExportProofBundle,
  proofBundleDownloadFilename,
  serializeExportProofBundle,
} from "../src/lib/projects/export-proof-bundle-download";
import type { ExportReviewPackage } from "../src/lib/projects/collaboration-store";

const capturedAt = "2026-05-16T05:30:00.000Z";
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
  itemCount: 0,
  stockCount: 0,
  selfHostedCount: 0,
  browserCount: 0,
  desktopCount: 0,
  reviewCount: 0,
  generatedAt: capturedAt,
  items: [],
};
const review: ExportReviewPackage = {
  id: "review-runtime",
  projectId: "project-runtime",
  exportJobId: "export-runtime",
  outputName: "Creator Final Export!!.mp4",
  format: "mp4",
  preset: "YouTube 1080p",
  reviewStatus: "needs-review",
  exportQaSnapshot,
  mediaAttributionSummary,
  renderedFile: {
    filename: "Creator Final Export!!.mp4",
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
  downloads: [{ id: "download-runtime", reviewId: review.id, filename: review.outputName, size: 4_200_000, createdAt: capturedAt }],
  releaseEvidenceSummary,
  desktopProofSummary,
  generatedAt: capturedAt,
});
const serialized = serializeExportProofBundle(bundle);
const parsed = parseDownloadedExportProofBundle(serialized);

assert.equal(proofBundleDownloadFilename(bundle), "creator-final-export-mp4-proof-bundle.json");
assert.ok(serialized.endsWith("\n"));
assert.equal(parsed?.id, bundle.id);
assert.equal(parsed?.reviewId, review.id);
assert.equal(parseDownloadedExportProofBundle("{not-json"), null);

const downloadModule = read("src/lib/projects/export-proof-bundle-download.ts");
const proofCard = read("src/features/review/components/export-proof-bundle-card.tsx");
const maintenanceCard = read("src/features/settings/components/local-maintenance-center-card.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(downloadModule, /serializeExportProofBundle/);
assert.match(downloadModule, /parseDownloadedExportProofBundle/);
assert.match(downloadModule, /proofBundleDownloadFilename/);
assert.match(proofCard, /downloadExportProofBundle/);
assert.match(maintenanceCard, /removeUnusedMedia/);
assert.match(maintenanceCard, /clearFailedExports/);
assert.match(maintenanceCard, /clearCloudConflicts/);
assert.match(maintenanceCard, /retryFailedExports/);
assert.match(maintenanceCard, /saveMaintenanceSnapshot/);
assert.match(packageJson, /check:proof-maintenance-runtime-actions/);
assert.match(lightweight, /check:proof-maintenance-runtime-actions/);
assert.match(todo, /\[x\] Add targeted runtime checks/);
assert.match(todo, /Review Runtime Automation And Release Operations/);
assert.match(changelog, /Proof And Maintenance Runtime Checks/);

console.log("Proof and maintenance runtime action checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
