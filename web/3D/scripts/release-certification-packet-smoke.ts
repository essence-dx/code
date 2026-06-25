import { strict as assert } from "node:assert";

import type { ReleaseCertificationExceptionLedger } from "@/features/projects/release-certification-exception-ledger";
import type { ReleaseCertificationIntakeChecklist } from "@/features/projects/release-certification-intake-checklist";
import type { ReleaseContinuityArchiveManifest } from "@/features/projects/release-continuity-archive-manifest";
import type { ReleaseContinuityDashboardPacket } from "@/features/projects/release-continuity-dashboard-packet";
import { createReleaseCertificationPacket } from "@/features/projects/release-certification-packet";

const generatedAt = "2026-05-23T11:00:00.000Z";
const releaseCandidateId = "native-1.9.0-certification";
const workspaceId = "Essence Runtime";

const intakeChecklist = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    blockerRouteCount: 0,
    certificationDecision: "start",
    checklistHash: "sha256:intake-checklist",
    intakeScore: 100,
    nextAction: "Release certification intake checklist is ready.",
    readyCount: 4,
    reviewCount: 0,
    rowCount: 4,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseCertificationIntakeChecklist;

const exceptionLedger = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    approvedCount: 2,
    blockedCount: 0,
    blockingCount: 0,
    certificationBlocked: false,
    expiredCount: 0,
    ledgerHash: "sha256:exception-ledger",
    ledgerScore: 100,
    missingApprovalCount: 0,
    missingRemediationCount: 0,
    missingSignoffCount: 0,
    nextAction: "Release certification exception ledger is ready.",
    readyCount: 2,
    reviewCount: 0,
    rowCount: 2,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseCertificationExceptionLedger;

const archiveManifest = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    archiveScore: 100,
    blockedCount: 0,
    manifestHash: "sha256:archive-manifest",
    nextAction: "Release continuity archive manifest is ready.",
    readyCount: 3,
    restorationReadyCount: 3,
    retentionReadyCount: 3,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
    storageReadyCount: 3,
  },
  workspaceId,
} as unknown as ReleaseContinuityArchiveManifest;

const continuityDashboard = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    blockerRouteCount: 0,
    blockedCount: 0,
    dashboardHash: "sha256:continuity-dashboard",
    dashboardScore: 100,
    goNoGoDecision: "go",
    nextAction: "Release continuity dashboard packet is ready.",
    operatorReady: true,
    ownerAcknowledged: true,
    readyCount: 3,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseContinuityDashboardPacket;

const packet = createReleaseCertificationPacket({
  archiveManifest,
  continuityDashboard,
  exceptionLedger,
  generatedAt,
  intakeChecklist,
  operatorOwner: "Certification Lead",
  releaseCandidateId,
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.goNoGoDecision, "go");
assert.equal(packet.summary.certificationScore, 100);
assert.equal(packet.summary.operatorReady, true);
assert.equal(packet.summary.readyCount, 4);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.blockerRouteCount, 0);
assert.ok(packet.summary.packetHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.area),
  [
    "intake-readiness",
    "exception-posture",
    "archive-custody",
    "continuity-status",
  ],
);
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.ok(packet.rows.every((row) => row.certificationReady));
assert.match(
  packet.csvContent,
  /^area,status,score,evidence_linked,certification_ready,blocker_route,evidence_hash,packet_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("Certification Lead"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-release-certification-packet-native-1-9-0-certification-20260523.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-release-certification-packet-native-1-9-0-certification-20260523.json",
);
assert.equal(packet.files.length, 2);

const blocked = createReleaseCertificationPacket({
  archiveManifest,
  continuityDashboard,
  exceptionLedger: {
    ...exceptionLedger,
    summary: {
      ...exceptionLedger.summary,
      blockedCount: 1,
      blockingCount: 1,
      certificationBlocked: true,
      ledgerHash: "sha256:blocked-exception-ledger",
      ledgerScore: 40,
      status: "blocked",
    },
  },
  intakeChecklist,
  operatorOwner: "",
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.goNoGoDecision, "no-go");
assert.equal(blocked.summary.operatorReady, false);
assert.ok(blocked.summary.certificationScore < 70);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.summary.blockerRouteCount, 2);
assert.equal(
  blocked.rows.find((row) => row.area === "exception-posture")?.blockerRoute,
  "release-certification-exception-ledger",
);
assert.equal(
  blocked.rows.find((row) => row.area === "intake-readiness")
    ?.certificationReady,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release certification packet/,
);

console.log("release certification packet smoke passed");
