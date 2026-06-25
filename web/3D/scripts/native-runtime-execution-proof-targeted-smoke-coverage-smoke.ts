import { strict as assert } from "node:assert";

import { createNativeRuntimeExecutionProofTargetedSmokeCoverage } from "@/features/projects/native-runtime-execution-proof-targeted-smoke-coverage";

const coverage = createNativeRuntimeExecutionProofTargetedSmokeCoverage({
  checks: [
    {
      area: "toolchain-prerequisite-detector",
      blockedScenarioHash: "sha256:toolchain-prerequisite-detector-blocked",
      readyScenarioHash: "sha256:toolchain-prerequisite-detector-ready",
      reportHash: "sha256:toolchain-prerequisite-detector-report",
      scriptName: "native-toolchain-prerequisite-detector-smoke.ts",
      status: "ready",
    },
    {
      area: "artifact-verification-command-runner",
      blockedScenarioHash: "sha256:artifact-verification-command-runner-blocked",
      readyScenarioHash: "sha256:artifact-verification-command-runner-ready",
      reportHash: "sha256:artifact-verification-command-runner-report",
      scriptName: "external-artifact-verification-command-runner-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-runtime-execution-probe",
      blockedScenarioHash: "sha256:cad-runtime-execution-probe-blocked",
      readyScenarioHash: "sha256:cad-runtime-execution-probe-ready",
      reportHash: "sha256:cad-runtime-execution-probe-report",
      scriptName: "native-cad-runtime-execution-probe-smoke.ts",
      status: "ready",
    },
    {
      area: "runtime-execution-readiness-packet",
      blockedScenarioHash: "sha256:runtime-execution-readiness-packet-blocked",
      readyScenarioHash: "sha256:runtime-execution-readiness-packet-ready",
      reportHash: "sha256:runtime-execution-readiness-packet-report",
      scriptName: "runtime-execution-readiness-packet-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-27T14:00:00.000Z",
  releaseCandidateId: "native-2.3.0-runtime-execution-readiness",
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
    "toolchain-prerequisite-detector",
    "artifact-verification-command-runner",
    "cad-runtime-execution-probe",
    "runtime-execution-readiness-packet",
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
  coverage.jsonContent.includes("runtime-execution-readiness-packet-smoke.ts"),
);
assert.equal(
  coverage.csvFileName,
  "essence-runtime-native-runtime-execution-proof-targeted-smoke-coverage-native-2-3-0-runtime-execution-readiness-20260527.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-native-runtime-execution-proof-targeted-smoke-coverage-native-2-3-0-runtime-execution-readiness-20260527.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createNativeRuntimeExecutionProofTargetedSmokeCoverage({
  checks: [
    {
      area: "runtime-execution-readiness-packet",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:runtime-execution-readiness-packet-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-2.3.0-runtime-execution-readiness",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "runtime-execution-readiness-packet")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "runtime-execution-readiness-packet")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "toolchain-prerequisite-detector")
    ?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native runtime execution proof targeted smoke coverage/,
);

console.log("native runtime execution proof targeted smoke coverage smoke passed");
