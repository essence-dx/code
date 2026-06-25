import { strict as assert } from "node:assert";

import { createNativeReleaseEnforcementLedger } from "@/features/projects/native-release-enforcement-ledger";

const ledger = createNativeReleaseEnforcementLedger({
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
  generatedAt: "2026-05-25T09:00:00.000Z",
  releaseCandidateId: "native-2.1.0-enforcement",
  workspaceId: "Essence Runtime",
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.enforcementScore, 100);
assert.equal(ledger.summary.releaseBlocked, false);
assert.equal(ledger.summary.readyCount, 3);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.reviewCount, 0);
assert.equal(ledger.summary.signedPackageReadyCount, 3);
assert.equal(ledger.summary.certificateFingerprintReadyCount, 3);
assert.equal(ledger.summary.timestampAuthorityReadyCount, 3);
assert.equal(ledger.summary.revocationClearCount, 3);
assert.ok(ledger.summary.enforcementHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(ledger.rows.every((row) => row.signedPackageReady));
assert.ok(ledger.rows.every((row) => row.certificateFingerprintReady));
assert.ok(ledger.rows.every((row) => row.timestampAuthorityReady));
assert.ok(ledger.rows.every((row) => row.revocationReady));
assert.ok(ledger.rows.every((row) => row.ownerReady));
assert.match(
  ledger.csvContent,
  /^platform,status,artifact_name,signed_package_ready,certificate_fingerprint_ready,timestamp_authority_ready,revocation_ready,owner_ready,enforcement_hash,next_action/,
);
assert.ok(ledger.jsonContent.includes("windows-timestamp-proof"));
assert.equal(
  ledger.csvFileName,
  "essence-runtime-native-release-enforcement-ledger-native-2-1-0-enforcement-20260525.csv",
);
assert.equal(
  ledger.jsonFileName,
  "essence-runtime-native-release-enforcement-ledger-native-2-1-0-enforcement-20260525.json",
);
assert.equal(ledger.files.length, 2);

const blocked = createNativeReleaseEnforcementLedger({
  artifacts: [
    {
      artifactName: "",
      certificateFingerprint: "",
      enforcementOwner: "",
      platform: "windows",
      revocationCheckedAt: "",
      revocationStatus: "unknown",
      signedPackageHash: "",
      timestampAuthority: "",
      timestampProofHash: "",
      timestampedAt: "",
    },
    {
      artifactName: "Essence_2.1.0_aarch64.dmg",
      certificateFingerprint: "sha256:macos-developer-id-fingerprint",
      enforcementOwner: "Desktop Platform",
      platform: "macos",
      revocationCheckedAt: "2026-05-25T08:22:00.000Z",
      revocationStatus: "revoked",
      signedPackageHash: "sha256:macos-notarized-package",
      timestampAuthority: "Apple Developer Timestamp",
      timestampProofHash: "sha256:macos-timestamp-proof",
      timestampedAt: "2026-05-25T08:17:00.000Z",
    },
  ],
  releaseCandidateId: "native-2.1.0-enforcement",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.enforcementScore < 60);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.signedPackageReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.certificateFingerprintReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.timestampAuthorityReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.revocationReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "macos")?.revocationReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "linux")?.status, "blocked");
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native release enforcement ledger/,
);

console.log("native release enforcement ledger smoke passed");
