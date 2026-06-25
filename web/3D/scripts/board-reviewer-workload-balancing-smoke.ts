import assert from "node:assert/strict";
import { createBoardReviewerWorkloadBalancingReport } from "@/features/projects/board-reviewer-workload-balancing";

const generatedAt = "2026-05-17T13:00:00.000Z";

const report = createBoardReviewerWorkloadBalancingReport({
  agenda: {
    items: [
      {
        durationMinutes: 16,
        id: "agenda-1",
        kind: "decision",
        nextAction: "Review launch sign-off.",
        ownerEmail: "chair@example.com",
        ownerName: "Board Chair",
        status: "blocked",
        topic: "Launch sign-off",
      },
      {
        durationMinutes: 10,
        id: "agenda-2",
        kind: "risk-review",
        nextAction: "Review incident risk.",
        ownerEmail: "chair@example.com",
        ownerName: "Board Chair",
        status: "watch",
        topic: "Incident risk",
      },
      {
        durationMinutes: 8,
        id: "agenda-3",
        kind: "owner-action",
        nextAction: "Assign remediation owner.",
        ownerEmail: null,
        ownerName: "Unassigned",
        status: "blocked",
        topic: "Unowned remediation",
      },
    ],
  },
  exceptionWorkflow: {
    rows: [
      {
        id: "exception-1",
        nextAction: "Collect exception sign-off.",
        requestedBy: "chair@example.com",
        signedOffBy: null,
        status: "pending",
        title: "Replay exception",
      },
      {
        id: "exception-2",
        nextAction: "Refresh rejected exception.",
        requestedBy: "risk@example.com",
        signedOffBy: "risk@example.com",
        status: "rejected",
        title: "Expired exception",
      },
    ],
  },
  generatedAt,
  notificationHistory: {
    records: [
      {
        createdAt: generatedAt,
        historyId: "notification-history-1",
        pendingAcknowledgementCount: 2,
        routes: [
          {
            acknowledgementState: "pending",
            route: {
              channel: "in-app",
              recipientEmail: "chair@example.com",
              recipientName: "Board Chair",
              status: "eligible",
            },
          },
          {
            acknowledgementState: "pending",
            route: {
              channel: "in-app",
              recipientEmail: "risk@example.com",
              recipientName: "Risk Reviewer",
              status: "eligible",
            },
          },
        ],
      },
    ],
  },
  packetHistory: {
    records: [
      {
        approvalStatus: "blocked",
        blockedSignOffCount: 2,
        createdBy: {
          email: "chair@example.com",
          name: "Board Chair",
        },
        packetId: "packet-1",
        recipientEmail: "chair@example.com",
        recipientName: "Board Chair",
        recipientPurpose: "Launch packet review",
        status: "active",
      },
      {
        approvalStatus: "watch",
        blockedSignOffCount: 0,
        createdBy: {
          email: "risk@example.com",
          name: "Risk Reviewer",
        },
        packetId: "packet-2",
        recipientEmail: "risk@example.com",
        recipientName: "Risk Reviewer",
        recipientPurpose: "Risk packet review",
        status: "active",
      },
    ],
  },
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.balanceScore, 50);
assert.equal(report.summary.reviewerCount, 3);
assert.equal(report.summary.overloadedReviewerCount, 1);
assert.equal(report.summary.unassignedTaskCount, 1);
assert.equal(report.summary.totalWorkloadPoints, 19);
assert.equal(report.rows[0]?.reviewerEmail, "chair@example.com");
assert.equal(report.rows[0]?.workloadPoints, 13);
assert.equal(report.rows.find((row) => row.reviewerEmail === null)?.status, "blocked");
assert.match(report.summary.nextAction, /Redistribute Board Chair/);
assert.match(report.csvContent, /reviewer,status,workload_points,agenda_items,packet_reviews,pending_acknowledgements,exception_signoffs,next_action/);
assert.equal(report.csvFileName, "workspace-board-board-reviewer-workload-20260517.csv");

console.log("board reviewer workload balancing smoke passed");
