import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveOversightIncidentReplayDrill } from "@/features/projects/board-release-archive-oversight-incident-replay-drill";
import type { BoardReleaseArchiveOversightBoardDistributionDigestReport } from "@/features/projects/board-release-archive-oversight-board-distribution-digest";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function distributionDigest(status: BoardReleaseArchiveOversightBoardDistributionDigestReport["summary"]["status"]): BoardReleaseArchiveOversightBoardDistributionDigestReport {
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
        distributionHash: "sha256:distribution-board",
        id: "distribution:board",
        nextAction: "Send Board archive chair the recurring archive oversight governance digest.",
        packetHash: "sha256:packet",
        recipient: "Board archive chair",
        recipientType: "board",
        reviewCadence: "weekly governance review",
        status,
      },
      {
        distributionHash: "sha256:distribution-audit",
        id: "distribution:audit",
        nextAction: "Send External audit lead the recurring archive oversight governance digest.",
        packetHash: "sha256:packet",
        recipient: "External audit lead",
        recipientType: "audit",
        reviewCadence: "monthly audit evidence review",
        status,
      },
    ],
    summary: {
      blockedCount: status === "blocked" ? 2 : 0,
      distributionDigestHash: "sha256:distribution-digest",
      distributionScore: status === "ready" ? 100 : status === "watch" ? 86 : 40,
      nextAction:
        status === "blocked"
          ? "Resolve blocked archive oversight quality before sending governance digest."
          : "Archive oversight board distribution digest is ready for recurring governance reviews.",
      readyCount: status === "ready" ? 2 : 0,
      rowCount: 2,
      status,
      watchCount: status === "watch" ? 2 : 0,
    },
    workspaceId,
  };
}

const ready = createBoardReleaseArchiveOversightIncidentReplayDrill({
  distributionDigest: distributionDigest("ready"),
  generatedAt,
  workspaceId,
});

assert.equal(ready.summary.status, "passed");
assert.equal(ready.summary.rowCount, 3);
assert.equal(ready.summary.passedCount, 3);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.watchCount, 0);
assert.equal(ready.summary.drillScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.scenario),
  ["custody-access-failure", "retention-unlock", "restore-drift"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-oversight-incident-replay-drill-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-oversight-incident-replay-drill-20260529.json");
assert.match(ready.csvContent, /^drill_id,scenario,status,drill_score,source_packet_hash/);

const blocked = createBoardReleaseArchiveOversightIncidentReplayDrill({
  distributionDigest: distributionDigest("blocked"),
  generatedAt,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Resolve blocked archive oversight distribution/);

const watch = createBoardReleaseArchiveOversightIncidentReplayDrill({
  distributionDigest: distributionDigest("watch"),
  generatedAt,
  scenarios: [
    {
      scenario: "restore-drift",
      replayEvidenceHash: null,
    },
  ],
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive oversight incident replay drill smoke passed");
