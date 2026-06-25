import { strict as assert } from "node:assert";

import { createAttachmentReadinessDiffReport } from "@/features/projects/attachment-readiness-diff-report";
import { createCadRuntimeAttachmentRehearsalPacket } from "@/features/projects/cad-runtime-attachment-rehearsal-packet";
import type { NativeReleaseEvidenceDrillPacket } from "@/features/projects/native-release-evidence-drill-packet";
import { createSignedArtifactAttachmentRehearsalPacket } from "@/features/projects/signed-artifact-attachment-rehearsal-packet";

const generatedAt = "2026-05-21T15:10:00.000Z";
const releaseCandidateId = "native-1.6.0-attachment";
const workspaceId = "Essence Runtime";

const acceptedDrillPacket = {
  rows: [
    {
      evidenceHash: "sha256:accepted-signed-artifact-drill",
      evidenceReady: true,
      gate: "signed-artifact-drill",
      nextAction: "Accepted signed artifact fixture drill.",
      packetHash: "sha256:accepted-signed-row",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      evidenceHash: "sha256:accepted-cad-conversion-drill",
      evidenceReady: true,
      gate: "cad-conversion-drill",
      nextAction: "Accepted CAD conversion fixture drill.",
      packetHash: "sha256:accepted-cad-row",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      evidenceHash: "sha256:accepted-comparison",
      evidenceReady: true,
      gate: "comparison-regression",
      nextAction: "Accepted comparison.",
      packetHash: "sha256:accepted-comparison-row",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
  ],
  summary: {
    blockedCount: 0,
    goNoGoDecision: "go",
    nextAction: "Accepted packet ready.",
    operatorReady: true,
    packetHash: "sha256:accepted-drill-packet",
    packetScore: 100,
    readyCount: 3,
    releaseApprovalBlocked: false,
    reviewCount: 0,
    rowCount: 3,
    status: "ready",
  },
} as NativeReleaseEvidenceDrillPacket;

const signedArtifactAttachments = createSignedArtifactAttachmentRehearsalPacket({
  generatedAt,
  releaseCandidateId,
  rehearsals: [
    {
      artifactSha256: "sha256:windows-artifact",
      artifactUrl:
        "https://release.essence-spline.com/native/1.6.0/windows/setup.exe",
      certificateEvidenceOwner: "Release Engineering",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/windows/certificate.json",
      checksumConfirmedAt: "2026-05-21T15:12:00.000Z",
      checksumConfirmationHash: "sha256:windows-checksum",
      localFixturePath: "fixtures/native/1.6.0/windows/setup.exe",
      platform: "windows",
    },
    {
      artifactSha256: "sha256:macos-artifact",
      artifactUrl:
        "https://release.essence-spline.com/native/1.6.0/macos/app.dmg",
      certificateEvidenceOwner: "Desktop Platform",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/macos/certificate.json",
      checksumConfirmedAt: "2026-05-21T15:13:00.000Z",
      checksumConfirmationHash: "sha256:macos-checksum",
      localFixturePath: "fixtures/native/1.6.0/macos/app.dmg",
      platform: "macos",
    },
    {
      artifactSha256: "sha256:linux-artifact",
      artifactUrl:
        "https://release.essence-spline.com/native/1.6.0/linux/app.AppImage",
      certificateEvidenceOwner: "Release Engineering",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/linux/certificate.json",
      checksumConfirmedAt: "2026-05-21T15:14:00.000Z",
      checksumConfirmationHash: "sha256:linux-checksum",
      localFixturePath: "fixtures/native/1.6.0/linux/app.AppImage",
      platform: "linux",
    },
  ],
  workspaceId,
});

const cadRuntimeAttachments = createCadRuntimeAttachmentRehearsalPacket({
  attachments: [
    {
      adapterId: "freecad",
      bundlePath: "resources/cad/freecad/bin/freecadcmd.exe",
      fallbackApprovalOwner: "CAD Runtime",
      fallbackApprovalUrl:
        "https://release.essence-spline.com/native/1.6.0/freecad/fallback.json",
      fixtureCorpusArtifactPath: "fixtures/cad/corpus/freecad.zip",
      fixtureCorpusArtifactSha256: "sha256:freecad-fixtures",
      outputEvidenceSha256: "sha256:freecad-output",
      outputEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/freecad/output.json",
      packagedBundleSha256: "sha256:freecad-bundle",
    },
    {
      adapterId: "occt",
      bundlePath: "resources/cad/occt/bin/essence-occt-convert",
      fallbackApprovalOwner: "Desktop Platform",
      fallbackApprovalUrl:
        "https://release.essence-spline.com/native/1.6.0/occt/fallback.json",
      fixtureCorpusArtifactPath: "fixtures/cad/corpus/occt.zip",
      fixtureCorpusArtifactSha256: "sha256:occt-fixtures",
      outputEvidenceSha256: "sha256:occt-output",
      outputEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/occt/output.json",
      packagedBundleSha256: "sha256:occt-bundle",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

const report = createAttachmentReadinessDiffReport({
  acceptedDrillPacket,
  cadRuntimeAttachments,
  generatedAt,
  releaseCandidateId,
  signedArtifactAttachments,
  workspaceId,
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.diffScore, 100);
assert.equal(report.summary.acceptedDrillReady, true);
assert.equal(report.summary.missingArtifactEvidenceCount, 0);
assert.equal(report.summary.missingCadEvidenceCount, 0);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.ok(report.summary.diffHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.area),
  [
    "signed-artifact-attachments",
    "cad-runtime-attachments",
    "accepted-release-drill",
  ],
);
assert.ok(report.rows.every((row) => row.currentEvidenceReady));
assert.ok(report.rows.every((row) => row.acceptedEvidenceReady));
assert.match(
  report.rows.find((row) => row.area === "signed-artifact-attachments")
    ?.acceptedEvidenceHash ?? "",
  /accepted-signed-artifact-drill/,
);
assert.match(
  report.rows.find((row) => row.area === "cad-runtime-attachments")
    ?.currentEvidenceHash ?? "",
  /^sha256:/,
);
assert.match(
  report.csvContent,
  /^area,status,current_evidence_ready,accepted_evidence_ready,missing_artifact_evidence,missing_cad_evidence,current_evidence_hash,accepted_evidence_hash,diff_hash,next_action/,
);
assert.ok(report.jsonContent.includes("accepted-drill-packet"));
assert.equal(
  report.csvFileName,
  "essence-runtime-attachment-readiness-diff-report-native-1-6-0-attachment-20260521.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-attachment-readiness-diff-report-native-1-6-0-attachment-20260521.json",
);
assert.equal(report.files.length, 2);

const blockedSignedArtifactAttachments = createSignedArtifactAttachmentRehearsalPacket({
  releaseCandidateId,
  rehearsals: [],
  workspaceId,
});

const blocked = createAttachmentReadinessDiffReport({
  acceptedDrillPacket,
  cadRuntimeAttachments,
  releaseCandidateId,
  signedArtifactAttachments: blockedSignedArtifactAttachments,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.diffScore < 70);
assert.equal(blocked.summary.missingArtifactEvidenceCount, 1);
assert.equal(blocked.summary.blockedCount, 1);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-attachments")
    ?.missingArtifactEvidence,
  true,
);
assert.equal(
  blocked.rows.find((row) => row.area === "cad-runtime-attachments")
    ?.missingCadEvidence,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve missing attachment evidence before native release approval/,
);

console.log("attachment readiness diff report smoke passed");
