import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceAutomationTriggerRegister } from "@/features/projects/board-release-archive-governance-automation-trigger-register";
import type { BoardReleaseArchiveGovernanceExecutivePacketReport } from "@/features/projects/board-release-archive-governance-executive-packet";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function executivePacket(status: BoardReleaseArchiveGovernanceExecutivePacketReport["summary"]["status"]): BoardReleaseArchiveGovernanceExecutivePacketReport {
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
        evidenceHash: "sha256:charter",
        id: "policy-charter",
        kind: "policy-charter",
        nextAction: "Keep archive governance policy charter ratified.",
        packetHash: "sha256:policy-charter-packet",
        score: status === "approved" ? 100 : status === "watch" ? 84 : 52,
        status,
        title: "Policy charter",
      },
      {
        evidenceHash: "sha256:owner-matrix",
        id: "control-owner-matrix",
        kind: "control-owner-matrix",
        nextAction: "Refresh owner handoff evidence.",
        packetHash: "sha256:owner-matrix-packet",
        score: status === "approved" ? 100 : status === "watch" ? 82 : 48,
        status,
        title: "Control owner matrix",
      },
      {
        evidenceHash: "sha256:quorum",
        id: "exception-quorum",
        kind: "exception-quorum",
        nextAction: "Refresh quorum exception approvals.",
        packetHash: "sha256:quorum-packet",
        score: status === "approved" ? 100 : status === "watch" ? 80 : 45,
        status,
        title: "Exception quorum tracker",
      },
      {
        evidenceHash: "sha256:drift",
        id: "policy-drift",
        kind: "policy-drift",
        nextAction: "Review active policy drift.",
        packetHash: "sha256:drift-packet",
        score: status === "approved" ? 100 : status === "watch" ? 85 : 40,
        status,
        title: "Policy drift monitor",
      },
      {
        evidenceHash: "sha256:recommendation",
        id: "release-recommendation",
        kind: "release-recommendation",
        nextAction: "Regenerate executive packet for release archive governance.",
        packetHash: "sha256:recommendation-packet",
        score: status === "approved" ? 100 : status === "watch" ? 83 : 46,
        status,
        title: "Archive governance release recommendation",
      },
    ],
    summary: {
      approvedCount: status === "approved" ? 5 : 0,
      blockedCount: status === "blocked" ? 5 : 0,
      governancePacketHash: "sha256:governance-packet",
      governanceScore: status === "approved" ? 100 : status === "watch" ? 82 : 36,
      nextAction: status === "approved" ? "Approve archive governance packet." : "Repair archive governance packet.",
      releaseRecommendation:
        status === "approved"
          ? "APPROVE archive governance packet with charter, owner matrix, quorum tracker, and policy drift monitor ready. Current score: 100/100."
          : status === "watch"
            ? "WATCH archive governance packet and complete executive monitoring before final release governance recommendation. Current score: 82/100."
            : "BLOCK archive governance packet until blocked evidence is repaired. Current score: 36/100.",
      rowCount: 5,
      status,
      watchCount: status === "watch" ? 5 : 0,
    },
    workspaceId,
  };
}

const ready = createBoardReleaseArchiveGovernanceAutomationTriggerRegister({
  executivePacket: executivePacket("approved"),
  generatedAt,
  workspaceId,
});

assert.equal(ready.summary.status, "scheduled");
assert.equal(ready.summary.rowCount, 4);
assert.equal(ready.summary.scheduledCount, 4);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.automationScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.kind),
  ["ownership-renewal", "quorum-refresh", "drift-review", "executive-packet-regeneration"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-governance-automation-trigger-register-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-governance-automation-trigger-register-20260529.json");
assert.match(ready.csvContent, /^trigger_id,kind,title,status,cadence,owner_role,evidence_hash,next_run_at,next_action/);
assert.match(ready.summary.nextAction, /Archive governance automation triggers are scheduled/);

const watch = createBoardReleaseArchiveGovernanceAutomationTriggerRegister({
  executivePacket: executivePacket("watch"),
  generatedAt,
  workspaceId,
});

assert.equal(watch.summary.status, "due");
assert.ok(watch.summary.dueCount > 0);
assert.match(watch.summary.nextAction, /Refresh due archive governance automation trigger/);

const blocked = createBoardReleaseArchiveGovernanceAutomationTriggerRegister({
  executivePacket: executivePacket("blocked"),
  generatedAt,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Repair blocked archive governance automation trigger/);

console.log("board release archive governance automation trigger register smoke passed");
