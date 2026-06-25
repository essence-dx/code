import assert from "node:assert/strict";
import { createBoardAssuranceAuditExport } from "@/features/projects/board-assurance-audit-export";

const generatedAt = "2026-05-17T09:00:00.000Z";

const report = createBoardAssuranceAuditExport({
  evidenceBundle: {
    bundleId: "bundle-board-1",
    files: [
      {
        contentHash: "sha256:approval",
        kind: "approval-history",
        label: "Approval history",
        path: "approval/history.json",
        recordCount: 2,
        status: "ready",
      },
      {
        contentHash: "sha256:replay",
        kind: "replay-audit",
        label: "Replay audit",
        path: "replay/audit.json",
        recordCount: 4,
        status: "blocked",
      },
    ],
    generatedAt,
    jsonContent: "{\"bundle\":true}",
    jsonFileName: "bundle.json",
    summary: {
      blockedEvidenceCount: 1,
      evidenceScore: 68,
      fileCount: 2,
      readyEvidenceCount: 1,
      replaySnapshotCount: 2,
      status: "blocked",
      totalByteSize: 1024,
      watchEvidenceCount: 0,
    },
    workspaceId: "workspace-board",
  },
  generatedAt,
  notificationHistory: {
    records: [
      {
        acknowledgedRouteCount: 1,
        contentHash: "sha256:history",
        createdAt: "2026-05-17T08:45:00.000Z",
        eligibleRouteCount: 3,
        historyId: "history-1",
        pendingAcknowledgementCount: 2,
        retryNeededCount: 1,
        status: "critical",
      },
    ],
    summary: {
      latestContentHash: "sha256:history",
      latestEligibleRouteCount: 3,
      latestRetryNeededCount: 1,
      latestSavedAt: "2026-05-17T08:45:00.000Z",
      latestStatus: "critical",
      pendingAcknowledgementCount: 2,
      totalRecordCount: 1,
    },
  },
  notificationRouting: {
    generatedAt,
    notifications: [
      {
        id: "notification-1",
        kind: "replay-blocker",
        severity: "critical",
        title: "Replay blocker",
      },
      {
        id: "notification-2",
        kind: "evidence-readiness",
        severity: "warning",
        title: "Evidence readiness",
      },
    ],
    routes: [
      {
        channel: "email",
        recipientEmail: "board@example.com",
        status: "eligible",
      },
      {
        channel: "in-app",
        recipientEmail: "owner@example.com",
        status: "eligible",
      },
    ],
    summary: {
      criticalCount: 1,
      eligibleRouteCount: 2,
      notificationCount: 2,
      routingScore: 70,
      status: "critical",
      warningCount: 1,
    },
    workspaceId: "workspace-board",
  },
  replaySnapshotHistory: {
    records: [
      {
        blockedRowCount: 2,
        contentHash: "sha256:snapshot",
        createdAt: "2026-05-17T08:30:00.000Z",
        replayScore: 72,
        rowCount: 4,
        snapshotId: "snapshot-1",
        status: "blocked",
      },
    ],
    summary: {
      blockedRowDelta: 1,
      latestContentHash: "sha256:snapshot",
      latestSavedAt: "2026-05-17T08:30:00.000Z",
      latestScore: 72,
      scoreDelta: -14,
      totalSnapshotCount: 1,
    },
  },
  varianceDashboard: {
    generatedAt,
    rows: [
      {
        delta: 2,
        id: "blocker-drift",
        label: "Blocker drift",
        status: "blocked",
      },
      {
        delta: -40,
        id: "runbook-follow-through",
        label: "Runbook follow-through",
        status: "blocked",
      },
    ],
    summary: {
      blockedCount: 2,
      status: "blocked",
      varianceScore: 35,
      watchCount: 0,
    },
    workspaceId: "workspace-board",
  },
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.auditScore, 55);
assert.equal(report.summary.sectionCount, 5);
assert.equal(report.summary.blockedSectionCount, 4);
assert.equal(report.summary.pendingAcknowledgementCount, 2);
assert.equal(report.sections[0]?.id, "reviewer-acknowledgements");
assert.match(report.sections[0]?.nextAction ?? "", /Collect reviewer acknowledgements/);
assert.match(report.jsonContent, /"schemaVersion": 1/);
assert.match(report.csvContent, /section,status,score,records,source_hash,next_action/);
assert.equal(report.jsonFileName, "workspace-board-board-assurance-audit-20260517.json");
assert.equal(report.csvFileName, "workspace-board-board-assurance-audit-20260517.csv");

console.log("board assurance audit export smoke passed");
