import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveOversightExceptionRenewalCalendar } from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";
import type { BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport } from "@/features/projects/board-release-archive-custody-executive-closeout-digest";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function closeoutDigest(): BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport {
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
        closeoutHash: "sha256:chain-closeout",
        evidenceHash: "sha256:chain",
        id: "closeout:chain",
        kind: "chain-of-control",
        nextAction: "Keep chain-of-control sealed.",
        score: 100,
        status: "approved",
        title: "Chain-of-control ledger",
      },
      {
        closeoutHash: "sha256:retention-closeout",
        evidenceHash: "sha256:retention",
        id: "closeout:retention",
        kind: "retention-lock",
        nextAction: "Keep retention lock frozen.",
        score: 100,
        status: "approved",
        title: "Retention lock workflow",
      },
      {
        closeoutHash: "sha256:access-closeout",
        evidenceHash: "sha256:access",
        id: "closeout:access",
        kind: "access-review",
        nextAction: "Keep access review approved.",
        score: 100,
        status: "approved",
        title: "Access review queue",
      },
      {
        closeoutHash: "sha256:restore-closeout",
        evidenceHash: "sha256:restore",
        id: "closeout:restore",
        kind: "restore-rehearsal",
        nextAction: "Keep restore rehearsal attached.",
        score: 100,
        status: "approved",
        title: "Restore rehearsal packet",
      },
      {
        closeoutHash: "sha256:recommendation-closeout",
        evidenceHash: "sha256:recommendation",
        id: "closeout:recommendation",
        kind: "release-recommendation",
        nextAction: "Approve release archive custody closeout.",
        score: 100,
        status: "approved",
        title: "Release archive custody recommendation",
      },
    ],
    summary: {
      approvedCount: 5,
      blockedCount: 0,
      closeoutDigestHash: "sha256:closeout-digest",
      closeoutScore: 100,
      executiveRecommendation: "APPROVE archive custody closeout.",
      nextAction: "Approve release archive custody closeout.",
      rowCount: 5,
      status: "approved",
      watchCount: 0,
    },
    workspaceId,
  };
}

const scheduled = createBoardReleaseArchiveOversightExceptionRenewalCalendar({
  closeoutDigest: closeoutDigest(),
  generatedAt,
  workspaceId,
});

assert.equal(scheduled.summary.status, "scheduled");
assert.equal(scheduled.summary.rowCount, 5);
assert.equal(scheduled.summary.scheduledCount, 5);
assert.equal(scheduled.summary.overdueCount, 0);
assert.equal(scheduled.summary.dueSoonCount, 0);
assert.equal(scheduled.summary.renewalScore, 100);
assert.deepEqual(
  scheduled.rows.map((row) => row.kind),
  ["access-review", "restore-rehearsal", "chain-of-control", "release-recommendation", "retention-lock"],
);
assert.equal(scheduled.csvFileName, "workspace-board-board-release-archive-oversight-exception-renewal-calendar-20260529.csv");
assert.equal(scheduled.jsonFileName, "workspace-board-board-release-archive-oversight-exception-renewal-calendar-20260529.json");
assert.match(scheduled.csvContent, /^renewal_id,kind,title,status,due_at,renewal_evidence_hash/);

const overdue = createBoardReleaseArchiveOversightExceptionRenewalCalendar({
  closeoutDigest: closeoutDigest(),
  generatedAt,
  renewalOverrides: [
    {
      dueAt: "2026-05-01T12:00:00.000Z",
      kind: "access-review",
      renewalEvidenceHash: null,
    },
  ],
  workspaceId,
});

assert.equal(overdue.summary.status, "blocked");
assert.equal(overdue.summary.overdueCount, 1);
assert.match(overdue.summary.nextAction, /Renew overdue archive oversight exception evidence/);

const complete = createBoardReleaseArchiveOversightExceptionRenewalCalendar({
  closeoutDigest: closeoutDigest(),
  generatedAt,
  renewalOverrides: [
    {
      completedAt: "2026-05-28T12:00:00.000Z",
      dueAt: "2026-05-29T12:00:00.000Z",
      kind: "access-review",
      renewalEvidenceHash: "sha256:renewed-access",
    },
  ],
  workspaceId,
});

assert.equal(complete.rows.find((row) => row.kind === "access-review")?.status, "complete");
assert.ok(complete.summary.completedCount > 0);

console.log("board release archive oversight exception renewal calendar smoke passed");
