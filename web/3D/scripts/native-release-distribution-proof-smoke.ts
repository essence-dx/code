import { strict as assert } from "node:assert";
import { createNativeCustomerPackageAvailabilityMonitor } from "@/features/projects/native-customer-package-availability-monitor";
import { createNativeReleaseRollbackDistributionProof } from "@/features/projects/native-release-rollback-distribution-proof";
import { createNativeSignedPackageDistributionManifestProof } from "@/features/projects/native-signed-package-distribution-manifest-proof";
import { createNativeUpdaterDownloadRehearsalEvidence } from "@/features/projects/native-updater-download-rehearsal-evidence";

const releaseCandidateId = "native-1.4.0-stable";
const workspaceId = "Essence Runtime";

const manifestProof = createNativeSignedPackageDistributionManifestProof({
  generatedAt: "2026-05-19T01:00:00.000Z",
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
  releaseCandidateId,
  requiredReleaseChannel: "stable",
  workspaceId,
});

const updaterRehearsal = createNativeUpdaterDownloadRehearsalEvidence({
  generatedAt: "2026-05-19T01:05:00.000Z",
  rehearsals: [
    {
      artifactSha256: "sha256:windows-artifact",
      byteRangeResumeVerified: true,
      checksumVerified: true,
      downloadUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_x64-setup.exe",
      expiredLinkHandled: true,
      finalByteCount: 128048128,
      manifestSha256: "sha256:windows-manifest",
      platform: "windows",
      rehearsalId: "windows-updater-download-20260519",
      resumedFromByte: 64000000,
    },
    {
      artifactSha256: "sha256:macos-artifact",
      byteRangeResumeVerified: true,
      checksumVerified: true,
      downloadUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_aarch64.dmg",
      expiredLinkHandled: true,
      finalByteCount: 154042368,
      manifestSha256: "sha256:macos-manifest",
      platform: "macos",
      rehearsalId: "macos-updater-download-20260519",
      resumedFromByte: 77000000,
    },
    {
      artifactSha256: "sha256:linux-artifact",
      byteRangeResumeVerified: true,
      checksumVerified: true,
      downloadUrl: "https://blob.vercel-storage.com/native/essence-spline_1.4.0_amd64.AppImage",
      expiredLinkHandled: true,
      finalByteCount: 116391936,
      manifestSha256: "sha256:linux-manifest",
      platform: "linux",
      rehearsalId: "linux-updater-download-20260519",
      resumedFromByte: 58000000,
    },
  ],
  releaseCandidateId,
  workspaceId,
});

const rollbackProof = createNativeReleaseRollbackDistributionProof({
  generatedAt: "2026-05-19T01:10:00.000Z",
  releaseCandidateId,
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
  workspaceId,
});

const availabilityMonitor = createNativeCustomerPackageAvailabilityMonitor({
  endpoints: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:windows-download-page-checksum",
      contentType: "text/html; charset=utf-8",
      endpointKind: "public-download-page",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:00.000Z",
      latencyMs: 420,
      platform: "windows",
      tlsValid: true,
      url: "https://essence-spline.com/download/windows",
    },
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:windows-updater-checksum",
      contentType: "application/json",
      endpointKind: "updater-endpoint",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:05.000Z",
      latencyMs: 280,
      platform: "windows",
      tlsValid: true,
      url: "https://updates.essence-spline.com/windows/stable/latest.json",
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:macos-download-page-checksum",
      contentType: "text/html; charset=utf-8",
      endpointKind: "public-download-page",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:10.000Z",
      latencyMs: 510,
      platform: "macos",
      tlsValid: true,
      url: "https://essence-spline.com/download/macos",
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:macos-updater-checksum",
      contentType: "application/json",
      endpointKind: "updater-endpoint",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:15.000Z",
      latencyMs: 310,
      platform: "macos",
      tlsValid: true,
      url: "https://updates.essence-spline.com/macos/stable/latest.json",
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:linux-download-page-checksum",
      contentType: "text/html; charset=utf-8",
      endpointKind: "public-download-page",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:20.000Z",
      latencyMs: 490,
      platform: "linux",
      tlsValid: true,
      url: "https://essence-spline.com/download/linux",
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:linux-updater-checksum",
      contentType: "application/json",
      endpointKind: "updater-endpoint",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:25.000Z",
      latencyMs: 320,
      platform: "linux",
      tlsValid: true,
      url: "https://updates.essence-spline.com/linux/stable/latest.json",
    },
    {
      artifactFileName: "essence-native-1.4.0-archive.zip",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:archive-mirror-checksum",
      contentType: "application/zip",
      endpointKind: "self-hosted-archive-mirror",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T01:15:30.000Z",
      latencyMs: 780,
      platform: "linux",
      tlsValid: true,
      url: "https://archive.essence-spline.com/native/1.4.0/essence-native-1.4.0-archive.zip",
    },
  ],
  generatedAt: "2026-05-19T01:16:00.000Z",
  releaseCandidateId,
  workspaceId,
});

const summaries = [
  manifestProof.summary,
  updaterRehearsal.summary,
  rollbackProof.summary,
  availabilityMonitor.summary,
];
const distributionHashes = [
  manifestProof.summary.proofHash,
  updaterRehearsal.summary.rehearsalHash,
  rollbackProof.summary.proofHash,
  availabilityMonitor.summary.monitorHash,
];
const exportFiles = [
  ...manifestProof.files,
  ...updaterRehearsal.files,
  ...rollbackProof.files,
  ...availabilityMonitor.files,
];

assert.ok(summaries.every((summary) => summary.status === "ready"));
assert.equal(manifestProof.summary.proofScore, 100);
assert.equal(updaterRehearsal.summary.rehearsalScore, 100);
assert.equal(rollbackProof.summary.proofScore, 100);
assert.equal(availabilityMonitor.summary.availabilityScore, 100);
assert.equal(manifestProof.summary.readyCount, 3);
assert.equal(updaterRehearsal.summary.readyCount, 3);
assert.equal(rollbackProof.summary.readyCount, 3);
assert.equal(availabilityMonitor.summary.readyCount, 7);
assert.ok(distributionHashes.every((hash) => hash.startsWith("sha256:")));
assert.equal(new Set(distributionHashes).size, 4);
assert.equal(exportFiles.length, 8);
assert.ok(exportFiles.every((file) => file.href.startsWith("data:")));
assert.ok(manifestProof.rows.every((row) => row.releaseChannel === "stable" && row.channelReady));
assert.ok(updaterRehearsal.rows.every((row) => row.byteRangeResumeVerified && row.expiredLinkHandled));
assert.ok(rollbackProof.rows.every((row) => row.channelRestoreCommandReady && row.postRollbackUpdaterVerified));
assert.ok(availabilityMonitor.rows.some((row) => row.endpointKind === "self-hosted-archive-mirror" && row.customerSafe));

console.log("native release distribution proof aggregate smoke passed");
