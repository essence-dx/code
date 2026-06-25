import { strict as assert } from "node:assert";
import { createDesktopPackageInstallRehearsalPacket } from "@/features/projects/desktop-package-install-rehearsal-packet";
import { createNativeArtifactExecutionReceiptValidator } from "@/features/projects/native-artifact-execution-receipt-validator";
import { createNativeCadWorkerExecutionEvidence } from "@/features/projects/native-cad-worker-execution-evidence";
import { createNativeRuntimeExceptionRoutingReport } from "@/features/projects/native-runtime-exception-routing";

const artifactValidation = createNativeArtifactExecutionReceiptValidator({
  generatedAt: "2026-05-18T15:00:00.000Z",
  receipts: [
    {
      artifactSha256: "sha256:windows-artifact",
      certificateFingerprint: "AA:BB:CC",
      fileName: "Essence_1.4.0_x64-setup.exe",
      manifestArtifactSha256: "sha256:windows-artifact",
      manifestFileName: "latest-windows.json",
      platform: "windows",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "AA:BB:CC",
      requiredReleaseChannel: "stable",
      updaterSignature: "ed25519:windows",
    },
    {
      artifactSha256: "sha256:macos-artifact",
      certificateFingerprint: "DD:EE:FF",
      fileName: "Essence_1.4.0_aarch64.dmg",
      manifestArtifactSha256: "sha256:macos-artifact",
      manifestFileName: "latest-darwin.json",
      platform: "macos",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "DD:EE:FF",
      requiredReleaseChannel: "stable",
      updaterSignature: "ed25519:macos",
    },
    {
      artifactSha256: "sha256:linux-artifact",
      certificateFingerprint: "11:22:33",
      fileName: "essence-spline_1.4.0_amd64.AppImage",
      manifestArtifactSha256: "sha256:linux-artifact",
      manifestFileName: "latest-linux.json",
      platform: "linux",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "11:22:33",
      requiredReleaseChannel: "stable",
      updaterSignature: "ed25519:linux",
    },
  ],
  workspaceId: "Essence Runtime",
});

const cadWorkerEvidence = createNativeCadWorkerExecutionEvidence({
  generatedAt: "2026-05-18T15:00:00.000Z",
  workers: [
    {
      adapterId: "freecad",
      available: true,
      command: "freecadcmd --console --run-test bracket_mm.step",
      diagnosticOutput: "loaded bracket_mm.step; exported 4280 triangles",
      exitCode: 0,
      fixtureName: "bracket_mm.step",
      outputHash: "sha256:freecad-output",
      sandboxMemoryMb: 2048,
      sandboxTimeoutSeconds: 120,
      version: "1.0.2",
    },
    {
      adapterId: "occt",
      available: true,
      command: "essence-occt-convert --fixture housing_mm.step",
      diagnosticOutput: "shape healed; tessellation complete",
      exitCode: 0,
      fixtureName: "housing_mm.step",
      outputHash: "sha256:occt-output",
      sandboxMemoryMb: 4096,
      sandboxTimeoutSeconds: 180,
      version: "7.9.1",
    },
  ],
  workspaceId: "Essence Runtime",
});

const installRehearsal = createDesktopPackageInstallRehearsalPacket({
  generatedAt: "2026-05-18T15:00:00.000Z",
  rehearsals: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      archiveVerified: true,
      installCommand: "Start-Process .\\Essence_1.4.0_x64-setup.exe -ArgumentList /S -Wait",
      installVerified: true,
      platform: "windows",
      rollbackVerified: true,
      smokeCommand: "essence-spline.exe --smoke open-sample",
      smokeVerified: true,
      updaterManifestUrl: "https://updates.essence-spline.app/windows/latest.json",
      updaterMetadataHash: "sha256:windows-manifest",
      verificationNotes: "silent install completed",
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      archiveVerified: true,
      installCommand: "hdiutil attach Essence_1.4.0_aarch64.dmg",
      installVerified: true,
      platform: "macos",
      rollbackVerified: true,
      smokeCommand: "/Applications/Essence.app/Contents/MacOS/Essence --smoke open-sample",
      smokeVerified: true,
      updaterManifestUrl: "https://updates.essence-spline.app/darwin/latest.json",
      updaterMetadataHash: "sha256:macos-manifest",
      verificationNotes: "gatekeeper check passed",
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      archiveVerified: true,
      installCommand: "chmod +x essence-spline_1.4.0_amd64.AppImage",
      installVerified: true,
      platform: "linux",
      rollbackVerified: true,
      smokeCommand: "./essence-spline_1.4.0_amd64.AppImage --smoke open-sample",
      smokeVerified: true,
      updaterManifestUrl: "https://updates.essence-spline.app/linux/latest.json",
      updaterMetadataHash: "sha256:linux-manifest",
      verificationNotes: "AppImage executable",
    },
  ],
  releaseVersion: "1.4.0",
  workspaceId: "Essence Runtime",
});

