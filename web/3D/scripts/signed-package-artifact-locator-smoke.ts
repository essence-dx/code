import { strict as assert } from "node:assert";

import { createSignedPackageArtifactLocator } from "@/features/projects/signed-package-artifact-locator";

const generatedAt = "2026-05-28T09:00:00.000Z";
const releaseCandidateId = "native-2.4.0-fulfillment-reality";
const workspaceId = "Essence Runtime";

const locator = createSignedPackageArtifactLocator({
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

assert.equal(locator.summary.status, "ready");
assert.equal(locator.summary.releaseBlocked, false);
assert.equal(locator.summary.locatorScore, 100);
assert.equal(locator.summary.readyCount, 3);
assert.equal(locator.summary.blockedCount, 0);
assert.equal(locator.summary.reviewCount, 0);
assert.equal(locator.summary.outputLocatedCount, 3);
assert.equal(locator.summary.certificateReadyCount, 3);
assert.equal(locator.summary.uploadReadyCount, 3);
assert.equal(locator.summary.missingArtifactBlockerCount, 0);
assert.ok(locator.summary.locatorHash.startsWith("sha256:"));
assert.deepEqual(
  locator.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.equal(locator.rows.find((row) => row.platform === "windows")?.sourceKind, "local");
assert.equal(locator.rows.find((row) => row.platform === "macos")?.sourceKind, "ci");
assert.equal(locator.rows.find((row) => row.platform === "linux")?.sourceKind, "local-and-ci");
assert.ok(locator.rows.every((row) => row.outputLocated));
assert.ok(locator.rows.every((row) => row.checksumReady));
assert.ok(locator.rows.every((row) => row.certificateReady));
assert.ok(locator.rows.every((row) => row.uploadReady));
assert.ok(locator.rows.every((row) => row.ciRunLinked));
assert.match(
  locator.csvContent,
  /^platform,status,source_kind,output_located,checksum_ready,certificate_ready,upload_ready,missing_artifact_blocker,locator_hash,next_action/,
);
assert.ok(locator.jsonContent.includes("Developer ID Application"));
assert.equal(
  locator.csvFileName,
  "essence-runtime-signed-package-artifact-locator-native-2-4-0-fulfillment-reality-20260528.csv",
);
assert.equal(
  locator.jsonFileName,
  "essence-runtime-signed-package-artifact-locator-native-2-4-0-fulfillment-reality-20260528.json",
);
assert.equal(locator.files.length, 2);

const blocked = createSignedPackageArtifactLocator({
  artifacts: [
    {
      artifactName: "EssenceSpline-2.4.0-setup.exe",
      artifactSha256: "",
      certificateExpiresAt: "",
      certificateFingerprint: "",
      certificateIssuer: "",
      certificateSubject: "",
      ciArtifactUrl: "",
      ciRunUrl: "",
      localOutputPath: "",
      platform: "windows",
      signedAt: "",
      uploadDestinationUrl: "",
      uploadOwner: "",
      uploadProvider: "",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.locatorScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.summary.missingArtifactBlockerCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.outputLocated, false);
assert.equal(blocked.rows.find((row) => row.platform === "macos")?.sourceKind, "missing");
assert.match(
  blocked.rows.find((row) => row.platform === "linux")?.blockerReason ?? "",
  /No linux signed package artifact located/,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked signed package artifact locator/,
);

console.log("signed package artifact locator smoke passed");
