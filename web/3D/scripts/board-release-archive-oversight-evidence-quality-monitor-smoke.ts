import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveOversightEvidenceQualityMonitor } from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";
import type { BoardReleaseArchiveOversightExceptionRenewalCalendarReport } from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function renewalCalendar(): BoardReleaseArchiveOversightExceptionRenewalCalendarReport {
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
        closeoutHash: "sha256:access-closeout",
        dueAt: "2026-06-12T12:00:00.000Z",
        id: "renewal:access",
        kind: "access-review",
        nextAction: "Track access review renewal date.",
        renewalEvidenceHash: "sha256:renewal-access",
        renewalHash: "sha256:renewal-row-access",
        status: "complete",
        title: "Access review queue",
      },
      {
        closeoutHash: "sha256:restore-closeout",
        dueAt: "2026-06-19T12:00:00.000Z",
        id: "renewal:restore",
        kind: "restore-rehearsal",
        nextAction: "Track restore rehearsal renewal date.",
        renewalEvidenceHash: "sha256:renewal-restore",
        renewalHash: "sha256:renewal-row-restore",
        status: "complete",
        title: "Restore rehearsal packet",
      },
      {
        closeoutHash: "sha256:chain-closeout",
        dueAt: "2026-06-28T12:00:00.000Z",
        id: "renewal:chain",
        kind: "chain-of-control",
        nextAction: "Track chain renewal date.",
        renewalEvidenceHash: "sha256:renewal-chain",
        renewalHash: "sha256:renewal-row-chain",
        status: "complete",
        title: "Chain-of-control ledger",
      },
      {
        closeoutHash: "sha256:recommendation-closeout",
        dueAt: "2026-06-28T12:00:00.000Z",
        id: "renewal:recommendation",
        kind: "release-recommendation",
        nextAction: "Track recommendation renewal date.",
        renewalEvidenceHash: "sha256:renewal-recommendation",
        renewalHash: "sha256:renewal-row-recommendation",
        status: "complete",
        title: "Release archive custody recommendation",
      },
      {
        closeoutHash: "sha256:retention-closeout",
        dueAt: "2026-07-13T12:00:00.000Z",
        id: "renewal:retention",
        kind: "retention-lock",
        nextAction: "Track retention renewal date.",
        renewalEvidenceHash: "sha256:renewal-retention",
        renewalHash: "sha256:renewal-row-retention",
        status: "complete",
        title: "Retention lock workflow",
      },
    ],
    summary: {
      completedCount: 5,
      dueSoonCount: 0,
      nextAction: "Archive oversight exception renewal calendar is scheduled.",
      overdueCount: 0,
      renewalCalendarHash: "sha256:renewal-calendar",
      renewalScore: 100,
      rowCount: 5,
      scheduledCount: 0,
      status: "scheduled",
    },
    workspaceId,
  };
}

const healthy = createBoardReleaseArchiveOversightEvidenceQualityMonitor({
  generatedAt,
  renewalCalendar: renewalCalendar(),
  workspaceId,
});

assert.equal(healthy.summary.status, "healthy");
assert.equal(healthy.summary.rowCount, 5);
assert.equal(healthy.summary.healthyCount, 5);
assert.equal(healthy.summary.blockedCount, 0);
assert.equal(healthy.summary.watchCount, 0);
assert.equal(healthy.summary.qualityScore, 100);
assert.deepEqual(
  healthy.rows.map((row) => row.kind),
  ["access-review", "restore-rehearsal", "chain-of-control", "release-recommendation", "retention-lock"],
);
assert.equal(healthy.csvFileName, "workspace-board-board-release-archive-oversight-evidence-quality-monitor-20260529.csv");
assert.equal(healthy.jsonFileName, "workspace-board-board-release-archive-oversight-evidence-quality-monitor-20260529.json");
assert.match(healthy.csvContent, /^quality_id,kind,title,status,quality_score,stale_hash,missing_attestation,reviewer_drift/);

const blocked = createBoardReleaseArchiveOversightEvidenceQualityMonitor({
  generatedAt,
  qualityOverrides: [
    {
      attestationHash: null,
      expectedReviewer: "Board archive chair",
      kind: "access-review",
      observedAt: "2026-04-01T12:00:00.000Z",
      reviewer: "Partner release observer",
    },
  ],
  renewalCalendar: renewalCalendar(),
  workspaceId,
});

const blockedAccess = blocked.rows.find((row) => row.kind === "access-review");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedAccess?.staleHash, true);
assert.equal(blockedAccess?.missingAttestation, true);
assert.equal(blockedAccess?.reviewerDrift, true);
assert.match(blocked.summary.nextAction, /Repair blocked archive oversight evidence quality/);

const watch = createBoardReleaseArchiveOversightEvidenceQualityMonitor({
  generatedAt,
  qualityOverrides: [
    {
      attestationHash: "sha256:restore-attestation",
      expectedReviewer: "Restore rehearsal owner",
      kind: "restore-rehearsal",
      observedAt: "2026-05-10T12:00:00.000Z",
      reviewer: "Restore rehearsal owner",
    },
  ],
  renewalCalendar: renewalCalendar(),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive oversight evidence quality monitor smoke passed");
