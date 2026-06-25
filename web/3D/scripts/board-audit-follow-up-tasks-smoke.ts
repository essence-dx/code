import assert from "node:assert/strict";
import { createBoardAuditFollowUpTasksReport } from "@/features/projects/board-audit-follow-up-tasks";

const generatedAt = "2026-05-17T15:00:00.000Z";

const report = createBoardAuditFollowUpTasksReport({
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
        nextAction: "Monitor exception.",
        owner: "Risk Reviewer",
        score: 62,
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
      ledgerScore: 46,
      linkedSourceCount: 2,
      nextAction: "Resolve launch decision.",
      status: "blocked",
      watchCount: 1,
    },
  },
  executiveDigest: {
    rows: [
      {
        id: "control-score",
        kind: "control-score",
        metric: "53/100 control score",
        nextAction: "Close blocked audit export sections.",
        score: 53,
        status: "blocked",
        title: "Board control score",
      },
      {
        id: "decision-risk",
        kind: "decision-risk",
        metric: "1 blocked decision",
        nextAction: "Resolve launch decision.",
        score: 45,
        status: "blocked",
        title: "Unresolved decision risk",
      },
    ],
    summary: {
      blockedDecisionCount: 1,
      digestScore: 49,
      nextAction: "Close blocked audit export sections.",
      overloadedReviewerCount: 1,
      riskCount: 4,
      staleEvidenceCount: 2,
      status: "blocked",
      unassignedTaskCount: 1,
      watchCount: 0,
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

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.taskScore, 18);
assert.equal(report.summary.taskCount, 6);
assert.equal(report.summary.criticalCount, 5);
assert.equal(report.summary.unassignedCount, 1);
assert.equal(report.tasks[0]?.id, "control:control-score");
assert.equal(report.tasks[0]?.dueAt, "2026-05-19T15:00:00.000Z");
assert.equal(report.tasks.find((task) => task.id === "workload:unassigned")?.ownerEmail, null);
assert.match(report.summary.nextAction, /Close blocked audit export sections/);
assert.match(report.csvContent, /task_id,kind,severity,status,owner,due_at,source,next_action/);
assert.equal(report.csvFileName, "workspace-board-board-audit-follow-up-tasks-20260517.csv");

console.log("board audit follow-up tasks smoke passed");
