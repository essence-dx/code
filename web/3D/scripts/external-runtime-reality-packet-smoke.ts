import { strict as assert } from "node:assert";
import { createExternalRuntimeRealityPacket } from "@/features/projects/external-runtime-reality-packet";

const packet = createExternalRuntimeRealityPacket({
  generatedAt: "2026-05-20T09:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  gates: [
    {
      evidenceHash: "sha256:certificate-backed-artifact-reality",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/artifact-reality.json",
      gate: "signed-package-verification",
      operatorOwner: "Release Engineering",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      evidenceHash: "sha256:native-cad-process-evidence",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/cad-process-evidence.json",
      gate: "cad-process-evidence",
      operatorOwner: "CAD Runtime",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      evidenceHash: "sha256:external-artifact-freshness",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/freshness.json",
      gate: "evidence-freshness",
      operatorOwner: "Release Manager",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.packetScore, 100);
assert.equal(packet.summary.releaseApprovalBlocked, false);
assert.equal(packet.summary.readyCount, 3);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.operatorReadyCount, 3);
assert.ok(packet.summary.packetHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.gate),
  ["signed-package-verification", "cad-process-evidence", "evidence-freshness"],
);
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.ok(packet.rows.every((row) => row.operatorReady));
assert.ok(packet.rows.every((row) => row.releaseApprovalReady));
assert.match(
  packet.csvContent,
  /^gate,status,score,evidence_linked,operator_ready,release_approval_ready,packet_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("native-cad-process-evidence"));
assert.equal(packet.csvFileName, "essence-runtime-external-runtime-reality-packet-native-1-4-0-stable-20260520.csv");
assert.equal(packet.jsonFileName, "essence-runtime-external-runtime-reality-packet-native-1-4-0-stable-20260520.json");
assert.equal(packet.files.length, 2);

const blocked = createExternalRuntimeRealityPacket({
  gates: [
    {
      evidenceHash: "",
      evidenceUrl: "",
      gate: "signed-package-verification",
      operatorOwner: "",
      releaseApprovalReady: false,
      score: 25,
      status: "blocked",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.packetScore < 50);
assert.equal(blocked.summary.releaseApprovalBlocked, true);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.gate === "signed-package-verification")?.evidenceLinked, false);
assert.equal(blocked.rows.find((row) => row.gate === "cad-process-evidence")?.operatorReady, false);
assert.equal(blocked.rows.find((row) => row.gate === "evidence-freshness")?.releaseApprovalReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked external runtime reality packet/);

console.log("external runtime reality packet smoke passed");
