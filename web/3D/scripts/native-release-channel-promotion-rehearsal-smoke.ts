import { strict as assert } from "node:assert";
import { createNativeReleaseChannelPromotionRehearsal } from "@/features/projects/native-release-channel-promotion-rehearsal";

const rehearsal = createNativeReleaseChannelPromotionRehearsal({
  fromChannel: "staging",
  generatedAt: "2026-05-18T19:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  steps: [
    {
      acknowledgedBy: "Release operator",
      approvalHashBefore: "sha256:approval-before",
      approvalHashAfter: "sha256:approval-after",
      detail: "Moved Windows, macOS, and Linux updater manifests from staging to stable.",
      evidenceHash: "sha256:alias-move",
      id: "native-staging-to-stable-alias",
      kind: "channel-move",
      rollbackEvidenceHash: null,
      staleApprovalInvalidated: true,
      status: "passed",
    },
    {
      acknowledgedBy: "Release operator",
      approvalHashBefore: "sha256:approval-before",
      approvalHashAfter: "sha256:approval-after",
      detail: "Rollback rehearsed by restoring the previous stable manifest set.",
      evidenceHash: "sha256:rollback",
      id: "native-stable-rollback",
      kind: "rollback-rehearsal",
      rollbackEvidenceHash: "sha256:rollback-proof",
      staleApprovalInvalidated: true,
      status: "passed",
    },
    {
      acknowledgedBy: "Release operator",
      approvalHashBefore: "sha256:approval-before",
      approvalHashAfter: "sha256:approval-after",
      detail: "Operator acknowledged stale approval invalidation after channel move.",
      evidenceHash: "sha256:operator-ack",
      id: "native-operator-ack",
      kind: "operator-acknowledgement",
      rollbackEvidenceHash: null,
      staleApprovalInvalidated: true,
      status: "passed",
    },
  ],
  toChannel: "stable",
  workspaceId: "Essence Runtime",
});

assert.equal(rehearsal.summary.status, "ready");
assert.equal(rehearsal.summary.rehearsalScore, 100);
assert.equal(rehearsal.summary.readyCount, 3);
assert.equal(rehearsal.summary.blockedCount, 0);
assert.equal(rehearsal.summary.reviewCount, 0);
assert.equal(rehearsal.summary.missingCoverageCount, 0);
assert.equal(rehearsal.summary.staleApprovalInvalidationCount, 3);
assert.ok(rehearsal.summary.rehearsalHash.startsWith("sha256:"));
assert.deepEqual(
  rehearsal.steps.map((step) => step.kind),
  ["channel-move", "rollback-rehearsal", "operator-acknowledgement"],
);
assert.ok(rehearsal.steps.every((step) => step.evidenceAttached));
assert.ok(rehearsal.steps.every((step) => step.staleApprovalInvalidated));
assert.equal(rehearsal.steps.find((step) => step.kind === "rollback-rehearsal")?.rollbackEvidenceAttached, true);
assert.match(
  rehearsal.csvContent,
  /^step_id,kind,status,evidence_attached,rollback_evidence_attached,stale_approval_invalidated,step_hash,next_action/,
);
assert.ok(rehearsal.jsonContent.includes("native-staging-to-stable-alias"));
assert.equal(rehearsal.csvFileName, "essence-runtime-native-release-channel-promotion-rehearsal-native-1-4-0-stable-20260518.csv");
assert.equal(rehearsal.jsonFileName, "essence-runtime-native-release-channel-promotion-rehearsal-native-1-4-0-stable-20260518.json");
assert.equal(rehearsal.files.length, 2);

const blocked = createNativeReleaseChannelPromotionRehearsal({
  fromChannel: "staging",
  releaseCandidateId: "native-1.4.0-stable",
  steps: [
    {
      acknowledgedBy: null,
      approvalHashBefore: "sha256:approval-before",
      approvalHashAfter: "sha256:approval-before",
      detail: "Channel move was attempted without operator acknowledgement.",
      evidenceHash: "",
      id: "native-staging-to-stable-alias",
      kind: "channel-move",
      rollbackEvidenceHash: null,
      staleApprovalInvalidated: false,
      status: "failed",
    },
  ],
  toChannel: "stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.rehearsalScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.steps.find((step) => step.kind === "channel-move")?.staleApprovalInvalidated, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native release channel promotion rehearsal/);

console.log("native release channel promotion rehearsal smoke passed");
