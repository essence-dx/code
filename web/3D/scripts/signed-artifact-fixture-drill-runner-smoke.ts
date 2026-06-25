import { strict as assert } from "node:assert";
import { createSignedArtifactFixtureDrillRunner } from "@/features/projects/signed-artifact-fixture-drill-runner";

const report = createSignedArtifactFixtureDrillRunner({
  generatedAt: "2026-05-21T08:30:00.000Z",
  releaseCandidateId: "native-1.5.0-drill",
  workspaceId: "Essence Runtime",
  fixtures: [
    {
      artifactFileName: "Essence_1.5.0_x64-setup.exe",
      artifactSha256: "sha256:windows-fixture-artifact",
      dryRunTranscript: [
        "signtool verify /pa /tw fixtures/Essence_1.5.0_x64-setup.exe",
        "Successfully verified: fixtures/Essence_1.5.0_x64-setup.exe",
      ],
      expectedCertificateFingerprint: "sha256:windows-ev-fixture-fingerprint",
      owner: "Release Engineering",
      platform: "windows",
      verificationCommand: "signtool verify /pa /tw fixtures/Essence_1.5.0_x64-setup.exe",
    },
    {
      artifactFileName: "Essence_1.5.0_aarch64.dmg",
      artifactSha256: "sha256:macos-fixture-artifact",
      dryRunTranscript: [
        "codesign --verify --deep --strict fixtures/Essence.app",
        "spctl -a -vv fixtures/Essence.app",
        "source=Notarized Developer ID",
      ],
      expectedCertificateFingerprint: "sha256:macos-developer-id-fixture-fingerprint",
      owner: "Desktop Platform",
      platform: "macos",
      verificationCommand: "codesign --verify --deep --strict fixtures/Essence.app && spctl -a -vv fixtures/Essence.app",
    },
    {
      artifactFileName: "essence-spline_1.5.0_amd64.AppImage",
      artifactSha256: "sha256:linux-fixture-artifact",
      dryRunTranscript: [
        "cosign verify-blob --bundle fixtures/essence-spline_1.5.0_amd64.AppImage.bundle fixtures/essence-spline_1.5.0_amd64.AppImage",
        "Verified OK",
      ],
      expectedCertificateFingerprint: "sha256:linux-sigstore-fixture-fingerprint",
      owner: "Release Engineering",
      platform: "linux",
      verificationCommand: "cosign verify-blob --bundle fixtures/essence-spline_1.5.0_amd64.AppImage.bundle fixtures/essence-spline_1.5.0_amd64.AppImage",
    },
  ],
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.drillScore, 100);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.commandReadyCount, 3);
assert.equal(report.summary.transcriptReadyCount, 3);
assert.ok(report.summary.drillHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(report.rows.every((row) => row.commandReady));
assert.ok(report.rows.every((row) => row.transcriptReady));
assert.ok(report.rows.every((row) => row.fixtureReady));
assert.ok(report.rows.every((row) => row.transcriptHash.startsWith("sha256:")));
assert.equal(report.rows.find((row) => row.platform === "windows")?.commandPlan[0], "Open Windows SDK Developer Command Prompt or CI image with signtool available.");
assert.match(report.rows.find((row) => row.platform === "macos")?.verificationCommand ?? "", /codesign/);
assert.match(report.rows.find((row) => row.platform === "linux")?.verificationCommand ?? "", /cosign/);
assert.match(
  report.csvContent,
  /^platform,status,artifact_file,command_ready,transcript_ready,fixture_ready,transcript_hash,drill_hash,next_action/,
);
assert.ok(report.jsonContent.includes("source=Notarized Developer ID"));
assert.equal(report.csvFileName, "essence-runtime-signed-artifact-fixture-drill-runner-native-1-5-0-drill-20260521.csv");
assert.equal(report.jsonFileName, "essence-runtime-signed-artifact-fixture-drill-runner-native-1-5-0-drill-20260521.json");
assert.equal(report.files.length, 2);

const blocked = createSignedArtifactFixtureDrillRunner({
  fixtures: [
    {
      artifactFileName: "Essence_1.5.0_x64-setup.exe",
      artifactSha256: "sha256:windows-fixture-artifact",
      dryRunTranscript: [],
      expectedCertificateFingerprint: "",
      owner: "",
      platform: "windows",
      verificationCommand: "",
    },
  ],
  releaseCandidateId: "native-1.5.0-drill",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.drillScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.commandReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.transcriptReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "macos")?.fixtureReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked signed artifact fixture drills/);

console.log("signed artifact fixture drill runner smoke passed");
