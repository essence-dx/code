import { strict as assert } from "node:assert";
import { createNativeArtifactRuntimeRemediationQueue } from "@/features/projects/native-artifact-runtime-remediation-queue";

const queue = createNativeArtifactRuntimeRemediationQueue({
  generatedAt: "2026-05-19T05:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  items: [
    {
      blockerId: "windows-signed-artifact-certificate",
      dueAt: "2026-05-20T09:00:00.000Z",
      escalationRoute: "release-engineering-oncall",
      evidencePacketHash: "sha256:windows-remediation-packet",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/windows/remediation.json",
      owner: "Release Engineering",
      platform: "windows",
      priority: "critical",
      remediationAction: "Attach EV signed installer and timestamp evidence before final native release approval.",
      unresolvedBlocker: "Missing certificate-backed Windows installer attachment.",
    },
    {
      blockerId: "macos-notarization-ticket",
      dueAt: "2026-05-20T10:00:00.000Z",
      escalationRoute: "desktop-platform-lead",
      evidencePacketHash: "sha256:macos-remediation-packet",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/macos/remediation.json",
      owner: "Desktop Platform",
      platform: "macos",
      priority: "high",
      remediationAction: "Attach notarization ticket, stapled DMG receipt, and updater manifest checksum before release closeout.",
      unresolvedBlocker: "Missing notarized macOS DMG evidence.",
    },
    {
      blockerId: "linux-cad-runtime-fallback",
      dueAt: "2026-05-20T11:00:00.000Z",
      escalationRoute: "cad-runtime-owner",
      evidencePacketHash: "sha256:linux-remediation-packet",
      evidencePacketUrl: "https://release.essence-spline.com/native/1.4.0/linux/remediation.json",
      owner: "CAD Runtime",
      platform: "linux",
      priority: "high",
      remediationAction: "Attach AppImage signing evidence and CAD fallback validation packet before release closeout.",
      unresolvedBlocker: "Missing Linux signed package plus CAD runtime fallback packet.",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(queue.summary.status, "ready");
assert.equal(queue.summary.queueScore, 100);
assert.equal(queue.summary.readyCount, 3);
assert.equal(queue.summary.blockedCount, 0);
assert.equal(queue.summary.reviewCount, 0);
assert.equal(queue.summary.criticalCount, 1);
assert.equal(queue.summary.escalationRouteCount, 3);
assert.equal(queue.summary.evidencePacketCount, 3);
assert.ok(queue.summary.queueHash.startsWith("sha256:"));
assert.deepEqual(
  queue.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.ok(queue.rows.every((row) => row.ownerReady));
assert.ok(queue.rows.every((row) => row.dueDateReady));
assert.ok(queue.rows.every((row) => row.escalationReady));
assert.ok(queue.rows.every((row) => row.evidencePacketReady));
assert.match(
  queue.csvContent,
  /^platform,status,priority,owner_ready,due_date_ready,escalation_ready,evidence_packet_ready,queue_hash,next_action/,
);
assert.ok(queue.jsonContent.includes("windows-signed-artifact-certificate"));
assert.equal(queue.csvFileName, "essence-runtime-native-artifact-runtime-remediation-queue-native-1-4-0-stable-20260519.csv");
assert.equal(queue.jsonFileName, "essence-runtime-native-artifact-runtime-remediation-queue-native-1-4-0-stable-20260519.json");
assert.equal(queue.files.length, 2);

const blocked = createNativeArtifactRuntimeRemediationQueue({
  items: [
    {
      blockerId: "windows-signed-artifact-certificate",
      dueAt: "",
      escalationRoute: "",
      evidencePacketHash: "",
      evidencePacketUrl: "",
      owner: "",
      platform: "windows",
      priority: "critical",
      remediationAction: "",
      unresolvedBlocker: "",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.queueScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.ownerReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.evidencePacketReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native artifact runtime remediation queue/);

console.log("native artifact runtime remediation queue smoke passed");
