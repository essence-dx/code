import { strict as assert } from "node:assert";
import { createNativeProductionFulfillmentCoverage } from "@/features/projects/native-production-fulfillment-coverage";

const coverage = createNativeProductionFulfillmentCoverage({
  generatedAt: "2026-05-18T20:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  checks: [
    {
      area: "fulfillment-ledger-scoring",
      blockedScenarioHash: "sha256:ledger-blocked",
      readyScenarioHash: "sha256:ledger-ready",
      reportHash: "sha256:ledger-report",
      status: "ready",
    },
    {
      area: "artifact-storage-handoff-readiness",
      blockedScenarioHash: "sha256:storage-blocked",
      readyScenarioHash: "sha256:storage-ready",
      reportHash: "sha256:storage-report",
      status: "ready",
    },
    {
      area: "cad-transcript-ingestion",
      blockedScenarioHash: "sha256:cad-blocked",
      readyScenarioHash: "sha256:cad-ready",
      reportHash: "sha256:cad-report",
      status: "ready",
    },
    {
      area: "promotion-rehearsal-gating",
      blockedScenarioHash: "sha256:promotion-blocked",
      readyScenarioHash: "sha256:promotion-ready",
      reportHash: "sha256:promotion-report",
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
  ["fulfillment-ledger-scoring", "artifact-storage-handoff-readiness", "cad-transcript-ingestion", "promotion-rehearsal-gating"],
);
assert.ok(coverage.rows.every((row) => row.readyScenarioCovered));
assert.ok(coverage.rows.every((row) => row.blockedScenarioCovered));
assert.ok(coverage.rows.every((row) => row.reportHashAttached));
assert.match(
  coverage.csvContent,
  /^area,status,ready_scenario_covered,blocked_scenario_covered,report_hash_attached,coverage_hash,next_action/,
);
assert.ok(coverage.jsonContent.includes("promotion-rehearsal-gating"));
assert.equal(coverage.csvFileName, "essence-runtime-native-production-fulfillment-coverage-native-1-4-0-stable-20260518.csv");
assert.equal(coverage.jsonFileName, "essence-runtime-native-production-fulfillment-coverage-native-1-4-0-stable-20260518.json");
assert.equal(coverage.files.length, 2);

const blockedCoverage = createNativeProductionFulfillmentCoverage({
  releaseCandidateId: "native-1.4.0-stable",
  checks: [
    {
      area: "fulfillment-ledger-scoring",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:ledger-ready",
      reportHash: "sha256:ledger-report",
      status: "ready",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blockedCoverage.summary.status, "blocked");
assert.ok(blockedCoverage.summary.coverageScore < 50);
assert.equal(blockedCoverage.summary.blockedCount, 4);
assert.equal(blockedCoverage.rows.find((row) => row.area === "fulfillment-ledger-scoring")?.blockedScenarioCovered, false);
assert.match(blockedCoverage.summary.nextAction, /Resolve blocked native production fulfillment coverage/);

console.log("native production fulfillment coverage smoke passed");
