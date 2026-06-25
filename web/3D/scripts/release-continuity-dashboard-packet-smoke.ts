import { strict as assert } from "node:assert";

import type { ReleaseContinuityEvidenceIndex } from "@/features/projects/release-continuity-evidence-index";
import type { ReleaseContinuityRegressionMonitor } from "@/features/projects/release-continuity-regression-monitor";
import { createReleaseContinuityDashboardPacket } from "@/features/projects/release-continuity-dashboard-packet";

const generatedAt = "2026-05-22T10:00:00.000Z";
const releaseCandidateId = "native-1.8.0-continuity";
const workspaceId = "Essence Runtime";

const evidenceIndex = {
  csvFileName:
    "essence-runtime-release-continuity-evidence-index-native-1-8-0-continuity-20260522.csv",
  generatedAt,
  jsonFileName:
    "essence-runtime-release-continuity-evidence-index-native-1-8-0-continuity-20260522.json",
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    continuityScore: 100,
    indexHash: "sha256:continuity-index",
    missingEvidenceCount: 0,
    nextAction: "Release continuity evidence index is ready.",
    readyCount: 4,
    reviewCount: 0,
    rowCount: 4,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseContinuityEvidenceIndex;

const regressionMonitor = {
  acceptedAt: "2026-05-21T10:00:00.000Z",
  acceptedReleaseCandidateId: "native-1.7.0-custody",
  csvFileName:
    "essence-runtime-release-continuity-regression-monitor-native-1-8-0-continuity-20260522.csv",
  generatedAt,
  jsonFileName:
    "essence-runtime-release-continuity-regression-monitor-native-1-8-0-continuity-20260522.json",
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    hashChangeCount: 0,
    missingEvidenceCount: 0,
    monitorHash: "sha256:regression-monitor",
    nextAction: "Release continuity regression monitor is ready.",
    readyCount: 4,
    regressionScore: 100,
    reviewCount: 0,
    rowCount: 4,
    scoreDropCount: 0,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseContinuityRegressionMonitor;

const packet = createReleaseContinuityDashboardPacket({
  evidenceIndex,
  generatedAt,
  operatorOwner: "Release Manager",
  ownerAcknowledged: true,
  regressionMonitor,
  releaseCandidateId,
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.goNoGoDecision, "go");
assert.equal(packet.summary.dashboardScore, 100);
assert.equal(packet.summary.ownerAcknowledged, true);
assert.equal(packet.summary.blockerRouteCount, 0);
assert.equal(packet.summary.readyCount, 3);
assert.ok(packet.summary.dashboardHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.area),
  ["continuity-readiness", "owner-acknowledgement", "blocker-routing"],
);
assert.ok(packet.rows.every((row) => row.releaseApprovalReady));
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.equal(
  packet.rows.find((row) => row.area === "owner-acknowledgement")
    ?.ownerAcknowledged,
  true,
);
assert.match(
  packet.csvContent,
  /^area,status,score,evidence_linked,owner_acknowledged,release_approval_ready,blocker_route,dashboard_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("Release Manager"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-release-continuity-dashboard-packet-native-1-8-0-continuity-20260522.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-release-continuity-dashboard-packet-native-1-8-0-continuity-20260522.json",
);
assert.equal(packet.files.length, 2);

const blocked = createReleaseContinuityDashboardPacket({
  evidenceIndex: {
    ...evidenceIndex,
    summary: {
      ...evidenceIndex.summary,
      blockedCount: 1,
      continuityScore: 55,
      missingEvidenceCount: 1,
      status: "blocked",
    },
  },
  operatorOwner: "",
  ownerAcknowledged: false,
  regressionMonitor: {
    ...regressionMonitor,
    summary: {
      ...regressionMonitor.summary,
      blockedCount: 1,
      hashChangeCount: 1,
      monitorHash: "sha256:changed-regression-monitor",
      regressionScore: 58,
      status: "blocked",
    },
  },
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.goNoGoDecision, "no-go");
assert.ok(blocked.summary.dashboardScore < 70);
assert.equal(blocked.summary.ownerAcknowledged, false);
assert.ok(blocked.summary.blockerRouteCount >= 2);
assert.equal(
  blocked.rows.find((row) => row.area === "owner-acknowledgement")
    ?.releaseApprovalReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "blocker-routing")?.blockerRoute,
  "release-continuity-war-room",
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release continuity dashboard packet/,
);

console.log("release continuity dashboard packet smoke passed");
