import { strict as assert } from "node:assert";
import { createNativeSignedArtifactIntakeQueue } from "@/features/projects/native-signed-artifact-intake-queue";

const queue = createNativeSignedArtifactIntakeQueue({
  generatedAt: "2026-05-19T06:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  artifacts: [
    {
      artifactSha256: "sha256:windows-ev-installer",
      fileName: "Essence_1.4.0_x64-setup.exe",
      platform: "windows",
      receivedAt: "2026-05-20T09:00:00.000Z",
      revocationCheckedAt: "2026-05-20T09:05:00.000Z",
      revocationStatus: "clear",
      signerIdentity: "Essence Runtime LLC",
      signerKeyFingerprint: "SHA256:11:22:33:44",
      timestampAuthority: "DigiCert Timestamp 2026",
      timestampedAt: "2026-05-20T09:03:00.000Z",
      uploadOwner: "Release Engineering",
    },
    {
      artifactSha256: "sha256:macos-notarized-dmg",
      fileName: "Essence_1.4.0_aarch64.dmg",
      platform: "macos",
      receivedAt: "2026-05-20T10:00:00.000Z",
      revocationCheckedAt: "2026-05-20T10:06:00.000Z",
      revocationStatus: "clear",
      signerIdentity: "Developer ID Application: Essence Runtime LLC",
      signerKeyFingerprint: "SHA256:AA:BB:CC:DD",
      timestampAuthority: "Apple Developer Timestamp",
      timestampedAt: "2026-05-20T10:04:00.000Z",
      uploadOwner: "Desktop Platform",
    },
    {
      artifactSha256: "sha256:linux-signed-appimage",
      fileName: "essence-spline_1.4.0_amd64.AppImage",
      platform: "linux",
      receivedAt: "2026-05-20T11:00:00.000Z",
      revocationCheckedAt: "2026-05-20T11:07:00.000Z",
      revocationStatus: "clear",
      signerIdentity: "Essence Runtime Release Key",
      signerKeyFingerprint: "SHA256:55:66:77:88",
      timestampAuthority: "Sigstore Rekor",
      timestampedAt: "2026-05-20T11:05:00.000Z",
      uploadOwner: "Release Engineering",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(queue.summary.status, "ready");
assert.equal(queue.summary.intakeScore, 100);
assert.equal(queue.summary.readyCount, 3);
assert.equal(queue.summary.blockedCount, 0);
assert.equal(queue.summary.reviewCount, 0);
assert.equal(queue.summary.checksumReadyCount, 3);
assert.equal(queue.summary.signerReadyCount, 3);
assert.equal(queue.summary.timestampReadyCount, 3);
assert.equal(queue.summary.revocationClearCount, 3);
assert.ok(queue.summary.intakeHash.startsWith("sha256:"));
assert.deepEqual(
  queue.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(queue.rows.every((row) => row.checksumReady));
assert.ok(queue.rows.every((row) => row.signerReady));
assert.ok(queue.rows.every((row) => row.timestampReady));
assert.ok(queue.rows.every((row) => row.revocationReady));
assert.match(
  queue.csvContent,
  /^platform,status,file_name,checksum_ready,signer_ready,timestamp_ready,revocation_ready,intake_hash,next_action/,
);
assert.ok(queue.jsonContent.includes("windows-ev-installer"));
assert.equal(queue.csvFileName, "essence-runtime-native-signed-artifact-intake-queue-native-1-4-0-stable-20260519.csv");
assert.equal(queue.jsonFileName, "essence-runtime-native-signed-artifact-intake-queue-native-1-4-0-stable-20260519.json");
assert.equal(queue.files.length, 2);

const blocked = createNativeSignedArtifactIntakeQueue({
  artifacts: [
    {
      artifactSha256: "",
      fileName: "",
      platform: "windows",
      receivedAt: "",
      revocationCheckedAt: "",
      revocationStatus: "unknown",
      signerIdentity: "",
      signerKeyFingerprint: "",
      timestampAuthority: "",
      timestampedAt: "",
      uploadOwner: "",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.intakeScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.checksumReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.signerReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.revocationReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native signed artifact intake queue/);

console.log("native signed artifact intake queue smoke passed");
