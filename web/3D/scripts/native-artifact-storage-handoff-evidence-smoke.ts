import { strict as assert } from "node:assert";
import { createNativeArtifactStorageHandoffEvidence } from "@/features/projects/native-artifact-storage-handoff-evidence";

const readyHandoff = createNativeArtifactStorageHandoffEvidence({
  artifacts: [
    {
      accessPolicy: "private-signed-url",
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      artifactSha256: "sha256:windows-artifact",
      manifestReferencesArtifact: true,
      manifestSha256: "sha256:windows-manifest",
      manifestUrl: "https://updates.essence-spline.app/windows/latest.json",
      platform: "windows",
      retentionDays: 90,
      storageProvider: "vercel-blob",
      storageUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_x64-setup.exe",
      uploadedAt: "2026-05-18T17:00:00.000Z",
    },
    {
      accessPolicy: "private-signed-url",
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      artifactSha256: "sha256:macos-artifact",
      manifestReferencesArtifact: true,
      manifestSha256: "sha256:macos-manifest",
      manifestUrl: "https://updates.essence-spline.app/darwin/latest.json",
      platform: "macos",
      retentionDays: 90,
      storageProvider: "vercel-blob",
      storageUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_aarch64.dmg",
      uploadedAt: "2026-05-18T17:00:00.000Z",
    },
    {
      accessPolicy: "private-signed-url",
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      artifactSha256: "sha256:linux-artifact",
      manifestReferencesArtifact: true,
      manifestSha256: "sha256:linux-manifest",
      manifestUrl: "https://updates.essence-spline.app/linux/latest.json",
      platform: "linux",
      retentionDays: 90,
      storageProvider: "vercel-blob",
      storageUrl: "https://blob.vercel-storage.com/native/essence-spline_1.4.0_amd64.AppImage",
      uploadedAt: "2026-05-18T17:00:00.000Z",
    },
  ],
  generatedAt: "2026-05-18T17:00:00.000Z",
  provider: "vercel-blob",
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(readyHandoff.summary.status, "ready");
assert.equal(readyHandoff.summary.handoffScore, 100);
assert.equal(readyHandoff.summary.readyCount, 3);
assert.equal(readyHandoff.summary.blockedCount, 0);
assert.equal(readyHandoff.summary.reviewCount, 0);
assert.ok(readyHandoff.summary.handoffHash.startsWith("sha256:"));
assert.deepEqual(
  readyHandoff.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(readyHandoff.rows.every((row) => row.checksumVerified));
assert.ok(readyHandoff.rows.every((row) => row.retentionReady));
assert.ok(readyHandoff.rows.every((row) => row.updaterManifestLinked));
assert.match(
  readyHandoff.csvContent,
  /^platform,status,artifact_file_name,storage_provider,checksum_verified,retention_ready,updater_manifest_linked,handoff_hash,next_action/,
);
assert.ok(readyHandoff.jsonContent.includes("https://blob.vercel-storage.com/native/essence-spline_1.4.0_amd64.AppImage"));
assert.equal(readyHandoff.csvFileName, "essence-runtime-native-artifact-storage-handoff-native-1-4-0-stable-20260518.csv");
assert.equal(readyHandoff.jsonFileName, "essence-runtime-native-artifact-storage-handoff-native-1-4-0-stable-20260518.json");
assert.equal(readyHandoff.files.length, 2);

const blockedHandoff = createNativeArtifactStorageHandoffEvidence({
  artifacts: [
    {
      accessPolicy: "manual",
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      artifactSha256: "",
      manifestReferencesArtifact: false,
      manifestSha256: "",
      manifestUrl: "",
      platform: "windows",
      retentionDays: 7,
      storageProvider: "manual",
      storageUrl: "",
      uploadedAt: null,
    },
  ],
  provider: "manual",
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blockedHandoff.summary.status, "blocked");
assert.ok(blockedHandoff.summary.handoffScore < 50);
assert.equal(blockedHandoff.summary.blockedCount, 3);
assert.equal(blockedHandoff.rows.find((row) => row.platform === "windows")?.updaterManifestLinked, false);
assert.match(blockedHandoff.summary.nextAction, /Resolve blocked native artifact storage handoff evidence/);

console.log("native artifact storage handoff evidence smoke passed");
