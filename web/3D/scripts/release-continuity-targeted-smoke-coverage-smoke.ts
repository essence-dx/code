import { strict as assert } from "node:assert";

import { createReleaseContinuityTargetedSmokeCoverage } from "@/features/projects/release-continuity-targeted-smoke-coverage";

const coverage = createReleaseContinuityTargetedSmokeCoverage({
  checks: [
    {
      area: "release-continuity-evidence-index",
      blockedScenarioHash: "sha256:release-continuity-evidence-index-blocked",
      readyScenarioHash: "sha256:release-continuity-evidence-index-ready",
      reportHash: "sha256:release-continuity-evidence-index-report",
      scriptName: "release-continuity-evidence-index-smoke.ts",
      status: "ready",
    },
    {
      area: "release-continuity-regression-monitor",
      blockedScenarioHash:
        "sha256:release-continuity-regression-monitor-blocked",
      readyScenarioHash: "sha256:release-continuity-regression-monitor-ready",
      reportHash: "sha256:release-continuity-regression-monitor-report",
      scriptName: "release-continuity-regression-monitor-smoke.ts",
      status: "ready",
    },
    {
      area: "release-continuity-dashboard-packet",
      blockedScenarioHash:
        "sha256:release-continuity-dashboard-packet-blocked",
      readyScenarioHash: "sha256:release-continuity-dashboard-packet-ready",
      reportHash: "sha256:release-continuity-dashboard-packet-report",
      scriptName: "release-continuity-dashboard-packet-smoke.ts",
      status: "ready",
    },
    {
      area: "release-continuity-archive-manifest",
      blockedScenarioHash:
        "sha256:release-continuity-archive-manifest-blocked",
      readyScenarioHash: "sha256:release-continuity-archive-manifest-ready",
      reportHash: "sha256:release-continuity-archive-manifest-report",
      scriptName: "release-continuity-archive-manifest-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-22T12:00:00.000Z",
  releaseCandidateId: "native-1.8.0-continuity",
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
    "release-continuity-evidence-index",
    "release-continuity-regression-monitor",
    "release-continuity-dashboard-packet",
    "release-continuity-archive-manifest",
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
    "release-continuity-archive-manifest-smoke.ts",
  ),
);
assert.equal(
  coverage.csvFileName,
  "essence-runtime-release-continuity-targeted-smoke-coverage-native-1-8-0-continuity-20260522.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-release-continuity-targeted-smoke-coverage-native-1-8-0-continuity-20260522.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createReleaseContinuityTargetedSmokeCoverage({
  checks: [
    {
      area: "release-continuity-evidence-index",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:release-continuity-evidence-index-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-1.8.0-continuity",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "release-continuity-evidence-index")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "release-continuity-evidence-index")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find(
    (row) => row.area === "release-continuity-archive-manifest",
  )?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release continuity targeted smoke coverage/,
);

console.log("release continuity targeted smoke coverage smoke passed");
