import { strict as assert } from "node:assert";

import type {
  ReleaseContinuityEvidenceIndex,
  ReleaseContinuityEvidenceIndexRow,
} from "@/features/projects/release-continuity-evidence-index";
import { createReleaseContinuityRegressionMonitor } from "@/features/projects/release-continuity-regression-monitor";

const generatedAt = "2026-05-22T09:15:00.000Z";
const releaseCandidateId = "native-1.8.0-continuity";
const workspaceId = "Essence Runtime";

function row(
  source: ReleaseContinuityEvidenceIndexRow["source"],
  evidenceHash: string,
  score = 100,
): ReleaseContinuityEvidenceIndexRow {
  return {
    evidenceHash,
    evidenceLinked: evidenceHash.startsWith("sha256:"),
    indexHash: `sha256:${source}-index`,
    nextAction: `Release continuity evidence index is searchable for ${source}.`,
    packetFileNames: [`${source}.csv`, `${source}.json`],
    score,
    searchable: evidenceHash.startsWith("sha256:"),
    searchText: `${source} ${releaseCandidateId} ${evidenceHash}`,
    source,
    status: score >= 90 && evidenceHash.startsWith("sha256:") ? "ready" : "blocked",
  };
}

const currentIndex = {
  csvFileName:
    "essence-runtime-release-continuity-evidence-index-native-1-8-0-continuity-20260522.csv",
  files: [],
  generatedAt,
  jsonFileName:
    "essence-runtime-release-continuity-evidence-index-native-1-8-0-continuity-20260522.json",
  releaseCandidateId,
  rows: [
    row("custody-approval", "sha256:custody-approval"),
    row("attachment-approval", "sha256:attachment-approval"),
    row("evidence-drill", "sha256:drill-packet"),
    row("external-runtime-reality", "sha256:external-reality"),
  ],
  summary: {
    blockedCount: 0,
    continuityScore: 100,
    indexHash: "sha256:current-index",
    missingEvidenceCount: 0,
    nextAction: "Release continuity evidence index is ready.",
    readyCount: 4,
    reviewCount: 0,
    rowCount: 4,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseContinuityEvidenceIndex;

const acceptedBaseline = {
  acceptedAt: "2026-05-21T09:15:00.000Z",
  releaseCandidateId: "native-1.7.0-custody",
  rows: currentIndex.rows.map((entry) => ({
    evidenceHash: entry.evidenceHash,
    score: entry.score,
    source: entry.source,
  })),
};

const monitor = createReleaseContinuityRegressionMonitor({
  acceptedBaseline,
  currentIndex,
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(monitor.summary.status, "ready");
assert.equal(monitor.summary.regressionScore, 100);
assert.equal(monitor.summary.readyCount, 4);
assert.equal(monitor.summary.blockedCount, 0);
assert.equal(monitor.summary.missingEvidenceCount, 0);
assert.equal(monitor.summary.scoreDropCount, 0);
assert.equal(monitor.summary.hashChangeCount, 0);
assert.ok(monitor.summary.monitorHash.startsWith("sha256:"));
assert.deepEqual(
  monitor.rows.map((entry) => entry.source),
  [
    "custody-approval",
    "attachment-approval",
    "evidence-drill",
    "external-runtime-reality",
  ],
);
assert.ok(monitor.rows.every((entry) => !entry.missingEvidence));
assert.ok(monitor.rows.every((entry) => !entry.scoreDropped));
assert.ok(monitor.rows.every((entry) => !entry.hashChanged));
assert.match(
  monitor.csvContent,
  /^source,status,current_score,accepted_score,score_delta,missing_evidence,score_dropped,hash_changed,monitor_hash,next_action/,
);
assert.ok(monitor.jsonContent.includes("native-1.7.0-custody"));
assert.equal(
  monitor.csvFileName,
  "essence-runtime-release-continuity-regression-monitor-native-1-8-0-continuity-20260522.csv",
);
assert.equal(
  monitor.jsonFileName,
  "essence-runtime-release-continuity-regression-monitor-native-1-8-0-continuity-20260522.json",
);
assert.equal(monitor.files.length, 2);

const regressedIndex = {
  ...currentIndex,
  rows: [
    row("custody-approval", "sha256:custody-approval"),
    row("attachment-approval", "", 0),
    row("evidence-drill", "sha256:changed-drill-packet", 72),
    row("external-runtime-reality", "sha256:external-reality", 88),
  ],
  summary: {
    ...currentIndex.summary,
    continuityScore: 65,
    indexHash: "sha256:regressed-index",
    status: "blocked",
  },
} as unknown as ReleaseContinuityEvidenceIndex;

const blocked = createReleaseContinuityRegressionMonitor({
  acceptedBaseline,
  currentIndex: regressedIndex,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.regressionScore < 70);
assert.equal(blocked.summary.missingEvidenceCount, 1);
assert.equal(blocked.summary.scoreDropCount, 2);
assert.equal(blocked.summary.hashChangeCount, 2);
assert.equal(
  blocked.rows.find((entry) => entry.source === "attachment-approval")
    ?.missingEvidence,
  true,
);
assert.equal(
  blocked.rows.find((entry) => entry.source === "evidence-drill")?.hashChanged,
  true,
);
assert.equal(
  blocked.rows.find((entry) => entry.source === "external-runtime-reality")
    ?.scoreDropped,
  true,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release continuity regression monitor/,
);

console.log("release continuity regression monitor smoke passed");
