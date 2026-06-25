import { strict as assert } from "node:assert";
import { createSignedArtifactAttachmentRehearsalPacket } from "@/features/projects/signed-artifact-attachment-rehearsal-packet";

const packet = createSignedArtifactAttachmentRehearsalPacket({
  generatedAt: "2026-05-21T13:00:00.000Z",
  releaseCandidateId: "native-1.6.0-attachment",
  rehearsals: [
    {
      artifactSha256: "sha256:windows-ev-installer",
      artifactUrl: "https://release.essence-spline.com/native/1.6.0/windows/Essence_1.6.0_x64-setup.exe",
      certificateEvidenceOwner: "Release Engineering",
      certificateEvidenceUrl: "https://release.essence-spline.com/native/1.6.0/windows/certificate.json",
      checksumConfirmedAt: "2026-05-21T13:12:00.000Z",
      checksumConfirmationHash: "sha256:windows-checksum-confirmation",
      localFixturePath: "fixtures/native/1.6.0/windows/Essence_1.6.0_x64-setup.exe",
      platform: "windows",
    },
    {
      artifactSha256: "sha256:macos-notarized-dmg",
      artifactUrl: "https://release.essence-spline.com/native/1.6.0/macos/Essence_1.6.0_aarch64.dmg",
      certificateEvidenceOwner: "Desktop Platform",
      certificateEvidenceUrl: "https://release.essence-spline.com/native/1.6.0/macos/certificate.json",
      checksumConfirmedAt: "2026-05-21T13:18:00.000Z",
      checksumConfirmationHash: "sha256:macos-checksum-confirmation",
      localFixturePath: "fixtures/native/1.6.0/macos/Essence_1.6.0_aarch64.dmg",
      platform: "macos",
    },
    {
      artifactSha256: "sha256:linux-signed-appimage",
      artifactUrl: "https://release.essence-spline.com/native/1.6.0/linux/essence-spline_1.6.0_amd64.AppImage",
      certificateEvidenceOwner: "Release Engineering",
      certificateEvidenceUrl: "https://release.essence-spline.com/native/1.6.0/linux/certificate.json",
      checksumConfirmedAt: "2026-05-21T13:22:00.000Z",
      checksumConfirmationHash: "sha256:linux-checksum-confirmation",
      localFixturePath: "fixtures/native/1.6.0/linux/essence-spline_1.6.0_amd64.AppImage",
      platform: "linux",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.rehearsalScore, 100);
assert.equal(packet.summary.readyCount, 3);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.artifactUrlReadyCount, 3);
assert.equal(packet.summary.localFixtureReadyCount, 3);
assert.equal(packet.summary.checksumConfirmedCount, 3);
assert.equal(packet.summary.certificateOwnerReadyCount, 3);
assert.ok(packet.summary.rehearsalHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(packet.rows.every((row) => row.artifactUrlReady));
assert.ok(packet.rows.every((row) => row.localFixtureReady));
assert.ok(packet.rows.every((row) => row.checksumConfirmed));
assert.ok(packet.rows.every((row) => row.certificateOwnerReady));
assert.match(packet.rows.find((row) => row.platform === "macos")?.localFixturePath ?? "", /aarch64\.dmg/);
assert.match(
  packet.csvContent,
  /^platform,status,artifact_url_ready,local_fixture_ready,checksum_confirmed,certificate_owner_ready,rehearsal_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("windows-checksum-confirmation"));
assert.equal(packet.csvFileName, "essence-runtime-signed-artifact-attachment-rehearsal-packet-native-1-6-0-attachment-20260521.csv");
assert.equal(packet.jsonFileName, "essence-runtime-signed-artifact-attachment-rehearsal-packet-native-1-6-0-attachment-20260521.json");
assert.equal(packet.files.length, 2);

const blocked = createSignedArtifactAttachmentRehearsalPacket({
  releaseCandidateId: "native-1.6.0-attachment",
  rehearsals: [
    {
      artifactSha256: "sha256:windows-ev-installer",
      artifactUrl: "",
      certificateEvidenceOwner: "",
      certificateEvidenceUrl: "",
      checksumConfirmedAt: "",
      checksumConfirmationHash: "",
      localFixturePath: "",
      platform: "windows",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.rehearsalScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.artifactUrlReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.localFixtureReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "linux")?.checksumConfirmed, false);
assert.match(blocked.summary.nextAction, /Resolve blocked signed artifact attachment rehearsal packet/);

console.log("signed artifact attachment rehearsal packet smoke passed");
