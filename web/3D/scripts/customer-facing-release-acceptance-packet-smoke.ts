import { strict as assert } from "node:assert";

import { createCustomerFacingReleaseAcceptancePacket } from "@/features/projects/customer-facing-release-acceptance-packet";
import { createNativeCadKernelDeliveryEnforcementVerifier } from "@/features/projects/native-cad-kernel-delivery-enforcement-verifier";
import { createNativeReleaseEnforcementLedger } from "@/features/projects/native-release-enforcement-ledger";
import { createProductionInstallLaunchEvidencePacket } from "@/features/projects/production-install-launch-evidence-packet";

const generatedAt = "2026-05-25T12:00:00.000Z";
const releaseCandidateId = "native-2.1.0-enforcement";
const workspaceId = "Essence Runtime";

const signedArtifactEnforcement = createNativeReleaseEnforcementLedger({
  artifacts: [
    {
      artifactName: "Essence_2.1.0_x64-setup.exe",
      certificateFingerprint: "sha256:windows-ev-certificate-fingerprint",
      enforcementOwner: "Release Engineering",
      platform: "windows",
      revocationCheckedAt: "2026-05-25T08:12:00.000Z",
      revocationStatus: "clear",
      signedPackageHash: "sha256:windows-signed-package",
      timestampAuthority: "DigiCert Timestamp 2026",
      timestampProofHash: "sha256:windows-timestamp-proof",
      timestampedAt: "2026-05-25T08:07:00.000Z",
    },
    {
      artifactName: "Essence_2.1.0_aarch64.dmg",
      certificateFingerprint: "sha256:macos-developer-id-fingerprint",
      enforcementOwner: "Desktop Platform",
      platform: "macos",
      revocationCheckedAt: "2026-05-25T08:22:00.000Z",
      revocationStatus: "clear",
      signedPackageHash: "sha256:macos-notarized-package",
      timestampAuthority: "Apple Developer Timestamp",
      timestampProofHash: "sha256:macos-timestamp-proof",
      timestampedAt: "2026-05-25T08:17:00.000Z",
    },
    {
      artifactName: "essence-spline_2.1.0_amd64.AppImage",
      certificateFingerprint: "sha256:linux-release-key-fingerprint",
      enforcementOwner: "Release Engineering",
      platform: "linux",
      revocationCheckedAt: "2026-05-25T08:32:00.000Z",
      revocationStatus: "clear",
      signedPackageHash: "sha256:linux-sigstore-package",
      timestampAuthority: "Sigstore Rekor",
      timestampProofHash: "sha256:linux-timestamp-proof",
      timestampedAt: "2026-05-25T08:27:00.000Z",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

const cadRuntimeEnforcement = createNativeCadKernelDeliveryEnforcementVerifier({
  generatedAt,
  releaseCandidateId,
  runtimes: [
    {
      adapterId: "freecad",
      bundledRuntimePath: "resources/cad/freecad/bin/freecadcmd",
      fallbackMessage:
        "Native CAD conversion is unavailable. STL import remains available while support reviews STEP and IGES repair options.",
      fallbackRoute: "/projects/import?mode=mesh-fallback",
      fixtureCommand:
        "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step",
      fixtureDurationMs: 18_420,
      fixtureExitCode: 0,
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureOutputHash: "sha256:freecad-bracket-glb-output",
      runtimeAvailable: true,
      runtimeVersion: "1.0.2",
      sandboxMemoryMb: 2048,
      sandboxPolicy: "readonly-filesystem-network-denied",
      sandboxProfileHash: "sha256:freecad-sandbox-profile",
      sandboxTimeoutSeconds: 120,
      supportRunbookUrl: "https://docs.essence-spline.com/runbooks/cad-runtime-fallback",
      verifierOwner: "CAD Runtime",
    },
    {
      adapterId: "occt",
      bundledRuntimePath: "resources/cad/occt/bin/essence-occt-convert",
      fallbackMessage:
        "Native CAD conversion is unavailable for this model. The import repair wizard can continue with mesh fallback output.",
      fallbackRoute: "/projects/import/repair",
      fixtureCommand:
        "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb",
      fixtureDurationMs: 22_950,
      fixtureExitCode: 0,
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureOutputHash: "sha256:occt-enclosure-glb-output",
      runtimeAvailable: true,
      runtimeVersion: "7.9.1",
      sandboxMemoryMb: 4096,
      sandboxPolicy: "readonly-filesystem-network-denied",
      sandboxProfileHash: "sha256:occt-sandbox-profile",
      sandboxTimeoutSeconds: 180,
      supportRunbookUrl: "https://docs.essence-spline.com/runbooks/cad-runtime-fallback",
      verifierOwner: "CAD Runtime",
    },
  ],
  workspaceId,
});

const installLaunchEvidence = createProductionInstallLaunchEvidencePacket({
  evidence: [
    {
      crashCount: 0,
      crashFreeMinutes: 45,
      crashFreeSessionHash: "sha256:windows-crash-free-session",
      installCommand: "Start-Process .\\Essence_2.1.0_x64-setup.exe -ArgumentList /S -Wait",
      installTranscriptHash: "sha256:windows-install-transcript",
      installedAt: "2026-05-25T10:10:00.000Z",
      installerFileName: "Essence_2.1.0_x64-setup.exe",
      installerSha256: "sha256:windows-installer",
      launchCommand: "essence-spline.exe --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:windows-launch-smoke",
      launchedAt: "2026-05-25T10:12:00.000Z",
      platform: "windows",
      rollbackEvidenceHash: "sha256:windows-rollback-route",
      rollbackRoute: "native/windows/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 42,
      crashFreeSessionHash: "sha256:macos-crash-free-session",
      installCommand: "hdiutil attach Essence_2.1.0_aarch64.dmg && cp -R Essence.app /Applications",
      installTranscriptHash: "sha256:macos-install-transcript",
      installedAt: "2026-05-25T10:15:00.000Z",
      installerFileName: "Essence_2.1.0_aarch64.dmg",
      installerSha256: "sha256:macos-installer",
      launchCommand: "/Applications/Essence.app/Contents/MacOS/Essence --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:macos-launch-smoke",
      launchedAt: "2026-05-25T10:17:00.000Z",
      platform: "macos",
      rollbackEvidenceHash: "sha256:macos-rollback-route",
      rollbackRoute: "native/macos/stable/latest.json",
      verifierOwner: "Desktop Platform",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 40,
      crashFreeSessionHash: "sha256:linux-crash-free-session",
      installCommand: "chmod +x essence-spline_2.1.0_amd64.AppImage",
      installTranscriptHash: "sha256:linux-install-transcript",
      installedAt: "2026-05-25T10:20:00.000Z",
      installerFileName: "essence-spline_2.1.0_amd64.AppImage",
      installerSha256: "sha256:linux-installer",
      launchCommand: "./essence-spline_2.1.0_amd64.AppImage --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:linux-launch-smoke",
      launchedAt: "2026-05-25T10:22:00.000Z",
      platform: "linux",
      rollbackEvidenceHash: "sha256:linux-rollback-route",
      rollbackRoute: "native/linux/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 35,
      crashFreeSessionHash: "sha256:android-crash-free-session",
      installCommand: "adb install app-release.aab",
      installTranscriptHash: "sha256:android-install-transcript",
      installedAt: "2026-05-25T10:25:00.000Z",
      installerFileName: "essence-spline-2.1.0.aab",
      installerSha256: "sha256:android-aab",
      launchCommand: "adb shell monkey -p com.essence.spline 1",
      launchExitCode: 0,
      launchSmokeHash: "sha256:android-launch-smoke",
      launchedAt: "2026-05-25T10:27:00.000Z",
      platform: "android",
      rollbackEvidenceHash: "sha256:android-rollback-track",
      rollbackRoute: "play-console/internal-track/2.0.9",
      verifierOwner: "Mobile Platform",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 32,
      crashFreeSessionHash: "sha256:ios-crash-free-session",
      installCommand: "xcrun simctl install booted EssenceSpline.app",
      installTranscriptHash: "sha256:ios-install-transcript",
      installedAt: "2026-05-25T10:30:00.000Z",
      installerFileName: "EssenceSpline-2.1.0.ipa",
      installerSha256: "sha256:ios-ipa",
      launchCommand: "xcrun simctl launch booted com.essence.spline",
      launchExitCode: 0,
      launchSmokeHash: "sha256:ios-launch-smoke",
      launchedAt: "2026-05-25T10:32:00.000Z",
      platform: "ios",
      rollbackEvidenceHash: "sha256:ios-rollback-track",
      rollbackRoute: "app-store-connect/testflight/2.0.9",
      verifierOwner: "Mobile Platform",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

const packet = createCustomerFacingReleaseAcceptancePacket({
  cadRuntimeEnforcement,
  generatedAt,
  installLaunchEvidence,
  releaseCandidateId,
  signedArtifactEnforcement,
  supportRoutes: [
    {
      customerMessage:
        "If install or launch fails, customers can contact release support with the acceptance packet id and rollback channel.",
      evidenceHash: "sha256:release-support-route",
      escalationSlaHours: 12,
      owner: "Customer Support",
      routeId: "release-support",
      supportUrl: "https://support.essence-spline.com/native-release",
    },
    {
      customerMessage:
        "If native CAD conversion is unavailable, customers can continue with mesh fallback and open a CAD import repair ticket.",
      evidenceHash: "sha256:cad-fallback-support-route",
      escalationSlaHours: 8,
      owner: "CAD Support",
      routeId: "cad-fallback-support",
      supportUrl: "https://support.essence-spline.com/cad-fallback",
    },
  ],
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.acceptanceScore, 100);
assert.equal(packet.summary.customerReleaseAccepted, true);
assert.equal(packet.summary.readyCount, 4);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.supportRouteReadyCount, 2);
assert.ok(packet.summary.acceptanceHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.gate),
  ["signed-artifact-enforcement", "cad-runtime-enforcement", "install-launch-evidence", "support-routing"],
);
assert.ok(packet.rows.every((row) => row.customerReady));
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.match(
  packet.csvContent,
  /^gate,status,score,customer_ready,evidence_linked,support_route_ready,acceptance_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("cad-fallback-support"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-customer-facing-release-acceptance-packet-native-2-1-0-enforcement-20260525.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-customer-facing-release-acceptance-packet-native-2-1-0-enforcement-20260525.json",
);
assert.equal(packet.files.length, 2);

const blocked = createCustomerFacingReleaseAcceptancePacket({
  cadRuntimeEnforcement: {
    ...cadRuntimeEnforcement,
    summary: {
      ...cadRuntimeEnforcement.summary,
      deliveryBlocked: true,
      enforcementScore: 40,
      status: "blocked",
    },
  },
  installLaunchEvidence: {
    ...installLaunchEvidence,
    summary: {
      ...installLaunchEvidence.summary,
      installLaunchBlocked: true,
      installLaunchScore: 35,
      status: "blocked",
    },
  },
  releaseCandidateId,
  signedArtifactEnforcement: {
    ...signedArtifactEnforcement,
    summary: {
      ...signedArtifactEnforcement.summary,
      enforcementScore: 45,
      releaseBlocked: true,
      status: "blocked",
    },
  },
  supportRoutes: [
    {
      customerMessage: "",
      evidenceHash: "",
      escalationSlaHours: 72,
      owner: "",
      routeId: "release-support",
      supportUrl: "",
    },
  ],
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.customerReleaseAccepted, false);
assert.ok(blocked.summary.acceptanceScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.supportRouteReadyCount, 0);
assert.equal(blocked.rows.find((row) => row.gate === "signed-artifact-enforcement")?.customerReady, false);
assert.equal(blocked.rows.find((row) => row.gate === "support-routing")?.supportRouteReady, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked customer-facing release acceptance packet/,
);

console.log("customer-facing release acceptance packet smoke passed");
