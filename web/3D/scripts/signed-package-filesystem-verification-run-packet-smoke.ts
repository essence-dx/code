import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runSignedPackageFilesystemVerificationRunPacket } from "@/features/projects/signed-package-filesystem-verification-run-packet";

const generatedAt = "2026-06-01T10:00:00.000Z";
const releaseCandidateId = "native-2.5.0-runtime-integration";
const workspaceId = "Essence Runtime";
const tempRoot = join(tmpdir(), `essence-spline-filesystem-verification-${Date.now()}`);

function sha256ForBytes(value: string) {
  return `sha256:${createHash("sha256").update(Buffer.from(value)).digest("hex")}`;
}

await mkdir(tempRoot, { recursive: true });

try {
  const windowsArtifact = join(tempRoot, "EssenceSpline-2.5.0-setup.exe");
  const macosArtifact = join(tempRoot, "EssenceSpline-2.5.0.dmg");
  const linuxArtifact = join(tempRoot, "EssenceSpline-2.5.0.AppImage");

  await writeFile(windowsArtifact, Buffer.from("windows signed installer bytes"));
  await writeFile(macosArtifact, Buffer.from("macos signed dmg bytes"));
  await writeFile(linuxArtifact, Buffer.from("linux signed appimage bytes"));

  const report = await runSignedPackageFilesystemVerificationRunPacket({
    artifacts: [
      {
        artifactName: "EssenceSpline-2.5.0-setup.exe",
        expectedSha256: sha256ForBytes("windows signed installer bytes"),
        localOutputPath: windowsArtifact,
        ownerAcknowledgedAt: "2026-06-01T10:20:00.000Z",
        ownerAcknowledgementHash: "sha256:windows-owner-ack",
        platform: "windows",
        signatureCommand: "signtool verify /pa /tw /v EssenceSpline-2.5.0-setup.exe",
        signatureExitCode: 0,
        signatureFinishedAt: "2026-06-01T10:01:18.000Z",
        signatureStartedAt: "2026-06-01T10:01:00.000Z",
        signatureStderr: "",
        signatureStdout: "Successfully verified: EssenceSpline-2.5.0-setup.exe",
        uploadDestinationUrl:
          "https://downloads.example.com/native/windows/EssenceSpline-2.5.0-setup.exe",
        verifierOwner: "Native Release",
      },
      {
        artifactName: "EssenceSpline-2.5.0.dmg",
        expectedSha256: sha256ForBytes("macos signed dmg bytes"),
        localOutputPath: macosArtifact,
        ownerAcknowledgedAt: "2026-06-01T10:24:00.000Z",
        ownerAcknowledgementHash: "sha256:macos-owner-ack",
        platform: "macos",
        signatureCommand: "codesign --verify --deep --strict EssenceSpline-2.5.0.dmg",
        signatureExitCode: 0,
        signatureFinishedAt: "2026-06-01T10:05:40.000Z",
        signatureStartedAt: "2026-06-01T10:05:00.000Z",
        signatureStderr: "",
        signatureStdout: "EssenceSpline-2.5.0.dmg: valid on disk",
        uploadDestinationUrl:
          "https://downloads.example.com/native/macos/EssenceSpline-2.5.0.dmg",
        verifierOwner: "Desktop Platform",
      },
      {
        artifactName: "EssenceSpline-2.5.0.AppImage",
        expectedSha256: sha256ForBytes("linux signed appimage bytes"),
        localOutputPath: linuxArtifact,
        ownerAcknowledgedAt: "2026-06-01T10:28:00.000Z",
        ownerAcknowledgementHash: "sha256:linux-owner-ack",
        platform: "linux",
        signatureCommand: "cosign verify-blob EssenceSpline-2.5.0.AppImage",
        signatureExitCode: 0,
        signatureFinishedAt: "2026-06-01T10:09:30.000Z",
        signatureStartedAt: "2026-06-01T10:09:00.000Z",
        signatureStderr: "",
        signatureStdout: "Verified OK",
        uploadDestinationUrl:
          "https://downloads.example.com/native/linux/EssenceSpline-2.5.0.AppImage",
        verifierOwner: "Native Release",
      },
    ],
    generatedAt,
    releaseCandidateId,
    uploadProbe: async ({ uploadDestinationUrl }) => ({
      checkedAt: "2026-06-01T10:30:00.000Z",
      reachable: uploadDestinationUrl.startsWith("https://downloads.example.com/"),
      statusCode: 200,
    }),
    workspaceId,
  });

  assert.equal(report.summary.status, "ready");
  assert.equal(report.summary.releaseBlocked, false);
  assert.equal(report.summary.verificationScore, 100);
  assert.equal(report.summary.readyCount, 3);
  assert.equal(report.summary.blockedCount, 0);
  assert.equal(report.summary.reviewCount, 0);
  assert.equal(report.summary.localOutputReadyCount, 3);
  assert.equal(report.summary.sha256MatchCount, 3);
  assert.equal(report.summary.signatureTranscriptReadyCount, 3);
  assert.equal(report.summary.uploadReachableCount, 3);
  assert.equal(report.summary.ownerAcknowledgedCount, 3);
  assert.ok(report.summary.verificationHash.startsWith("sha256:"));
  assert.deepEqual(
    report.rows.map((row) => row.platform),
    ["windows", "macos", "linux"],
  );
  assert.ok(report.rows.every((row) => row.fileExists));
  assert.ok(report.rows.every((row) => row.actualSha256 === row.expectedSha256));
  assert.ok(report.rows.every((row) => row.sha256Matches));
  assert.ok(report.rows.every((row) => row.signatureTranscriptReady));
  assert.ok(report.rows.every((row) => row.uploadReachable));
  assert.ok(report.rows.every((row) => row.ownerAcknowledged));
  assert.match(
    report.csvContent,
    /^platform,status,artifact_name,local_output_path,file_exists,sha256_matches,signature_transcript_ready,upload_reachable,owner_acknowledged,verification_hash,next_action/,
  );
  assert.ok(report.jsonContent.includes("Successfully verified"));
  assert.equal(
    report.csvFileName,
    "essence-runtime-signed-package-filesystem-verification-run-packet-native-2-5-0-runtime-integration-20260601.csv",
  );
  assert.equal(
    report.jsonFileName,
    "essence-runtime-signed-package-filesystem-verification-run-packet-native-2-5-0-runtime-integration-20260601.json",
  );
  assert.equal(report.files.length, 2);

  const blocked = await runSignedPackageFilesystemVerificationRunPacket({
    artifacts: [
      {
        artifactName: "EssenceSpline-2.5.0-setup.exe",
        expectedSha256: "sha256:not-the-file-hash",
        localOutputPath: windowsArtifact,
        ownerAcknowledgedAt: "",
        ownerAcknowledgementHash: "",
        platform: "windows",
        signatureCommand: "signtool verify /pa /tw /v EssenceSpline-2.5.0-setup.exe",
        signatureExitCode: 1,
        signatureFinishedAt: "",
        signatureStartedAt: "",
        signatureStderr: "signature verification failed",
        signatureStdout: "",
        uploadDestinationUrl: "https://downloads.example.com/native/windows/missing.exe",
        verifierOwner: "",
      },
    ],
    generatedAt,
    releaseCandidateId,
    uploadProbe: async () => ({
      checkedAt: "",
      reachable: false,
      statusCode: 404,
    }),
    workspaceId,
  });

  assert.equal(blocked.summary.status, "blocked");
  assert.equal(blocked.summary.releaseBlocked, true);
  assert.ok(blocked.summary.verificationScore < 50);
  assert.equal(blocked.summary.blockedCount, 3);
  assert.equal(blocked.summary.sha256MatchCount, 0);
  assert.equal(
    blocked.rows.find((row) => row.platform === "windows")?.sha256Matches,
    false,
  );
  assert.equal(
    blocked.rows.find((row) => row.platform === "macos")?.fileExists,
    false,
  );
  assert.equal(
    blocked.rows.find((row) => row.platform === "linux")?.uploadReachable,
    false,
  );
  assert.match(
    blocked.summary.nextAction,
    /Resolve blocked signed package filesystem verification run packet/,
  );
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}

console.log("signed package filesystem verification run packet smoke passed");
