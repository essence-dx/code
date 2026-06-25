import { strict as assert } from "node:assert";

import { createNativeReleaseCustodyTargetedSmokeCoverage } from "@/features/projects/native-release-custody-targeted-smoke-coverage";

const coverage = createNativeReleaseCustodyTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-artifact-custody-ledger",
      blockedScenarioHash: "sha256:signed-artifact-custody-blocked",
      readyScenarioHash: "sha256:signed-artifact-custody-ready",
      reportHash: "sha256:signed-artifact-custody-ledger-report",
      scriptName: "signed-artifact-custody-ledger-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-runtime-custody-ledger",
      blockedScenarioHash: "sha256:cad-runtime-custody-blocked",
      readyScenarioHash: "sha256:cad-runtime-custody-ready",
      reportHash: "sha256:cad-runtime-custody-ledger-report",
      scriptName: "cad-runtime-custody-ledger-smoke.ts",
      status: "ready",
    },
    {
      area: "attachment-custody-drift-monitor",
      blockedScenarioHash: "sha256:attachment-custody-drift-blocked",
      readyScenarioHash: "sha256:attachment-custody-drift-ready",
      reportHash: "sha256:attachment-custody-drift-monitor-report",
      scriptName: "attachment-custody-drift-monitor-smoke.ts",
      status: "ready",
    },
    {
      area: "native-release-custody-approval",
      blockedScenarioHash: "sha256:native-release-custody-approval-blocked",
      readyScenarioHash: "sha256:native-release-custody-approval-ready",
      reportHash: "sha256:native-release-custody-approval-packet-report",
      scriptName: "native-release-custody-approval-packet-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-21T21:00:00.000Z",
  releaseCandidateId: "native-1.7.0-custody",
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
    "signed-artifact-custody-ledger",
    "cad-runtime-custody-ledger",
    "attachment-custody-drift-monitor",
    "native-release-custody-approval",
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
assert.ok(coverage.jsonContent.includes("native-release-custody-approval-packet-smoke.ts"));
assert.equal(
  coverage.csvFileName,
  "essence-runtime-native-release-custody-targeted-smoke-coverage-native-1-7-0-custody-20260521.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-native-release-custody-targeted-smoke-coverage-native-1-7-0-custody-20260521.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createNativeReleaseCustodyTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-artifact-custody-ledger",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:signed-artifact-custody-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-1.7.0-custody",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-custody-ledger")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-custody-ledger")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "native-release-custody-approval")
    ?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native release custody targeted smoke coverage/,
);

console.log("native release custody targeted smoke coverage smoke passed");
