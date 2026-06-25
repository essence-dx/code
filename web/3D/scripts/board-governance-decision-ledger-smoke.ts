import assert from "node:assert/strict";
import { createBoardGovernanceDecisionLedger } from "@/features/projects/board-governance-decision-ledger";

const generatedAt = "2026-05-17T12:00:00.000Z";

const ledger = createBoardGovernanceDecisionLedger({
  agenda: {
    items: [
      {
        decisionPrompt: "Approve public launch path?",
        dueAt: "2026-05-18T12:00:00.000Z",
        evidence: "Scenario recommendation asks for board decision.",
        id: "agenda-decision-1",
        kind: "decision",
        nextAction: "Resolve launch approval before closeout.",
        ownerName: "Board chair",
        sourceId: "packet-1",
        sourceLabel: "Approval packet",
        status: "blocked",
        topic: "Approve public launch",
      },
      {
        decisionPrompt: "Accept remediation watch?",
        dueAt: null,
        evidence: "Incident recurrence is under watch.",
        id: "agenda-risk-1",
        kind: "risk-review",
        nextAction: "Review remediation evidence.",
        ownerName: "Risk owner",
        sourceId: "incident-1",
        sourceLabel: "Incident recurrence",
        status: "watch",
        topic: "Review incident recurrence",
      },
    ],
    summary: {
      blockedItemCount: 1,
      readyItemCount: 0,
      status: "blocked",
      totalItemCount: 2,
      watchItemCount: 1,
    },
  },
  auditExport: {
    auditId: "audit-board-1",
    sections: [
      {
        id: "reviewer-acknowledgements",
        label: "Reviewer acknowledgements",
        nextAction: "Collect reviewer acknowledgements.",
        score: 30,
        sourceHash: "sha256:ack",
        status: "blocked",
      },
    ],
    summary: {
      auditScore: 55,
      blockedSectionCount: 1,
      status: "blocked",
      watchSectionCount: 0,
    },
  },
  controlCenter: {
    rows: [
      {
        id: "closeout-report",
        label: "Closeout report",
        nextAction: "Close blocked audit export sections and forecast risks.",
        owner: "Board operations",
        score: 41,
        status: "blocked",
      },
    ],
    summary: {
      blockedCount: 1,
      controlScore: 54,
      status: "blocked",
      watchCount: 0,
    },
  },
  exceptionWorkflow: {
    rows: [
      {
        approverSignoff: "changes-requested",
        evidence: "Exception expires before closeout.",
        expiresAt: "2026-05-19T12:00:00.000Z",
        id: "exception-1",
        nextAction: "Refresh exception approval.",
        scopeId: "blocker-1",
        signedOffBy: "board@example.com",
        status: "release-gate-blocked",
        title: "Replay blocker exception",
      },
    ],
    summary: {
      approvedCount: 0,
      releaseGateBlockedCount: 1,
      status: "release-gate-blocked",
      totalCount: 1,
      workflowScore: 35,
    },
  },
  generatedAt,
  packetHistory: {
    records: [
      {
        approvalScore: 64,
        approvalStatus: "blocked",
        blockedSignOffCount: 2,
        contentHash: "sha256:packet",
        createdAt: "2026-05-17T09:00:00.000Z",
        packetId: "packet-1",
        recipientPurpose: "May board closeout",
        status: "active",
      },
    ],
    summary: {
      activeCount: 1,
      blockedPacketCount: 1,
      totalCount: 1,
    },
  },
  workspaceId: "workspace-board",
});

assert.equal(ledger.summary.status, "blocked");
assert.equal(ledger.summary.ledgerScore, 32);
assert.equal(ledger.summary.decisionCount, 5);
assert.equal(ledger.summary.blockedCount, 5);
assert.equal(ledger.summary.linkedSourceCount, 5);
assert.equal(ledger.decisions[0]?.id, "closeout:closeout-report");
assert.equal(ledger.decisions.find((decision) => decision.id === "packet:packet-1")?.source, "packet-approval");
assert.equal(ledger.decisions.find((decision) => decision.id === "exception:exception-1")?.status, "blocked");
assert.match(ledger.summary.nextAction, /Close blocked audit export sections/);
assert.match(ledger.csvContent, /decision_id,source,status,owner,source_hash,next_action/);
assert.equal(ledger.csvFileName, "workspace-board-board-governance-decision-ledger-20260517.csv");

console.log("board governance decision ledger smoke passed");
