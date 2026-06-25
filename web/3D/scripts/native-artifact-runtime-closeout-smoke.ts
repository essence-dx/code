import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";
import { createNativeArtifactRuntimeReleaseBlockerMatrix } from "@/features/projects/native-artifact-runtime-release-blocker-matrix";
import { createNativeArtifactRuntimeRemediationQueue } from "@/features/projects/native-artifact-runtime-remediation-queue";
import { createNativeCadKernelRuntimeCloseout } from "@/features/projects/native-cad-kernel-runtime-closeout";
import { createNativeSignedArtifactExternalHandoffCloseout } from "@/features/projects/native-signed-artifact-external-handoff-closeout";

function digest(values: string[]) {
  return `sha256:${createHash("sha256").update(values.join("|")).digest("hex")}`;
}

const releaseCandidateId = "native-1.4.0-stable";
const workspaceId = "Essence Runtime";

const signedHandoff = createNativeSignedArtifactExternalHandoffCloseout({
  generatedAt: "2026-05-19T02:00:00.000Z",
  handoffs: [
    {
      artifactAttachmentLocation: "Vercel Blob native/windows/1.4.0/Essence_1.4.0_x64-setup.exe",
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      blockingGate: "windows-certificate-backed-installer",
      certificateAuthority: "DigiCert EV Code Signing",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/windows/evidence.json",
      gateBlockedWithoutArtifact: true,
      handoffOwner: "Release Engineering",
      ownerAcknowledged: true,
      platform: "windows",
      releaseApprovalRequired: true,
      signerIdentity: "Essence Runtime LLC",
      targetAttachedAt: "2026-05-20T09:00:00.000Z",
    },
    {
      artifactAttachmentLocation: "Vercel Blob native/macos/1.4.0/Essence_1.4.0_aarch64.dmg",
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      blockingGate: "macos-notarized-dmg",
      certificateAuthority: "Apple Developer ID",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/macos/evidence.json",
      gateBlockedWithoutArtifact: true,
      handoffOwner: "Desktop Platform",
      ownerAcknowledged: true,
      platform: "macos",
      releaseApprovalRequired: true,
      signerIdentity: "Essence Runtime LLC",
      targetAttachedAt: "2026-05-20T10:00:00.000Z",
    },
    {
      artifactAttachmentLocation: "Vercel Blob native/linux/1.4.0/essence-spline_1.4.0_amd64.AppImage",
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      blockingGate: "linux-appimage-signature",
      certificateAuthority: "GPG release signing key",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/linux/evidence.json",
      gateBlockedWithoutArtifact: true,
      handoffOwner: "Release Engineering",
      ownerAcknowledged: true,
      platform: "linux",
      releaseApprovalRequired: true,
      signerIdentity: "Essence Runtime LLC",
      targetAttachedAt: "2026-05-20T11:00:00.000Z",
    },
  ],
  releaseCandidateId,
  workspaceId,
});

const cadCloseout = createNativeCadKernelRuntimeCloseout({
  generatedAt: "2026-05-19T03:00:00.000Z",
  releaseCandidateId,
  runtimes: [
    {
      adapterId: "freecad",
      bundledRuntimePath: "resources/cad/freecad/bin/freecadcmd",
      conversionFixtureCount: 8,
      customerFallbackMessage: "CAD conversion temporarily unavailable. STL import remains available while support reviews the STEP/IGES file.",
      fixtureDiagnosticsHash: "sha256:freecad-fixture-diagnostics",
      installedVersion: "1.0.2",
      outputArtifactHash: "sha256:freecad-output-artifacts",
      runtimePathVerified: true,
      sandboxMemoryMb: 2048,
      sandboxTimeoutSeconds: 120,
      sandboxedExecutionVerified: true,
    },
    {
      adapterId: "occt",
      bundledRuntimePath: "resources/cad/occt/bin/essence-occt-convert",
      conversionFixtureCount: 10,
      customerFallbackMessage: "Native CAD conversion is unavailable for this file. The import repair wizard can continue with mesh fallback output.",
      fixtureDiagnosticsHash: "sha256:occt-fixture-diagnostics",
      installedVersion: "7.9.1",
      outputArtifactHash: "sha256:occt-output-artifacts",
      runtimePathVerified: true,
      sandboxMemoryMb: 4096,
      sandboxTimeoutSeconds: 180,
      sandboxedExecutionVerified: true,
    },
  ],
  workspaceId,
});

const blockerMatrix = createNativeArtifactRuntimeReleaseBlockerMatrix({
  blockers: [
    {
      blockerId: "signed-artifacts-windows",
      cadRuntimeReady: true,
      dueAt: "2026-05-20T09:00:00.000Z",
      evidenceHash: "sha256:windows-signed-artifact-closeout",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/windows/evidence.json",
      owner: "Release Engineering",
      platform: "windows",
      releaseApprovalReady: true,
      signedArtifactReady: true,
      updaterDistributionReady: true,
    },
    {
      blockerId: "cad-runtime-macos",
      cadRuntimeReady: true,
      dueAt: "2026-05-20T10:00:00.000Z",
      evidenceHash: "sha256:macos-cad-runtime-closeout",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/macos/cad-runtime.json",
      owner: "Desktop Platform",
      platform: "macos",
      releaseApprovalReady: true,
      signedArtifactReady: true,
      updaterDistributionReady: true,
    },
    {
      blockerId: "linux-release-approval",
      cadRuntimeReady: true,
      dueAt: "2026-05-20T11:00:00.000Z",
      evidenceHash: "sha256:linux-release-approval",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/linux/approval.json",
      owner: "Release Manager",
      platform: "linux",
      releaseApprovalReady: true,
      signedArtifactReady: true,
      updaterDistributionReady: true,
    },
  ],
  generatedAt: "2026-05-19T04:00:00.000Z",
  releaseCandidateId,
  workspaceId,
});

