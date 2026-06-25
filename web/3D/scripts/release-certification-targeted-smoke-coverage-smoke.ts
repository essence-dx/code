import { strict as assert } from "node:assert";

import { createReleaseCertificationTargetedSmokeCoverage } from "@/features/projects/release-certification-targeted-smoke-coverage";

const coverage = createReleaseCertificationTargetedSmokeCoverage({
  checks: [
    {
      area: "release-certification-intake-checklist",
      blockedScenarioHash:
        "sha256:release-certification-intake-checklist-blocked",
      readyScenarioHash: "sha256:release-certification-intake-checklist-ready",
      reportHash: "sha256:release-certification-intake-checklist-report",
      scriptName: "release-certification-intake-checklist-smoke.ts",
      status: "ready",
    },
    {
      area: "release-certification-exception-ledger",
      blockedScenarioHash:
        "sha256:release-certification-exception-ledger-blocked",
      readyScenarioHash: "sha256:release-certification-exception-ledger-ready",
      reportHash: "sha256:release-certification-exception-ledger-report",
      scriptName: "release-certification-exception-ledger-smoke.ts",
      status: "ready",
    },
    {
      area: "release-certification-packet",
      blockedScenarioHash: "sha256:release-certification-packet-blocked",
      readyScenarioHash: "sha256:release-certification-packet-ready",
      reportHash: "sha256:release-certification-packet-report",
      scriptName: "release-certification-packet-smoke.ts",
      status: "ready",
    },
    {
      area: "release-certification-renewal-monitor",
      blockedScenarioHash:
        "sha256:release-certification-renewal-monitor-blocked",
      readyScenarioHash: "sha256:release-certification-renewal-monitor-ready",
      reportHash: "sha256:release-certification-renewal-monitor-report",
      scriptName: "release-certification-renewal-monitor-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-23T13:00:00.000Z",
  releaseCandidateId: "native-1.9.0-certification",
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
    "release-certification-intake-checklist",
    "release-certification-exception-ledger",
    "release-certification-packet",
    "release-certification-renewal-monitor",
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
    "release-certification-renewal-monitor-smoke.ts",
  ),
);
assert.equal(
  coverage.csvFileName,
  "essence-runtime-release-certification-targeted-smoke-coverage-native-1-9-0-certification-20260523.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-release-certification-targeted-smoke-coverage-native-1-9-0-certification-20260523.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createReleaseCertificationTargetedSmokeCoverage({
  checks: [
    {
      area: "release-certification-intake-checklist",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:release-certification-intake-checklist-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-1.9.0-certification",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find(
    (row) => row.area === "release-certification-intake-checklist",
  )?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find(
    (row) => row.area === "release-certification-intake-checklist",
  )?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find(
    (row) => row.area === "release-certification-renewal-monitor",
  )?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release certification targeted smoke coverage/,
);

console.log("release certification targeted smoke coverage smoke passed");
