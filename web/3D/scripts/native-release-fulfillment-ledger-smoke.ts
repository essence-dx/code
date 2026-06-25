import { strict as assert } from "node:assert";
import { createDesktopPackageInstallRehearsalPacket } from "@/features/projects/desktop-package-install-rehearsal-packet";
import { createNativeArtifactExecutionReceiptValidator } from "@/features/projects/native-artifact-execution-receipt-validator";
import { createNativeReleaseFulfillmentLedger } from "@/features/projects/native-release-fulfillment-ledger";
import { createNativeRuntimeExceptionRoutingReport } from "@/features/projects/native-runtime-exception-routing";

const artifactValidation = createNativeArtifactExecutionReceiptValidator({
  generatedAt: "2026-05-18T16:00:00.000Z",
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

const installRehearsal = createDesktopPackageInstallRehearsalPacket({
  generatedAt: "2026-05-18T16:00:00.000Z",
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

const exceptionRouting = createNativeRuntimeExceptionRoutingReport({
  exceptions: [],
  generatedAt: "2026-05-18T16:00:00.000Z",
  workspaceId: "Essence Runtime",
});

const ledger = createNativeReleaseFulfillmentLedger({
  approvalRenewal: {
    approvedBy: "Release approver",
    approvalHash: "sha256:approval-renewal",
    expiresAt: "2026-06-18T16:00:00.000Z",
    renewedAt: "2026-05-18T16:00:00.000Z",
    status: "ready",
  },
  artifactValidation,
  exceptionRouting,
  generatedAt: "2026-05-18T16:00:00.000Z",
  installRehearsal,
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.decision, "promote");
assert.equal(ledger.summary.fulfillmentScore, 100);
assert.equal(ledger.summary.readyCount, 4);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.reviewCount, 0);
assert.ok(ledger.summary.ledgerHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.kind),
  ["signed-artifacts", "install-rehearsals", "exception-routes", "approval-renewal"],
);
assert.equal(ledger.rows.find((row) => row.kind === "signed-artifacts")?.sourceHash, artifactValidation.summary.validationHash);
assert.equal(ledger.rows.find((row) => row.kind === "install-rehearsals")?.sourceHash, installRehearsal.summary.packetHash);
assert.equal(ledger.rows.find((row) => row.kind === "exception-routes")?.sourceHash, exceptionRouting.summary.routingHash);
assert.match(ledger.csvContent, /^fulfillment_id,kind,status,decision,score,source_hash,ledger_hash,next_action/);
assert.ok(ledger.jsonContent.includes("native-1.4.0-stable"));
assert.equal(ledger.csvFileName, "essence-runtime-native-release-fulfillment-ledger-native-1-4-0-stable-20260518.csv");
assert.equal(ledger.jsonFileName, "essence-runtime-native-release-fulfillment-ledger-native-1-4-0-stable-20260518.json");
assert.equal(ledger.files.length, 2);

const blockedLedger = createNativeReleaseFulfillmentLedger({
  approvalRenewal: {
    approvedBy: null,
    approvalHash: null,
    expiresAt: "2026-05-17T16:00:00.000Z",
    renewedAt: null,
    status: "blocked",
  },
  artifactValidation: createNativeArtifactExecutionReceiptValidator({
    receipts: [],
    workspaceId: "Essence Runtime",
  }),
  exceptionRouting: createNativeRuntimeExceptionRoutingReport({
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
  }),
  installRehearsal: createDesktopPackageInstallRehearsalPacket({
    rehearsals: [],
    releaseVersion: "1.4.0",
    workspaceId: "Essence Runtime",
  }),
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blockedLedger.summary.status, "blocked");
assert.equal(blockedLedger.summary.decision, "block");
assert.ok(blockedLedger.summary.fulfillmentScore < 50);
assert.equal(blockedLedger.summary.blockedCount, 4);
assert.match(blockedLedger.summary.nextAction, /Resolve blocked native release fulfillment ledger rows/);

console.log("native release fulfillment ledger smoke passed");
