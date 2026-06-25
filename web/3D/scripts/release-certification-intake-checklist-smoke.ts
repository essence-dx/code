import { strict as assert } from "node:assert";

import type { ExternalRuntimeRealityPacket } from "@/features/projects/external-runtime-reality-packet";
import type { NativeReleaseCustodyApprovalPacket } from "@/features/projects/native-release-custody-approval-packet";
import type { ReleaseContinuityArchiveManifest } from "@/features/projects/release-continuity-archive-manifest";
import type { ReleaseContinuityDashboardPacket } from "@/features/projects/release-continuity-dashboard-packet";
import { createReleaseCertificationIntakeChecklist } from "@/features/projects/release-certification-intake-checklist";

const generatedAt = "2026-05-23T09:00:00.000Z";
const releaseCandidateId = "native-1.9.0-certification";
const workspaceId = "Essence Runtime";

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
    nextAction: "Release continuity dashboard is ready.",
    operatorReady: true,
    ownerAcknowledged: true,
    readyCount: 3,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseContinuityDashboardPacket;

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

const custodyApproval = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    approvalScore: 100,
    blockedCount: 0,
    custodyApprovalHash: "sha256:custody-approval",
    evidenceReadyCount: 3,
    goNoGoDecision: "go",
    nextAction: "Native release custody approval is ready.",
    operatorReady: true,
    readyCount: 3,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as NativeReleaseCustodyApprovalPacket;

const externalReality = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    nextAction: "External runtime reality packet is ready.",
    operatorReadyCount: 3,
    packetHash: "sha256:external-runtime-reality",
    packetScore: 100,
    readyCount: 3,
    releaseApprovalBlocked: false,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as ExternalRuntimeRealityPacket;

const checklist = createReleaseCertificationIntakeChecklist({
  archiveManifest,
  continuityDashboard,
  custodyApproval,
  externalReality,
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(checklist.summary.status, "ready");
assert.equal(checklist.summary.certificationDecision, "start");
assert.equal(checklist.summary.intakeScore, 100);
assert.equal(checklist.summary.readyCount, 4);
assert.equal(checklist.summary.blockedCount, 0);
assert.equal(checklist.summary.blockerRouteCount, 0);
assert.ok(checklist.summary.checklistHash.startsWith("sha256:"));
assert.deepEqual(
  checklist.rows.map((row) => row.gate),
  [
    "continuity-dashboard-approval",
    "archive-manifest-retention",
    "native-artifact-custody",
    "external-runtime-reality",
  ],
);
assert.ok(checklist.rows.every((row) => row.evidenceLinked));
assert.ok(checklist.rows.every((row) => row.certificationReady));
assert.match(
  checklist.csvContent,
  /^gate,status,score,evidence_linked,certification_ready,blocker_route,evidence_hash,checklist_hash,next_action/,
);
assert.ok(checklist.jsonContent.includes("archive-manifest-retention"));
assert.equal(
  checklist.csvFileName,
  "essence-runtime-release-certification-intake-checklist-native-1-9-0-certification-20260523.csv",
);
assert.equal(
  checklist.jsonFileName,
  "essence-runtime-release-certification-intake-checklist-native-1-9-0-certification-20260523.json",
);
assert.equal(checklist.files.length, 2);

const blocked = createReleaseCertificationIntakeChecklist({
  archiveManifest: {
    ...archiveManifest,
    summary: {
      ...archiveManifest.summary,
      archiveScore: 42,
      blockedCount: 2,
      manifestHash: "missing",
      restorationReadyCount: 0,
      retentionReadyCount: 1,
      status: "blocked",
    },
  },
  continuityDashboard,
  custodyApproval,
  externalReality: {
    ...externalReality,
    summary: {
      ...externalReality.summary,
      blockedCount: 1,
      packetHash: "",
      packetScore: 55,
      releaseApprovalBlocked: true,
      status: "blocked",
    },
  },
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.certificationDecision, "hold");
assert.ok(blocked.summary.intakeScore < 80);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.summary.blockerRouteCount, 2);
assert.equal(
  blocked.rows.find((row) => row.gate === "archive-manifest-retention")
    ?.blockerRoute,
  "release-certification-archive-retention",
);
assert.equal(
  blocked.rows.find((row) => row.gate === "external-runtime-reality")
    ?.evidenceLinked,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release certification intake checklist/,
);

console.log("release certification intake checklist smoke passed");
