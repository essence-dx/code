import { strict as assert } from "node:assert";
import { createNativeExternalArtifactAcceptancePacket } from "@/features/projects/native-external-artifact-acceptance-packet";

const packet = createNativeExternalArtifactAcceptancePacket({
  generatedAt: "2026-05-19T09:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  gates: [
    {
      approvalOwner: "Release Manager",
      evidenceHash: "sha256:signed-artifact-intake-packet",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/intake.json",
      gate: "signed-artifact-intake",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      approvalOwner: "CAD Runtime",
      evidenceHash: "sha256:cad-runtime-bundle-verification",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/cad-runtime.json",
      gate: "cad-runtime-bundle-verification",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      approvalOwner: "Desktop Platform",
      evidenceHash: "sha256:artifact-attachment-workflow",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/attachment-workflow.json",
      gate: "artifact-attachment-workflow",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
    {
      approvalOwner: "Customer Experience",
      evidenceHash: "sha256:customer-download-readiness",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/customer-downloads.json",
      gate: "customer-download-readiness",
      releaseApprovalReady: true,
      score: 100,
      status: "ready",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.acceptanceScore, 100);
assert.equal(packet.summary.readyCount, 4);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.approvalReadyCount, 4);
assert.equal(packet.summary.customerDownloadReady, true);
assert.ok(packet.summary.acceptanceHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.gate),
  ["signed-artifact-intake", "cad-runtime-bundle-verification", "artifact-attachment-workflow", "customer-download-readiness"],
);
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.ok(packet.rows.every((row) => row.releaseApprovalReady));
assert.match(
  packet.csvContent,
  /^gate,status,score,evidence_linked,release_approval_ready,acceptance_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("customer-download-readiness"));
assert.equal(packet.csvFileName, "essence-runtime-native-external-artifact-acceptance-packet-native-1-4-0-stable-20260519.csv");
assert.equal(packet.jsonFileName, "essence-runtime-native-external-artifact-acceptance-packet-native-1-4-0-stable-20260519.json");
assert.equal(packet.files.length, 2);

const blocked = createNativeExternalArtifactAcceptancePacket({
  gates: [
    {
      approvalOwner: "",
      evidenceHash: "",
      evidenceUrl: "",
      gate: "signed-artifact-intake",
      releaseApprovalReady: false,
      score: 45,
      status: "blocked",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.acceptanceScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.customerDownloadReady, false);
assert.equal(blocked.rows.find((row) => row.gate === "signed-artifact-intake")?.evidenceLinked, false);
assert.equal(blocked.rows.find((row) => row.gate === "customer-download-readiness")?.releaseApprovalReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native external artifact acceptance packet/);

console.log("native external artifact acceptance packet smoke passed");
