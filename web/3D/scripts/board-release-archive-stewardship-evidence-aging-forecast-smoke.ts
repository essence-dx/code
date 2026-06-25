import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveStewardshipEvidenceAgingForecast } from "@/features/projects/board-release-archive-stewardship-evidence-aging-forecast";
import type { BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport } from "@/features/projects/board-release-archive-stewardship-ownership-rotation-planner";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function rotationPlanner(status: BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport["summary"]["status"]): BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport {
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
        currentOwner: "Renewal owner",
        handoffEvidenceHash: "sha256:renewal-handoff",
        handoffHash: "sha256:handoff-renewal",
        id: "rotation:renewal",
        kind: "exception-renewals",
        nextAction: "Keep renewal rotation ready.",
        nextOwner: "Quality owner",
        rotationDueAt: "2026-06-12T12:00:00.000Z",
        rotationScore: status === "ready" ? 100 : status === "watch" ? 78 : 42,
        status: rowStatus,
        title: "Exception renewal calendar",
      },
      {
        currentOwner: "Evidence quality owner",
        handoffEvidenceHash: "sha256:quality-handoff",
        handoffHash: "sha256:handoff-quality",
        id: "rotation:quality",
        kind: "evidence-quality",
        nextAction: "Keep quality rotation ready.",
        nextOwner: "Audit evidence deputy",
        rotationDueAt: "2026-06-19T12:00:00.000Z",
        rotationScore: 100,
        status: "ready",
        title: "Evidence quality monitor",
      },
      {
        currentOwner: "Board distribution owner",
        handoffEvidenceHash: "sha256:distribution-handoff",
        handoffHash: "sha256:handoff-distribution",
        id: "rotation:distribution",
        kind: "board-distribution",
        nextAction: "Keep distribution rotation ready.",
        nextOwner: "Governance operations deputy",
        rotationDueAt: "2026-06-28T12:00:00.000Z",
        rotationScore: 100,
        status: "ready",
        title: "Board distribution digest",
      },
    ],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "Archive stewardship ownership rotation planner is ready.",
      readyCount: status === "ready" ? 3 : 2,
      rotationPlannerHash: "sha256:rotation-planner",
      rotationScore: status === "ready" ? 100 : status === "watch" ? 86 : 58,
      rowCount: 3,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const healthy = createBoardReleaseArchiveStewardshipEvidenceAgingForecast({
  generatedAt,
  rotationPlanner: rotationPlanner("ready"),
  workspaceId,
});

assert.equal(healthy.summary.status, "healthy");
assert.equal(healthy.summary.rowCount, 3);
assert.equal(healthy.summary.healthyCount, 3);
assert.equal(healthy.summary.blockedCount, 0);
assert.equal(healthy.summary.watchCount, 0);
assert.equal(healthy.summary.forecastScore, 100);
assert.deepEqual(
  healthy.rows.map((row) => row.kind),
  ["exception-renewals", "evidence-quality", "board-distribution"],
);
assert.equal(healthy.csvFileName, "workspace-board-board-release-archive-stewardship-evidence-aging-forecast-20260529.csv");
assert.equal(healthy.jsonFileName, "workspace-board-board-release-archive-stewardship-evidence-aging-forecast-20260529.json");
assert.match(healthy.csvContent, /^forecast_id,kind,title,status,forecast_score,renewal_pressure,stale_hash_risk,reviewer_capacity/);

const blocked = createBoardReleaseArchiveStewardshipEvidenceAgingForecast({
  forecastOverrides: [
    {
      kind: "exception-renewals",
      reviewerCapacity: 35,
      staleHashRisk: 88,
    },
  ],
  generatedAt,
  rotationPlanner: rotationPlanner("blocked"),
  workspaceId,
});

const blockedRenewal = blocked.rows.find((row) => row.kind === "exception-renewals");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedRenewal?.status, "blocked");
assert.match(blocked.summary.nextAction, /Reduce blocked archive stewardship evidence aging risk/);

const watch = createBoardReleaseArchiveStewardshipEvidenceAgingForecast({
  forecastOverrides: [
    {
      kind: "evidence-quality",
      reviewerCapacity: 64,
      staleHashRisk: 45,
    },
  ],
  generatedAt,
  rotationPlanner: rotationPlanner("ready"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive stewardship evidence aging forecast smoke passed");
