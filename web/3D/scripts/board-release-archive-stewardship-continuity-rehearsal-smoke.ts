import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveStewardshipContinuityRehearsal } from "@/features/projects/board-release-archive-stewardship-continuity-rehearsal";
import type { BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport } from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function exceptionBudgetLedger(status: BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport["summary"]["status"]): BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport {
  const rowStatus = status === "blocked" ? "blocked" : status === "watch" ? "watch" : "approved";

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
        acceptedRisk: status === "blocked" ? 85 : status === "watch" ? 54 : 0,
        boardApprovalHash: status === "blocked" ? null : "sha256:board-renewal",
        budgetHash: "sha256:budget-renewal",
        budgetScore: status === "approved" ? 100 : status === "watch" ? 72 : 34,
        burnDownPercent: status === "blocked" ? 20 : status === "watch" ? 55 : 100,
        expiryAt: status === "blocked" ? "2026-05-25T12:00:00.000Z" : "2026-06-28T12:00:00.000Z",
        forecastHash: "sha256:aging-renewal",
        id: "budget:renewal",
        kind: "exception-renewals",
        nextAction: "Keep exception budget approved.",
        status: rowStatus,
        title: "Exception renewal calendar",
      },
      {
        acceptedRisk: 0,
        boardApprovalHash: "sha256:board-quality",
        budgetHash: "sha256:budget-quality",
        budgetScore: 100,
        burnDownPercent: 100,
        expiryAt: "2026-06-28T12:00:00.000Z",
        forecastHash: "sha256:aging-quality",
        id: "budget:quality",
        kind: "evidence-quality",
        nextAction: "Keep quality budget approved.",
        status: "approved",
        title: "Evidence quality monitor",
      },
      {
        acceptedRisk: 0,
        boardApprovalHash: "sha256:board-distribution",
        budgetHash: "sha256:budget-distribution",
        budgetScore: 100,
        burnDownPercent: 100,
        expiryAt: "2026-06-28T12:00:00.000Z",
        forecastHash: "sha256:aging-distribution",
        id: "budget:distribution",
        kind: "board-distribution",
        nextAction: "Keep distribution budget approved.",
        status: "approved",
        title: "Board distribution digest",
      },
    ],
    summary: {
      approvedCount: status === "approved" ? 3 : 2,
      blockedCount: status === "blocked" ? 1 : 0,
      budgetLedgerHash: "sha256:budget-ledger",
      budgetScore: status === "approved" ? 100 : status === "watch" ? 91 : 78,
      nextAction: "Archive stewardship exception budget ledger is approved.",
      rowCount: 3,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const ready = createBoardReleaseArchiveStewardshipContinuityRehearsal({
  exceptionBudgetLedger: exceptionBudgetLedger("approved"),
  generatedAt,
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.rowCount, 3);
assert.equal(ready.summary.readyCount, 3);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.watchCount, 0);
assert.equal(ready.summary.rehearsalScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.kind),
  ["exception-renewals", "evidence-quality", "board-distribution"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-stewardship-continuity-rehearsal-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-stewardship-continuity-rehearsal-20260529.json");
assert.match(ready.csvContent, /^rehearsal_id,kind,title,status,owner_handoff_minutes,packet_recovery_minutes,governance_resume_minutes,evidence_hash/);

const blocked = createBoardReleaseArchiveStewardshipContinuityRehearsal({
  exceptionBudgetLedger: exceptionBudgetLedger("blocked"),
  generatedAt,
  rehearsalOverrides: [
    {
      evidenceHash: null,
      governanceResumeMinutes: 150,
      kind: "exception-renewals",
      ownerHandoffMinutes: 75,
      packetRecoveryMinutes: 120,
    },
  ],
  workspaceId,
});

const blockedRenewal = blocked.rows.find((row) => row.kind === "exception-renewals");
assert.equal(blocked.summary.status, "blocked");
assert.equal(blockedRenewal?.status, "blocked");
assert.match(blocked.summary.nextAction, /Recover blocked archive stewardship continuity rehearsal/);

const watch = createBoardReleaseArchiveStewardshipContinuityRehearsal({
  exceptionBudgetLedger: exceptionBudgetLedger("approved"),
  generatedAt,
  rehearsalOverrides: [
    {
      evidenceHash: "sha256:quality-rehearsal",
      governanceResumeMinutes: 75,
      kind: "evidence-quality",
      ownerHandoffMinutes: 35,
      packetRecoveryMinutes: 50,
    },
  ],
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive stewardship continuity rehearsal smoke passed");
