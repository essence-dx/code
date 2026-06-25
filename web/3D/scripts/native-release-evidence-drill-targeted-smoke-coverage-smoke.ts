import { strict as assert } from "node:assert";
import { createNativeReleaseEvidenceDrillTargetedSmokeCoverage } from "@/features/projects/native-release-evidence-drill-targeted-smoke-coverage";

const coverage = createNativeReleaseEvidenceDrillTargetedSmokeCoverage({
  generatedAt: "2026-05-21T12:00:00.000Z",
  releaseCandidateId: "native-1.5.0-drill",
  checks: [
    {
      area: "signed-artifact-fixture-drill",
      blockedScenarioHash: "sha256:signed-artifact-fixture-drill-blocked",
      readyScenarioHash: "sha256:signed-artifact-fixture-drill-ready",
      reportHash: "sha256:signed-artifact-fixture-drill-runner-smoke-report",
      scriptName: "signed-artifact-fixture-drill-runner-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-conversion-fixture-drill",
      blockedScenarioHash: "sha256:cad-conversion-fixture-drill-blocked",
      readyScenarioHash: "sha256:cad-conversion-fixture-drill-ready",
      reportHash: "sha256:cad-conversion-fixture-drill-runner-smoke-report",
      scriptName: "cad-conversion-fixture-drill-runner-smoke.ts",
      status: "ready",
    },
    {
      area: "release-evidence-drill-comparison",
      blockedScenarioHash: "sha256:release-evidence-drill-comparison-blocked",
      readyScenarioHash: "sha256:release-evidence-drill-comparison-ready",
      reportHash: "sha256:release-evidence-drill-comparison-smoke-report",
      scriptName: "release-evidence-drill-comparison-smoke.ts",
      status: "ready",
    },
    {
      area: "native-release-evidence-drill-packet",
      blockedScenarioHash: "sha256:native-release-evidence-drill-packet-blocked",
      readyScenarioHash: "sha256:native-release-evidence-drill-packet-ready",
      reportHash: "sha256:native-release-evidence-drill-packet-smoke-report",
      scriptName: "native-release-evidence-drill-packet-smoke.ts",
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
  [
    "signed-artifact-fixture-drill",
    "cad-conversion-fixture-drill",
    "release-evidence-drill-comparison",
    "native-release-evidence-drill-packet",
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
assert.ok(coverage.jsonContent.includes("native-release-evidence-drill-packet-smoke.ts"));
assert.equal(coverage.csvFileName, "essence-runtime-native-release-evidence-drill-targeted-smoke-coverage-native-1-5-0-drill-20260521.csv");
assert.equal(coverage.jsonFileName, "essence-runtime-native-release-evidence-drill-targeted-smoke-coverage-native-1-5-0-drill-20260521.json");
assert.equal(coverage.files.length, 2);

const blocked = createNativeReleaseEvidenceDrillTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-artifact-fixture-drill",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:signed-artifact-fixture-drill-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-1.5.0-drill",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.rows.find((row) => row.area === "signed-artifact-fixture-drill")?.scriptLinked, false);
assert.equal(blocked.rows.find((row) => row.area === "signed-artifact-fixture-drill")?.blockedScenarioCovered, false);
assert.equal(blocked.rows.find((row) => row.area === "native-release-evidence-drill-packet")?.reportHashAttached, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native release evidence drill targeted smoke coverage/);

console.log("native release evidence drill targeted smoke coverage smoke passed");
