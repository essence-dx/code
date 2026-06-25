import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceAutomationFailureLedger } from "@/features/projects/board-release-archive-governance-automation-failure-ledger";
import { createBoardReleaseArchiveGovernanceAutomationRunbook } from "@/features/projects/board-release-archive-governance-automation-runbook";
import type { BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport } from "@/features/projects/board-release-archive-governance-automation-trigger-register";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function triggerRegister(status: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport["summary"]["status"]): BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport {
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
        cadence: "monthly",
        evidenceHash: "sha256:ownership-evidence",
        id: "ownership-renewal",
        kind: "ownership-renewal",
        nextAction: "Keep ownership renewal scheduled.",
        nextRunAt: "2026-06-29T12:00:00.000Z",
        ownerRole: "governance owner",
        status,
        title: "Ownership renewal trigger",
        triggerHash: "sha256:ownership-trigger",
      },
      {
        cadence: "biweekly",
        evidenceHash: "sha256:quorum-evidence",
        id: "quorum-refresh",
        kind: "quorum-refresh",
        nextAction: "Refresh quorum approvals.",
        nextRunAt: "2026-06-12T12:00:00.000Z",
        ownerRole: "board secretary",
        status,
        title: "Quorum refresh trigger",
        triggerHash: "sha256:quorum-trigger",
      },
      {
        cadence: "weekly",
        evidenceHash: "sha256:drift-evidence",
        id: "drift-review",
        kind: "drift-review",
        nextAction: "Review policy drift.",
        nextRunAt: "2026-06-05T12:00:00.000Z",
        ownerRole: "policy reviewer",
        status,
        title: "Policy drift review trigger",
        triggerHash: "sha256:drift-trigger",
      },
      {
        cadence: "after-trigger-change",
        evidenceHash: "sha256:packet-evidence",
        id: "executive-packet-regeneration",
        kind: "executive-packet-regeneration",
        nextAction: "Regenerate executive packet.",
        nextRunAt: "2026-05-31T12:00:00.000Z",
        ownerRole: "release governance lead",
        status,
        title: "Executive packet regeneration trigger",
        triggerHash: "sha256:packet-trigger",
      },
    ],
    summary: {
      automationScore: status === "scheduled" ? 100 : status === "due" ? 68 : 20,
      blockedCount: status === "blocked" ? 4 : 0,
      dueCount: status === "due" ? 4 : 0,
      nextAction: status === "scheduled" ? "Archive governance automation triggers are scheduled." : "Repair automation triggers.",
      registerHash: "sha256:register",
      rowCount: 4,
      scheduledCount: status === "scheduled" ? 4 : 0,
      status,
    },
    workspaceId,
  };
}

function ledgerFor(status: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport["summary"]["status"]) {
  const register = triggerRegister(status);
  const runbook = createBoardReleaseArchiveGovernanceAutomationRunbook({
    generatedAt,
    triggerRegister: register,
    workspaceId,
  });

  return createBoardReleaseArchiveGovernanceAutomationFailureLedger({
    generatedAt,
    runbook,
    triggerRegister: register,
    workspaceId,
  });
}

const ready = ledgerFor("scheduled");

assert.equal(ready.summary.status, "clear");
assert.equal(ready.summary.rowCount, 4);
assert.equal(ready.summary.clearCount, 4);
assert.equal(ready.summary.blockingCount, 0);
assert.equal(ready.summary.ledgerScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.kind),
  ["missed-trigger", "stale-recommendation", "blocked-owner", "remediation-approval"],
);
assert.equal(ready.csvFileName, "workspace-board-board-release-archive-governance-automation-failure-ledger-20260529.csv");
assert.equal(ready.jsonFileName, "workspace-board-board-release-archive-governance-automation-failure-ledger-20260529.json");
assert.match(ready.csvContent, /^failure_id,kind,title,status,owner_role,severity,evidence_hash,remediation_hash,next_action/);
assert.match(ready.summary.nextAction, /Archive governance automation failure ledger is clear/);

const monitor = ledgerFor("due");

assert.equal(monitor.summary.status, "monitor");
assert.ok(monitor.summary.monitorCount > 0);
assert.match(monitor.summary.nextAction, /Review archive governance automation failure ledger/);

const blocking = ledgerFor("blocked");

assert.equal(blocking.summary.status, "blocking");
assert.ok(blocking.summary.blockingCount > 0);
assert.match(blocking.summary.nextAction, /Approve remediation for blocked archive governance automation failures/);

console.log("board release archive governance automation failure ledger smoke passed");
