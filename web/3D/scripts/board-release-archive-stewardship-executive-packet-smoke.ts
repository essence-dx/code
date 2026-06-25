import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveStewardshipExecutivePacket } from "@/features/projects/board-release-archive-stewardship-executive-packet";
import type { BoardReleaseArchiveStewardshipContinuityRehearsalReport } from "@/features/projects/board-release-archive-stewardship-continuity-rehearsal";
import type { BoardReleaseArchiveStewardshipEvidenceAgingForecastReport } from "@/features/projects/board-release-archive-stewardship-evidence-aging-forecast";
import type { BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport } from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";
import type { BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport } from "@/features/projects/board-release-archive-stewardship-ownership-rotation-planner";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function rotationPlanner(status: BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport["summary"]["status"]): BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport {
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
      nextAction: "Archive stewardship ownership rotation planner is ready.",
      readyCount: status === "ready" ? 5 : 4,
      rotationPlannerHash: "sha256:rotation-planner",
      rotationScore: status === "ready" ? 100 : status === "watch" ? 82 : 48,
      rowCount: 5,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function evidenceAging(status: BoardReleaseArchiveStewardshipEvidenceAgingForecastReport["summary"]["status"]): BoardReleaseArchiveStewardshipEvidenceAgingForecastReport {
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
      forecastHash: "sha256:evidence-aging",
      forecastScore: status === "healthy" ? 100 : status === "watch" ? 84 : 52,
      healthyCount: status === "healthy" ? 5 : 4,
      nextAction: "Archive stewardship evidence aging forecast is healthy.",
      rowCount: 5,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function exceptionBudget(status: BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport["summary"]["status"]): BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport {
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
      budgetLedgerHash: "sha256:exception-budget",
      budgetScore: status === "approved" ? 100 : status === "watch" ? 86 : 58,
      nextAction: "Archive stewardship exception budget ledger is approved.",
      rowCount: 5,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function continuity(status: BoardReleaseArchiveStewardshipContinuityRehearsalReport["summary"]["status"]): BoardReleaseArchiveStewardshipContinuityRehearsalReport {
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
      continuityHash: "sha256:continuity",
      nextAction: "Archive stewardship continuity rehearsal is ready.",
      readyCount: status === "ready" ? 5 : 4,
      rehearsalScore: status === "ready" ? 100 : status === "watch" ? 88 : 60,
      rowCount: 5,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveStewardshipExecutivePacket({
  continuityRehearsal: continuity("ready"),
  evidenceAgingForecast: evidenceAging("healthy"),
  exceptionBudgetLedger: exceptionBudget("approved"),
  generatedAt,
  ownershipRotationPlanner: rotationPlanner("ready"),
  workspaceId,
});

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 5);
assert.equal(approved.summary.approvedCount, 5);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.stewardshipScore, 100);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["ownership-rotation", "evidence-aging", "exception-budget", "continuity-rehearsal", "release-recommendation"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-stewardship-executive-packet-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-stewardship-executive-packet-20260529.json");
assert.match(approved.csvContent, /^packet_id,kind,title,status,score,evidence_hash,packet_hash,next_action/);
assert.match(approved.summary.releaseRecommendation, /^APPROVE/);

const blocked = createBoardReleaseArchiveStewardshipExecutivePacket({
  continuityRehearsal: continuity("blocked"),
  evidenceAgingForecast: evidenceAging("blocked"),
  exceptionBudgetLedger: exceptionBudget("blocked"),
  generatedAt,
  ownershipRotationPlanner: rotationPlanner("blocked"),
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.releaseRecommendation, /^BLOCK/);

const watch = createBoardReleaseArchiveStewardshipExecutivePacket({
  continuityRehearsal: continuity("watch"),
  evidenceAgingForecast: evidenceAging("watch"),
  exceptionBudgetLedger: exceptionBudget("watch"),
  generatedAt,
  ownershipRotationPlanner: rotationPlanner("watch"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);
assert.match(watch.summary.releaseRecommendation, /^WATCH/);

console.log("board release archive stewardship executive packet smoke passed");
