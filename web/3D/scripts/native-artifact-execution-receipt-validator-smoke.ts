import { strict as assert } from "node:assert";
import { createNativeArtifactExecutionReceiptValidator } from "@/features/projects/native-artifact-execution-receipt-validator";

const report = createNativeArtifactExecutionReceiptValidator({
  generatedAt: "2026-05-18T11:00:00.000Z",
  receipts: [
    {
      artifactSha256: "sha256:windows-installer",
      certificateFingerprint: "SHA256:11:22:33:44",
      fileName: "EssenceSpline_1.6.0_x64_en-US.msi",
      manifestArtifactSha256: "sha256:windows-installer",
      manifestFileName: "latest-windows.yml",
      platform: "windows",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "SHA256:11:22:33:44",
      requiredReleaseChannel: "stable",
      updaterSignature: "sig:windows",
    },
    {
      artifactSha256: "sha256:macos-dmg",
      certificateFingerprint: "SHA256:AA:BB:CC:DD",
      fileName: "EssenceSpline_1.6.0_aarch64.dmg",
      manifestArtifactSha256: "sha256:macos-dmg",
      manifestFileName: "latest-macos.json",
      platform: "macos",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "SHA256:AA:BB:CC:DD",
      requiredReleaseChannel: "stable",
      updaterSignature: "sig:macos",
    },
    {
      artifactSha256: "sha256:linux-appimage",
      certificateFingerprint: "SHA256:55:66:77:88",
      fileName: "EssenceSpline_1.6.0_amd64.AppImage",
      manifestArtifactSha256: "sha256:linux-appimage",
      manifestFileName: "latest-linux.json",
      platform: "linux",
      releaseChannel: "stable",
      requiredCertificateFingerprint: "SHA256:55:66:77:88",
      requiredReleaseChannel: "stable",
      updaterSignature: "sig:linux",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.validationScore, 100);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.ok(report.summary.validationHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.equal(report.rows.every((row) => row.manifestMatchesArtifact), true);
assert.equal(report.rows.every((row) => row.certificateMatchesExpectation), true);
assert.equal(report.rows.every((row) => row.channelMatchesExpectation), true);
assert.match(report.csvContent, /^receipt_id,platform,file_name,status,manifest_matches_artifact,certificate_matches_expectation,channel_matches_expectation,validation_hash,next_action/);
assert.ok(report.jsonContent.includes("latest-windows.yml"));
assert.equal(report.csvFileName, "essence-runtime-native-artifact-execution-receipt-validator-20260518.csv");
assert.equal(report.jsonFileName, "essence-runtime-native-artifact-execution-receipt-validator-20260518.json");
assert.ok(report.csvDataUri.startsWith("data:text/csv"));
assert.ok(report.jsonDataUri.startsWith("data:application/json"));

const blockedReport = createNativeArtifactExecutionReceiptValidator({
  receipts: [
    {
      artifactSha256: "sha256:windows-installer",
      certificateFingerprint: "SHA256:BAD",
      fileName: "EssenceSpline_1.6.0_x64_en-US.msi",
      manifestArtifactSha256: "sha256:older-windows-installer",
      manifestFileName: "latest-windows.yml",
      platform: "windows",
      releaseChannel: "beta",
      requiredCertificateFingerprint: "SHA256:11:22:33:44",
      requiredReleaseChannel: "stable",
      updaterSignature: null,
    },
  ],
  requiredPlatforms: ["windows", "macos"],
  workspaceId: "Essence Runtime",
});

assert.equal(blockedReport.summary.status, "blocked");
assert.ok(blockedReport.summary.validationScore < 50);
assert.equal(blockedReport.summary.blockedCount, 2);
assert.equal(blockedReport.rows.find((row) => row.platform === "windows")?.manifestMatchesArtifact, false);
assert.equal(blockedReport.rows.find((row) => row.platform === "windows")?.certificateMatchesExpectation, false);
assert.equal(blockedReport.rows.find((row) => row.platform === "windows")?.channelMatchesExpectation, false);
assert.match(blockedReport.summary.nextAction, /Resolve blocked native artifact execution receipts/);

console.log("native artifact execution receipt validator smoke passed");
