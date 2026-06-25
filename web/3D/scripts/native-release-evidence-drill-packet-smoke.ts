import { strict as assert } from "node:assert";
import { createCadConversionFixtureDrillRunner } from "@/features/projects/cad-conversion-fixture-drill-runner";
import { createNativeReleaseEvidenceDrillPacket } from "@/features/projects/native-release-evidence-drill-packet";
import { createReleaseEvidenceDrillComparisonReport } from "@/features/projects/release-evidence-drill-comparison";
import { createSignedArtifactFixtureDrillRunner } from "@/features/projects/signed-artifact-fixture-drill-runner";

const generatedAt = "2026-05-21T11:00:00.000Z";
const releaseCandidateId = "native-1.5.0-drill";
const workspaceId = "Essence Runtime";

const signedArtifactDrill = createSignedArtifactFixtureDrillRunner({
  generatedAt,
  releaseCandidateId,
  workspaceId,
  fixtures: [
    {
      artifactFileName: "Essence_1.5.0_x64-setup.exe",
      artifactSha256: "sha256:windows-fixture-artifact",
      dryRunTranscript: ["signtool verify /pa /tw fixtures/Essence_1.5.0_x64-setup.exe", "Successfully verified"],
      expectedCertificateFingerprint: "sha256:windows-ev-fixture-fingerprint",
      owner: "Release Engineering",
      platform: "windows",
      verificationCommand: "signtool verify /pa /tw fixtures/Essence_1.5.0_x64-setup.exe",
    },
    {
      artifactFileName: "Essence_1.5.0_aarch64.dmg",
      artifactSha256: "sha256:macos-fixture-artifact",
      dryRunTranscript: ["codesign --verify --deep --strict fixtures/Essence.app", "source=Notarized Developer ID"],
      expectedCertificateFingerprint: "sha256:macos-developer-id-fixture-fingerprint",
      owner: "Desktop Platform",
      platform: "macos",
      verificationCommand: "codesign --verify --deep --strict fixtures/Essence.app && spctl -a -vv fixtures/Essence.app",
    },
    {
      artifactFileName: "essence-spline_1.5.0_amd64.AppImage",
      artifactSha256: "sha256:linux-fixture-artifact",
      dryRunTranscript: ["cosign verify-blob --bundle fixtures/essence-spline_1.5.0_amd64.AppImage.bundle fixtures/essence-spline_1.5.0_amd64.AppImage", "Verified OK"],
      expectedCertificateFingerprint: "sha256:linux-sigstore-fixture-fingerprint",
      owner: "Release Engineering",
      platform: "linux",
      verificationCommand: "cosign verify-blob --bundle fixtures/essence-spline_1.5.0_amd64.AppImage.bundle fixtures/essence-spline_1.5.0_amd64.AppImage",
    },
  ],
});

const cadFixtureDrill = createCadConversionFixtureDrillRunner({
  generatedAt,
  releaseCandidateId,
  workspaceId,
  drills: [
    {
      adapterId: "freecad",
      commandPlan: ["resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step"],
      expectedOutputHash: "sha256:freecad-bracket-output",
      failureTranscript: "",
      fixtureCorpus: [{ fixtureName: "bracket_mm.step", format: "STEP", sourceSha256: "sha256:freecad-bracket-source" }],
      outputHash: "sha256:freecad-bracket-output",
      owner: "CAD Runtime",
    },
    {
      adapterId: "occt",
      commandPlan: ["resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb"],
      expectedOutputHash: "sha256:occt-enclosure-output",
      failureTranscript: "OCCT dry-run failure route captured: non-manifold shell recovery transcript retained.",
      fixtureCorpus: [{ fixtureName: "enclosure_mm.iges", format: "IGES", sourceSha256: "sha256:occt-enclosure-source" }],
      outputHash: "sha256:occt-enclosure-output",
      owner: "CAD Runtime",
    },
  ],
});

const comparison = createReleaseEvidenceDrillComparisonReport({
  acceptedBaseline: {
    acceptedAt: "2026-05-20T10:00:00.000Z",
    cadFixtureDrillHash: cadFixtureDrill.summary.drillHash,
    cadFixtureDrillScore: cadFixtureDrill.summary.drillScore,
    cadFixtureDrillStatus: cadFixtureDrill.summary.status,
    signedArtifactDrillHash: signedArtifactDrill.summary.drillHash,
    signedArtifactDrillScore: signedArtifactDrill.summary.drillScore,
    signedArtifactDrillStatus: signedArtifactDrill.summary.status,
  },
  cadFixtureDrill,
  generatedAt,
  releaseCandidateId,
  signedArtifactDrill,
  workspaceId,
});

const packet = createNativeReleaseEvidenceDrillPacket({
  cadFixtureDrill,
  comparison,
  generatedAt,
  operatorOwner: "Release Manager",
  releaseCandidateId,
  signedArtifactDrill,
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.goNoGoDecision, "go");
assert.equal(packet.summary.packetScore, 100);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.readyCount, 3);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.operatorReady, true);
assert.ok(packet.summary.packetHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.gate),
  ["signed-artifact-drill", "cad-conversion-drill", "comparison-regression"],
);
assert.ok(packet.rows.every((row) => row.evidenceReady));
assert.ok(packet.rows.every((row) => row.releaseApprovalReady));
assert.match(packet.rows.find((row) => row.gate === "comparison-regression")?.nextAction ?? "", /comparison evidence is ready/);
assert.match(
  packet.csvContent,
  /^gate,status,score,evidence_ready,release_approval_ready,evidence_hash,packet_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("Release Manager"));
assert.equal(packet.csvFileName, "essence-runtime-native-release-evidence-drill-packet-native-1-5-0-drill-20260521.csv");
assert.equal(packet.jsonFileName, "essence-runtime-native-release-evidence-drill-packet-native-1-5-0-drill-20260521.json");
assert.equal(packet.files.length, 2);

const blockedComparison = createReleaseEvidenceDrillComparisonReport({
  acceptedBaseline: {
    acceptedAt: "2026-05-20T10:00:00.000Z",
    cadFixtureDrillHash: "sha256:prior-cad",
    cadFixtureDrillScore: 100,
    cadFixtureDrillStatus: "ready",
    signedArtifactDrillHash: "sha256:prior-signed",
    signedArtifactDrillScore: 100,
    signedArtifactDrillStatus: "ready",
  },
  cadFixtureDrill: createCadConversionFixtureDrillRunner({
    drills: [],
    releaseCandidateId,
    workspaceId,
  }),
  releaseCandidateId,
  signedArtifactDrill,
  workspaceId,
});

const blocked = createNativeReleaseEvidenceDrillPacket({
  cadFixtureDrill: createCadConversionFixtureDrillRunner({
    drills: [],
    releaseCandidateId,
    workspaceId,
  }),
  comparison: blockedComparison,
  operatorOwner: "",
  releaseCandidateId,
  signedArtifactDrill,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.goNoGoDecision, "no-go");
assert.equal(blocked.summary.operatorReady, false);
assert.ok(blocked.summary.packetScore < 60);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.gate === "cad-conversion-drill")?.evidenceReady, false);
assert.equal(blocked.rows.find((row) => row.gate === "comparison-regression")?.releaseApprovalReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native release evidence drill packet/);

console.log("native release evidence drill packet smoke passed");
