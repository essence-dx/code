import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ExportReviewPackage } from "../src/lib/projects/collaboration-store";
import type { HostedReviewLinkSummary } from "../src/lib/projects/hosted-review-link-contracts";
import {
  createHostedShareFreshnessReport,
  hostedShareFreshnessStatusLabel,
  newestEvidenceTimestamp,
} from "../src/lib/projects/hosted-share-freshness";

const issuedAt = "2026-05-16T08:00:00.000Z";
const link: HostedReviewLinkSummary = {
  id: "link-1",
  projectId: "project-1",
  title: "Launch Project",
  url: "https://essence.example/share/token-1",
  permission: "comment-only",
  enabled: true,
  expired: false,
  exportName: "launch-cut.mp4",
  expiresAt: "2026-05-30T08:00:00.000Z",
  createdAt: issuedAt,
  updatedAt: issuedAt,
};
const staleReport = createHostedShareFreshnessReport({
  link,
  releaseEvidenceUpdatedAt: Date.parse("2026-05-16T08:05:00.000Z"),
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T07:59:00.000Z"),
  reviewProofUpdatedAt: "2026-05-16T08:10:00.000Z",
});
const currentReport = createHostedShareFreshnessReport({
  link,
  releaseEvidenceUpdatedAt: Date.parse("2026-05-16T07:50:00.000Z"),
  desktopEvidenceCheckedAt: Date.parse("2026-05-16T07:55:00.000Z"),
  reviewProofUpdatedAt: "2026-05-16T07:58:00.000Z",
});
const reviewReport = createHostedShareFreshnessReport({
  link,
  releaseEvidenceUpdatedAt: null,
  desktopEvidenceCheckedAt: null,
  reviewProofUpdatedAt: null,
});
const projectReviews: ExportReviewPackage[] = [
  review("review-old", "2026-05-16T07:20:00.000Z"),
  review("review-new", "2026-05-16T08:20:00.000Z"),
];

assert.equal(staleReport.status, "stale");
assert.equal(staleReport.staleCount, 2);
assert.equal(staleReport.items.find((item) => item.id === "release-evidence")?.status, "stale");
assert.equal(staleReport.items.find((item) => item.id === "desktop-proof")?.status, "current");
assert.equal(staleReport.items.find((item) => item.id === "review-proof")?.status, "stale");
assert.equal(currentReport.status, "ready");
assert.equal(reviewReport.status, "review");
assert.equal(hostedShareFreshnessStatusLabel("current"), "Current");
assert.equal(newestEvidenceTimestamp([projectReviews[0]?.updatedAt, projectReviews[1]?.updatedAt]), "2026-05-16T08:20:00.000Z");

const freshnessModule = read("src/lib/projects/hosted-share-freshness.ts");
const freshnessWarning = read("src/features/projects/components/hosted-share-freshness-warning.tsx");
const hostedLinksPanel = read("src/features/projects/components/hosted-review-links-panel.tsx");
const collaborationStore = read("src/lib/projects/collaboration-store.ts");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(freshnessModule, /createHostedShareFreshnessReport/);
assert.match(freshnessModule, /release-evidence/);
assert.match(freshnessModule, /desktop-proof/);
assert.match(freshnessModule, /review-proof/);
assert.match(freshnessWarning, /Hosted share proof/);
assert.match(freshnessWarning, /Some proof changed after this link was issued/);
assert.match(hostedLinksPanel, /HostedShareFreshnessWarning/);
assert.match(hostedLinksPanel, /loadReleaseEvidence/);
assert.match(hostedLinksPanel, /loadDesktopVerificationHistory/);
assert.match(hostedLinksPanel, /loadExportProofBundleHistory/);
assert.match(collaborationStore, /listProjectExportReviews/);
assert.match(packageJson, /check:hosted-share-freshness-workflow/);
assert.match(lightweight, /check:hosted-share-freshness-workflow/);
assert.match(todo, /\[x\] Add stale hosted-share proof warnings/);
assert.match(changelog, /Hosted Share Freshness Warnings/);

console.log("Hosted share freshness workflow checks passed.");

function review(id: string, updatedAt: string): ExportReviewPackage {
  return {
    id,
    projectId: "project-1",
    exportJobId: id.replace("review", "export"),
    outputName: "launch-cut.mp4",
    format: "mp4",
    preset: "YouTube 1080p",
    reviewStatus: "needs-review",
    createdAt: "2026-05-16T07:00:00.000Z",
    updatedAt,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
