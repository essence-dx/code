import assert from "node:assert/strict";
import {
  createBoardEvidenceReadinessSnapshotHistoryReport,
  createBoardEvidenceReadinessSnapshotRecord,
  getBoardEvidenceReadinessSnapshotDownload,
} from "@/features/projects/board-evidence-readiness-snapshots";
import type { BoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";

function digest(score: number, riskCount: number, generatedAt: string): BoardAuditEvidenceReadinessDigest {
  return {
    csvContent: "task_id,status,owner,readiness_score,risk_level,recommendation\n",
    csvDataUri: "data:text/csv;charset=utf-8,task_id",
    csvFileName: "readiness.csv",
    generatedAt,
    jsonContent: "{}",
    jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
    jsonFileName: "readiness.json",
    recommendations: Array.from({ length: riskCount }, (_, index) => ({
      ownerName: `Owner ${index + 1}`,
      recommendation: `Resolve risk ${index + 1}.`,
      taskId: `task-${index + 1}`,
      title: `Risk ${index + 1}`,
    })),
    risks: Array.from({ length: riskCount }, (_, index) => ({
      nextAction: `Resolve risk ${index + 1}.`,
      ownerName: `Owner ${index + 1}`,
      readinessScore: score - index,
      riskLevel: index === 0 ? "critical" : "high",
      status: "blocked",
      taskId: `task-${index + 1}`,
      title: `Risk ${index + 1}`,
    })),
    summary: {
      carryForwardCount: riskCount,
      nextAction: riskCount > 0 ? "Resolve readiness blockers." : "Ready for closeout.",
      readinessScore: score,
      scoreDelta: 0,
      status: riskCount > 0 ? "blocked" : "ready",
      taskCount: 2,
      trendPointCount: 2,
      unresolvedAttachmentRiskCount: riskCount,
    },
    trend: [
      {
        generatedAt: "2026-05-19T10:00:00.000Z",
        readinessScore: score - 10,
      },
      {
        generatedAt,
        readinessScore: score,
      },
    ],
    workspaceId: "workspace-board",
  };
}

const current = createBoardEvidenceReadinessSnapshotRecord({
  actor: {
    email: "chair@example.com",
    name: "Board Chair",
    userId: "user-chair",
  },
  createdAt: "2026-05-20T11:00:00.000Z",
  digest: digest(72, 1, "2026-05-20T10:00:00.000Z"),
  id: "snapshot-current",
  workspaceId: "workspace-board",
});

const previous = createBoardEvidenceReadinessSnapshotRecord({
  actor: {
    email: "ops@example.com",
    name: "Ops Lead",
    userId: "user-ops",
  },
  createdAt: "2026-05-19T11:00:00.000Z",
  digest: digest(58, 2, "2026-05-19T10:00:00.000Z"),
  id: "snapshot-previous",
  workspaceId: "workspace-board",
});

const history = createBoardEvidenceReadinessSnapshotHistoryReport([previous, current]);
const jsonDownload = getBoardEvidenceReadinessSnapshotDownload(current, "json");
const csvDownload = getBoardEvidenceReadinessSnapshotDownload(current, "csv");

assert.equal(current.snapshotId, "board-evidence-readiness-workspace-board-20260520");
assert.match(current.contentHash, /^sha256:/);
assert.equal(current.actor.name, "Board Chair");
assert.equal(current.readinessScore, 72);
assert.equal(current.unresolvedAttachmentRiskCount, 1);
assert.equal(history.summary.totalSnapshotCount, 2);
assert.equal(history.summary.actorCount, 2);
assert.equal(history.summary.latestScore, 72);
assert.equal(history.summary.previousScore, 58);
assert.equal(history.summary.scoreDelta, 14);
assert.equal(history.summary.riskDelta, -1);
assert.equal(history.summary.statusTrend, "improving");
assert.equal(history.records[0]?.id, "snapshot-current");
assert.equal(history.trends.find((row) => row.metric === "Readiness score")?.delta, 14);
assert.match(history.csvContent, /created_at,status,readiness_score,attachment_risks,carry_forward,next_action/);
assert.match(jsonDownload.body, /"contentHash"/);
assert.match(csvDownload.body, /Readiness score/);
assert.equal(jsonDownload.fileName, "essence-spline-board-evidence-readiness-20260520.json");
assert.equal(csvDownload.fileName, "essence-spline-board-evidence-readiness-20260520.csv");

console.log("board evidence readiness snapshots smoke passed");
