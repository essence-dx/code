import { strict as assert } from "node:assert";
import { createCertificateBackedPackageArtifactRealityVerifier } from "@/features/projects/certificate-backed-package-artifact-reality-verifier";

const verifier = createCertificateBackedPackageArtifactRealityVerifier({
  generatedAt: "2026-05-20T06:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  artifacts: [
    {
      artifactSha256: "sha256:windows-ev-installer",
      artifactUrl: "https://release.essence-spline.com/native/1.4.0/windows/Essence_1.4.0_x64-setup.exe",
      certificateFingerprint: "sha256:windows-ev-certificate-fingerprint",
      certificateSubject: "Essence Runtime LLC",
      notarizationTicketHash: "",
      platform: "windows",
      revocationCheckedAt: "2026-05-20T06:08:00.000Z",
      revocationStatus: "clear",
      signedAt: "2026-05-20T06:03:00.000Z",
      signatureAuthority: "DigiCert EV Code Signing",
      signatureKind: "authenticode",
      transparencyLogUrl: "",
      verificationCommand: "signtool verify /pa /tw Essence_1.4.0_x64-setup.exe",
      verificationExitCode: 0,
      verificationTranscriptHash: "sha256:windows-authenticode-transcript",
      verifierOwner: "Release Engineering",
    },
    {
      artifactSha256: "sha256:macos-notarized-dmg",
      artifactUrl: "https://release.essence-spline.com/native/1.4.0/macos/Essence_1.4.0_aarch64.dmg",
      certificateFingerprint: "sha256:macos-developer-id-fingerprint",
      certificateSubject: "Developer ID Application: Essence Runtime LLC",
      notarizationTicketHash: "sha256:apple-notarization-ticket",
      platform: "macos",
      revocationCheckedAt: "2026-05-20T06:18:00.000Z",
      revocationStatus: "clear",
      signedAt: "2026-05-20T06:13:00.000Z",
      signatureAuthority: "Apple Developer ID",
      signatureKind: "codesign-notarized",
      transparencyLogUrl: "",
      verificationCommand: "codesign --verify --deep --strict Essence.app && spctl -a -vv Essence.app",
      verificationExitCode: 0,
      verificationTranscriptHash: "sha256:macos-codesign-notarization-transcript",
      verifierOwner: "Desktop Platform",
    },
    {
      artifactSha256: "sha256:linux-signed-appimage",
      artifactUrl: "https://release.essence-spline.com/native/1.4.0/linux/essence-spline_1.4.0_amd64.AppImage",
      certificateFingerprint: "sha256:linux-release-key-fingerprint",
      certificateSubject: "Essence Runtime Release Key",
      notarizationTicketHash: "",
      platform: "linux",
      revocationCheckedAt: "2026-05-20T06:28:00.000Z",
      revocationStatus: "clear",
      signedAt: "2026-05-20T06:23:00.000Z",
      signatureAuthority: "Sigstore Rekor",
      signatureKind: "sigstore",
      transparencyLogUrl: "https://rekor.sigstore.dev/api/v1/log/entries/essence-spline-1.4.0",
      verificationCommand: "cosign verify-blob --bundle essence-spline_1.4.0_amd64.AppImage.bundle essence-spline_1.4.0_amd64.AppImage",
      verificationExitCode: 0,
      verificationTranscriptHash: "sha256:linux-sigstore-transcript",
      verifierOwner: "Release Engineering",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(verifier.summary.status, "ready");
assert.equal(verifier.summary.realityScore, 100);
assert.equal(verifier.summary.readyCount, 3);
assert.equal(verifier.summary.blockedCount, 0);
assert.equal(verifier.summary.reviewCount, 0);
assert.equal(verifier.summary.certificateReadyCount, 3);
assert.equal(verifier.summary.revocationClearCount, 3);
assert.equal(verifier.summary.verificationReadyCount, 3);
assert.ok(verifier.summary.realityHash.startsWith("sha256:"));
assert.deepEqual(
  verifier.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(verifier.rows.every((row) => row.artifactLinked));
assert.ok(verifier.rows.every((row) => row.certificateReady));
assert.ok(verifier.rows.every((row) => row.revocationReady));
assert.ok(verifier.rows.every((row) => row.verificationReady));
assert.equal(verifier.rows.find((row) => row.platform === "macos")?.notarizationReady, true);
assert.equal(verifier.rows.find((row) => row.platform === "linux")?.transparencyReady, true);
assert.match(
  verifier.csvContent,
  /^platform,status,signature_kind,artifact_linked,certificate_ready,revocation_ready,verification_ready,reality_hash,next_action/,
);
assert.ok(verifier.jsonContent.includes("windows-authenticode-transcript"));
assert.equal(verifier.csvFileName, "essence-runtime-certificate-backed-package-artifact-reality-verifier-native-1-4-0-stable-20260520.csv");
assert.equal(verifier.jsonFileName, "essence-runtime-certificate-backed-package-artifact-reality-verifier-native-1-4-0-stable-20260520.json");
assert.equal(verifier.files.length, 2);

const blocked = createCertificateBackedPackageArtifactRealityVerifier({
  artifacts: [
    {
      artifactSha256: "",
      artifactUrl: "",
      certificateFingerprint: "",
      certificateSubject: "",
      notarizationTicketHash: "",
      platform: "windows",
      revocationCheckedAt: "",
      revocationStatus: "unknown",
      signedAt: "",
      signatureAuthority: "",
      signatureKind: "authenticode",
      transparencyLogUrl: "",
      verificationCommand: "",
      verificationExitCode: 1,
      verificationTranscriptHash: "",
      verifierOwner: "",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.realityScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.artifactLinked, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.certificateReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "macos")?.notarizationReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked certificate-backed package artifact reality verifier/);

console.log("certificate-backed package artifact reality verifier smoke passed");
