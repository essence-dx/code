import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveStewardshipExceptionBudgetLedger } from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";
import type { BoardReleaseArchiveStewardshipEvidenceAgingForecastReport } from "@/features/projects/board-release-archive-stewardship-evidence-aging-forecast";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function agingForecast(status: BoardReleaseArchiveStewardshipEvidenceAgingForecastReport["summary"]["status"]): BoardReleaseArchiveStewardshipEvidenceAgingForecastReport {
  const rowStatus = status === "blocked" ? "blocked" : status === "watch" ? "watch" : "healthy";

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
        agingHash: "sha256:aging-renewal",
        forecastScore: status === "healthy" ? 100 : status === "watch" ? 76 : 42,
        id: "aging:renewal",
        kind: "exception-renewals",
        nextAction: "Keep renewal aging forecast healthy.",
        renewalPressure: status === "blocked" ? 96 : status === "watch" ? 72 : 0,
        reviewerCapacity: status === "blocked" ? 38 : status === "watch" ? 66 : 100,
        rotationDueAt: "2026-06-12T12:00:00.000Z",
        rotationHash: "sha256:rotation-renewal",
        staleHashRisk: status === "blocked" ? 88 : status === "watch" ? 45 : 0,
        status: rowStatus,
        title: "Exception renewal calendar",
      },
      {
        agingHash: "sha256:aging-quality",
        forecastScore: 100,
        id: "aging:quality",
        kind: "evidence-quality",
        nextAction: "Keep evidence quality forecast healthy.",
        renewalPressure: 0,
        reviewerCapacity: 100,
        rotationDueAt: "2026-06-19T12:00:00.000Z",
        rotationHash: "sha256:rotation-quality",
        staleHashRisk: 0,
        status: "healthy",
        title: "Evidence quality monitor",
      },
      {
        agingHash: "sha256:aging-distribution",
        forecastScore: 100,
        id: "aging:distribution",
        kind: "board-distribution",
        nextAction: "Keep distribution forecast healthy.",
        renewalPressure: 0,
        reviewerCapacity: 100,
        rotationDueAt: "2026-06-28T12:00:00.000Z",
        rotationHash: "sha256:rotation-distribution",
        staleHashRisk: 0,
        status: "healthy",
        title: "Board distribution digest",
      },
    ],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      forecastHash: "sha256:aging-forecast",
      forecastScore: status === "healthy" ? 100 : status === "watch" ? 88 : 61,
      healthyCount: status === "healthy" ? 3 : 2,
      nextAction: "Archive stewardship evidence aging forecast is healthy.",
      rowCount: 3,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveStewardshipExceptionBudgetLedger({
  agingForecast: agingForecast("healthy"),
  generatedAt,
  workspaceId,
});

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 3);
assert.equal(approved.summary.approvedCount, 3);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.budgetScore, 100);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["exception-renewals", "evidence-quality", "board-distribution"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-stewardship-exception-budget-ledger-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-stewardship-exception-budget-ledger-20260529.json");
assert.match(approved.csvContent, /^budget_id,kind,title,status,accepted_risk,expiry_at,burn_down_percent,board_approval_hash/);

const blocked = createBoardReleaseArchiveStewardshipExceptionBudgetLedger({
  agingForecast: agingForecast("blocked"),
  budgetOverrides: [
    {
      acceptedRisk: 85,
      boardApprovalHash: null,
      burnDownPercent: 20,
      expiryAt: "2026-05-25T12:00:00.000Z",
      kind: "exception-renewals",
    },
  ],
  generatedAt,
  workspaceId,
});

const blockedRenewal = blocked.rows.find((row) => row.kind === "exception-renewals");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedRenewal?.status, "blocked");
assert.match(blocked.summary.nextAction, /Reduce blocked archive stewardship exception budget/);

const watch = createBoardReleaseArchiveStewardshipExceptionBudgetLedger({
  agingForecast: agingForecast("healthy"),
  budgetOverrides: [
    {
      acceptedRisk: 54,
      boardApprovalHash: "sha256:board-quality",
      burnDownPercent: 55,
      expiryAt: "2026-06-03T12:00:00.000Z",
      kind: "evidence-quality",
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive stewardship exception budget ledger smoke passed");
