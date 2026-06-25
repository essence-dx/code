import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveStewardshipOwnershipRotationPlanner } from "@/features/projects/board-release-archive-stewardship-ownership-rotation-planner";
import type { BoardReleaseArchiveOversightExecutiveHealthPacketReport } from "@/features/projects/board-release-archive-oversight-executive-health-packet";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function healthPacket(status: BoardReleaseArchiveOversightExecutiveHealthPacketReport["summary"]["status"]): BoardReleaseArchiveOversightExecutiveHealthPacketReport {
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
        evidenceHash: "sha256:renewals",
        healthHash: "sha256:health-renewals",
        id: "health:renewals",
        kind: "exception-renewals",
        nextAction: "Keep exception renewal calendar healthy.",
        score: status === "blocked" ? 58 : status === "watch" ? 82 : 100,
        status: status === "blocked" ? "blocked" : status === "watch" ? "watch" : "approved",
        title: "Exception renewal calendar",
      },
      {
        evidenceHash: "sha256:quality",
        healthHash: "sha256:health-quality",
        id: "health:quality",
        kind: "evidence-quality",
        nextAction: "Keep evidence quality healthy.",
        score: 100,
        status: "approved",
        title: "Evidence quality monitor",
      },
      {
        evidenceHash: "sha256:distribution",
        healthHash: "sha256:health-distribution",
        id: "health:distribution",
        kind: "board-distribution",
        nextAction: "Keep distribution digest ready.",
        score: 100,
        status: "approved",
        title: "Board distribution digest",
      },
      {
        evidenceHash: "sha256:replay",
        healthHash: "sha256:health-replay",
        id: "health:replay",
        kind: "incident-replay",
        nextAction: "Keep replay drill passed.",
        score: 100,
        status: "approved",
        title: "Incident replay drill",
      },
      {
        evidenceHash: "sha256:recommendation",
        healthHash: "sha256:health-recommendation",
        id: "health:recommendation",
        kind: "release-recommendation",
        nextAction: "Approve archive oversight health packet.",
        score: status === "blocked" ? 72 : status === "watch" ? 86 : 100,
        status,
        title: "Archive oversight release recommendation",
      },
    ],
    summary: {
      approvedCount: status === "approved" ? 5 : 3,
      blockedCount: status === "blocked" ? 2 : 0,
      healthPacketHash: "sha256:health-packet",
      healthScore: status === "approved" ? 100 : status === "watch" ? 86 : 64,
      nextAction: status === "approved" ? "Approve archive oversight health packet." : "Review archive oversight health packet.",
      releaseRecommendation: status === "approved" ? "APPROVE archive oversight health packet." : "WATCH archive oversight health packet.",
      rowCount: 5,
      status,
      watchCount: status === "watch" ? 2 : 0,
    },
    workspaceId,
  };
}

const ready = createBoardReleaseArchiveStewardshipOwnershipRotationPlanner({
  generatedAt,
  healthPacket: healthPacket("approved"),
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.rowCount, 5);
assert.equal(ready.summary.readyCount, 5);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.watchCount, 0);
assert.equal(ready.summary.rotationScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.kind),
  ["exception-renewals", "evidence-quality", "board-distribution", "incident-replay", "release-recommendation"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-stewardship-ownership-rotation-planner-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-stewardship-ownership-rotation-planner-20260529.json");
assert.match(ready.csvContent, /^rotation_id,kind,title,status,current_owner,next_owner,rotation_due_at,handoff_hash/);

const blocked = createBoardReleaseArchiveStewardshipOwnershipRotationPlanner({
  generatedAt,
  healthPacket: healthPacket("blocked"),
  rotationOverrides: [
    {
      currentOwner: "Renewal owner",
      handoffEvidenceHash: null,
      kind: "exception-renewals",
      nextOwner: "Quality owner",
      rotationDueAt: "2026-05-20T12:00:00.000Z",
    },
  ],
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Complete blocked archive stewardship ownership rotation/);

const watch = createBoardReleaseArchiveStewardshipOwnershipRotationPlanner({
  generatedAt,
  healthPacket: healthPacket("approved"),
  rotationOverrides: [
    {
      currentOwner: "Replay owner",
      handoffEvidenceHash: "sha256:replay-handoff",
      kind: "incident-replay",
      nextOwner: "Replay deputy",
      rotationDueAt: "2026-06-03T12:00:00.000Z",
    },
  ],
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive stewardship ownership rotation planner smoke passed");
