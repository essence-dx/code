import { strict as assert } from "node:assert";

import { createNativeFulfillmentExecutionRealityTargetedSmokeCoverage } from "@/features/projects/native-fulfillment-execution-reality-targeted-smoke-coverage";

const coverage = createNativeFulfillmentExecutionRealityTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-package-artifact-locator",
      blockedScenarioHash: "sha256:signed-package-artifact-locator-blocked",
      readyScenarioHash: "sha256:signed-package-artifact-locator-ready",
      reportHash: "sha256:signed-package-artifact-locator-report",
      scriptName: "signed-package-artifact-locator-smoke.ts",
      status: "ready",
    },
    {
      area: "packaged-cad-runtime-execution-adapter",
      blockedScenarioHash: "sha256:packaged-cad-runtime-execution-adapter-blocked",
      readyScenarioHash: "sha256:packaged-cad-runtime-execution-adapter-ready",
      reportHash: "sha256:packaged-cad-runtime-execution-adapter-report",
      scriptName: "packaged-cad-runtime-execution-adapter-smoke.ts",
      status: "ready",
    },
    {
      area: "native-export-fulfillment-rehearsal",
      blockedScenarioHash: "sha256:native-export-fulfillment-rehearsal-blocked",
      readyScenarioHash: "sha256:native-export-fulfillment-rehearsal-ready",
      reportHash: "sha256:native-export-fulfillment-rehearsal-report",
      scriptName: "native-export-fulfillment-rehearsal-smoke.ts",
      status: "ready",
    },
    {
      area: "customer-facing-native-fulfillment-status-packet",
      blockedScenarioHash:
        "sha256:customer-facing-native-fulfillment-status-packet-blocked",
      readyScenarioHash:
        "sha256:customer-facing-native-fulfillment-status-packet-ready",
      reportHash: "sha256:customer-facing-native-fulfillment-status-packet-report",
      scriptName: "customer-facing-native-fulfillment-status-packet-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-31T10:00:00.000Z",
  releaseCandidateId: "native-2.4.0-fulfillment-execution-reality",
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
  [
    "signed-package-artifact-locator",
    "packaged-cad-runtime-execution-adapter",
    "native-export-fulfillment-rehearsal",
    "customer-facing-native-fulfillment-status-packet",
  ],
);
assert.ok(coverage.rows.every((row) => row.readyScenarioCovered));
assert.ok(coverage.rows.every((row) => row.blockedScenarioCovered));
assert.ok(coverage.rows.every((row) => row.reportHashAttached));
assert.ok(coverage.rows.every((row) => row.scriptLinked));
assert.match(
  coverage.csvContent,
  /^area,status,script_linked,ready_scenario_covered,blocked_scenario_covered,report_hash_attached,coverage_hash,next_action/,
);
assert.ok(
  coverage.jsonContent.includes(
    "customer-facing-native-fulfillment-status-packet-smoke.ts",
  ),
);
assert.equal(
  coverage.csvFileName,
  "essence-runtime-native-fulfillment-execution-reality-targeted-smoke-coverage-native-2-4-0-fulfillment-execution-reality-20260531.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-native-fulfillment-execution-reality-targeted-smoke-coverage-native-2-4-0-fulfillment-execution-reality-20260531.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createNativeFulfillmentExecutionRealityTargetedSmokeCoverage({
  checks: [
    {
      area: "customer-facing-native-fulfillment-status-packet",
      blockedScenarioHash: "",
      readyScenarioHash:
        "sha256:customer-facing-native-fulfillment-status-packet-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-2.4.0-fulfillment-execution-reality",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "customer-facing-native-fulfillment-status-packet")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "customer-facing-native-fulfillment-status-packet")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-package-artifact-locator")
    ?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native fulfillment execution reality targeted smoke coverage/,
);

console.log(
  "native fulfillment execution reality targeted smoke coverage smoke passed",
);
