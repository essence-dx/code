import { strict as assert } from "node:assert";
import { createCertificateBackedNativeArtifactIngestion } from "@/features/projects/certificate-backed-native-artifact-ingestion";

const generatedAt = "2026-06-01T10:00:00.000Z";
const workspaceId = "Workspace Native Runtime";

const readyIngestion = createCertificateBackedNativeArtifactIngestion({
  artifacts: [
    {
      artifactSha256: "sha256:windows-installer",
      certificateFingerprint: "SHA256:11:22:33:44",
      fileName: "EssenceSpline_1.5.0_x64_en-US.msi",
      platform: "windows",
      revocationStatus: "valid",
      signedAt: "2026-06-01T09:10:00.000Z",
      signerIdentity: "CN=Essence Spline",
      timestampAuthority: "DigiCert Timestamp Server",
      timestampedAt: "2026-06-01T09:12:00.000Z",
      uploadedAt: "2026-06-01T09:20:00.000Z",
      uploader: "release-operator",
    },
    {
      artifactSha256: "sha256:macos-dmg",
      certificateFingerprint: "SHA256:AA:BB:CC:DD",
      fileName: "EssenceSpline_1.5.0_aarch64.dmg",
      platform: "macos",
      revocationStatus: "valid",
      signedAt: "2026-06-01T09:15:00.000Z",
      signerIdentity: "Developer ID Application: Essence Spline",
      timestampAuthority: "Apple Timestamp Authority",
      timestampedAt: "2026-06-01T09:16:00.000Z",
      uploadedAt: "2026-06-01T09:24:00.000Z",
      uploader: "release-operator",
    },
    {
      artifactSha256: "sha256:linux-appimage",
      certificateFingerprint: "SHA256:55:66:77:88",
      fileName: "EssenceSpline_1.5.0_amd64.AppImage",
      platform: "linux",
      revocationStatus: "valid",
      signedAt: "2026-06-01T09:18:00.000Z",
      signerIdentity: "Essence Spline Linux Release",
      timestampAuthority: "GPG signature timestamp",
      timestampedAt: "2026-06-01T09:19:00.000Z",
      uploadedAt: "2026-06-01T09:28:00.000Z",
      uploader: "release-operator",
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(readyIngestion.summary.status, "ready");
assert.equal(readyIngestion.summary.rowCount, 3);
assert.equal(readyIngestion.summary.readyCount, 3);
assert.equal(readyIngestion.summary.blockedCount, 0);
assert.equal(readyIngestion.summary.ingestionScore, 100);
assert.deepEqual(
  readyIngestion.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.match(readyIngestion.summary.nextAction, /Certificate-backed native artifact ingestion is ready/);
assert.equal(readyIngestion.csvFileName, "workspace-native-runtime-certificate-backed-native-artifact-ingestion-20260601.csv");
assert.equal(readyIngestion.jsonFileName, "workspace-native-runtime-certificate-backed-native-artifact-ingestion-20260601.json");
assert.match(readyIngestion.csvContent, /^ingestion_id,platform,file_name,status,artifact_sha256,certificate_fingerprint,revocation_status,timestamp_authority,ingestion_hash,next_action/);

const blockedIngestion = createCertificateBackedNativeArtifactIngestion({
  artifacts: [],
  generatedAt,
  workspaceId,
});

assert.equal(blockedIngestion.summary.status, "blocked");
assert.equal(blockedIngestion.summary.blockedCount, 3);
assert.match(blockedIngestion.summary.nextAction, /Upload certificate-backed native artifacts/);

const reviewIngestion = createCertificateBackedNativeArtifactIngestion({
  artifacts: [
    {
      artifactSha256: "sha256:windows-installer",
      certificateFingerprint: "SHA256:11:22:33:44",
      fileName: "EssenceSpline_1.5.0_x64_en-US.msi",
      platform: "windows",
      revocationStatus: "unknown",
      signedAt: "2026-06-01T09:10:00.000Z",
      signerIdentity: "CN=Essence Spline",
      timestampAuthority: "DigiCert Timestamp Server",
      timestampedAt: "2026-06-01T09:12:00.000Z",
      uploadedAt: "2026-06-01T09:20:00.000Z",
      uploader: "release-operator",
    },
  ],
  generatedAt,
  requiredPlatforms: ["windows"],
  workspaceId,
});

assert.equal(reviewIngestion.summary.status, "review");
assert.equal(reviewIngestion.summary.reviewCount, 1);
assert.match(reviewIngestion.summary.nextAction, /Review certificate-backed native artifact ingestion/);

const revokedIngestion = createCertificateBackedNativeArtifactIngestion({
  artifacts: [
    {
      artifactSha256: "sha256:linux-appimage",
      certificateFingerprint: "SHA256:55:66:77:88",
      fileName: "EssenceSpline_1.5.0_amd64.AppImage",
      platform: "linux",
      revocationStatus: "revoked",
      signedAt: "2026-06-01T09:18:00.000Z",
      signerIdentity: "Essence Spline Linux Release",
      timestampAuthority: "GPG signature timestamp",
      timestampedAt: "2026-06-01T09:19:00.000Z",
      uploadedAt: "2026-06-01T09:28:00.000Z",
      uploader: "release-operator",
    },
  ],
  generatedAt,
  requiredPlatforms: ["linux"],
  workspaceId,
});

assert.equal(revokedIngestion.summary.status, "blocked");
assert.equal(revokedIngestion.summary.blockedCount, 1);
assert.match(revokedIngestion.rows[0]?.nextAction ?? "", /Replace revoked certificate/);

console.log("certificate-backed native artifact ingestion smoke passed");
