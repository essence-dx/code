import { strict as assert } from "node:assert";
import { createNativeArtifactFulfillmentTargetedSmokeCoverage } from "@/features/projects/native-artifact-fulfillment-targeted-smoke-coverage";

const coverage = createNativeArtifactFulfillmentTargetedSmokeCoverage({
  generatedAt: "2026-05-19T10:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  checks: [
    {
      area: "signed-artifact-intake",
      blockedScenarioHash: "sha256:signed-artifact-intake-blocked",
      readyScenarioHash: "sha256:signed-artifact-intake-ready",
      reportHash: "sha256:native-signed-artifact-intake-queue-smoke-report",
      scriptName: "native-signed-artifact-intake-queue-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-runtime-bundle-verification",
      blockedScenarioHash: "sha256:cad-runtime-bundle-blocked",
      readyScenarioHash: "sha256:cad-runtime-bundle-ready",
      reportHash: "sha256:native-cad-runtime-bundle-installer-verification-smoke-report",
      scriptName: "native-cad-runtime-bundle-installer-verification-smoke.ts",
      status: "ready",
    },
    {
      area: "artifact-attachment-workflow",
      blockedScenarioHash: "sha256:artifact-attachment-blocked",
      readyScenarioHash: "sha256:artifact-attachment-ready",
      reportHash: "sha256:native-release-candidate-artifact-attachment-workflow-smoke-report",
      scriptName: "native-release-candidate-artifact-attachment-workflow-smoke.ts",
      status: "ready",
    },
    {
      area: "fulfillment-acceptance-packet",
      blockedScenarioHash: "sha256:fulfillment-acceptance-blocked",
      readyScenarioHash: "sha256:fulfillment-acceptance-ready",
      reportHash: "sha256:native-external-artifact-acceptance-packet-smoke-report",
      scriptName: "native-external-artifact-acceptance-packet-smoke.ts",
      status: "ready",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(coverage.summary.status, "ready");
assert.equal(coverage.summary.coverageScore, 100);
assert.equal(coverage.summary.readyCount, 4);
assert.equal(coverage.summary.blockedCount, 0);
assert.equal(coverage.summary.reviewCount, 0);
assert.equal(coverage.summary.missingCoverageCount, 0);
assert.ok(coverage.summary.coverageHash.startsWith("sha256:"));
assert.deepEqual(
  coverage.rows.map((row) => row.area),
  ["signed-artifact-intake", "cad-runtime-bundle-verification", "artifact-attachment-workflow", "fulfillment-acceptance-packet"],
);
assert.ok(coverage.rows.every((row) => row.readyScenarioCovered));
assert.ok(coverage.rows.every((row) => row.blockedScenarioCovered));
assert.ok(coverage.rows.every((row) => row.reportHashAttached));
assert.ok(coverage.rows.every((row) => row.scriptLinked));
assert.match(
  coverage.csvContent,
  /^area,status,script_linked,ready_scenario_covered,blocked_scenario_covered,report_hash_attached,coverage_hash,next_action/,
);
assert.ok(coverage.jsonContent.includes("native-external-artifact-acceptance-packet-smoke.ts"));
assert.equal(coverage.csvFileName, "essence-runtime-native-artifact-fulfillment-targeted-smoke-coverage-native-1-4-0-stable-20260519.csv");
assert.equal(coverage.jsonFileName, "essence-runtime-native-artifact-fulfillment-targeted-smoke-coverage-native-1-4-0-stable-20260519.json");
assert.equal(coverage.files.length, 2);

const blocked = createNativeArtifactFulfillmentTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-artifact-intake",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:signed-artifact-intake-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.rows.find((row) => row.area === "signed-artifact-intake")?.scriptLinked, false);
assert.equal(blocked.rows.find((row) => row.area === "signed-artifact-intake")?.blockedScenarioCovered, false);
assert.equal(blocked.rows.find((row) => row.area === "fulfillment-acceptance-packet")?.reportHashAttached, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native artifact fulfillment targeted smoke coverage/);

console.log("native artifact fulfillment targeted smoke coverage smoke passed");
