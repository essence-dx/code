import { strict as assert } from "node:assert";
import {
  createBoardDecisionReplaySnapshotHistoryReport,
  createBoardDecisionReplaySnapshotRecord,
  getBoardDecisionReplaySnapshotDownload,
} from "@/features/projects/board-decision-replay-snapshots";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";

const blockedReport: BoardDecisionReplayAuditReport = {
  csvContent: "approval_id,packet_id,recipient_purpose,kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,approval_id",
  csvFileName: "workspace-board-decision-replay-audit.csv",
  generatedAt: "2026-01-15T12:00:00.000Z",
  rows: [
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-01T10:00:00.000Z",
      baselineValue: "92/100 approval, 0 blockers",
      currentValue: "68/100 risk score, 3 blockers",
      delta: 3,
      detail: "Release evidence drift introduced blockers.",
      id: "evidence-drift:approval-1",
      kind: "release-evidence-drift",
      nextAction: "Re-open board approval before release.",
      occurredAt: "2026-01-15T12:00:00.000Z",
      packetId: "packet-approval-1",
      recipientPurpose: "board approval",
      status: "blocked",
      title: "Release evidence drift",
    },
  ],
  summary: {
    activeApprovalCount: 1,
    blockedRowCount: 1,
    latestApprovalAt: "2026-01-01T10:00:00.000Z",
    laterIncidentCount: 1,
    nextAction: "Re-open board approval before release.",
    readyApprovalCount: 1,
    releaseEvidenceDriftCount: 1,
    replayScore: 71,
    rowCount: 1,
    runbookBlockedCount: 1,
    runbookIncompleteCount: 1,
    status: "blocked",
    watchRowCount: 0,
  },
  workspaceId: "workspace-1",
};

const readyReport: BoardDecisionReplayAuditReport = {
  ...blockedReport,
  generatedAt: "2026-01-20T12:00:00.000Z",
  rows: [
    {
      ...blockedReport.rows[0],
      currentValue: "No later incident",
      delta: 0,
      id: "incident:none:approval-1",
      kind: "incident",
      nextAction: "Archive this replay audit with the signed approval packet.",
      status: "ready",
      title: "No later incidents",
    },
  ],
  summary: {
    ...blockedReport.summary,
    blockedRowCount: 0,
    laterIncidentCount: 0,
    nextAction: "Archive this replay audit with the signed approval packet.",
    releaseEvidenceDriftCount: 0,
    replayScore: 96,
    runbookBlockedCount: 0,
    runbookIncompleteCount: 0,
    status: "ready",
  },
};

const actor = {
  email: "board@example.com",
  name: "Board Secretary",
  userId: "user-board",
};

const older = createBoardDecisionReplaySnapshotRecord({
  actor,
  createdAt: "2026-01-15T12:30:00.000Z",
  id: "snapshot-old",
  report: blockedReport,
  workspaceId: "workspace-1",
});
const newer = createBoardDecisionReplaySnapshotRecord({
  actor,
  createdAt: "2026-01-20T12:30:00.000Z",
  id: "snapshot-new",
  report: readyReport,
  workspaceId: "workspace-1",
});
const history = createBoardDecisionReplaySnapshotHistoryReport([older, newer]);
const jsonDownload = getBoardDecisionReplaySnapshotDownload(newer, "json");
const csvDownload = getBoardDecisionReplaySnapshotDownload(newer, "csv");

assert.equal(newer.replayScore, 96);
assert.equal(newer.status, "ready");
assert.match(newer.contentHash, /^sha256:/);
assert.ok(newer.jsonByteSize > 100);
assert.ok(newer.csvByteSize > 40);
assert.equal(history.records[0]?.id, "snapshot-new");
assert.equal(history.summary.totalSnapshotCount, 2);
assert.equal(history.summary.latestScore, 96);
assert.equal(history.summary.previousScore, 71);
assert.equal(history.summary.scoreDelta, 25);
assert.equal(history.summary.blockedRowDelta, -1);
assert.equal(history.summary.statusTrend, "improving");
assert.equal(history.trends.find((row) => row.metric === "Replay score")?.direction, "improving");
assert.equal(history.trends.find((row) => row.metric === "Blocked replay rows")?.direction, "improving");
assert.match(history.csvContent, /created_at,status,replay_score,blocked_rows,watch_rows,later_incidents,runbook_blocked,next_action/);
assert.match(history.csvDataUri, /^data:text\/csv/);
assert.equal(jsonDownload.mimeType, "application/json;charset=utf-8");
assert.equal(csvDownload.mimeType, "text/csv;charset=utf-8");
assert.match(jsonDownload.body, /"replayScore": 96/);
assert.match(csvDownload.body, /Release evidence drift/);

console.log("board decision replay snapshots smoke passed");
