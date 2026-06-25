import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernancePolicyDriftMonitor } from "@/features/projects/board-release-archive-governance-policy-drift-monitor";
import type { BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport } from "@/features/projects/board-release-archive-governance-exception-quorum-tracker";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function quorumTracker(status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport["summary"]["status"]): BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport {
  const rowStatus = status === "blocked" ? "blocked" : status === "watch" ? "watch" : "approved";

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
        abstentions: status === "blocked" ? 3 : status === "watch" ? 1 : 0,
        approvalVotes: status === "blocked" ? 1 : status === "watch" ? 3 : 4,
        id: "quorum:decision-rights",
        kind: "decision-rights",
        matrixHash: "sha256:matrix-decision",
        nextAction: "Keep quorum approved.",
        quorumHash: "sha256:quorum-decision",
        quorumScore: status === "approved" ? 100 : status === "watch" ? 76 : 35,
        renewalThresholdDays: status === "watch" ? 5 : 21,
        status: rowStatus,
        title: "Decision rights charter",
      },
      {
        abstentions: 0,
        approvalVotes: 4,
        id: "quorum:approval-policy",
        kind: "approval-policy",
        matrixHash: "sha256:matrix-approval",
        nextAction: "Keep approval quorum approved.",
        quorumHash: "sha256:quorum-approval",
        quorumScore: 100,
        renewalThresholdDays: 21,
        status: "approved",
        title: "Approval policy charter",
      },
      {
        abstentions: 0,
        approvalVotes: 4,
        id: "quorum:risk-acceptance",
        kind: "risk-acceptance",
        matrixHash: "sha256:matrix-risk",
        nextAction: "Keep risk quorum approved.",
        quorumHash: "sha256:quorum-risk",
        quorumScore: 100,
        renewalThresholdDays: 14,
        status: "approved",
        title: "Risk acceptance charter",
      },
      {
        abstentions: 0,
        approvalVotes: 4,
        id: "quorum:release-authority",
        kind: "release-authority",
        matrixHash: "sha256:matrix-release",
        nextAction: "Keep release quorum approved.",
        quorumHash: "sha256:quorum-release",
        quorumScore: 100,
        renewalThresholdDays: 21,
        status: "approved",
        title: "Release authority charter",
      },
    ],
    summary: {
      approvedCount: status === "approved" ? 4 : 3,
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "Archive governance exception quorum tracker is approved.",
      quorumHash: "sha256:quorum",
      quorumScore: status === "approved" ? 100 : status === "watch" ? 94 : 84,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const aligned = createBoardReleaseArchiveGovernancePolicyDriftMonitor({
  generatedAt,
  quorumTracker: quorumTracker("approved"),
  workspaceId,
});

assert.equal(aligned.summary.status, "aligned");
assert.equal(aligned.summary.rowCount, 4);
assert.equal(aligned.summary.alignedCount, 4);
assert.equal(aligned.summary.blockedCount, 0);
assert.equal(aligned.summary.watchCount, 0);
assert.equal(aligned.summary.driftScore, 100);
assert.deepEqual(
  aligned.rows.map((row) => row.kind),
  ["decision-rights", "approval-policy", "risk-acceptance", "release-authority"],
);
assert.equal(aligned.csvFileName, "workspace-board-board-release-archive-governance-policy-drift-monitor-20260529.csv");
assert.equal(aligned.jsonFileName, "workspace-board-board-release-archive-governance-policy-drift-monitor-20260529.json");
assert.match(aligned.csvContent, /^drift_id,kind,title,status,active_rule,recommendation,drift_score,drift_hash,next_action/);

const blocked = createBoardReleaseArchiveGovernancePolicyDriftMonitor({
  driftOverrides: [
    {
      activeRule: "Approve archive release when quorum has one approval vote.",
      kind: "risk-acceptance",
      recommendation: "BLOCK archive release until quorum repairs risk acceptance approval.",
    },
  ],
  generatedAt,
  quorumTracker: quorumTracker("blocked"),
  workspaceId,
});

const blockedRisk = blocked.rows.find((row) => row.kind === "risk-acceptance");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedRisk?.status, "blocked");
assert.match(blocked.summary.nextAction, /Repair blocked archive governance policy drift/);

const watch = createBoardReleaseArchiveGovernancePolicyDriftMonitor({
  driftOverrides: [
    {
      activeRule: "Watch archive release when quorum has renewal pressure.",
      kind: "approval-policy",
      recommendation: "WATCH archive release while quorum renewal window is under ten days.",
    },
  ],
  generatedAt,
  quorumTracker: quorumTracker("watch"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive governance policy drift monitor smoke passed");
