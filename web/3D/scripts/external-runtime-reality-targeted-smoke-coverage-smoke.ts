import { strict as assert } from "node:assert";
import { createExternalRuntimeRealityTargetedSmokeCoverage } from "@/features/projects/external-runtime-reality-targeted-smoke-coverage";

const coverage = createExternalRuntimeRealityTargetedSmokeCoverage({
  generatedAt: "2026-05-20T10:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  checks: [
    {
      area: "certificate-backed-artifact-reality",
      blockedScenarioHash: "sha256:certificate-backed-artifact-reality-blocked",
      readyScenarioHash: "sha256:certificate-backed-artifact-reality-ready",
      reportHash: "sha256:certificate-backed-package-artifact-reality-verifier-smoke-report",
      scriptName: "certificate-backed-package-artifact-reality-verifier-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-process-evidence-collection",
      blockedScenarioHash: "sha256:cad-process-evidence-blocked",
      readyScenarioHash: "sha256:cad-process-evidence-ready",
      reportHash: "sha256:native-cad-runtime-process-evidence-collector-smoke-report",
      scriptName: "native-cad-runtime-process-evidence-collector-smoke.ts",
      status: "ready",
    },
    {
      area: "external-evidence-freshness",
      blockedScenarioHash: "sha256:external-evidence-freshness-blocked",
      readyScenarioHash: "sha256:external-evidence-freshness-ready",
      reportHash: "sha256:external-artifact-evidence-freshness-monitor-smoke-report",
      scriptName: "external-artifact-evidence-freshness-monitor-smoke.ts",
      status: "ready",
    },
    {
      area: "external-runtime-reality-packet",
      blockedScenarioHash: "sha256:external-runtime-reality-packet-blocked",
      readyScenarioHash: "sha256:external-runtime-reality-packet-ready",
      reportHash: "sha256:external-runtime-reality-packet-smoke-report",
      scriptName: "external-runtime-reality-packet-smoke.ts",
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
  ["certificate-backed-artifact-reality", "cad-process-evidence-collection", "external-evidence-freshness", "external-runtime-reality-packet"],
);
assert.ok(coverage.rows.every((row) => row.readyScenarioCovered));
assert.ok(coverage.rows.every((row) => row.blockedScenarioCovered));
assert.ok(coverage.rows.every((row) => row.reportHashAttached));
assert.ok(coverage.rows.every((row) => row.scriptLinked));
assert.match(
  coverage.csvContent,
  /^area,status,script_linked,ready_scenario_covered,blocked_scenario_covered,report_hash_attached,coverage_hash,next_action/,
);
assert.ok(coverage.jsonContent.includes("external-runtime-reality-packet-smoke.ts"));
assert.equal(coverage.csvFileName, "essence-runtime-external-runtime-reality-targeted-smoke-coverage-native-1-4-0-stable-20260520.csv");
assert.equal(coverage.jsonFileName, "essence-runtime-external-runtime-reality-targeted-smoke-coverage-native-1-4-0-stable-20260520.json");
assert.equal(coverage.files.length, 2);

const blocked = createExternalRuntimeRealityTargetedSmokeCoverage({
  checks: [
    {
      area: "certificate-backed-artifact-reality",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:certificate-backed-artifact-reality-ready",
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
assert.equal(blocked.rows.find((row) => row.area === "certificate-backed-artifact-reality")?.scriptLinked, false);
assert.equal(blocked.rows.find((row) => row.area === "certificate-backed-artifact-reality")?.blockedScenarioCovered, false);
assert.equal(blocked.rows.find((row) => row.area === "external-runtime-reality-packet")?.reportHashAttached, false);
assert.match(blocked.summary.nextAction, /Resolve blocked external runtime reality targeted smoke coverage/);

console.log("external runtime reality targeted smoke coverage smoke passed");
