import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveGovernanceAutomationAuditTrail } from "@/features/projects/board-release-archive-governance-automation-audit-trail";
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

function auditTrailFor(status: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport["summary"]["status"]) {
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

  return createBoardReleaseArchiveGovernanceAutomationAuditTrail({
    failureLedger,
    generatedAt,
    runbook,
    triggerRegister: register,
    workspaceId,
  });
}

const verified = auditTrailFor("scheduled");

assert.equal(verified.summary.status, "verified");
assert.equal(verified.summary.rowCount, 4);
assert.equal(verified.summary.verifiedCount, 4);
assert.equal(verified.summary.blockedCount, 0);
assert.equal(verified.summary.auditScore, 100);
assert.deepEqual(
  verified.rows.map((row) => row.kind),
  ["packet-generation", "trigger-evidence-link", "operator-action", "board-acknowledgement"],
);
assert.equal(verified.csvFileName, "workspace-board-board-release-archive-governance-automation-audit-trail-20260529.csv");
assert.equal(verified.jsonFileName, "workspace-board-board-release-archive-governance-automation-audit-trail-20260529.json");
assert.match(verified.csvContent, /^audit_id,kind,title,status,actor_role,evidence_hash,action_hash,acknowledgement_hash,next_action/);
assert.match(verified.summary.nextAction, /Archive governance automation audit trail is verified/);

const review = auditTrailFor("due");

assert.equal(review.summary.status, "review");
assert.ok(review.summary.reviewCount > 0);
assert.match(review.summary.nextAction, /Review archive governance automation audit trail/);

const blocked = auditTrailFor("blocked");

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Repair blocked archive governance automation audit trail/);

console.log("board release archive governance automation audit trail smoke passed");
