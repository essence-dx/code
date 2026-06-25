import { strict as assert } from "node:assert";
import { createSignedNativeArtifactProvenanceLedger } from "@/features/projects/signed-native-artifact-provenance-ledger";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Native";

const ledger = createSignedNativeArtifactProvenanceLedger({
  generatedAt,
  workspaceId,
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.rowCount, 4);
assert.equal(ledger.summary.readyCount, 4);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.provenanceScore, 100);
assert.deepEqual(
  ledger.rows.map((row) => row.kind),
  ["desktop-updater-manifest", "os-signing-plan", "fixture-validation", "release-channel-promotion"],
);
assert.equal(ledger.csvFileName, "workspace-native-signed-native-artifact-provenance-ledger-20260529.csv");
assert.equal(ledger.jsonFileName, "workspace-native-signed-native-artifact-provenance-ledger-20260529.json");
assert.match(ledger.csvContent, /^artifact_id,kind,title,status,owner_role,evidence_hash,provenance_hash,next_action/);
assert.match(ledger.summary.nextAction, /Signed native artifact provenance ledger is ready/);

const blocked = createSignedNativeArtifactProvenanceLedger({
  generatedAt,
  releaseChannelStatus: "blocked",
  signingPlanStatus: "blocked",
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.nextAction, /Repair blocked signed native artifact provenance/);

const review = createSignedNativeArtifactProvenanceLedger({
  fixtureValidationStatus: "review",
  generatedAt,
  updaterManifestStatus: "review",
  workspaceId,
});

assert.equal(review.summary.status, "review");
assert.ok(review.summary.reviewCount > 0);
assert.match(review.summary.nextAction, /Review signed native artifact provenance/);

console.log("signed native artifact provenance ledger smoke passed");
