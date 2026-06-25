import { strict as assert } from "node:assert";

import { createReleaseAttestationTargetedSmokeCoverage } from "@/features/projects/release-attestation-targeted-smoke-coverage";

const coverage = createReleaseAttestationTargetedSmokeCoverage({
  checks: [
    {
      area: "release-attestation-history-ledger",
      blockedScenarioHash:
        "sha256:release-attestation-history-ledger-blocked",
      readyScenarioHash: "sha256:release-attestation-history-ledger-ready",
      reportHash: "sha256:release-attestation-history-ledger-report",
      scriptName: "release-attestation-history-ledger-smoke.ts",
      status: "ready",
    },
    {
      area: "release-attestation-replay-verifier",
      blockedScenarioHash:
        "sha256:release-attestation-replay-verifier-blocked",
      readyScenarioHash: "sha256:release-attestation-replay-verifier-ready",
      reportHash: "sha256:release-attestation-replay-verifier-report",
      scriptName: "release-attestation-replay-verifier-smoke.ts",
      status: "ready",
    },
    {
      area: "release-attestation-distribution-packet",
      blockedScenarioHash:
        "sha256:release-attestation-distribution-packet-blocked",
      readyScenarioHash:
        "sha256:release-attestation-distribution-packet-ready",
      reportHash: "sha256:release-attestation-distribution-packet-report",
      scriptName: "release-attestation-distribution-packet-smoke.ts",
      status: "ready",
    },
    {
      area: "release-attestation-revocation-workflow",
      blockedScenarioHash:
        "sha256:release-attestation-revocation-workflow-blocked",
      readyScenarioHash:
        "sha256:release-attestation-revocation-workflow-ready",
      reportHash: "sha256:release-attestation-revocation-workflow-report",
      scriptName: "release-attestation-revocation-workflow-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-24T13:00:00.000Z",
  releaseCandidateId: "native-2.0.0-attestation",
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
    "release-attestation-history-ledger",
    "release-attestation-replay-verifier",
    "release-attestation-distribution-packet",
    "release-attestation-revocation-workflow",
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
    "release-attestation-revocation-workflow-smoke.ts",
  ),
);
assert.equal(
  coverage.csvFileName,
  "essence-runtime-release-attestation-targeted-smoke-coverage-native-2-0-0-attestation-20260524.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-release-attestation-targeted-smoke-coverage-native-2-0-0-attestation-20260524.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createReleaseAttestationTargetedSmokeCoverage({
  checks: [
    {
      area: "release-attestation-history-ledger",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:release-attestation-history-ledger-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-2.0.0-attestation",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "release-attestation-history-ledger")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "release-attestation-history-ledger")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find(
    (row) => row.area === "release-attestation-revocation-workflow",
  )?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release attestation targeted smoke coverage/,
);

console.log("release attestation targeted smoke coverage smoke passed");
