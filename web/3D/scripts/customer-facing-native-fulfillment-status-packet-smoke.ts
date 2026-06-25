import { strict as assert } from "node:assert";

import { createCustomerFacingNativeFulfillmentStatusPacket } from "@/features/projects/customer-facing-native-fulfillment-status-packet";
import { createNativeExportFulfillmentRehearsal } from "@/features/projects/native-export-fulfillment-rehearsal";
import { runPackagedCadRuntimeExecutionAdapter } from "@/features/projects/packaged-cad-runtime-execution-adapter";
import { createProductionInstallLaunchEvidencePacket } from "@/features/projects/production-install-launch-evidence-packet";
import { createSignedPackageArtifactLocator } from "@/features/projects/signed-package-artifact-locator";

const generatedAt = "2026-05-30T10:00:00.000Z";
const releaseCandidateId = "native-2.4.0-fulfillment-status";
const workspaceId = "Essence Runtime";

const packageLocator = createSignedPackageArtifactLocator({
  artifacts: [
    {
      artifactName: "EssenceSpline-2.4.0-setup.exe",
      artifactSha256: "sha256:windows-installer-output",
      certificateExpiresAt: "2027-05-30T00:00:00.000Z",
      certificateFingerprint: "sha256:windows-authenticode-cert",
      certificateIssuer: "DigiCert Trusted G4 Code Signing RSA4096 SHA384 2021 CA1",
      certificateSubject: "Essence Runtime Labs",
      ciArtifactUrl: "https://ci.example.com/essence/actions/runs/930/artifacts/windows",
      ciRunUrl: "https://ci.example.com/essence/actions/runs/930",
      localOutputPath: "dist/native/windows/EssenceSpline-2.4.0-setup.exe",
      platform: "windows",
      signedAt: "2026-05-30T08:20:00.000Z",
      uploadDestinationUrl:
        "https://downloads.example.com/native/windows/EssenceSpline-2.4.0-setup.exe",
      uploadOwner: "Native Release",
      uploadProvider: "Vercel Blob",
    },
  ],
  generatedAt,
  releaseCandidateId,
  requiredPlatforms: ["windows"],
  workspaceId,
});

const cadRuntimeExecution = await runPackagedCadRuntimeExecutionAdapter({
  generatedAt,
  releaseCandidateId,
  requiredAdapters: ["freecad"],
  runtimes: [
    {
      adapterId: "freecad",
      commandArguments: [
        "scripts/cad/freecad-mesh-export.py",
        "fixtures/cad/bracket.step",
        "--output",
        "evidence/freecad/bracket.glb",
      ],
      desktopBundleRoot: "C:/Program Files/EssenceSpline/resources/cad/freecad",
      executableExists: true,
      executableRelativePath: "bin/freecadcmd.exe",
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureInputPath: "fixtures/cad/bracket.step",
      installedVersion: "FreeCAD 1.0.2",
      outputPath: "evidence/freecad/bracket.glb",
      owner: "CAD Runtime",
      packagedLayoutHash: "sha256:freecad-packaged-layout",
      sandboxProfile: "desktop-cad-runtime-2048mb-120s-readonly",
      timeoutMs: 120_000,
    },
  ],
  executor: async ({ runtime }) => ({
    durationMs: 17_200,
    exitCode: 0,
    finishedAt: "2026-05-30T10:04:20.000Z",
    outputHash: "sha256:freecad-packaged-output",
    outputPath: runtime.outputPath,
    startedAt: "2026-05-30T10:04:00.000Z",
    stderr: "",
    stdout: "FreeCAD packaged runtime completed",
  }),
  workspaceId,
});

