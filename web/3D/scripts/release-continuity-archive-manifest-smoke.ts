import { strict as assert } from "node:assert";

import { createReleaseContinuityArchiveManifest } from "@/features/projects/release-continuity-archive-manifest";

const generatedAt = "2026-05-22T11:00:00.000Z";
const releaseCandidateId = "native-1.8.0-continuity";
const workspaceId = "Essence Runtime";

const manifest = createReleaseContinuityArchiveManifest({
  entries: [
    {
      acceptedPacketHash: "sha256:continuity-index",
      owner: "Release Engineering",
      restorationProofHash: "sha256:continuity-index-restore-proof",
      restorationUrl:
        "https://release.essence-spline.com/native/1.8.0/continuity/index-restore.json",
      retentionExpiresAt: "2028-05-22T11:00:00.000Z",
      source: "release-continuity-evidence-index",
      storageUrl:
        "https://release.essence-spline.com/native/1.8.0/continuity/evidence-index.json",
    },
    {
      acceptedPacketHash: "sha256:regression-monitor",
      owner: "Release Manager",
      restorationProofHash: "sha256:regression-monitor-restore-proof",
      restorationUrl:
        "https://release.essence-spline.com/native/1.8.0/continuity/regression-restore.json",
      retentionExpiresAt: "2028-05-22T11:00:00.000Z",
      source: "release-continuity-regression-monitor",
      storageUrl:
        "https://release.essence-spline.com/native/1.8.0/continuity/regression-monitor.json",
    },
    {
      acceptedPacketHash: "sha256:dashboard-packet",
      owner: "Release Operations",
      restorationProofHash: "sha256:dashboard-packet-restore-proof",
      restorationUrl:
        "https://release.essence-spline.com/native/1.8.0/continuity/dashboard-restore.json",
      retentionExpiresAt: "2028-05-22T11:00:00.000Z",
      source: "release-continuity-dashboard-packet",
      storageUrl:
        "https://release.essence-spline.com/native/1.8.0/continuity/dashboard-packet.json",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(manifest.summary.status, "ready");
assert.equal(manifest.summary.archiveScore, 100);
assert.equal(manifest.summary.readyCount, 3);
assert.equal(manifest.summary.blockedCount, 0);
assert.equal(manifest.summary.retentionReadyCount, 3);
assert.equal(manifest.summary.restorationReadyCount, 3);
assert.equal(manifest.summary.storageReadyCount, 3);
assert.ok(manifest.summary.manifestHash.startsWith("sha256:"));
assert.deepEqual(
  manifest.rows.map((row) => row.source),
  [
    "release-continuity-evidence-index",
    "release-continuity-regression-monitor",
    "release-continuity-dashboard-packet",
  ],
);
assert.ok(manifest.rows.every((row) => row.acceptedPacketReady));
assert.ok(manifest.rows.every((row) => row.storageReady));
assert.ok(manifest.rows.every((row) => row.retentionReady));
assert.ok(manifest.rows.every((row) => row.restorationReady));
assert.match(
  manifest.csvContent,
  /^source,status,accepted_packet_ready,storage_ready,retention_ready,restoration_ready,manifest_hash,next_action/,
);
assert.ok(manifest.jsonContent.includes("dashboard-packet-restore-proof"));
assert.equal(
  manifest.csvFileName,
  "essence-runtime-release-continuity-archive-manifest-native-1-8-0-continuity-20260522.csv",
);
assert.equal(
  manifest.jsonFileName,
  "essence-runtime-release-continuity-archive-manifest-native-1-8-0-continuity-20260522.json",
);
assert.equal(manifest.files.length, 2);

const blocked = createReleaseContinuityArchiveManifest({
  entries: [
    {
      acceptedPacketHash: "",
      owner: "",
      restorationProofHash: "",
      restorationUrl: "",
      retentionExpiresAt: "2025-05-22T11:00:00.000Z",
      source: "release-continuity-evidence-index",
      storageUrl: "",
    },
  ],
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.archiveScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.summary.retentionReadyCount, 0);
assert.equal(blocked.summary.restorationReadyCount, 0);
assert.equal(blocked.summary.storageReadyCount, 0);
assert.equal(
  blocked.rows.find((row) => row.source === "release-continuity-evidence-index")
    ?.acceptedPacketReady,
  false,
);
assert.equal(
  blocked.rows.find(
    (row) => row.source === "release-continuity-dashboard-packet",
  )?.restorationReady,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release continuity archive manifest/,
);

console.log("release continuity archive manifest smoke passed");
