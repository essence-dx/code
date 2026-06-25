import assert from "node:assert/strict";
import { createBoardGovernanceExecutiveDigest } from "@/features/projects/board-governance-executive-digest";

const generatedAt = "2026-05-17T14:00:00.000Z";

const digest = createBoardGovernanceExecutiveDigest({
  controlCenter: {
    rows: [
      {
        id: "closeout-report",
        label: "Closeout report",
        nextAction: "Close blocked audit export sections.",
        owner: "Board operations",
        score: 44,
        status: "blocked",
      },
      {
        id: "packet-status",
        label: "Packet status",
        nextAction: "Refresh packet.",
        owner: "Packet owner",
        score: 62,
        status: "watch",
      },
    ],
    summary: {
      blockedCount: 1,
      controlScore: 53,
      nextAction: "Close blocked audit export sections.",
      readyCount: 0,
      rowCount: 2,
      savedReviewCycleCount: 1,
      status: "blocked",
      watchCount: 1,
    },
  },
  decisionLedger: {
    decisions: [
      {
        id: "decision-1",
        nextAction: "Resolve launch decision.",
        owner: "Board Chair",
        score: 30,
        source: "agenda-decision",
        sourceHash: "sha256:decision",
        sourceId: "agenda-1",
        status: "blocked",
        title: "Launch decision",
      },
      {
        id: "decision-2",
        nextAction: "Confirm exception.",
        owner: "Risk Reviewer",
        score: 60,
        source: "exception",
        sourceHash: "sha256:exception",
        sourceId: "exception-1",
        status: "watch",
        title: "Exception review",
      },
    ],
    summary: {
      blockedCount: 1,
      decisionCount: 2,
      ledgerScore: 45,
      linkedSourceCount: 2,
      nextAction: "Resolve launch decision.",
      readyCount: 0,
      status: "blocked",
      watchCount: 1,
    },
  },
  freshnessMonitor: {
    rows: [
      {
        ageDays: 9,
        id: "packet:old",
        kind: "packet",
        nextAction: "Refresh stale board packet evidence.",
        owner: "Packet owner",
        score: 35,
        sourceHash: "sha256:packet",
        sourceId: "packet-old",
        status: "stale",
        title: "Active board packet",
      },
      {
        ageDays: 2,
        id: "ack:pending",
        kind: "acknowledgement",
        nextAction: "Collect reviewer acknowledgement.",
        owner: "Reviewer coordinator",
        score: 50,
        sourceHash: "sha256:ack",
        sourceId: "ack-1",
        status: "expired",
        title: "Reviewer acknowledgements",
      },
    ],
    summary: {
      expiredCount: 1,
      freshCount: 0,
      freshnessScore: 43,
      nextAction: "Refresh stale board packet evidence.",
      rowCount: 2,
      staleCount: 1,
      status: "blocked",
      watchCount: 0,
    },
  },
  generatedAt,
  reviewerWorkload: {
    rows: [
      {
        agendaItemCount: 2,
        exceptionSignoffCount: 1,
        nextAction: "Redistribute Board Chair workload.",
        packetReviewCount: 1,
        pendingAcknowledgementCount: 1,
        reviewerEmail: "chair@example.com",
        reviewerName: "Board Chair",
        status: "overloaded",
        tasks: [],
        workloadPoints: 13,
      },
      {
        agendaItemCount: 1,
        exceptionSignoffCount: 0,
        nextAction: "Assign unowned board review work.",
        packetReviewCount: 0,
        pendingAcknowledgementCount: 0,
        reviewerEmail: null,
        reviewerName: "Unassigned",
        status: "blocked",
        tasks: [],
        workloadPoints: 0,
      },
    ],
    summary: {
      balanceScore: 50,
      nextAction: "Redistribute Board Chair workload.",
      overloadedReviewerCount: 1,
      reviewerCount: 2,
      status: "blocked",
      totalWorkloadPoints: 13,
      unassignedTaskCount: 1,
      watchReviewerCount: 0,
    },
  },
  workspaceId: "workspace-board",
});

assert.equal(digest.summary.status, "blocked");
assert.equal(digest.summary.digestScore, 48);
assert.equal(digest.summary.riskCount, 4);
assert.equal(digest.summary.blockedDecisionCount, 1);
assert.equal(digest.summary.overloadedReviewerCount, 1);
assert.equal(digest.rows[0]?.id, "control-score");
assert.equal(digest.rows[0]?.status, "blocked");
assert.match(digest.executiveMemo, /Board governance is blocked/);
assert.match(digest.csvContent, /digest_id,kind,status,score,metric,next_action/);
assert.match(digest.jsonContent, /"schemaVersion": 1/);
assert.equal(digest.csvFileName, "workspace-board-board-governance-executive-digest-20260517.csv");
assert.equal(digest.jsonFileName, "workspace-board-board-governance-executive-digest-20260517.json");

console.log("board governance executive digest smoke passed");
