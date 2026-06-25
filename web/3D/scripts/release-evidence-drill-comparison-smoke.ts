import { strict as assert } from "node:assert";
import { createCadConversionFixtureDrillRunner } from "@/features/projects/cad-conversion-fixture-drill-runner";
import { createReleaseEvidenceDrillComparisonReport } from "@/features/projects/release-evidence-drill-comparison";
import { createSignedArtifactFixtureDrillRunner } from "@/features/projects/signed-artifact-fixture-drill-runner";

const generatedAt = "2026-05-21T10:00:00.000Z";
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
      fixtureCorpus: [
        {
          fixtureName: "bracket_mm.step",
          format: "STEP",
          sourceSha256: "sha256:freecad-bracket-source",
        },
      ],
      outputHash: "sha256:freecad-bracket-output",
      owner: "CAD Runtime",
    },
    {
      adapterId: "occt",
      commandPlan: ["resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb"],
      expectedOutputHash: "sha256:occt-enclosure-output",
      failureTranscript: "OCCT dry-run failure route captured: non-manifold shell recovery transcript retained.",
      fixtureCorpus: [
        {
          fixtureName: "enclosure_mm.iges",
          format: "IGES",
          sourceSha256: "sha256:occt-enclosure-source",
        },
      ],
      outputHash: "sha256:occt-enclosure-output",
      owner: "CAD Runtime",
    },
  ],
});

const stable = createReleaseEvidenceDrillComparisonReport({
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

assert.equal(stable.summary.status, "ready");
assert.equal(stable.summary.comparisonScore, 100);
assert.equal(stable.summary.regressionCount, 0);
assert.equal(stable.summary.changedCount, 0);
assert.equal(stable.summary.readyCount, 4);
assert.ok(stable.summary.comparisonHash.startsWith("sha256:"));
assert.deepEqual(
  stable.rows.map((row) => row.id),
  ["signed-artifact-status", "signed-artifact-score", "cad-fixture-status", "cad-fixture-score"],
);
assert.ok(stable.rows.every((row) => row.status === "ready"));
assert.match(stable.summary.nextAction, /Release evidence drill comparison is stable/);
assert.match(stable.csvContent, /^comparison_id,status,severity,metric,accepted_value,current_value,delta,current_hash,next_action/);
assert.ok(stable.jsonContent.includes("signed-artifact-score"));
assert.equal(stable.csvFileName, "essence-runtime-release-evidence-drill-comparison-native-1-5-0-drill-20260521.csv");
assert.equal(stable.jsonFileName, "essence-runtime-release-evidence-drill-comparison-native-1-5-0-drill-20260521.json");
assert.equal(stable.files.length, 2);

const regressed = createReleaseEvidenceDrillComparisonReport({
  acceptedBaseline: {
    acceptedAt: "2026-05-20T10:00:00.000Z",
    cadFixtureDrillHash: "sha256:prior-cad-drill",
    cadFixtureDrillScore: 100,
    cadFixtureDrillStatus: "ready",
    signedArtifactDrillHash: "sha256:prior-signed-drill",
    signedArtifactDrillScore: 100,
    signedArtifactDrillStatus: "ready",
  },
  cadFixtureDrill: createCadConversionFixtureDrillRunner({
    drills: [
      {
        adapterId: "freecad",
        commandPlan: [],
        expectedOutputHash: "",
        failureTranscript: "",
        fixtureCorpus: [],
        outputHash: "",
        owner: "",
      },
    ],
    releaseCandidateId,
    workspaceId,
  }),
  releaseCandidateId,
  signedArtifactDrill,
  workspaceId,
});

assert.equal(regressed.summary.status, "blocked");
assert.ok(regressed.summary.comparisonScore < 70);
assert.equal(regressed.summary.regressionCount >= 2, true);
assert.equal(regressed.rows.find((row) => row.id === "cad-fixture-status")?.status, "blocked");
assert.equal(regressed.rows.find((row) => row.id === "cad-fixture-score")?.severity, "critical");
assert.match(regressed.summary.nextAction, /Resolve release evidence drill regressions/);

console.log("release evidence drill comparison smoke passed");
