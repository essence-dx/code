import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceExceptionQuorumTracker } from "@/features/projects/board-release-archive-governance-exception-quorum-tracker";
import type { BoardReleaseArchiveGovernanceControlOwnerMatrixReport } from "@/features/projects/board-release-archive-governance-control-owner-matrix";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function ownerMatrix(status: BoardReleaseArchiveGovernanceControlOwnerMatrixReport["summary"]["status"]): BoardReleaseArchiveGovernanceControlOwnerMatrixReport {
  const rowStatus = status === "blocked" ? "blocked" : status === "watch" ? "watch" : "ready";

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
        accountableOwner: "Board chair",
        charterHash: "sha256:charter-decision",
        escalationPath: "Archive governance committee",
        evidenceObligation: "Signed decision-rights attestation",
        id: "owner:decision-rights",
        kind: "decision-rights",
        matrixScore: status === "ready" ? 100 : status === "watch" ? 82 : 48,
        nextAction: "Keep ownership ready.",
        ownerHash: "sha256:owner-decision",
        reviewCadenceDays: 14,
        status: rowStatus,
        title: "Decision rights charter",
      },
      {
        accountableOwner: "Governance secretary",
        charterHash: "sha256:charter-approval",
        escalationPath: "Board chair",
        evidenceObligation: "Approval policy acknowledgement log",
        id: "owner:approval-policy",
        kind: "approval-policy",
        matrixScore: 100,
        nextAction: "Keep approval ownership ready.",
        ownerHash: "sha256:owner-approval",
        reviewCadenceDays: 14,
        status: "ready",
        title: "Approval policy charter",
      },
      {
        accountableOwner: "Risk owner",
        charterHash: "sha256:charter-risk",
        escalationPath: "Board risk committee",
        evidenceObligation: "Risk acceptance decision record",
        id: "owner:risk-acceptance",
        kind: "risk-acceptance",
        matrixScore: 100,
        nextAction: "Keep risk ownership ready.",
        ownerHash: "sha256:owner-risk",
        reviewCadenceDays: 7,
        status: "ready",
        title: "Risk acceptance charter",
      },
      {
        accountableOwner: "Executive sponsor",
        charterHash: "sha256:charter-release",
        escalationPath: "Board chair",
        evidenceObligation: "Release authority sign-off",
        id: "owner:release-authority",
        kind: "release-authority",
        matrixScore: 100,
        nextAction: "Keep release ownership ready.",
        ownerHash: "sha256:owner-release",
        reviewCadenceDays: 14,
        status: "ready",
        title: "Release authority charter",
      },
    ],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      matrixHash: "sha256:matrix",
      matrixScore: status === "ready" ? 100 : status === "watch" ? 94 : 87,
      nextAction: "Archive governance control owner matrix is ready.",
      readyCount: status === "ready" ? 4 : 3,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveGovernanceExceptionQuorumTracker({
  controlOwnerMatrix: ownerMatrix("ready"),
  generatedAt,
  workspaceId,
});

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 4);
assert.equal(approved.summary.approvedCount, 4);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.quorumScore, 100);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["decision-rights", "approval-policy", "risk-acceptance", "release-authority"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-governance-exception-quorum-tracker-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-governance-exception-quorum-tracker-20260529.json");
assert.match(approved.csvContent, /^quorum_id,kind,title,status,approval_votes,abstentions,renewal_threshold_days,quorum_score,quorum_hash,next_action/);

const blocked = createBoardReleaseArchiveGovernanceExceptionQuorumTracker({
  controlOwnerMatrix: ownerMatrix("blocked"),
  generatedAt,
  quorumOverrides: [
    {
      abstentions: 3,
      approvalVotes: 1,
      kind: "risk-acceptance",
      renewalThresholdDays: 2,
    },
  ],
  workspaceId,
});

const blockedRisk = blocked.rows.find((row) => row.kind === "risk-acceptance");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedRisk?.status, "blocked");
assert.match(blocked.summary.nextAction, /Repair blocked archive governance exception quorum/);

const watch = createBoardReleaseArchiveGovernanceExceptionQuorumTracker({
  controlOwnerMatrix: ownerMatrix("ready"),
  generatedAt,
  quorumOverrides: [
    {
      abstentions: 1,
      approvalVotes: 3,
      kind: "approval-policy",
      renewalThresholdDays: 5,
    },
  ],
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive governance exception quorum tracker smoke passed");
