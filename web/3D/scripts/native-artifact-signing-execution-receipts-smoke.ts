import { strict as assert } from "node:assert";
import { createNativeArtifactSigningExecutionReceipts } from "@/features/projects/native-artifact-signing-execution-receipts";

const generatedAt = "2026-05-31T09:00:00.000Z";
const workspaceId = "Workspace Native";

const readyReceipts = createNativeArtifactSigningExecutionReceipts({
  artifacts: [
    {
      artifactSha256: "sha256:macos-app-archive",
      certificateFingerprint: "SHA256:AA:BB:CC:DD",
      fileName: "EssenceSpline_1.4.0_aarch64.app.tar.gz",
      platform: "macos",
      signedAt: "2026-05-31T08:12:00.000Z",
      signerIdentity: "Developer ID Application: Essence Spline",
      timestampAuthority: "Apple Timestamp Authority",
      timestampedAt: "2026-05-31T08:13:00.000Z",
      updaterSignature: "ed25519:macos-updater-signature",
    },
    {
      artifactSha256: "sha256:windows-msix",
      certificateFingerprint: "SHA256:11:22:33:44",
      fileName: "EssenceSpline_1.4.0_x64_en-US.msi",
      platform: "windows",
      signedAt: "2026-05-31T08:22:00.000Z",
      signerIdentity: "CN=Essence Spline",
      timestampAuthority: "DigiCert Timestamp Server",
      timestampedAt: "2026-05-31T08:23:00.000Z",
      updaterSignature: "ed25519:windows-updater-signature",
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(readyReceipts.summary.status, "ready");
assert.equal(readyReceipts.summary.rowCount, 2);
assert.equal(readyReceipts.summary.readyCount, 2);
assert.equal(readyReceipts.summary.blockedCount, 0);
assert.equal(readyReceipts.summary.receiptScore, 100);
assert.ok(readyReceipts.rows.every((row) => row.receiptHash.startsWith("sha256:")));
assert.match(readyReceipts.summary.nextAction, /Native artifact signing execution receipts are ready/);
assert.equal(readyReceipts.csvFileName, "workspace-native-native-artifact-signing-execution-receipts-20260531.csv");
assert.equal(readyReceipts.jsonFileName, "workspace-native-native-artifact-signing-execution-receipts-20260531.json");
assert.match(readyReceipts.csvContent, /^artifact_id,platform,file_name,status,artifact_sha256,certificate_fingerprint,timestamp_authority,updater_signature,receipt_hash,next_action/);

const blockedReceipts = createNativeArtifactSigningExecutionReceipts({
  artifacts: [],
  generatedAt,
  workspaceId,
});

assert.equal(blockedReceipts.summary.status, "blocked");
assert.equal(blockedReceipts.summary.blockedCount, 1);
assert.match(blockedReceipts.summary.nextAction, /Ingest signed native desktop artifacts/);

const reviewReceipts = createNativeArtifactSigningExecutionReceipts({
  artifacts: [
    {
      artifactSha256: "sha256:linux-appimage",
      certificateFingerprint: "SHA256:55:66:77:88",
      fileName: "EssenceSpline_1.4.0_amd64.AppImage",
      platform: "linux",
      signedAt: "2026-05-31T08:32:00.000Z",
      signerIdentity: "Essence Spline Linux Release",
      timestampAuthority: null,
      timestampedAt: null,
      updaterSignature: "ed25519:linux-updater-signature",
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(reviewReceipts.summary.status, "review");
assert.equal(reviewReceipts.summary.reviewCount, 1);
assert.match(reviewReceipts.summary.nextAction, /Review native signing execution receipts/);

console.log("native artifact signing execution receipts smoke passed");
