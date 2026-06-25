import { strict as assert } from "node:assert";

import { createExternalArtifactVerificationCommandRunner } from "@/features/projects/external-artifact-verification-command-runner";

const report = createExternalArtifactVerificationCommandRunner({
  commands: [
    {
      artifactPath: "C:/releases/native/Essence_2.2.0_x64-setup.exe",
      artifactSha256: "sha256:windows-installer-artifact",
      exitCode: 0,
      finishedAt: "2026-05-26T10:01:15.000Z",
      platform: "windows",
      stderrHash: "sha256:windows-stderr-empty",
      stdoutHash: "sha256:windows-authenticode-stdout",
      transcriptHash: "sha256:windows-authenticode-transcript",
      verificationCommand:
        "signtool verify /pa /tw /v C:/releases/native/Essence_2.2.0_x64-setup.exe",
      verificationKind: "authenticode",
      verifierOwner: "Release Engineering",
      workingDirectory: "C:/releases/native",
      startedAt: "2026-05-26T10:01:00.000Z",
    },
    {
      artifactPath: "/Volumes/releases/native/Essence_2.2.0_aarch64.dmg",
      artifactSha256: "sha256:macos-dmg-artifact",
      exitCode: 0,
      finishedAt: "2026-05-26T10:04:40.000Z",
      platform: "macos",
      stderrHash: "sha256:macos-stderr-empty",
      stdoutHash: "sha256:macos-codesign-stdout",
      transcriptHash: "sha256:macos-codesign-transcript",
      verificationCommand:
        "codesign --verify --deep --strict /Volumes/releases/native/Essence_2.2.0_aarch64.dmg",
      verificationKind: "codesign",
      verifierOwner: "Desktop Platform",
      workingDirectory: "/Volumes/releases/native",
      startedAt: "2026-05-26T10:04:00.000Z",
    },
    {
      artifactPath: "/srv/releases/native/essence-spline_2.2.0_amd64.AppImage",
      artifactSha256: "sha256:linux-appimage-artifact",
      exitCode: 0,
      finishedAt: "2026-05-26T10:07:30.000Z",
      platform: "linux",
      stderrHash: "sha256:linux-stderr-empty",
      stdoutHash: "sha256:linux-sigstore-stdout",
      transcriptHash: "sha256:linux-sigstore-transcript",
      verificationCommand:
        "cosign verify-blob --bundle essence-spline_2.2.0_amd64.AppImage.bundle /srv/releases/native/essence-spline_2.2.0_amd64.AppImage",
      verificationKind: "sigstore",
      verifierOwner: "Release Engineering",
      workingDirectory: "/srv/releases/native",
      startedAt: "2026-05-26T10:07:00.000Z",
    },
    {
      artifactPath: "/srv/releases/mobile/essence-spline-2.2.0.aab",
      artifactSha256: "sha256:android-aab-artifact",
      exitCode: 0,
      finishedAt: "2026-05-26T10:11:10.000Z",
      platform: "android",
      stderrHash: "sha256:android-stderr-empty",
      stdoutHash: "sha256:android-apksigner-stdout",
      transcriptHash: "sha256:android-apksigner-transcript",
      verificationCommand:
        "apksigner verify --verbose --print-certs /srv/releases/mobile/essence-spline-2.2.0.aab",
      verificationKind: "apksigner",
      verifierOwner: "Mobile Platform",
      workingDirectory: "/srv/releases/mobile",
      startedAt: "2026-05-26T10:11:00.000Z",
    },
    {
      artifactPath: "/srv/releases/mobile/EssenceSpline-2.2.0.ipa",
      artifactSha256: "sha256:ios-ipa-artifact",
      exitCode: 0,
      finishedAt: "2026-05-26T10:14:55.000Z",
      platform: "ios",
      stderrHash: "sha256:ios-stderr-empty",
      stdoutHash: "sha256:ios-codesign-stdout",
      transcriptHash: "sha256:ios-codesign-transcript",
      verificationCommand:
        "codesign --verify --deep --strict /srv/releases/mobile/EssenceSpline-2.2.0.ipa",
      verificationKind: "ios-codesign",
      verifierOwner: "Mobile Platform",
      workingDirectory: "/srv/releases/mobile",
      startedAt: "2026-05-26T10:14:00.000Z",
    },
  ],
  generatedAt: "2026-05-26T11:00:00.000Z",
  releaseCandidateId: "native-2.2.0-runtime-execution",
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.verificationScore, 100);
assert.equal(report.summary.releaseBlocked, false);
assert.equal(report.summary.readyCount, 5);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.artifactPathReadyCount, 5);
assert.equal(report.summary.commandReadyCount, 5);
assert.equal(report.summary.exitCodeReadyCount, 5);
assert.equal(report.summary.transcriptReadyCount, 5);
assert.ok(report.summary.verificationHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.platform),
  ["windows", "macos", "linux", "android", "ios"],
);
assert.ok(report.rows.every((row) => row.artifactPathReady));
assert.ok(report.rows.every((row) => row.artifactChecksumReady));
assert.ok(report.rows.every((row) => row.commandReady));
assert.ok(report.rows.every((row) => row.exitCodeReady));
assert.ok(report.rows.every((row) => row.transcriptReady));
assert.match(
  report.csvContent,
  /^platform,status,artifact_path,verification_kind,artifact_path_ready,command_ready,exit_code_ready,transcript_ready,verification_hash,next_action/,
);
assert.ok(report.jsonContent.includes("android-apksigner-transcript"));
assert.equal(
  report.csvFileName,
  "essence-runtime-external-artifact-verification-command-runner-native-2-2-0-runtime-execution-20260526.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-external-artifact-verification-command-runner-native-2-2-0-runtime-execution-20260526.json",
);
assert.equal(report.files.length, 2);

const blocked = createExternalArtifactVerificationCommandRunner({
  commands: [
    {
      artifactPath: "",
      artifactSha256: "",
      exitCode: 1,
      finishedAt: "",
      platform: "windows",
      stderrHash: "",
      stdoutHash: "",
      transcriptHash: "",
      verificationCommand: "signtool verify /pa /tw /v Essence_2.2.0_x64-setup.exe",
      verificationKind: "authenticode",
      verifierOwner: "",
      workingDirectory: "",
      startedAt: "",
    },
  ],
  releaseCandidateId: "native-2.2.0-runtime-execution",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.verificationScore < 50);
assert.equal(blocked.summary.blockedCount, 5);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.artifactPathReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.exitCodeReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "macos")?.status, "blocked");
assert.equal(blocked.rows.find((row) => row.platform === "android")?.transcriptReady, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked external artifact verification command runner/,
);

console.log("external artifact verification command runner smoke passed");
