import { strict as assert } from "node:assert";
import { createNativeUpdaterDownloadRehearsalEvidence } from "@/features/projects/native-updater-download-rehearsal-evidence";

const report = createNativeUpdaterDownloadRehearsalEvidence({
  generatedAt: "2026-05-18T22:00:00.000Z",
  rehearsals: [
    {
      artifactSha256: "sha256:windows-artifact",
      byteRangeResumeVerified: true,
      checksumVerified: true,
      downloadUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_x64-setup.exe",
      expiredLinkHandled: true,
      finalByteCount: 128048128,
      manifestSha256: "sha256:windows-manifest",
      platform: "windows",
      rehearsalId: "windows-updater-download-20260518",
      resumedFromByte: 64000000,
    },
    {
      artifactSha256: "sha256:macos-artifact",
      byteRangeResumeVerified: true,
      checksumVerified: true,
      downloadUrl: "https://blob.vercel-storage.com/native/Essence_1.4.0_aarch64.dmg",
      expiredLinkHandled: true,
      finalByteCount: 154042368,
      manifestSha256: "sha256:macos-manifest",
      platform: "macos",
      rehearsalId: "macos-updater-download-20260518",
      resumedFromByte: 77000000,
    },
    {
      artifactSha256: "sha256:linux-artifact",
      byteRangeResumeVerified: true,
      checksumVerified: true,
      downloadUrl: "https://blob.vercel-storage.com/native/essence-spline_1.4.0_amd64.AppImage",
      expiredLinkHandled: true,
      finalByteCount: 116391936,
      manifestSha256: "sha256:linux-manifest",
      platform: "linux",
      rehearsalId: "linux-updater-download-20260518",
      resumedFromByte: 58000000,
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.rehearsalScore, 100);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.expiredLinkHandledCount, 3);
assert.ok(report.summary.rehearsalHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(report.rows.every((row) => row.byteRangeResumeVerified));
assert.ok(report.rows.every((row) => row.checksumVerified));
assert.ok(report.rows.every((row) => row.expiredLinkHandled));
assert.ok(report.rows.every((row) => row.byteCountReady));
assert.match(
  report.csvContent,
  /^platform,status,byte_range_resume_verified,checksum_verified,expired_link_handled,byte_count_ready,rehearsal_hash,next_action/,
);
assert.ok(report.jsonContent.includes("linux-updater-download-20260518"));
assert.equal(report.csvFileName, "essence-runtime-native-updater-download-rehearsal-evidence-native-1-4-0-stable-20260518.csv");
assert.equal(report.jsonFileName, "essence-runtime-native-updater-download-rehearsal-evidence-native-1-4-0-stable-20260518.json");
assert.equal(report.files.length, 2);

const blocked = createNativeUpdaterDownloadRehearsalEvidence({
  rehearsals: [
    {
      artifactSha256: "",
      byteRangeResumeVerified: false,
      checksumVerified: false,
      downloadUrl: "",
      expiredLinkHandled: false,
      finalByteCount: 0,
      manifestSha256: "",
      platform: "windows",
      rehearsalId: "windows-updater-download-20260518",
      resumedFromByte: 0,
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.rehearsalScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.checksumVerified, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.expiredLinkHandled, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native updater download rehearsal evidence/);

console.log("native updater download rehearsal evidence smoke passed");