const launchEvidence = createProductionInstallLaunchEvidencePacket({
  evidence: [
    {
      crashCount: 0,
      crashFreeMinutes: 45,
      crashFreeSessionHash: "sha256:windows-crash-free-session",
      installCommand: "Start-Process .\\EssenceSpline-2.4.0-setup.exe -ArgumentList /S -Wait",
      installTranscriptHash: "sha256:windows-install-transcript",
      installedAt: "2026-05-30T10:10:00.000Z",
      installerFileName: "EssenceSpline-2.4.0-setup.exe",
      installerSha256: "sha256:windows-installer-output",
      launchCommand: "essence-spline.exe --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:windows-launch-smoke",
      launchedAt: "2026-05-30T10:12:00.000Z",
      platform: "windows",
      rollbackEvidenceHash: "sha256:windows-rollback-route",
      rollbackRoute: "native/windows/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
  ],
  generatedAt,
  releaseCandidateId,
  requiredPlatforms: ["windows"],
  workspaceId,
});

const fulfillmentRehearsal = createNativeExportFulfillmentRehearsal({
  cadRuntimeExecution,
  customerFallbackChecks: [
    {
      checkedAt: "2026-05-30T10:30:00.000Z",
      customerMessage:
        "Browser export remains available while native CAD conversion is unavailable.",
      evidenceHash: "sha256:browser-export-fallback-check",
      fallbackId: "browser-export-fallback",
      fallbackRoute: "https://essence.example.com/projects/demo/export",
      owner: "Customer Experience",
      status: "ready",
    },
  ],
  generatedAt,
  launchEvidence,
  packageLocator,
  releaseCandidateId,
  workspaceId,
});

const packet = createCustomerFacingNativeFulfillmentStatusPacket({
  cadRuntimeExecution,
  fulfillmentRehearsal,
  generatedAt,
  packageLocator,
  releaseCandidateId,
  statusRoutes: [
    {
      blockerOwner: "Native Release",
      blockerRoute: "https://status.example.com/native/downloads/windows",
      customerMessage:
        "Windows native download is available with a signed installer and checksum evidence.",
      etaAt: "2026-05-30T10:45:00.000Z",
      etaOwner: "Native Release",
      fallbackMessage:
        "Use the browser editor export while desktop download support is unavailable.",
      fallbackRoute: "https://essence.example.com/projects/demo/export",
      targetId: "download:windows",
    },
    {
      blockerOwner: "CAD Runtime",
      blockerRoute: "https://status.example.com/native/cad/freecad",
      customerMessage:
        "FreeCAD STEP and IGES conversion is supported in the packaged desktop runtime.",
      etaAt: "2026-05-30T10:50:00.000Z",
      etaOwner: "CAD Runtime",
      fallbackMessage:
        "Mesh fallback import remains available if native CAD conversion is interrupted.",
      fallbackRoute: "https://essence.example.com/projects/import?mode=mesh-fallback",
      targetId: "cad:freecad",
    },
    {
      blockerOwner: "Customer Experience",
      blockerRoute: "https://status.example.com/native/fallback/browser-export",
      customerMessage:
        "Browser export remains available while native fulfillment support changes.",
      etaAt: "2026-05-30T11:00:00.000Z",
      etaOwner: "Customer Experience",
      fallbackMessage:
        "Browser export remains available while native CAD conversion is unavailable.",
      fallbackRoute: "https://essence.example.com/projects/demo/export",
      targetId: "fallback:browser-export-fallback",
    },
    {
      blockerOwner: "Native Release",
      blockerRoute: "https://status.example.com/native/blockers/package",
      customerMessage: "Signed package verification is clear for this release candidate.",
      etaAt: "2026-05-30T11:05:00.000Z",
      etaOwner: "Native Release",
      fallbackMessage: "Use browser export while package verification is being repaired.",
      fallbackRoute: "https://essence.example.com/projects/demo/export",
      targetId: "blocker:package-verification",
    },
    {
      blockerOwner: "CAD Runtime",
      blockerRoute: "https://status.example.com/native/blockers/cad",
      customerMessage: "CAD fixture conversion is clear for this release candidate.",
      etaAt: "2026-05-30T11:10:00.000Z",
      etaOwner: "CAD Runtime",
      fallbackMessage: "Use mesh fallback while CAD fixture conversion is being repaired.",
      fallbackRoute: "https://essence.example.com/projects/import?mode=mesh-fallback",
      targetId: "blocker:cad-fixture-conversion",
    },
    {
      blockerOwner: "Release Engineering",
      blockerRoute: "https://status.example.com/native/blockers/launch",
      customerMessage: "Install and launch smoke evidence is clear for this release candidate.",
      etaAt: "2026-05-30T11:15:00.000Z",
      etaOwner: "Release Engineering",
      fallbackMessage: "Use browser projects while launch evidence is being repaired.",
      fallbackRoute: "https://essence.example.com/dashboard",
      targetId: "blocker:launch-smoke",
    },
    {
      blockerOwner: "Customer Experience",
      blockerRoute: "https://status.example.com/native/blockers/fallback",
      customerMessage: "Customer fallback messaging is clear for this release candidate.",
      etaAt: "2026-05-30T11:20:00.000Z",
      etaOwner: "Customer Experience",
      fallbackMessage: "Use browser export while fallback messaging is being repaired.",
      fallbackRoute: "https://essence.example.com/projects/demo/export",
      targetId: "blocker:customer-fallback",
    },
  ],
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.releaseBlocked, false);
assert.equal(packet.summary.statusScore, 100);
assert.equal(packet.summary.downloadAvailableCount, 1);
assert.equal(packet.summary.cadSupportedCount, 1);
assert.equal(packet.summary.fallbackReadyCount, 1);
assert.equal(packet.summary.blockerRouteReadyCount, 4);
assert.equal(packet.summary.rowCount, 7);
assert.ok(packet.summary.statusHash.startsWith("sha256:"));
assert.equal(packet.downloadStatuses[0]?.downloadStatus, "available");
assert.equal(
  packet.downloadStatuses[0]?.downloadUrl,
  "https://downloads.example.com/native/windows/EssenceSpline-2.4.0-setup.exe",
);
assert.equal(packet.downloadStatuses[0]?.etaOwner, "Native Release");
assert.equal(packet.cadSupportStatuses[0]?.cadSupportStatus, "supported");
assert.match(packet.cadSupportStatuses[0]?.fallbackMessage ?? "", /Mesh fallback/);
assert.equal(packet.fallbackMessages[0]?.fallbackRouteReady, true);
assert.ok(packet.blockerRoutes.every((route) => route.routeReady));
assert.match(
  packet.csvContent,
  /^section,target_id,status,download_status,cad_support_status,eta_owner,eta_at,blocker_route,status_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("browser-export-fallback"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-customer-facing-native-fulfillment-status-packet-native-2-4-0-fulfillment-status-20260530.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-customer-facing-native-fulfillment-status-packet-native-2-4-0-fulfillment-status-20260530.json",
);
assert.equal(packet.files.length, 2);

const blockedPackageLocator = createSignedPackageArtifactLocator({
  artifacts: [],
  generatedAt,
  releaseCandidateId,
  requiredPlatforms: ["windows"],
  workspaceId,
});
const blockedCadRuntimeExecution = await runPackagedCadRuntimeExecutionAdapter({
  executor: async () => {
    throw new Error("executor should not run for missing packaged CAD runtime");
  },
  generatedAt,
  releaseCandidateId,
  requiredAdapters: ["freecad"],
  runtimes: [],
  workspaceId,
});
const blockedRehearsal = createNativeExportFulfillmentRehearsal({
  customerFallbackChecks: [
    {
      checkedAt: "",
      customerMessage: "",
      evidenceHash: "",
      fallbackId: "browser-export-fallback",
      fallbackRoute: "",
      owner: "",
      status: "blocked",
    },
  ],
  generatedAt,
  packageLocator: blockedPackageLocator,
  releaseCandidateId,
  workspaceId,
});
const blocked = createCustomerFacingNativeFulfillmentStatusPacket({
  cadRuntimeExecution: blockedCadRuntimeExecution,
  fulfillmentRehearsal: blockedRehearsal,
  generatedAt,
  packageLocator: blockedPackageLocator,
  releaseCandidateId,
  statusRoutes: [
    {
      blockerOwner: "",
      blockerRoute: "",
      customerMessage: "",
      etaAt: "",
      etaOwner: "",
      fallbackMessage: "",
      fallbackRoute: "",
      targetId: "download:windows",
    },
  ],
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.statusScore < 50);
assert.equal(blocked.downloadStatuses[0]?.downloadStatus, "blocked");
assert.equal(blocked.cadSupportStatuses[0]?.cadSupportStatus, "blocked");
assert.equal(
  blocked.blockerRoutes.find((route) => route.gate === "cad-fixture-conversion")
    ?.routeReady,
  false,
);
assert.match(blocked.summary.nextAction, /Resolve customer-facing native fulfillment status/);

console.log("customer-facing native fulfillment status packet smoke passed");
