import { strict as assert } from "node:assert";

import { createAttachmentCustodyDriftMonitor } from "@/features/projects/attachment-custody-drift-monitor";
import { createCadRuntimeCustodyLedger } from "@/features/projects/cad-runtime-custody-ledger";
import type { NativeReleaseAttachmentApprovalPacket } from "@/features/projects/native-release-attachment-approval-packet";
import { createSignedArtifactCustodyLedger } from "@/features/projects/signed-artifact-custody-ledger";

const generatedAt = "2026-05-21T19:10:00.000Z";
const releaseCandidateId = "native-1.7.0-custody";
const workspaceId = "Essence Runtime";

const signedArtifactCustody = createSignedArtifactCustodyLedger({
  artifacts: [
    {
      artifactSha256: "sha256:windows-artifact",
      certificateCustodyOwner: "Release Engineering",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/windows/certificate.json",
      checksumRenewalAt: "2026-06-21T08:00:00.000Z",
      checksumRenewalHash: "sha256:windows-renewal",
      platform: "windows",
      retentionExpiresAt: "2027-05-21T08:00:00.000Z",
      storageOwner: "Release Engineering",
      storageUrl:
        "https://release.essence-spline.com/native/1.7.0/windows/setup.exe",
    },
    {
      artifactSha256: "sha256:macos-artifact",
      certificateCustodyOwner: "Desktop Platform",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/macos/certificate.json",
      checksumRenewalAt: "2026-06-21T08:05:00.000Z",
      checksumRenewalHash: "sha256:macos-renewal",
      platform: "macos",
      retentionExpiresAt: "2027-05-21T08:00:00.000Z",
      storageOwner: "Desktop Platform",
      storageUrl:
        "https://release.essence-spline.com/native/1.7.0/macos/app.dmg",
    },
    {
      artifactSha256: "sha256:linux-artifact",
      certificateCustodyOwner: "Release Engineering",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/linux/certificate.json",
      checksumRenewalAt: "2026-06-21T08:10:00.000Z",
      checksumRenewalHash: "sha256:linux-renewal",
      platform: "linux",
      retentionExpiresAt: "2027-05-21T08:00:00.000Z",
      storageOwner: "Release Engineering",
      storageUrl:
        "https://release.essence-spline.com/native/1.7.0/linux/app.AppImage",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

const cadRuntimeCustody = createCadRuntimeCustodyLedger({
  generatedAt,
  releaseCandidateId,
  runtimes: [
    {
      adapterId: "freecad",
      bundleOwner: "CAD Runtime",
      bundlePath: "resources/cad/freecad/1.7.0/windows-x64/freecadcmd.exe",
      bundleSha256: "sha256:freecad-bundle",
      fallbackApprovalCustodyOwner: "Release Engineering",
      fallbackApprovalEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/freecad/fallback-approval.json",
      fixtureCorpusRetentionExpiresAt: "2027-05-21T08:00:00.000Z",
      fixtureCorpusSha256: "sha256:freecad-fixture-corpus",
      outputEvidenceRenewalAt: "2026-06-21T09:00:00.000Z",
      outputEvidenceRenewalHash: "sha256:freecad-output-renewal",
    },
    {
      adapterId: "occt",
      bundleOwner: "Desktop Platform",
      bundlePath: "resources/cad/occt/7.8.1/linux-x64/essence-occt-convert",
      bundleSha256: "sha256:occt-bundle",
      fallbackApprovalCustodyOwner: "CAD Runtime",
      fallbackApprovalEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/occt/fallback-approval.json",
      fixtureCorpusRetentionExpiresAt: "2027-05-21T08:00:00.000Z",
      fixtureCorpusSha256: "sha256:occt-fixture-corpus",
      outputEvidenceRenewalAt: "2026-06-21T09:05:00.000Z",
      outputEvidenceRenewalHash: "sha256:occt-output-renewal",
    },
  ],
  workspaceId,
});

const approvalPacket = {
  generatedAt,
  operatorOwner: "Release Manager",
  releaseCandidateId,
  rows: [
    {
      approvalHash: "sha256:signed-approval-row",
      evidenceHash: signedArtifactCustody.summary.ledgerHash,
      evidenceLinked: true,
      gate: "signed-artifact-attachments",
      nextAction: "Signed attachments approved.",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      approvalHash: "sha256:cad-approval-row",
      evidenceHash: cadRuntimeCustody.summary.ledgerHash,
      evidenceLinked: true,
      gate: "cad-runtime-attachments",
      nextAction: "CAD attachments approved.",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
  ],
  summary: {
    approvalHash: "sha256:approval-packet",
    approvalScore: 100,
    blockedCount: 0,
    goNoGoDecision: "go",
    nextAction: "Attachment approval ready.",
    operatorReady: true,
    readyCount: 2,
    reviewCount: 0,
    rowCount: 2,
    status: "ready",
  },
  workspaceId,
} as NativeReleaseAttachmentApprovalPacket;

const report = createAttachmentCustodyDriftMonitor({
  approvalPacket,
  cadRuntimeCustody,
  generatedAt,
  releaseCandidateId,
  signedArtifactCustody,
  workspaceId,
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.driftScore, 100);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.staleOwnerCount, 0);
assert.equal(report.summary.expiredRetentionCount, 0);
assert.equal(report.summary.changedEvidenceHashCount, 0);
assert.ok(report.summary.driftHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.area),
  [
    "signed-artifact-custody",
    "cad-runtime-custody",
    "attachment-approval-packet",
  ],
);
assert.ok(report.rows.every((row) => row.ownerCurrent));
assert.ok(report.rows.every((row) => row.retentionCurrent));
assert.ok(report.rows.every((row) => !row.changedEvidenceHash));
assert.match(
  report.csvContent,
  /^area,status,owner_current,retention_current,changed_evidence_hash,current_evidence_hash,approval_evidence_hash,drift_hash,next_action/,
);
assert.ok(report.jsonContent.includes("approval-packet"));
assert.equal(
  report.csvFileName,
  "essence-runtime-attachment-custody-drift-monitor-native-1-7-0-custody-20260521.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-attachment-custody-drift-monitor-native-1-7-0-custody-20260521.json",
);
assert.equal(report.files.length, 2);

const expiredSignedArtifactCustody = createSignedArtifactCustodyLedger({
  artifacts: [
    {
      artifactSha256: "sha256:windows-artifact",
      certificateCustodyOwner: "",
      certificateEvidenceUrl: "",
      checksumRenewalAt: "",
      checksumRenewalHash: "",
      platform: "windows",
      retentionExpiresAt: "2025-05-21T08:00:00.000Z",
      storageOwner: "",
      storageUrl: "",
    },
  ],
  releaseCandidateId,
  workspaceId,
});

const blocked = createAttachmentCustodyDriftMonitor({
  approvalPacket,
  cadRuntimeCustody,
  releaseCandidateId,
  signedArtifactCustody: expiredSignedArtifactCustody,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.driftScore < 70);
assert.equal(blocked.summary.staleOwnerCount, 1);
assert.equal(blocked.summary.expiredRetentionCount, 1);
assert.equal(blocked.summary.changedEvidenceHashCount, 1);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-custody")
    ?.ownerCurrent,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-custody")
    ?.retentionCurrent,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-custody")
    ?.changedEvidenceHash,
  true,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve attachment custody drift before release evidence continuity approval/,
);

console.log("attachment custody drift monitor smoke passed");
