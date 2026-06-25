import { strict as assert } from "node:assert";

import { createSignedArtifactCustodyLedger } from "@/features/projects/signed-artifact-custody-ledger";

const ledger = createSignedArtifactCustodyLedger({
  artifacts: [
    {
      artifactSha256: "sha256:windows-artifact",
      certificateCustodyOwner: "Release Engineering",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/windows/certificate.json",
      checksumRenewalAt: "2026-06-21T08:00:00.000Z",
      checksumRenewalHash: "sha256:windows-renewal",
      platform: "windows",
      retentionExpiresAt: "2027-05-21T08:00:00.000Z",
      storageOwner: "Release Engineering",
      storageUrl:
        "https://release.essence-spline.com/native/1.7.0/windows/setup.exe",
    },
    {
      artifactSha256: "sha256:macos-artifact",
      certificateCustodyOwner: "Desktop Platform",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/macos/certificate.json",
      checksumRenewalAt: "2026-06-21T08:05:00.000Z",
      checksumRenewalHash: "sha256:macos-renewal",
      platform: "macos",
      retentionExpiresAt: "2027-05-21T08:00:00.000Z",
      storageOwner: "Desktop Platform",
      storageUrl:
        "https://release.essence-spline.com/native/1.7.0/macos/app.dmg",
    },
    {
      artifactSha256: "sha256:linux-artifact",
      certificateCustodyOwner: "Release Engineering",
      certificateEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/linux/certificate.json",
      checksumRenewalAt: "2026-06-21T08:10:00.000Z",
      checksumRenewalHash: "sha256:linux-renewal",
      platform: "linux",
      retentionExpiresAt: "2027-05-21T08:00:00.000Z",
      storageOwner: "Release Engineering",
      storageUrl:
        "https://release.essence-spline.com/native/1.7.0/linux/app.AppImage",
    },
  ],
  generatedAt: "2026-05-21T18:00:00.000Z",
  releaseCandidateId: "native-1.7.0-custody",
  workspaceId: "Essence Runtime",
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.custodyScore, 100);
assert.equal(ledger.summary.readyCount, 3);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.reviewCount, 0);
assert.equal(ledger.summary.storageOwnerReadyCount, 3);
assert.equal(ledger.summary.retentionReadyCount, 3);
assert.equal(ledger.summary.checksumRenewalReadyCount, 3);
assert.equal(ledger.summary.certificateCustodyReadyCount, 3);
assert.ok(ledger.summary.ledgerHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(ledger.rows.every((row) => row.storageOwnerReady));
assert.ok(ledger.rows.every((row) => row.retentionReady));
assert.ok(ledger.rows.every((row) => row.checksumRenewalReady));
assert.ok(ledger.rows.every((row) => row.certificateCustodyReady));
assert.match(
  ledger.rows.find((row) => row.platform === "windows")?.storageUrl ?? "",
  /setup\.exe/,
);
assert.match(
  ledger.rows.find((row) => row.platform === "macos")?.certificateCustodyOwner ?? "",
  /Desktop Platform/,
);
assert.match(
  ledger.csvContent,
  /^platform,status,storage_owner_ready,retention_ready,checksum_renewal_ready,certificate_custody_ready,ledger_hash,next_action/,
);
assert.ok(ledger.jsonContent.includes("linux-renewal"));
assert.equal(
  ledger.csvFileName,
  "essence-runtime-signed-artifact-custody-ledger-native-1-7-0-custody-20260521.csv",
);
assert.equal(
  ledger.jsonFileName,
  "essence-runtime-signed-artifact-custody-ledger-native-1-7-0-custody-20260521.json",
);
assert.equal(ledger.files.length, 2);

const blocked = createSignedArtifactCustodyLedger({
  artifacts: [
    {
      artifactSha256: "sha256:windows-artifact",
      certificateCustodyOwner: "",
      certificateEvidenceUrl: "",
      checksumRenewalAt: "",
      checksumRenewalHash: "",
      platform: "windows",
      retentionExpiresAt: "",
      storageOwner: "",
      storageUrl: "",
    },
  ],
  releaseCandidateId: "native-1.7.0-custody",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.custodyScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(
  blocked.rows.find((row) => row.platform === "windows")?.storageOwnerReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.platform === "windows")?.retentionReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.platform === "linux")?.certificateCustodyReady,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked signed artifact custody ledger/,
);

console.log("signed artifact custody ledger smoke passed");
