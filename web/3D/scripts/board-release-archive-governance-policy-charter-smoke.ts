import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernancePolicyCharter } from "@/features/projects/board-release-archive-governance-policy-charter";
import type { BoardReleaseArchiveStewardshipExecutivePacketReport } from "@/features/projects/board-release-archive-stewardship-executive-packet";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function stewardshipPacket(status: BoardReleaseArchiveStewardshipExecutivePacketReport["summary"]["status"]): BoardReleaseArchiveStewardshipExecutivePacketReport {
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
      approvedCount: status === "approved" ? 5 : 4,
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "Archive stewardship packet is ready.",
      releaseRecommendation:
        status === "blocked"
          ? "BLOCK archive stewardship packet until blocked evidence is repaired."
          : status === "watch"
            ? "WATCH archive stewardship packet before final release recommendation."
            : "APPROVE archive stewardship packet with ownership rotation, evidence aging, exception budget, and continuity rehearsal ready.",
      rowCount: 5,
      status,
      stewardshipPacketHash: "sha256:stewardship-packet",
      stewardshipScore: status === "approved" ? 100 : status === "watch" ? 84 : 58,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveGovernancePolicyCharter({
  generatedAt,
  stewardshipPacket: stewardshipPacket("approved"),
  workspaceId,
});

assert.equal(approved.summary.status, "ratified");
assert.equal(approved.summary.rowCount, 4);
assert.equal(approved.summary.ratifiedCount, 4);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.charterScore, 100);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["decision-rights", "approval-policy", "risk-acceptance", "release-authority"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-governance-policy-charter-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-governance-policy-charter-20260529.json");
assert.match(approved.csvContent, /^charter_id,kind,title,status,decision_right,required_approval,score,policy_hash,next_action/);

const blocked = createBoardReleaseArchiveGovernancePolicyCharter({
  charterOverrides: [
    {
      decisionRight: "Archive governance board",
      kind: "risk-acceptance",
      requiredApproval: "",
      score: 42,
    },
  ],
  generatedAt,
  stewardshipPacket: stewardshipPacket("blocked"),
  workspaceId,
});

const blockedRisk = blocked.rows.find((row) => row.kind === "risk-acceptance");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedRisk?.status, "blocked");
assert.match(blocked.summary.nextAction, /Repair blocked archive governance policy charter/);

const watch = createBoardReleaseArchiveGovernancePolicyCharter({
  charterOverrides: [
    {
      decisionRight: "Archive governance board",
      kind: "approval-policy",
      requiredApproval: "Board chair acknowledgement",
      score: 72,
    },
  ],
  generatedAt,
  stewardshipPacket: stewardshipPacket("watch"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive governance policy charter smoke passed");
