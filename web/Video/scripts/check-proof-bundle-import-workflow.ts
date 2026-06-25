import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compareExportProofBundles,
  normalizeExportProofBundle,
  type ExportProofBundle,
} from "../src/lib/projects/export-proof-bundle";

const bundle = createBundle();
const normalized = normalizeExportProofBundle(JSON.parse(JSON.stringify(bundle)));
assert(normalized, "proof bundle should normalize from exported JSON");
assert.equal(normalized.reviewId, bundle.reviewId);
assert.equal(normalized.sections.length, 6);
assert.equal(normalizeExportProofBundle({ ...bundle, schemaVersion: 2 }), null);
assert.equal(normalizeExportProofBundle({ ...bundle, sections: [] }), null);

const matchingComparison = compareExportProofBundles(bundle, normalized);
assert.equal(matchingComparison.status, "match");
assert.equal(matchingComparison.mismatchCount, 0);
assert.equal(matchingComparison.attentionCount, 0);

const driftedBundle = createBundle({
  reviewId: "other-review",
  status: "review",
  downloadCount: 1,
  sections: bundle.sections.map((section) =>
    section.id === "desktop-evidence" ? { ...section, status: "review", evidenceCount: section.evidenceCount - 1 } : section,
  ),
});
const driftedComparison = compareExportProofBundles(bundle, driftedBundle);
assert.equal(driftedComparison.status, "mismatch");
assert(driftedComparison.mismatchCount > 0);
assert(driftedComparison.attentionCount > 0);
assert.match(driftedComparison.items.find((item) => item.id === "identity")?.detail ?? "", /other-review/);
assert.match(driftedComparison.items.find((item) => item.id === "section-desktop-evidence")?.detail ?? "", /imported status is review/);

const proofModule = read("src/lib/projects/export-proof-bundle.ts");
const historyModule = read("src/lib/projects/export-proof-bundle-history.ts");
const importPanel = read("src/features/review/components/export-proof-bundle-import-panel.tsx");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(proofModule, /normalizeExportProofBundle/);
assert.match(proofModule, /compareExportProofBundles/);
assert.match(historyModule, /importExportProofBundle/);
assert.match(historyModule, /loadExportProofBundleHistory/);
assert.match(historyModule, /clearImportedProofBundle/);
assert.match(importPanel, /Import proof bundle/);
assert.match(importPanel, /comparison\.items\.slice\(0, 8\)/);
assert.match(reviewClient, /importProofBundle/);
assert.match(reviewClient, /compareExportProofBundles/);
assert.match(reviewClient, /Review not found/);
assert.match(packageJson, /check:proof-bundle-import-workflow/);
assert.match(lightweight, /check:proof-bundle-import-workflow/);
assert.match(todo, /proof-bundle import and comparison/);
assert.match(changelog, /Proof Bundle Import And Comparison/);

console.log("Proof bundle import workflow checks passed.");

function createBundle(overrides: Partial<ExportProofBundle> = {}): ExportProofBundle {
  const base: ExportProofBundle = {
    schemaVersion: 1,
    id: "proof-review-1",
    reviewId: "review-1",
    projectId: "project-1",
    exportJobId: "export-1",
    outputName: "creator-export.mp4",
    format: "mp4",
    preset: "YouTube 1080p",
    generatedAt: "2026-05-16T05:09:54.840Z",
    status: "ready",
    readyCount: 6,
    reviewCount: 0,
    blockedCount: 0,
    downloadCount: 2,
    downloadBytes: 8_450_000,
    sections: [
      proofSection("export-qa", "Export QA", 6),
      proofSection("render-route", "Render route", 1),
      proofSection("media-attribution", "Media attribution", 2),
      proofSection("release-evidence", "Release evidence", 3),
      proofSection("desktop-evidence", "Desktop evidence", 9),
      proofSection("download-history", "Download history", 2),
    ],
  };

  return { ...base, ...overrides };
}

function proofSection(id: ExportProofBundle["sections"][number]["id"], label: string, evidenceCount: number) {
  return {
    id,
    label,
    status: "ready" as const,
    summary: `${label} is ready`,
    detail: `${label} detail`,
    evidenceCount,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
