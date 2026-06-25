import { strict as assert } from "node:assert";
import { createNativeSignedArtifactExternalHandoffCloseout } from "@/features/projects/native-signed-artifact-external-handoff-closeout";

const closeout = createNativeSignedArtifactExternalHandoffCloseout({
  generatedAt: "2026-05-19T02:00:00.000Z",
  handoffs: [
    {
      artifactAttachmentLocation: "Vercel Blob native/windows/1.4.0/Essence_1.4.0_x64-setup.exe",
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      blockingGate: "windows-certificate-backed-installer",
      certificateAuthority: "DigiCert EV Code Signing",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/windows/evidence.json",
      gateBlockedWithoutArtifact: true,
      handoffOwner: "Release Engineering",
      ownerAcknowledged: true,
      platform: "windows",
      releaseApprovalRequired: true,
      signerIdentity: "Essence Runtime LLC",
      targetAttachedAt: "2026-05-20T09:00:00.000Z",
    },
    {
      artifactAttachmentLocation: "Vercel Blob native/macos/1.4.0/Essence_1.4.0_aarch64.dmg",
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      blockingGate: "macos-notarized-dmg",
      certificateAuthority: "Apple Developer ID",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/macos/evidence.json",
      gateBlockedWithoutArtifact: true,
      handoffOwner: "Desktop Platform",
      ownerAcknowledged: true,
      platform: "macos",
      releaseApprovalRequired: true,
      signerIdentity: "Essence Runtime LLC",
      targetAttachedAt: "2026-05-20T10:00:00.000Z",
    },
    {
      artifactAttachmentLocation: "Vercel Blob native/linux/1.4.0/essence-spline_1.4.0_amd64.AppImage",
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      blockingGate: "linux-appimage-signature",
      certificateAuthority: "GPG release signing key",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/linux/evidence.json",
      gateBlockedWithoutArtifact: true,
      handoffOwner: "Release Engineering",
      ownerAcknowledged: true,
      platform: "linux",
      releaseApprovalRequired: true,
      signerIdentity: "Essence Runtime LLC",
      targetAttachedAt: "2026-05-20T11:00:00.000Z",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(closeout.summary.status, "ready");
assert.equal(closeout.summary.closeoutScore, 100);
assert.equal(closeout.summary.readyCount, 3);
assert.equal(closeout.summary.blockedCount, 0);
assert.equal(closeout.summary.reviewCount, 0);
assert.equal(closeout.summary.blockedReleaseGateCount, 3);
assert.equal(closeout.summary.ownerAcknowledgedCount, 3);
assert.ok(closeout.summary.closeoutHash.startsWith("sha256:"));
assert.deepEqual(
  closeout.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(closeout.rows.every((row) => row.attachmentLocationReady));
assert.ok(closeout.rows.every((row) => row.ownerReady));
assert.ok(closeout.rows.every((row) => row.releaseGateDocumented));
assert.ok(closeout.rows.every((row) => row.evidencePacketLinked));
assert.match(
  closeout.csvContent,
  /^platform,status,artifact_file_name,attachment_location_ready,owner_ready,release_gate_documented,gate_blocked_without_artifact,evidence_packet_linked,closeout_hash,next_action/,
);
assert.ok(closeout.jsonContent.includes("windows-certificate-backed-installer"));
assert.equal(closeout.csvFileName, "essence-runtime-native-signed-artifact-external-handoff-closeout-native-1-4-0-stable-20260519.csv");
assert.equal(closeout.jsonFileName, "essence-runtime-native-signed-artifact-external-handoff-closeout-native-1-4-0-stable-20260519.json");
assert.equal(closeout.files.length, 2);

const blocked = createNativeSignedArtifactExternalHandoffCloseout({
  handoffs: [
    {
      artifactAttachmentLocation: "",
      artifactFileName: "",
      blockingGate: "",
      certificateAuthority: "",
      evidencePacketUrl: "",
      gateBlockedWithoutArtifact: false,
      handoffOwner: "",
      ownerAcknowledged: false,
      platform: "windows",
      releaseApprovalRequired: true,
      signerIdentity: "",
      targetAttachedAt: "",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.closeoutScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.ownerReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.releaseGateDocumented, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native signed artifact external handoff closeout/);

console.log("native signed artifact external handoff closeout smoke passed");
