import { strict as assert } from "node:assert";
import { createNativeSignedPackageDistributionManifestProof } from "@/features/projects/native-signed-package-distribution-manifest-proof";

const proof = createNativeSignedPackageDistributionManifestProof({
  generatedAt: "2026-05-18T21:00:00.000Z",
  manifests: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      artifactSha256: "sha256:windows-artifact",
      artifactUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_x64-setup.exe",
      attestationSha256: "sha256:windows-attestation",
      checksumAttested: true,
      manifestSha256: "sha256:windows-manifest",
      manifestUrl: "https://updates.essence-spline.app/windows/latest.json",
      platform: "windows",
      releaseChannel: "stable",
      updaterManifestReferencesArtifact: true,
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      artifactSha256: "sha256:macos-artifact",
      artifactUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_aarch64.dmg",
      attestationSha256: "sha256:macos-attestation",
      checksumAttested: true,
      manifestSha256: "sha256:macos-manifest",
      manifestUrl: "https://updates.essence-spline.app/darwin/latest.json",
      platform: "macos",
      releaseChannel: "stable",
      updaterManifestReferencesArtifact: true,
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      artifactSha256: "sha256:linux-artifact",
      artifactUrl: "https://blob.vercel-storage.com/native/essence-spline_1.4.0_amd64.AppImage",
      attestationSha256: "sha256:linux-attestation",
      checksumAttested: true,
      manifestSha256: "sha256:linux-manifest",
      manifestUrl: "https://updates.essence-spline.app/linux/latest.json",
      platform: "linux",
      releaseChannel: "stable",
      updaterManifestReferencesArtifact: true,
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  requiredReleaseChannel: "stable",
  workspaceId: "Essence Runtime",
});

assert.equal(proof.summary.status, "ready");
assert.equal(proof.summary.proofScore, 100);
assert.equal(proof.summary.readyCount, 3);
assert.equal(proof.summary.blockedCount, 0);
assert.equal(proof.summary.reviewCount, 0);
assert.equal(proof.summary.channelMismatchCount, 0);
assert.ok(proof.summary.proofHash.startsWith("sha256:"));
assert.deepEqual(
  proof.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(proof.rows.every((row) => row.artifactHosted));
assert.ok(proof.rows.every((row) => row.manifestLinked));
assert.ok(proof.rows.every((row) => row.checksumAttested));
assert.ok(proof.rows.every((row) => row.channelReady));
assert.match(
  proof.csvContent,
  /^platform,status,release_channel,artifact_hosted,manifest_linked,checksum_attested,channel_ready,proof_hash,next_action/,
);
assert.ok(proof.jsonContent.includes("https://updates.essence-spline.app/linux/latest.json"));
assert.equal(proof.csvFileName, "essence-runtime-native-signed-package-distribution-manifest-proof-native-1-4-0-stable-20260518.csv");
assert.equal(proof.jsonFileName, "essence-runtime-native-signed-package-distribution-manifest-proof-native-1-4-0-stable-20260518.json");
assert.equal(proof.files.length, 2);

const blocked = createNativeSignedPackageDistributionManifestProof({
  manifests: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      artifactSha256: "",
      artifactUrl: "",
      attestationSha256: "",
      checksumAttested: false,
      manifestSha256: "",
      manifestUrl: "",
      platform: "windows",
      releaseChannel: "staging",
      updaterManifestReferencesArtifact: false,
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  requiredReleaseChannel: "stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.proofScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.summary.channelMismatchCount, 1);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.manifestLinked, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native signed package distribution manifest proof/);

console.log("native signed package distribution manifest proof smoke passed");
