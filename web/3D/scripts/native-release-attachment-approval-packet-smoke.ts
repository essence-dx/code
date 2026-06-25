import { strict as assert } from "node:assert";

import { createAttachmentReadinessDiffReport } from "@/features/projects/attachment-readiness-diff-report";
import { createCadRuntimeAttachmentRehearsalPacket } from "@/features/projects/cad-runtime-attachment-rehearsal-packet";
import type { NativeReleaseEvidenceDrillPacket } from "@/features/projects/native-release-evidence-drill-packet";
import { createNativeReleaseAttachmentApprovalPacket } from "@/features/projects/native-release-attachment-approval-packet";
import { createSignedArtifactAttachmentRehearsalPacket } from "@/features/projects/signed-artifact-attachment-rehearsal-packet";

const generatedAt = "2026-05-21T16:00:00.000Z";
const releaseCandidateId = "native-1.6.0-attachment";
const workspaceId = "Essence Runtime";

const acceptedDrillPacket = {
  rows: [
    {
      evidenceHash: "sha256:accepted-signed-artifact-drill",
      evidenceReady: true,
      gate: "signed-artifact-drill",
      nextAction: "Accepted signed artifact drill.",
      packetHash: "sha256:accepted-signed-row",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      evidenceHash: "sha256:accepted-cad-conversion-drill",
      evidenceReady: true,
      gate: "cad-conversion-drill",
      nextAction: "Accepted CAD drill.",
      packetHash: "sha256:accepted-cad-row",
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
    readyCount: 2,
    releaseApprovalBlocked: false,
    reviewCount: 0,
    rowCount: 2,
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
      checksumConfirmedAt: "2026-05-21T16:02:00.000Z",
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
      checksumConfirmedAt: "2026-05-21T16:03:00.000Z",
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
      checksumConfirmedAt: "2026-05-21T16:04:00.000Z",
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

const readinessDiff = createAttachmentReadinessDiffReport({
  acceptedDrillPacket,
  cadRuntimeAttachments,
  generatedAt,
  releaseCandidateId,
  signedArtifactAttachments,
  workspaceId,
});

const packet = createNativeReleaseAttachmentApprovalPacket({
  cadRuntimeAttachments,
  generatedAt,
  operatorOwner: "Release Manager",
  readinessDiff,
  releaseCandidateId,
  signedArtifactAttachments,
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.goNoGoDecision, "go");
assert.equal(packet.summary.approvalScore, 100);
assert.equal(packet.summary.operatorReady, true);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.readyCount, 3);
assert.equal(packet.summary.reviewCount, 0);
assert.ok(packet.summary.approvalHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.gate),
  [
    "signed-artifact-attachments",
    "cad-runtime-attachments",
    "attachment-readiness-diff",
  ],
);
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.ok(packet.rows.every((row) => row.releaseApprovalReady));
assert.match(
  packet.rows.find((row) => row.gate === "attachment-readiness-diff")
    ?.nextAction ?? "",
  /ready for operator approval/,
);
assert.match(
  packet.csvContent,
  /^gate,status,score,evidence_linked,release_approval_ready,approval_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("Release Manager"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-native-release-attachment-approval-packet-native-1-6-0-attachment-20260521.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-native-release-attachment-approval-packet-native-1-6-0-attachment-20260521.json",
);
assert.equal(packet.files.length, 2);

const blocked = createNativeReleaseAttachmentApprovalPacket({
  cadRuntimeAttachments,
  operatorOwner: "",
  readinessDiff,
  releaseCandidateId,
  signedArtifactAttachments: createSignedArtifactAttachmentRehearsalPacket({
    releaseCandidateId,
    rehearsals: [],
    workspaceId,
  }),
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.goNoGoDecision, "no-go");
assert.equal(blocked.summary.operatorReady, false);
assert.ok(blocked.summary.approvalScore < 70);
assert.equal(blocked.summary.blockedCount, 1);
assert.equal(
  blocked.rows.find((row) => row.gate === "signed-artifact-attachments")
    ?.evidenceLinked,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native release attachment approval packet/,
);

console.log("native release attachment approval packet smoke passed");
