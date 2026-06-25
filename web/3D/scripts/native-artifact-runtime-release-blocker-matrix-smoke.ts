import { strict as assert } from "node:assert";
import { createNativeArtifactRuntimeReleaseBlockerMatrix } from "@/features/projects/native-artifact-runtime-release-blocker-matrix";

const matrix = createNativeArtifactRuntimeReleaseBlockerMatrix({
  generatedAt: "2026-05-19T04:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  blockers: [
    {
      blockerId: "signed-artifacts-windows",
      cadRuntimeReady: true,
      dueAt: "2026-05-20T09:00:00.000Z",
      evidenceHash: "sha256:windows-signed-artifact-closeout",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/windows/evidence.json",
      owner: "Release Engineering",
      platform: "windows",
      releaseApprovalReady: true,
      signedArtifactReady: true,
      updaterDistributionReady: true,
    },
    {
      blockerId: "cad-runtime-macos",
      cadRuntimeReady: true,
      dueAt: "2026-05-20T10:00:00.000Z",
      evidenceHash: "sha256:macos-cad-runtime-closeout",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/macos/cad-runtime.json",
      owner: "Desktop Platform",
      platform: "macos",
      releaseApprovalReady: true,
      signedArtifactReady: true,
      updaterDistributionReady: true,
    },
    {
      blockerId: "linux-release-approval",
      cadRuntimeReady: true,
      dueAt: "2026-05-20T11:00:00.000Z",
      evidenceHash: "sha256:linux-release-approval",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/linux/approval.json",
      owner: "Release Manager",
      platform: "linux",
      releaseApprovalReady: true,
      signedArtifactReady: true,
      updaterDistributionReady: true,
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(matrix.summary.status, "go");
assert.equal(matrix.summary.matrixScore, 100);
assert.equal(matrix.summary.goCount, 3);
assert.equal(matrix.summary.blockedCount, 0);
assert.equal(matrix.summary.reviewCount, 0);
assert.equal(matrix.summary.signedArtifactReadyCount, 3);
assert.equal(matrix.summary.updaterDistributionReadyCount, 3);
assert.equal(matrix.summary.cadRuntimeReadyCount, 3);
assert.equal(matrix.summary.releaseApprovalReadyCount, 3);
assert.ok(matrix.summary.matrixHash.startsWith("sha256:"));
assert.deepEqual(
  matrix.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(matrix.rows.every((row) => row.goNoGo === "go"));
assert.ok(matrix.rows.every((row) => row.evidenceLinked));
assert.match(
  matrix.csvContent,
  /^platform,go_no_go,signed_artifact_ready,updater_distribution_ready,cad_runtime_ready,release_approval_ready,evidence_linked,matrix_hash,next_action/,
);
assert.ok(matrix.jsonContent.includes("signed-artifacts-windows"));
assert.equal(matrix.csvFileName, "essence-runtime-native-artifact-runtime-release-blocker-matrix-native-1-4-0-stable-20260519.csv");
assert.equal(matrix.jsonFileName, "essence-runtime-native-artifact-runtime-release-blocker-matrix-native-1-4-0-stable-20260519.json");
assert.equal(matrix.files.length, 2);

const blocked = createNativeArtifactRuntimeReleaseBlockerMatrix({
  blockers: [
    {
      blockerId: "signed-artifacts-windows",
      cadRuntimeReady: false,
      dueAt: "",
      evidenceHash: "",
      evidenceUrl: "",
      owner: "",
      platform: "windows",
      releaseApprovalReady: false,
      signedArtifactReady: false,
      updaterDistributionReady: true,
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.matrixScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.goNoGo, "blocked");
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.evidenceLinked, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native artifact runtime release blocker matrix/);

console.log("native artifact runtime release blocker matrix smoke passed");