const exceptionRoutes = createNativeRuntimeExceptionRoutingReport({
  exceptions: [
    {
      ageHours: 1,
      dueAt: "2026-05-19T15:00:00.000Z",
      evidenceHash: "sha256:signature-ok",
      kind: "missing-signature",
      owner: "Release signing owner",
      severity: "medium",
      sourceId: "windows-signed-artifact",
      sourceStatus: "ready",
    },
    {
      ageHours: 1,
      dueAt: "2026-05-19T15:00:00.000Z",
      evidenceHash: "sha256:cad-worker-ok",
      kind: "failed-cad-worker-execution",
      owner: "CAD runtime owner",
      severity: "medium",
      sourceId: "freecad-fixture-bracket",
      sourceStatus: "ready",
    },
    {
      ageHours: 1,
      dueAt: "2026-05-19T15:00:00.000Z",
      evidenceHash: "sha256:install-ok",
      kind: "install-rehearsal-regression",
      owner: "Desktop release owner",
      severity: "medium",
      sourceId: "linux-appimage-install",
      sourceStatus: "ready",
    },
    {
      ageHours: 1,
      dueAt: "2026-05-19T15:00:00.000Z",
      evidenceHash: "sha256:approval-ok",
      kind: "stale-artifact-approval",
      owner: "Release approver",
      severity: "medium",
      sourceId: "macos-approval",
      sourceStatus: "ready",
    },
  ],
  generatedAt: "2026-05-18T15:00:00.000Z",
  workspaceId: "Essence Runtime",
});

assert.equal(artifactValidation.summary.status, "ready");
assert.equal(artifactValidation.summary.validationScore, 100);
assert.equal(artifactValidation.summary.rowCount, 3);
assert.equal(artifactValidation.files.length, 2);

assert.equal(cadWorkerEvidence.summary.status, "ready");
assert.equal(cadWorkerEvidence.summary.evidenceScore, 100);
assert.equal(cadWorkerEvidence.rows.every((row) => row.commandAvailable && row.fixturePassed && row.sandboxReady), true);

assert.equal(installRehearsal.summary.status, "ready");
assert.equal(installRehearsal.summary.rehearsalScore, 100);
assert.equal(installRehearsal.rows.every((row) => row.updaterMetadataLinked && row.installVerified && row.smokeVerified), true);

assert.equal(exceptionRoutes.summary.status, "ready");
assert.equal(exceptionRoutes.summary.routedCount, 0);
assert.equal(exceptionRoutes.summary.routingScore, 100);
assert.equal(exceptionRoutes.rows.every((row) => !row.routeEligible), true);

const blockedArtifactValidation = createNativeArtifactExecutionReceiptValidator({
  receipts: [
    {
      artifactSha256: "sha256:windows-artifact",
      certificateFingerprint: null,
      fileName: "Essence_1.4.0_x64-setup.exe",
      manifestArtifactSha256: "sha256:other",
      manifestFileName: "latest-windows.json",
      platform: "windows",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "AA:BB:CC",
      requiredReleaseChannel: "stable",
      updaterSignature: null,
    },
  ],
  requiredPlatforms: ["windows", "macos", "linux"],
  workspaceId: "Essence Runtime",
});
const blockedCadWorkerEvidence = createNativeCadWorkerExecutionEvidence({
  requiredAdapters: ["freecad", "occt"],
  workers: [
    {
      adapterId: "freecad",
      available: false,
      command: "",
      diagnosticOutput: "freecadcmd not found",
      exitCode: 127,
      fixtureName: "bracket_mm.step",
      outputHash: null,
      sandboxMemoryMb: 512,
      sandboxTimeoutSeconds: 30,
      version: null,
    },
  ],
  workspaceId: "Essence Runtime",
});
const blockedInstallRehearsal = createDesktopPackageInstallRehearsalPacket({
  rehearsals: [],
  releaseVersion: "1.4.0",
  requiredPlatforms: ["windows", "macos", "linux"],
  workspaceId: "Essence Runtime",
});
const blockedExceptionRoutes = createNativeRuntimeExceptionRoutingReport({
  exceptions: [
    {
      ageHours: 96,
      dueAt: "2026-05-18T10:00:00.000Z",
      evidenceHash: "sha256:stale",
      kind: "stale-artifact-approval",
      owner: "Release approver",
      severity: "critical",
      sourceId: "macos-approval",
      sourceStatus: "blocked",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blockedArtifactValidation.summary.status, "blocked");
assert.ok(blockedArtifactValidation.summary.validationScore < 50);
assert.equal(blockedCadWorkerEvidence.summary.status, "blocked");
assert.ok(blockedCadWorkerEvidence.summary.evidenceScore < 50);
assert.equal(blockedInstallRehearsal.summary.status, "blocked");
assert.ok(blockedInstallRehearsal.summary.rehearsalScore < 50);
assert.equal(blockedExceptionRoutes.summary.status, "blocked");
assert.equal(blockedExceptionRoutes.summary.routedCount, 1);
assert.equal(blockedExceptionRoutes.rows[0]?.routeEligible, true);
assert.match(blockedExceptionRoutes.rows[0]?.nextAction ?? "", /Open artifact-approval-renewal/);

console.log("native artifact execution evidence coverage smoke passed");
