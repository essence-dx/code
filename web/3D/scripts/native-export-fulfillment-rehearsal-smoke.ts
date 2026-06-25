import { strict as assert } from "node:assert";

import { runPackagedCadRuntimeExecutionAdapter } from "@/features/projects/packaged-cad-runtime-execution-adapter";
import { createProductionInstallLaunchEvidencePacket } from "@/features/projects/production-install-launch-evidence-packet";
import { createSignedPackageArtifactLocator } from "@/features/projects/signed-package-artifact-locator";
import { createNativeExportFulfillmentRehearsal } from "@/features/projects/native-export-fulfillment-rehearsal";

const generatedAt = "2026-05-29T09:00:00.000Z";
const releaseCandidateId = "native-2.4.0-fulfillment-reality";
const workspaceId = "Essence Runtime";

const packageLocator = createSignedPackageArtifactLocator({
  artifacts: [
    {
      artifactName: "EssenceSpline-2.4.0-setup.exe",
      artifactSha256: "sha256:windows-installer-output",
      certificateExpiresAt: "2027-05-28T00:00:00.000Z",
      certificateFingerprint: "sha256:windows-authenticode-cert",
      certificateIssuer: "DigiCert Trusted G4 Code Signing RSA4096 SHA384 2021 CA1",
      certificateSubject: "Essence Runtime Labs",
      ciArtifactUrl: "",
      ciRunUrl: "https://ci.example.com/essence/actions/runs/924",
      localOutputPath: "dist/native/windows/EssenceSpline-2.4.0-setup.exe",
      platform: "windows",
      signedAt: "2026-05-28T08:20:00.000Z",
      uploadDestinationUrl:
        "https://downloads.example.com/native/windows/EssenceSpline-2.4.0-setup.exe",
      uploadOwner: "Native Release",
      uploadProvider: "Vercel Blob",
    },
    {
      artifactName: "EssenceSpline-2.4.0.dmg",
      artifactSha256: "sha256:macos-dmg-output",
      certificateExpiresAt: "2027-05-28T00:00:00.000Z",
      certificateFingerprint: "sha256:macos-developer-id-cert",
      certificateIssuer: "Developer ID Certification Authority",
      certificateSubject: "Developer ID Application: Essence Runtime Labs",
      ciArtifactUrl:
        "https://ci.example.com/essence/actions/runs/924/artifacts/EssenceSpline-2.4.0.dmg",
      ciRunUrl: "https://ci.example.com/essence/actions/runs/924",
      localOutputPath: "",
      platform: "macos",
      signedAt: "2026-05-28T08:30:00.000Z",
      uploadDestinationUrl:
        "https://downloads.example.com/native/macos/EssenceSpline-2.4.0.dmg",
      uploadOwner: "Native Release",
      uploadProvider: "Vercel Blob",
    },
    {
      artifactName: "EssenceSpline-2.4.0.AppImage",
      artifactSha256: "sha256:linux-appimage-output",
      certificateExpiresAt: "2027-05-28T00:00:00.000Z",
      certificateFingerprint: "sha256:linux-sigstore-cert",
      certificateIssuer: "Fulcio Code Signing Root",
      certificateSubject: "https://github.com/essence/spline/.github/workflows/release.yml",
      ciArtifactUrl:
        "https://ci.example.com/essence/actions/runs/924/artifacts/EssenceSpline-2.4.0.AppImage",
      ciRunUrl: "https://ci.example.com/essence/actions/runs/924",
      localOutputPath: "dist/native/linux/EssenceSpline-2.4.0.AppImage",
      platform: "linux",
      signedAt: "2026-05-28T08:40:00.000Z",
      uploadDestinationUrl:
        "https://downloads.example.com/native/linux/EssenceSpline-2.4.0.AppImage",
      uploadOwner: "Native Release",
      uploadProvider: "Vercel Blob",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

const cadRuntimeExecution = await runPackagedCadRuntimeExecutionAdapter({
  generatedAt,
  releaseCandidateId,
  runtimes: [
    {
      adapterId: "freecad",
      commandArguments: [
        "scripts/cad/freecad-mesh-export.py",
        "fixtures/cad/bracket.step",
        "--output",
        "evidence/freecad/bracket.glb",
      ],
      desktopBundleRoot:
        "C:/Program Files/EssenceSpline/resources/cad/freecad",
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
    {
      adapterId: "occt",
      commandArguments: [
        "fixtures/cad/enclosure.iges",
        "--format",
        "glb",
        "--output",
        "evidence/occt/enclosure.glb",
      ],
      desktopBundleRoot:
        "/Applications/EssenceSpline.app/Contents/Resources/cad/occt",
      executableExists: true,
      executableRelativePath: "bin/essence-occt-convert",
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureInputPath: "fixtures/cad/enclosure.iges",
      installedVersion: "OCCT 7.9.1",
      outputPath: "evidence/occt/enclosure.glb",
      owner: "CAD Runtime",
      packagedLayoutHash: "sha256:occt-packaged-layout",
      sandboxProfile: "desktop-cad-runtime-4096mb-180s-readonly",
      timeoutMs: 180_000,
    },
  ],
  executor: async ({ runtime }) => ({
    durationMs: runtime.adapterId === "freecad" ? 17_200 : 21_450,
    exitCode: 0,
    finishedAt:
      runtime.adapterId === "freecad"
        ? "2026-05-29T09:04:20.000Z"
        : "2026-05-29T09:07:20.000Z",
    outputHash:
      runtime.adapterId === "freecad"
        ? "sha256:freecad-packaged-output"
        : "sha256:occt-packaged-output",
    outputPath: runtime.outputPath,
    startedAt:
      runtime.adapterId === "freecad"
        ? "2026-05-29T09:04:00.000Z"
        : "2026-05-29T09:07:00.000Z",
    stderr: "",
    stdout:
      runtime.adapterId === "freecad"
        ? "FreeCAD packaged runtime completed"
        : "OCCT packaged runtime completed",
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
      installedAt: "2026-05-29T09:10:00.000Z",
      installerFileName: "EssenceSpline-2.4.0-setup.exe",
      installerSha256: "sha256:windows-installer-output",
      launchCommand: "essence-spline.exe --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:windows-launch-smoke",
      launchedAt: "2026-05-29T09:12:00.000Z",
      platform: "windows",
      rollbackEvidenceHash: "sha256:windows-rollback-route",
      rollbackRoute: "native/windows/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 42,
      crashFreeSessionHash: "sha256:macos-crash-free-session",
      installCommand: "hdiutil attach EssenceSpline-2.4.0.dmg && cp -R Essence.app /Applications",
      installTranscriptHash: "sha256:macos-install-transcript",
      installedAt: "2026-05-29T09:15:00.000Z",
      installerFileName: "EssenceSpline-2.4.0.dmg",
      installerSha256: "sha256:macos-dmg-output",
      launchCommand: "/Applications/Essence.app/Contents/MacOS/Essence --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:macos-launch-smoke",
      launchedAt: "2026-05-29T09:17:00.000Z",
      platform: "macos",
      rollbackEvidenceHash: "sha256:macos-rollback-route",
      rollbackRoute: "native/macos/stable/latest.json",
      verifierOwner: "Desktop Platform",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 40,
      crashFreeSessionHash: "sha256:linux-crash-free-session",
      installCommand: "chmod +x EssenceSpline-2.4.0.AppImage",
      installTranscriptHash: "sha256:linux-install-transcript",
      installedAt: "2026-05-29T09:20:00.000Z",
      installerFileName: "EssenceSpline-2.4.0.AppImage",
      installerSha256: "sha256:linux-appimage-output",
      launchCommand: "./EssenceSpline-2.4.0.AppImage --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:linux-launch-smoke",
      launchedAt: "2026-05-29T09:22:00.000Z",
      platform: "linux",
      rollbackEvidenceHash: "sha256:linux-rollback-route",
      rollbackRoute: "native/linux/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
  ],
  generatedAt,
  releaseCandidateId,
  requiredPlatforms: ["windows", "macos", "linux"],
  workspaceId,
});

const rehearsal = createNativeExportFulfillmentRehearsal({
  cadRuntimeExecution,
  customerFallbackChecks: [
    {
      checkedAt: "2026-05-29T09:30:00.000Z",
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

assert.equal(rehearsal.summary.status, "ready");
assert.equal(rehearsal.summary.releaseBlocked, false);
assert.equal(rehearsal.summary.rehearsalScore, 100);
assert.equal(rehearsal.summary.readyCount, 4);
assert.equal(rehearsal.summary.blockedCount, 0);
assert.equal(rehearsal.summary.reviewCount, 0);
assert.equal(rehearsal.summary.fallbackReadyCount, 1);
assert.ok(rehearsal.summary.rehearsalHash.startsWith("sha256:"));
assert.deepEqual(
  rehearsal.rows.map((row) => row.gate),
  [
    "package-verification",
    "cad-fixture-conversion",
    "launch-smoke",
    "customer-fallback",
  ],
);
assert.ok(rehearsal.rows.every((row) => row.evidenceLinked));
assert.ok(rehearsal.rows.every((row) => row.rehearsalHash.startsWith("sha256:")));
assert.match(
  rehearsal.csvContent,
  /^gate,status,score,evidence_linked,release_blocked,rehearsal_hash,next_action/,
);
assert.ok(rehearsal.jsonContent.includes("browser-export-fallback"));
assert.equal(
  rehearsal.csvFileName,
  "essence-runtime-native-export-fulfillment-rehearsal-native-2-4-0-fulfillment-reality-20260529.csv",
);
assert.equal(
  rehearsal.jsonFileName,
  "essence-runtime-native-export-fulfillment-rehearsal-native-2-4-0-fulfillment-reality-20260529.json",
);
assert.equal(rehearsal.files.length, 2);

const blocked = createNativeExportFulfillmentRehearsal({
  customerFallbackChecks: [
    {
      checkedAt: "",
      customerMessage: "",
      evidenceHash: "",
      fallbackId: "native-cad-fallback",
      fallbackRoute: "",
      owner: "",
      status: "blocked",
    },
  ],
  generatedAt,
  packageLocator,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.rehearsalScore < 60);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.summary.fallbackReadyCount, 0);
assert.equal(blocked.rows.find((row) => row.gate === "cad-fixture-conversion")?.status, "blocked");
assert.equal(blocked.rows.find((row) => row.gate === "launch-smoke")?.evidenceLinked, false);
assert.match(
  blocked.rows.find((row) => row.gate === "customer-fallback")?.nextAction ?? "",
  /Resolve blocked native export fulfillment rehearsal/,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native export fulfillment rehearsal/,
);

console.log("native export fulfillment rehearsal smoke passed");
