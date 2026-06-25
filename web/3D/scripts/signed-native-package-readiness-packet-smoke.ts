import { strict as assert } from "node:assert";
import { createDesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import { createSignedNativeArtifactProvenanceLedger } from "@/features/projects/signed-native-artifact-provenance-ledger";
import { createSignedNativePackageReadinessPacket } from "@/features/projects/signed-native-package-readiness-packet";

const generatedAt = "2026-05-30T16:00:00.000Z";
const workspaceId = "Workspace Native";

const configuredEnv = {
  APPLE_APP_SPECIFIC_PASSWORD: "configured",
  APPLE_CERTIFICATE_BASE64: "configured",
  APPLE_CERTIFICATE_PASSWORD: "configured",
  APPLE_ID: "configured",
  APPLE_SIGNING_IDENTITY: "configured",
  APPLE_TEAM_ID: "configured",
  TAURI_SIGNING_PRIVATE_KEY: "configured",
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "configured",
  WINDOWS_CERTIFICATE_BASE64: "configured",
  WINDOWS_CERTIFICATE_PASSWORD: "configured",
  WINDOWS_TIMESTAMP_URL: "http://timestamp.digicert.com",
};

const readyPacket = createSignedNativePackageReadinessPacket({
  artifactProvenance: createSignedNativeArtifactProvenanceLedger({ generatedAt, workspaceId }),
  generatedAt,
  signingPlan: createDesktopSigningPlan(configuredEnv),
  workspaceId,
});

assert.equal(readyPacket.summary.status, "ready");
assert.equal(readyPacket.summary.rowCount, 4);
assert.equal(readyPacket.summary.readyCount, 4);
assert.equal(readyPacket.summary.blockedCount, 0);
assert.equal(readyPacket.summary.readinessScore, 100);
assert.deepEqual(
  readyPacket.rows.map((row) => row.kind),
  ["artifact-provenance", "signing-evidence", "updater-metadata", "release-recommendation"],
);
assert.match(readyPacket.summary.nextAction, /Signed native package readiness packet is ready/);
assert.equal(readyPacket.csvFileName, "workspace-native-signed-native-package-readiness-packet-20260530.csv");
assert.equal(readyPacket.jsonFileName, "workspace-native-signed-native-package-readiness-packet-20260530.json");
assert.match(readyPacket.csvContent, /^section_id,kind,title,status,evidence_hash,next_action/);

const blockedPacket = createSignedNativePackageReadinessPacket({
  artifactProvenance: createSignedNativeArtifactProvenanceLedger({
    generatedAt,
    releaseChannelStatus: "blocked",
    signingPlanStatus: "blocked",
    workspaceId,
  }),
  generatedAt,
  signingPlan: createDesktopSigningPlan({}),
  workspaceId,
});

assert.equal(blockedPacket.summary.status, "blocked");
assert.ok(blockedPacket.summary.blockedCount > 0);
assert.match(blockedPacket.summary.nextAction, /Resolve signed native package blockers/);

const reviewPacket = createSignedNativePackageReadinessPacket({
  artifactProvenance: createSignedNativeArtifactProvenanceLedger({ generatedAt, workspaceId }),
  generatedAt,
  signingPlan: createDesktopSigningPlan(configuredEnv),
  updaterMetadataStatus: "review",
  workspaceId,
});

assert.equal(reviewPacket.summary.status, "review");
assert.ok(reviewPacket.summary.reviewCount > 0);
assert.match(reviewPacket.summary.nextAction, /Review signed native package readiness evidence/);

console.log("signed native package readiness packet smoke passed");