const remediationQueue = createNativeArtifactRuntimeRemediationQueue({
  generatedAt: "2026-05-19T05:00:00.000Z",
  items: [
    {
      blockerId: "windows-signed-artifact-certificate",
      dueAt: "2026-05-20T09:00:00.000Z",
      escalationRoute: "release-engineering-oncall",
      evidencePacketHash: "sha256:windows-remediation-packet",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/windows/remediation.json",
      owner: "Release Engineering",
      platform: "windows",
      priority: "critical",
      remediationAction: "Attach EV signed installer and timestamp evidence before final native release approval.",
      unresolvedBlocker: "Missing certificate-backed Windows installer attachment.",
    },
    {
      blockerId: "macos-notarization-ticket",
      dueAt: "2026-05-20T10:00:00.000Z",
      escalationRoute: "desktop-platform-lead",
      evidencePacketHash: "sha256:macos-remediation-packet",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/macos/remediation.json",
      owner: "Desktop Platform",
      platform: "macos",
      priority: "high",
      remediationAction: "Attach notarization ticket, stapled DMG receipt, and updater manifest checksum before release closeout.",
      unresolvedBlocker: "Missing notarized macOS DMG evidence.",
    },
    {
      blockerId: "linux-cad-runtime-fallback",
      dueAt: "2026-05-20T11:00:00.000Z",
      escalationRoute: "cad-runtime-owner",
      evidencePacketHash: "sha256:linux-remediation-packet",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/linux/remediation.json",
      owner: "CAD Runtime",
      platform: "linux",
      priority: "high",
      remediationAction: "Attach AppImage signing evidence and CAD fallback validation packet before release closeout.",
      unresolvedBlocker: "Missing Linux signed package plus CAD runtime fallback packet.",
    },
  ],
  releaseCandidateId,
  workspaceId,
});

const closeoutReports = [
  {
    artifactCount: signedHandoff.files.length,
    hash: signedHandoff.summary.closeoutHash,
    name: "signed-artifact-handoff",
    releaseCandidateId: signedHandoff.releaseCandidateId,
    score: signedHandoff.summary.closeoutScore,
    status: signedHandoff.summary.status,
  },
  {
    artifactCount: cadCloseout.files.length,
    hash: cadCloseout.summary.closeoutHash,
    name: "cad-runtime-closeout",
    releaseCandidateId: cadCloseout.releaseCandidateId,
    score: cadCloseout.summary.closeoutScore,
    status: cadCloseout.summary.status,
  },
  {
    artifactCount: blockerMatrix.files.length,
    hash: blockerMatrix.summary.matrixHash,
    name: "release-blocker-matrix",
    releaseCandidateId: blockerMatrix.releaseCandidateId,
    score: blockerMatrix.summary.matrixScore,
    status: blockerMatrix.summary.status,
  },
  {
    artifactCount: remediationQueue.files.length,
    hash: remediationQueue.summary.queueHash,
    name: "remediation-queue",
    releaseCandidateId: remediationQueue.releaseCandidateId,
    score: remediationQueue.summary.queueScore,
    status: remediationQueue.summary.status,
  },
];

const closeoutHash = digest(closeoutReports.map((report) => report.hash));

assert.deepEqual(
  closeoutReports.map((report) => report.releaseCandidateId),
  [releaseCandidateId, releaseCandidateId, releaseCandidateId, releaseCandidateId],
);
assert.deepEqual(
  closeoutReports.map((report) => report.score),
  [100, 100, 100, 100],
);
assert.deepEqual(
  closeoutReports.map((report) => report.artifactCount),
  [2, 2, 2, 2],
);
assert.deepEqual(
  closeoutReports.map((report) => report.name),
  ["signed-artifact-handoff", "cad-runtime-closeout", "release-blocker-matrix", "remediation-queue"],
);
assert.ok(closeoutReports.every((report) => report.hash.startsWith("sha256:")));
assert.equal(signedHandoff.summary.status, "ready");
assert.equal(cadCloseout.summary.status, "ready");
assert.equal(blockerMatrix.summary.status, "go");
assert.equal(remediationQueue.summary.status, "ready");
assert.ok(closeoutHash.startsWith("sha256:"));

const blockedHandoff = createNativeSignedArtifactExternalHandoffCloseout({
  handoffs: [],
  releaseCandidateId,
  workspaceId,
});
const blockedCad = createNativeCadKernelRuntimeCloseout({
  releaseCandidateId,
  requiredAdapters: ["freecad", "occt"],
  runtimes: [],
  workspaceId,
});
const blockedMatrix = createNativeArtifactRuntimeReleaseBlockerMatrix({
  blockers: [],
  releaseCandidateId,
  workspaceId,
});
const blockedQueue = createNativeArtifactRuntimeRemediationQueue({
  items: [],
  releaseCandidateId,
  workspaceId,
});

assert.equal(blockedHandoff.summary.status, "blocked");
assert.equal(blockedCad.summary.status, "blocked");
assert.equal(blockedMatrix.summary.status, "blocked");
assert.equal(blockedQueue.summary.status, "blocked");
assert.equal(blockedHandoff.summary.blockedCount, 3);
assert.equal(blockedCad.summary.blockedCount, 2);
assert.equal(blockedMatrix.summary.blockedCount, 3);
assert.equal(blockedQueue.summary.blockedCount, 3);

console.log("native artifact runtime closeout aggregate smoke passed", closeoutHash);
