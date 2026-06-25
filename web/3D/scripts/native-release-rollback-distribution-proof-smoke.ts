import { strict as assert } from "node:assert";
import { createNativeReleaseRollbackDistributionProof } from "@/features/projects/native-release-rollback-distribution-proof";

const proof = createNativeReleaseRollbackDistributionProof({
  generatedAt: "2026-05-18T23:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  rollbacks: [
    {
      channelRestoreCommand: "vercel blob cp native/windows/1.3.9/latest.json native/windows/stable/latest.json",
      channelRestoreEvidenceHash: "sha256:windows-channel-restore",
      operator: "Release operator",
      platform: "windows",
      postRollbackUpdaterVerified: true,
      previousStableArtifactFileName: "Essence_1.3.9_x64-setup.exe",
      previousStableArtifactSha256: "sha256:windows-previous-artifact",
      previousStableManifestSha256: "sha256:windows-previous-manifest",
      rollbackWindowMinutes: 12,
      updaterVerificationHash: "sha256:windows-updater-verified",
    },
    {
      channelRestoreCommand: "vercel blob cp native/macos/1.3.9/latest.json native/macos/stable/latest.json",
      channelRestoreEvidenceHash: "sha256:macos-channel-restore",
      operator: "Release operator",
      platform: "macos",
      postRollbackUpdaterVerified: true,
      previousStableArtifactFileName: "Essence_1.3.9_aarch64.dmg",
      previousStableArtifactSha256: "sha256:macos-previous-artifact",
      previousStableManifestSha256: "sha256:macos-previous-manifest",
      rollbackWindowMinutes: 14,
      updaterVerificationHash: "sha256:macos-updater-verified",
    },
    {
      channelRestoreCommand: "vercel blob cp native/linux/1.3.9/latest.json native/linux/stable/latest.json",
      channelRestoreEvidenceHash: "sha256:linux-channel-restore",
      operator: "Release operator",
      platform: "linux",
      postRollbackUpdaterVerified: true,
      previousStableArtifactFileName: "essence-spline_1.3.9_amd64.AppImage",
      previousStableArtifactSha256: "sha256:linux-previous-artifact",
      previousStableManifestSha256: "sha256:linux-previous-manifest",
      rollbackWindowMinutes: 15,
      updaterVerificationHash: "sha256:linux-updater-verified",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(proof.summary.status, "ready");
assert.equal(proof.summary.proofScore, 100);
assert.equal(proof.summary.readyCount, 3);
assert.equal(proof.summary.blockedCount, 0);
assert.equal(proof.summary.reviewCount, 0);
assert.equal(proof.summary.restoreCommandCount, 3);
assert.ok(proof.summary.proofHash.startsWith("sha256:"));
assert.deepEqual(
  proof.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(proof.rows.every((row) => row.previousStableArtifactLinked));
assert.ok(proof.rows.every((row) => row.channelRestoreCommandReady));
assert.ok(proof.rows.every((row) => row.postRollbackUpdaterVerified));
assert.ok(proof.rows.every((row) => row.updaterVerificationAttached));
assert.match(
  proof.csvContent,
  /^platform,status,previous_stable_artifact_linked,channel_restore_command_ready,post_rollback_updater_verified,updater_verification_attached,rollback_hash,next_action/,
);
assert.ok(proof.jsonContent.includes("Essence_1.3.9_x64-setup.exe"));
assert.equal(proof.csvFileName, "essence-runtime-native-release-rollback-distribution-proof-native-1-4-0-stable-20260518.csv");
assert.equal(proof.jsonFileName, "essence-runtime-native-release-rollback-distribution-proof-native-1-4-0-stable-20260518.json");
assert.equal(proof.files.length, 2);

const blocked = createNativeReleaseRollbackDistributionProof({
  releaseCandidateId: "native-1.4.0-stable",
  rollbacks: [
    {
      channelRestoreCommand: "",
      channelRestoreEvidenceHash: "",
      operator: "",
      platform: "windows",
      postRollbackUpdaterVerified: false,
      previousStableArtifactFileName: "",
      previousStableArtifactSha256: "",
      previousStableManifestSha256: "",
      rollbackWindowMinutes: 0,
      updaterVerificationHash: "",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.proofScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.channelRestoreCommandReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.postRollbackUpdaterVerified, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native release rollback distribution proof/);

console.log("native release rollback distribution proof smoke passed");
