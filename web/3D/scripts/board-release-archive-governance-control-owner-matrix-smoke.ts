import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceControlOwnerMatrix } from "@/features/projects/board-release-archive-governance-control-owner-matrix";
import type { BoardReleaseArchiveGovernancePolicyCharterReport } from "@/features/projects/board-release-archive-governance-policy-charter";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function policyCharter(status: BoardReleaseArchiveGovernancePolicyCharterReport["summary"]["status"]): BoardReleaseArchiveGovernancePolicyCharterReport {
  const rowStatus = status === "blocked" ? "blocked" : status === "watch" ? "watch" : "ratified";

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
        decisionRight: "Archive governance board owns release archive decision rights.",
        id: "charter:decision-rights",
        kind: "decision-rights",
        nextAction: "Keep decision rights ratified.",
        policyHash: "sha256:policy-decision",
        requiredApproval: "Board chair ratification",
        score: status === "ratified" ? 100 : status === "watch" ? 78 : 44,
        status: rowStatus,
        stewardshipHash: "sha256:stewardship",
        title: "Decision rights charter",
      },
      {
        decisionRight: "Archive governance board approves stewardship packet outcomes.",
        id: "charter:approval-policy",
        kind: "approval-policy",
        nextAction: "Keep approval policy ratified.",
        policyHash: "sha256:policy-approval",
        requiredApproval: "Board chair ratification",
        score: 100,
        status: "ratified",
        stewardshipHash: "sha256:stewardship",
        title: "Approval policy charter",
      },
      {
        decisionRight: "Risk acceptance requires explicit board authorization.",
        id: "charter:risk-acceptance",
        kind: "risk-acceptance",
        nextAction: "Keep risk acceptance ratified.",
        policyHash: "sha256:policy-risk",
        requiredApproval: "Board chair ratification",
        score: 100,
        status: "ratified",
        stewardshipHash: "sha256:stewardship",
        title: "Risk acceptance charter",
      },
      {
        decisionRight: "Release authority follows the stewardship packet recommendation.",
        id: "charter:release-authority",
        kind: "release-authority",
        nextAction: "Keep release authority ratified.",
        policyHash: "sha256:policy-release",
        requiredApproval: "Executive sponsor approval",
        score: 100,
        status: "ratified",
        stewardshipHash: "sha256:stewardship",
        title: "Release authority charter",
      },
    ],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      charterHash: "sha256:charter",
      charterScore: status === "ratified" ? 100 : status === "watch" ? 94 : 86,
      nextAction: "Archive governance policy charter is ratified.",
      ratifiedCount: status === "ratified" ? 4 : 3,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const ready = createBoardReleaseArchiveGovernanceControlOwnerMatrix({
  generatedAt,
  policyCharter: policyCharter("ratified"),
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.rowCount, 4);
assert.equal(ready.summary.readyCount, 4);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.watchCount, 0);
assert.equal(ready.summary.matrixScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.kind),
  ["decision-rights", "approval-policy", "risk-acceptance", "release-authority"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-governance-control-owner-matrix-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-governance-control-owner-matrix-20260529.json");
assert.match(ready.csvContent, /^owner_id,kind,title,status,accountable_owner,escalation_path,review_cadence,evidence_obligation,matrix_score,owner_hash,next_action/);

const blocked = createBoardReleaseArchiveGovernanceControlOwnerMatrix({
  generatedAt,
  ownerOverrides: [
    {
      accountableOwner: "",
      escalationPath: "",
      evidenceObligation: "",
      kind: "decision-rights",
      reviewCadenceDays: 45,
    },
  ],
  policyCharter: policyCharter("blocked"),
  workspaceId,
});

const blockedDecision = blocked.rows.find((row) => row.kind === "decision-rights");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedDecision?.status, "blocked");
assert.match(blocked.summary.nextAction, /Repair blocked archive governance control owner matrix/);

const watch = createBoardReleaseArchiveGovernanceControlOwnerMatrix({
  generatedAt,
  ownerOverrides: [
    {
      accountableOwner: "Governance secretary",
      escalationPath: "Board chair",
      evidenceObligation: "Weekly signed owner acknowledgement",
      kind: "approval-policy",
      reviewCadenceDays: 21,
    },
  ],
  policyCharter: policyCharter("watch"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive governance control owner matrix smoke passed");
