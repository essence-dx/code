import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceExecutivePacket } from "@/features/projects/board-release-archive-governance-executive-packet";
import type { BoardReleaseArchiveGovernanceControlOwnerMatrixReport } from "@/features/projects/board-release-archive-governance-control-owner-matrix";
import type { BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport } from "@/features/projects/board-release-archive-governance-exception-quorum-tracker";
import type { BoardReleaseArchiveGovernancePolicyCharterReport } from "@/features/projects/board-release-archive-governance-policy-charter";
import type { BoardReleaseArchiveGovernancePolicyDriftMonitorReport } from "@/features/projects/board-release-archive-governance-policy-drift-monitor";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function policyCharter(status: BoardReleaseArchiveGovernancePolicyCharterReport["summary"]["status"]): BoardReleaseArchiveGovernancePolicyCharterReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      charterHash: "sha256:charter",
      charterScore: status === "ratified" ? 100 : status === "watch" ? 84 : 52,
      nextAction: "Archive governance policy charter is ratified.",
      ratifiedCount: status === "ratified" ? 4 : 3,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function ownerMatrix(status: BoardReleaseArchiveGovernanceControlOwnerMatrixReport["summary"]["status"]): BoardReleaseArchiveGovernanceControlOwnerMatrixReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      matrixHash: "sha256:matrix",
      matrixScore: status === "ready" ? 100 : status === "watch" ? 82 : 48,
      nextAction: "Archive governance control owner matrix is ready.",
      readyCount: status === "ready" ? 4 : 3,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function quorumTracker(status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport["summary"]["status"]): BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      approvedCount: status === "approved" ? 4 : 3,
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "Archive governance exception quorum tracker is approved.",
      quorumHash: "sha256:quorum",
      quorumScore: status === "approved" ? 100 : status === "watch" ? 80 : 45,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function driftMonitor(status: BoardReleaseArchiveGovernancePolicyDriftMonitorReport["summary"]["status"]): BoardReleaseArchiveGovernancePolicyDriftMonitorReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      alignedCount: status === "aligned" ? 4 : 3,
      blockedCount: status === "blocked" ? 1 : 0,
      driftHash: "sha256:drift",
      driftScore: status === "aligned" ? 100 : status === "watch" ? 85 : 40,
      nextAction: "Archive governance policy drift monitor is aligned.",
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveGovernanceExecutivePacket({
  controlOwnerMatrix: ownerMatrix("ready"),
  exceptionQuorumTracker: quorumTracker("approved"),
  generatedAt,
  policyCharter: policyCharter("ratified"),
  policyDriftMonitor: driftMonitor("aligned"),
  workspaceId,
});

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 5);
assert.equal(approved.summary.approvedCount, 5);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.governanceScore, 100);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["policy-charter", "control-owner-matrix", "exception-quorum", "policy-drift", "release-recommendation"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-governance-executive-packet-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-governance-executive-packet-20260529.json");
assert.match(approved.csvContent, /^packet_id,kind,title,status,score,evidence_hash,packet_hash,next_action/);
assert.match(approved.summary.releaseRecommendation, /^APPROVE/);

const blocked = createBoardReleaseArchiveGovernanceExecutivePacket({
  controlOwnerMatrix: ownerMatrix("blocked"),
  exceptionQuorumTracker: quorumTracker("blocked"),
  generatedAt,
  policyCharter: policyCharter("blocked"),
  policyDriftMonitor: driftMonitor("blocked"),
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.releaseRecommendation, /^BLOCK/);

const watch = createBoardReleaseArchiveGovernanceExecutivePacket({
  controlOwnerMatrix: ownerMatrix("watch"),
  exceptionQuorumTracker: quorumTracker("watch"),
  generatedAt,
  policyCharter: policyCharter("watch"),
  policyDriftMonitor: driftMonitor("watch"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);
assert.match(watch.summary.releaseRecommendation, /^WATCH/);

console.log("board release archive governance executive packet smoke passed");
