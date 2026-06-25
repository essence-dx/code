import { strict as assert } from "node:assert";

import { createNativeReleaseEnforcementTargetedSmokeCoverage } from "@/features/projects/native-release-enforcement-targeted-smoke-coverage";

const coverage = createNativeReleaseEnforcementTargetedSmokeCoverage({
  checks: [
    {
      area: "release-enforcement-ledger",
      blockedScenarioHash: "sha256:release-enforcement-ledger-blocked",
      readyScenarioHash: "sha256:release-enforcement-ledger-ready",
      reportHash: "sha256:release-enforcement-ledger-report",
      scriptName: "native-release-enforcement-ledger-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-delivery-verifier",
      blockedScenarioHash: "sha256:cad-delivery-verifier-blocked",
      readyScenarioHash: "sha256:cad-delivery-verifier-ready",
      reportHash: "sha256:cad-delivery-verifier-report",
      scriptName: "native-cad-kernel-delivery-enforcement-verifier-smoke.ts",
      status: "ready",
    },
    {
      area: "install-evidence-packet",
      blockedScenarioHash: "sha256:install-evidence-packet-blocked",
      readyScenarioHash: "sha256:install-evidence-packet-ready",
      reportHash: "sha256:install-evidence-packet-report",
      scriptName: "production-install-launch-evidence-packet-smoke.ts",
      status: "ready",
    },
    {
      area: "customer-acceptance-packet",
      blockedScenarioHash: "sha256:customer-acceptance-packet-blocked",
      readyScenarioHash: "sha256:customer-acceptance-packet-ready",
      reportHash: "sha256:customer-acceptance-packet-report",
      scriptName: "customer-facing-release-acceptance-packet-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-25T13:00:00.000Z",
  releaseCandidateId: "native-2.1.0-enforcement",
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
    "release-enforcement-ledger",
    "cad-delivery-verifier",
    "install-evidence-packet",
    "customer-acceptance-packet",
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
    "customer-facing-release-acceptance-packet-smoke.ts",
  ),
);
assert.equal(
  coverage.csvFileName,
  "essence-runtime-native-release-enforcement-targeted-smoke-coverage-native-2-1-0-enforcement-20260525.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-native-release-enforcement-targeted-smoke-coverage-native-2-1-0-enforcement-20260525.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createNativeReleaseEnforcementTargetedSmokeCoverage({
  checks: [
    {
      area: "release-enforcement-ledger",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:release-enforcement-ledger-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-2.1.0-enforcement",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "release-enforcement-ledger")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "release-enforcement-ledger")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "customer-acceptance-packet")
    ?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native release enforcement targeted smoke coverage/,
);

console.log("native release enforcement targeted smoke coverage smoke passed");
