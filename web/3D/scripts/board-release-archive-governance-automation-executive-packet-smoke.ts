import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceAutomationAuditTrail } from "@/features/projects/board-release-archive-governance-automation-audit-trail";
import { createBoardReleaseArchiveGovernanceAutomationExecutivePacket } from "@/features/projects/board-release-archive-governance-automation-executive-packet";
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

function executivePacketFor(status: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport["summary"]["status"]) {
  const register = triggerRegister(status);
  const runbook = createBoardReleaseArchiveGovernanceAutomationRunbook({
    generatedAt,
    triggerRegister: register,
    workspaceId,
  });
  const failureLedger = createBoardReleaseArchiveGovernanceAutomationFailureLedger({
    generatedAt,
    runbook,
    triggerRegister: register,
    workspaceId,
  });
  const auditTrail = createBoardReleaseArchiveGovernanceAutomationAuditTrail({
    failureLedger,
    generatedAt,
    runbook,
    triggerRegister: register,
    workspaceId,
  });

  return createBoardReleaseArchiveGovernanceAutomationExecutivePacket({
    auditTrail,
    failureLedger,
    generatedAt,
    runbook,
    triggerRegister: register,
    workspaceId,
  });
}

const approved = executivePacketFor("scheduled");

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 5);
assert.equal(approved.summary.approvedCount, 5);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.packetScore, 100);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["trigger-register", "runbook", "failure-ledger", "audit-trail", "release-recommendation"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-governance-automation-executive-packet-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-governance-automation-executive-packet-20260529.json");
assert.match(approved.csvContent, /^packet_id,kind,title,status,owner_role,evidence_hash,packet_hash,recommendation,next_action/);
assert.match(approved.summary.nextAction, /Archive governance automation executive packet is approved/);

const review = executivePacketFor("due");

assert.equal(review.summary.status, "review");
assert.ok(review.summary.reviewCount > 0);
assert.match(review.summary.nextAction, /Review archive governance automation executive packet/);

const blocked = executivePacketFor("blocked");

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Block release until archive governance automation executive packet is repaired/);

console.log("board release archive governance automation executive packet smoke passed");
