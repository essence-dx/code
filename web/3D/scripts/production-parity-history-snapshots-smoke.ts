import { strict as assert } from "node:assert";
import { createProductionParityHistorySnapshots, type LiveProductionParityEvidenceDashboardReport } from "@/features/projects/live-production-parity-evidence-dashboard";

function report(input: {
  blockedCount: number;
  generatedAt: string;
  parityHash: string;
  parityScore: number;
  readyCount: number;
  reviewCount: number;
  status: LiveProductionParityEvidenceDashboardReport["summary"]["status"];
}): LiveProductionParityEvidenceDashboardReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt: input.generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: input.blockedCount,
      nextAction: "production parity action",
      parityHash: input.parityHash,
      parityScore: input.parityScore,
      readyCount: input.readyCount,
      reviewCount: input.reviewCount,
      rowCount: input.readyCount + input.reviewCount + input.blockedCount,
      status: input.status,
    },
    workspaceId: "Workspace Native Runtime",
  };
}

const first = report({
  blockedCount: 2,
  generatedAt: "2026-05-30T12:00:00.000Z",
  parityHash: "sha256:first",
  parityScore: 58,
  readyCount: 3,
  reviewCount: 2,
  status: "blocked",
});

const second = report({
  blockedCount: 1,
  generatedAt: "2026-05-31T12:00:00.000Z",
  parityHash: "sha256:second",
  parityScore: 76,
  readyCount: 5,
  reviewCount: 1,
  status: "review",
});

const current = report({
  blockedCount: 0,
  generatedAt: "2026-06-01T12:00:00.000Z",
  parityHash: "sha256:current",
  parityScore: 100,
  readyCount: 7,
  reviewCount: 0,
  status: "ready",
});

const laterRegression = report({
  blockedCount: 1,
  generatedAt: "2026-06-02T12:00:00.000Z",
  parityHash: "sha256:later-regression",
  parityScore: 72,
  readyCount: 5,
  reviewCount: 1,
  status: "review",
});

const history = createProductionParityHistorySnapshots({
  current,
  previous: [second, first],
});

assert.equal(history.summary.snapshotCount, 3);
assert.equal(history.summary.latestScore, 100);
assert.equal(history.summary.scoreDelta, 42);
assert.equal(history.summary.blockedDelta, -2);
assert.equal(history.summary.trend, "improved");
assert.equal(history.records[0]?.scoreDelta, 0);
assert.equal(history.records[1]?.scoreDelta, 18);
assert.equal(history.records[2]?.scoreDelta, 24);
assert.equal(history.records[2]?.statusChanged, true);
assert.match(history.records[2]?.driftSummary ?? "", /improved by 24 points/);
assert.match(history.csvContent, /^snapshot_id,generated_at,status,parity_score,score_delta,blocked_delta,trend,snapshot_hash/);
assert.match(history.jsonContent, /"historyHash"/);
assert.equal(history.csvFileName, "workspace-native-runtime-production-parity-history-20260601.csv");
assert.equal(history.jsonFileName, "workspace-native-runtime-production-parity-history-20260601.json");

const regressed = createProductionParityHistorySnapshots({
  current: laterRegression,
  previous: [current],
});

assert.equal(regressed.summary.trend, "regressed");
assert.ok(regressed.summary.blockedDelta > 0);
assert.match(regressed.summary.nextAction, /Investigate production parity regression/);

console.log("production parity history snapshots smoke passed");
