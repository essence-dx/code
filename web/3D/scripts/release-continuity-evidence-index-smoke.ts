import { strict as assert } from "node:assert";

import type { ExternalRuntimeRealityPacket } from "@/features/projects/external-runtime-reality-packet";
import type { NativeReleaseAttachmentApprovalPacket } from "@/features/projects/native-release-attachment-approval-packet";
import type { NativeReleaseCustodyApprovalPacket } from "@/features/projects/native-release-custody-approval-packet";
import type { NativeReleaseEvidenceDrillPacket } from "@/features/projects/native-release-evidence-drill-packet";
import { createReleaseContinuityEvidenceIndex } from "@/features/projects/release-continuity-evidence-index";

const generatedAt = "2026-05-22T08:30:00.000Z";
const releaseCandidateId = "native-1.8.0-continuity";
const workspaceId = "Essence Runtime";

const custodyApproval = {
  csvFileName:
    "essence-runtime-native-release-custody-approval-packet-native-1-7-0-custody-20260521.csv",
  files: [],
  generatedAt,
  jsonFileName:
    "essence-runtime-native-release-custody-approval-packet-native-1-7-0-custody-20260521.json",
  releaseCandidateId,
  rows: [],
  summary: {
    approvalScore: 100,
    blockedCount: 0,
    custodyApprovalHash: "sha256:custody-approval",
    evidenceReadyCount: 3,
    goNoGoDecision: "go",
    nextAction: "Custody approval ready.",
    operatorReady: true,
    readyCount: 3,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as NativeReleaseCustodyApprovalPacket;

const attachmentApproval = {
  csvFileName:
    "essence-runtime-native-release-attachment-approval-packet-native-1-6-0-attachment-20260521.csv",
  files: [],
  generatedAt,
  jsonFileName:
    "essence-runtime-native-release-attachment-approval-packet-native-1-6-0-attachment-20260521.json",
  operatorOwner: "Release Manager",
  releaseCandidateId,
  rows: [],
  summary: {
    approvalHash: "sha256:attachment-approval",
    approvalScore: 100,
    blockedCount: 0,
    goNoGoDecision: "go",
    nextAction: "Attachment approval ready.",
    operatorReady: true,
    readyCount: 3,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as NativeReleaseAttachmentApprovalPacket;

const drillPacket = {
  csvFileName:
    "essence-runtime-native-release-evidence-drill-packet-native-1-5-0-drill-20260521.csv",
  files: [],
  generatedAt,
  jsonFileName:
    "essence-runtime-native-release-evidence-drill-packet-native-1-5-0-drill-20260521.json",
  operatorOwner: "Release Manager",
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    goNoGoDecision: "go",
    nextAction: "Drill packet ready.",
    operatorReady: true,
    packetHash: "sha256:drill-packet",
    packetScore: 100,
    readyCount: 3,
    releaseApprovalBlocked: false,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as NativeReleaseEvidenceDrillPacket;

const externalReality = {
  csvFileName:
    "essence-runtime-external-runtime-reality-packet-native-1-4-0-stable-20260520.csv",
  files: [],
  generatedAt,
  jsonFileName:
    "essence-runtime-external-runtime-reality-packet-native-1-4-0-stable-20260520.json",
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    nextAction: "External runtime reality ready.",
    operatorReadyCount: 3,
    packetHash: "sha256:external-reality",
    packetScore: 100,
    readyCount: 3,
    releaseApprovalBlocked: false,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
  workspaceId,
} as unknown as ExternalRuntimeRealityPacket;

const index = createReleaseContinuityEvidenceIndex({
  attachmentApproval,
  custodyApproval,
  drillPacket,
  externalReality,
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(index.summary.status, "ready");
assert.equal(index.summary.continuityScore, 100);
assert.equal(index.summary.readyCount, 4);
assert.equal(index.summary.blockedCount, 0);
assert.equal(index.summary.missingEvidenceCount, 0);
assert.ok(index.summary.indexHash.startsWith("sha256:"));
assert.deepEqual(
  index.rows.map((row) => row.source),
  [
    "custody-approval",
    "attachment-approval",
    "evidence-drill",
    "external-runtime-reality",
  ],
);
assert.ok(index.rows.every((row) => row.searchable));
assert.ok(index.rows.every((row) => row.evidenceLinked));
assert.ok(index.rows.every((row) => row.searchText.includes(releaseCandidateId)));
assert.ok(
  index.rows
    .find((row) => row.source === "external-runtime-reality")
    ?.searchText.includes("external-reality"),
);
assert.match(
  index.csvContent,
  /^source,status,score,evidence_linked,searchable,evidence_hash,index_hash,next_action/,
);
assert.ok(index.jsonContent.includes("custody-approval"));
assert.equal(
  index.csvFileName,
  "essence-runtime-release-continuity-evidence-index-native-1-8-0-continuity-20260522.csv",
);
assert.equal(
  index.jsonFileName,
  "essence-runtime-release-continuity-evidence-index-native-1-8-0-continuity-20260522.json",
);
assert.equal(index.files.length, 2);

const blocked = createReleaseContinuityEvidenceIndex({
  attachmentApproval: {
    ...attachmentApproval,
    summary: {
      ...attachmentApproval.summary,
      approvalHash: "",
      approvalScore: 45,
      blockedCount: 1,
      goNoGoDecision: "no-go",
      status: "blocked",
    },
  },
  custodyApproval,
  drillPacket,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.continuityScore < 70);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.summary.missingEvidenceCount, 2);
assert.equal(
  blocked.rows.find((row) => row.source === "attachment-approval")
    ?.evidenceLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.source === "external-runtime-reality")
    ?.searchable,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release continuity evidence index/,
);

console.log("release continuity evidence index smoke passed");
