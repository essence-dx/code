import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ExportPublishPrep, ExportReviewComment, ExportReviewDownload, ExportReviewPackage } from "../src/lib/projects/collaboration-store";
import type { HostedReviewComment } from "../src/lib/projects/hosted-review-link-contracts";
import { hostedReviewCommentSchema } from "../src/lib/projects/hosted-review-link-contracts";
import { createReviewerAuditPacket } from "../src/lib/projects/reviewer-audit-packet";

const createdAt = "2026-05-16T07:45:00.000Z";
const review: ExportReviewPackage = {
  id: "review-1",
  projectId: "project-1",
  exportJobId: "export-1",
  outputName: "launch-cut.mp4",
  format: "mp4",
  preset: "YouTube 1080p",
  reviewStatus: "approved",
  createdAt,
  updatedAt: "2026-05-16T08:00:00.000Z",
};
const hostedComments: HostedReviewComment[] = [
  {
    id: "hosted-comment-1",
    reviewerName: "Mina",
    reviewerEmail: "mina@example.com",
    body: "Approved with one note.",
    time: 12,
    anchorLabel: "Intro",
    resolvedAt: null,
    createdAt,
  },
  {
    id: "hosted-comment-2",
    reviewerName: "Mina",
    reviewerEmail: "mina@example.com",
    body: "The outro is ready.",
    time: null,
    anchorLabel: "Outro",
    resolvedAt: null,
    createdAt: "2026-05-16T07:50:00.000Z",
  },
];
const localComments: ExportReviewComment[] = [
  { id: "local-comment-1", reviewId: review.id, body: "Internal approval note.", createdAt, resolvedAt: createdAt },
  { id: "local-comment-2", reviewId: review.id, body: "Needs publish metadata.", createdAt: "2026-05-16T07:52:00.000Z" },
];
const downloads: ExportReviewDownload[] = [
  { id: "download-1", reviewId: review.id, filename: "launch-cut.mp4", size: 4_000_000, createdAt },
  { id: "download-2", reviewId: review.id, filename: "launch-cut-final.mp4", size: 4_500_000, createdAt: "2026-05-16T07:55:00.000Z" },
];
const publishPreps: ExportPublishPrep[] = [
  {
    id: "prep-1",
    reviewId: review.id,
    targetId: "youtube",
    targetLabel: "YouTube",
    destination: "YouTube Studio",
    status: "ready",
    suggestedFilename: "launch-cut-youtube.mp4",
    checklist: [{ id: "title", label: "Title", complete: true, detail: "Title is ready." }],
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "prep-2",
    reviewId: review.id,
    targetId: "instagram",
    targetLabel: "Instagram",
    destination: "Instagram",
    status: "needs-credentials",
    suggestedFilename: "launch-cut-instagram.mp4",
    checklist: [{ id: "credentials", label: "Credentials", complete: false, detail: "Owner credentials required." }],
    createdAt,
    updatedAt: createdAt,
  },
];
const packet = createReviewerAuditPacket({
  review,
  hostedComments,
  localComments,
  downloads,
  publishPreps,
  exportedAt: "2026-05-16T08:05:00.000Z",
});

assert.equal(hostedReviewCommentSchema.parse({ id: "c", reviewerName: "R", body: "Hi", time: null, anchorLabel: null, resolvedAt: null, createdAt }).reviewerEmail, null);
assert.equal(packet.schemaVersion, 1);
assert.equal(packet.review.approvalStatus, "approved");
assert.equal(packet.reviewerIdentity.hostedReviewerCount, 1);
assert.deepEqual(packet.reviewerIdentity.hostedReviewerEmails, ["mina@example.com"]);
assert.equal(packet.comments.hostedCount, 2);
assert.equal(packet.comments.localCount, 2);
assert.equal(packet.comments.unresolvedLocalCount, 1);
assert.equal(packet.downloads.count, 2);
assert.equal(packet.downloads.totalBytes, 8_500_000);
assert.equal(packet.publishPrep.count, 2);
assert.equal(packet.publishPrep.readyCount, 1);
assert.equal(packet.publishPrep.needsCredentialsCount, 1);
assert.equal(packet.publishPrep.needsChangesCount, 0);

const packetModule = read("src/lib/projects/reviewer-audit-packet.ts");
const auditCard = read("src/features/review/components/reviewer-audit-packet-card.tsx");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const hostedContracts = read("src/lib/projects/hosted-review-link-contracts.ts");
const hostedServer = read("src/lib/projects/server-review-links.ts");
const hostedCommentsUi = read("src/features/review/components/hosted-review-comments.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(packetModule, /createReviewerAuditPacket/);
assert.match(packetModule, /downloadReviewerAuditPacket/);
assert.match(packetModule, /hostedReviewerEmails/);
assert.match(auditCard, /Reviewer audit/);
assert.match(auditCard, /Load hosted comments/);
assert.match(auditCard, /Export audit/);
assert.match(reviewClient, /ReviewerAuditPacketCard/);
assert.match(hostedContracts, /reviewerEmail/);
assert.match(hostedServer, /reviewerEmail: row\.reviewerEmail/);
assert.match(hostedCommentsUi, /comment\.reviewerEmail/);
assert.match(packageJson, /check:reviewer-audit-packet-workflow/);
assert.match(lightweight, /check:reviewer-audit-packet-workflow/);
assert.match(todo, /\[x\] Add reviewer identity and audit export packets/);
assert.match(changelog, /Reviewer Audit Packets/);

console.log("Reviewer audit packet workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
