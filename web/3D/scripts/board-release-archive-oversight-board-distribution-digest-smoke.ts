import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveOversightBoardDistributionDigest } from "@/features/projects/board-release-archive-oversight-board-distribution-digest";
import type { BoardReleaseArchiveOversightEvidenceQualityMonitorReport } from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function qualityMonitor(status: BoardReleaseArchiveOversightEvidenceQualityMonitorReport["summary"]["status"]): BoardReleaseArchiveOversightEvidenceQualityMonitorReport {
  const isBlocked = status === "blocked";
  const isWatch = status === "watch";

  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [
      {
        attestationHash: isBlocked ? null : "sha256:access-attestation",
        expectedReviewer: "Board archive chair",
        id: "quality:access",
        kind: "access-review",
        missingAttestation: isBlocked,
        nextAction: isBlocked ? "Repair blocked archive oversight evidence quality for Access review queue." : "Keep archive oversight evidence quality healthy for Access review queue.",
        observedAt: generatedAt,
        qualityHash: "sha256:quality-access",
        qualityScore: isBlocked ? 42 : isWatch ? 82 : 100,
        renewalHash: "sha256:renewal-access",
        reviewer: isBlocked ? "Partner release observer" : "Board archive chair",
        reviewerDrift: isBlocked,
        staleHash: isWatch,
        status: isBlocked ? "blocked" : isWatch ? "watch" : "healthy",
        title: "Access review queue",
      },
      {
        attestationHash: "sha256:restore-attestation",
        expectedReviewer: "Restore rehearsal owner",
        id: "quality:restore",
        kind: "restore-rehearsal",
        missingAttestation: false,
        nextAction: "Keep archive oversight evidence quality healthy for Restore rehearsal packet.",
        observedAt: generatedAt,
        qualityHash: "sha256:quality-restore",
        qualityScore: 100,
        renewalHash: "sha256:renewal-restore",
        reviewer: "Restore rehearsal owner",
        reviewerDrift: false,
        staleHash: false,
        status: "healthy",
        title: "Restore rehearsal packet",
      },
    ],
    summary: {
      blockedCount: isBlocked ? 1 : 0,
      healthyCount: isBlocked || isWatch ? 1 : 2,
      missingAttestationCount: isBlocked ? 1 : 0,
      nextAction: isBlocked ? "Repair blocked archive oversight evidence quality for Access review queue." : "Archive oversight evidence quality monitor is healthy.",
      qualityMonitorHash: "sha256:quality-monitor",
      qualityScore: isBlocked ? 71 : isWatch ? 91 : 100,
      reviewerDriftCount: isBlocked ? 1 : 0,
      rowCount: 2,
      staleHashCount: isWatch ? 1 : 0,
      status,
      watchCount: isWatch ? 1 : 0,
    },
    workspaceId,
  };
}

const ready = createBoardReleaseArchiveOversightBoardDistributionDigest({
  generatedAt,
  qualityMonitor: qualityMonitor("healthy"),
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.rowCount, 4);
assert.equal(ready.summary.readyCount, 4);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.watchCount, 0);
assert.equal(ready.summary.distributionScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.recipientType),
  ["board", "audit", "records", "executive"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-oversight-board-distribution-digest-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-oversight-board-distribution-digest-20260529.json");
assert.match(ready.csvContent, /^distribution_id,recipient_type,recipient,status,review_cadence,packet_hash/);

const blocked = createBoardReleaseArchiveOversightBoardDistributionDigest({
  generatedAt,
  qualityMonitor: qualityMonitor("blocked"),
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Resolve blocked archive oversight quality/);

const watch = createBoardReleaseArchiveOversightBoardDistributionDigest({
  generatedAt,
  qualityMonitor: qualityMonitor("watch"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive oversight board distribution digest smoke passed");
