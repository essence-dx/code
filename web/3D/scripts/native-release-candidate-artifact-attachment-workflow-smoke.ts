import { strict as assert } from "node:assert";
import { createNativeReleaseCandidateArtifactAttachmentWorkflow } from "@/features/projects/native-release-candidate-artifact-attachment-workflow";

const workflow = createNativeReleaseCandidateArtifactAttachmentWorkflow({
  generatedAt: "2026-05-19T08:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  attachments: [
    {
      artifactSha256: "sha256:windows-ev-installer",
      artifactUrl: "https://release.essence-spline.com/native/1.4.0/windows/Essence_1.4.0_x64-setup.exe",
      attachedAt: "2026-05-20T09:20:00.000Z",
      attachmentOwner: "Release Engineering",
      intakeHash: "sha256:windows-intake-row",
      manifestArtifactSha256: "sha256:windows-ev-installer",
      manifestUpdatedAt: "2026-05-20T09:26:00.000Z",
      manifestUrl: "https://release.essence-spline.com/native/1.4.0/windows/latest.yml",
      platform: "windows",
      releaseApprovalBlocked: false,
      updaterChannel: "stable",
    },
    {
      artifactSha256: "sha256:macos-notarized-dmg",
      artifactUrl: "https://release.essence-spline.com/native/1.4.0/macos/Essence_1.4.0_aarch64.dmg",
      attachedAt: "2026-05-20T10:20:00.000Z",
      attachmentOwner: "Desktop Platform",
      intakeHash: "sha256:macos-intake-row",
      manifestArtifactSha256: "sha256:macos-notarized-dmg",
      manifestUpdatedAt: "2026-05-20T10:27:00.000Z",
      manifestUrl: "https://release.essence-spline.com/native/1.4.0/macos/latest.json",
      platform: "macos",
      releaseApprovalBlocked: false,
      updaterChannel: "stable",
    },
    {
      artifactSha256: "sha256:linux-signed-appimage",
      artifactUrl: "https://release.essence-spline.com/native/1.4.0/linux/essence-spline_1.4.0_amd64.AppImage",
      attachedAt: "2026-05-20T11:20:00.000Z",
      attachmentOwner: "Release Engineering",
      intakeHash: "sha256:linux-intake-row",
      manifestArtifactSha256: "sha256:linux-signed-appimage",
      manifestUpdatedAt: "2026-05-20T11:29:00.000Z",
      manifestUrl: "https://release.essence-spline.com/native/1.4.0/linux/latest.json",
      platform: "linux",
      releaseApprovalBlocked: false,
      updaterChannel: "stable",
    },
  ],
  requiredUpdaterChannel: "stable",
  workspaceId: "Essence Runtime",
});

assert.equal(workflow.summary.status, "ready");
assert.equal(workflow.summary.workflowScore, 100);
assert.equal(workflow.summary.readyCount, 3);
assert.equal(workflow.summary.blockedCount, 0);
assert.equal(workflow.summary.reviewCount, 0);
assert.equal(workflow.summary.attachmentReadyCount, 3);
assert.equal(workflow.summary.manifestReadyCount, 3);
assert.equal(workflow.summary.approvalUnblockedCount, 3);
assert.ok(workflow.summary.workflowHash.startsWith("sha256:"));
assert.deepEqual(
  workflow.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(workflow.rows.every((row) => row.attachmentReady));
assert.ok(workflow.rows.every((row) => row.manifestReady));
assert.ok(workflow.rows.every((row) => row.channelReady));
assert.ok(workflow.rows.every((row) => row.releaseApprovalReady));
assert.match(
  workflow.csvContent,
  /^platform,status,artifact_attached,manifest_ready,channel_ready,release_approval_ready,workflow_hash,next_action/,
);
assert.ok(workflow.jsonContent.includes("windows-ev-installer"));
assert.equal(workflow.csvFileName, "essence-runtime-native-release-candidate-artifact-attachment-workflow-native-1-4-0-stable-20260519.csv");
assert.equal(workflow.jsonFileName, "essence-runtime-native-release-candidate-artifact-attachment-workflow-native-1-4-0-stable-20260519.json");
assert.equal(workflow.files.length, 2);

const blocked = createNativeReleaseCandidateArtifactAttachmentWorkflow({
  attachments: [
    {
      artifactSha256: "sha256:windows-ev-installer",
      artifactUrl: "",
      attachedAt: "",
      attachmentOwner: "",
      intakeHash: "",
      manifestArtifactSha256: "sha256:old-windows-installer",
      manifestUpdatedAt: "",
      manifestUrl: "",
      platform: "windows",
      releaseApprovalBlocked: true,
      updaterChannel: "beta",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  requiredUpdaterChannel: "stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.workflowScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.attachmentReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.manifestReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.releaseApprovalReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native release candidate artifact attachment workflow/);

console.log("native release candidate artifact attachment workflow smoke passed");
