import { strict as assert } from "node:assert";

import { createNativeReleaseAttachmentTargetedSmokeCoverage } from "@/features/projects/native-release-attachment-targeted-smoke-coverage";

const coverage = createNativeReleaseAttachmentTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-artifact-attachment-rehearsal",
      blockedScenarioHash: "sha256:signed-artifact-attachment-blocked",
      readyScenarioHash: "sha256:signed-artifact-attachment-ready",
      reportHash: "sha256:signed-artifact-attachment-rehearsal-packet-report",
      scriptName: "signed-artifact-attachment-rehearsal-packet-smoke.ts",
      status: "ready",
    },
    {
      area: "cad-runtime-attachment-rehearsal",
      blockedScenarioHash: "sha256:cad-runtime-attachment-blocked",
      readyScenarioHash: "sha256:cad-runtime-attachment-ready",
      reportHash: "sha256:cad-runtime-attachment-rehearsal-packet-report",
      scriptName: "cad-runtime-attachment-rehearsal-packet-smoke.ts",
      status: "ready",
    },
    {
      area: "attachment-readiness-diff",
      blockedScenarioHash: "sha256:attachment-readiness-diff-blocked",
      readyScenarioHash: "sha256:attachment-readiness-diff-ready",
      reportHash: "sha256:attachment-readiness-diff-report",
      scriptName: "attachment-readiness-diff-report-smoke.ts",
      status: "ready",
    },
    {
      area: "native-release-attachment-approval",
      blockedScenarioHash: "sha256:native-release-attachment-approval-blocked",
      readyScenarioHash: "sha256:native-release-attachment-approval-ready",
      reportHash: "sha256:native-release-attachment-approval-packet-report",
      scriptName: "native-release-attachment-approval-packet-smoke.ts",
      status: "ready",
    },
  ],
  generatedAt: "2026-05-21T17:00:00.000Z",
  releaseCandidateId: "native-1.6.0-attachment",
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
    "signed-artifact-attachment-rehearsal",
    "cad-runtime-attachment-rehearsal",
    "attachment-readiness-diff",
    "native-release-attachment-approval",
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
assert.ok(coverage.jsonContent.includes("native-release-attachment-approval-packet-smoke.ts"));
assert.equal(
  coverage.csvFileName,
  "essence-runtime-native-release-attachment-targeted-smoke-coverage-native-1-6-0-attachment-20260521.csv",
);
assert.equal(
  coverage.jsonFileName,
  "essence-runtime-native-release-attachment-targeted-smoke-coverage-native-1-6-0-attachment-20260521.json",
);
assert.equal(coverage.files.length, 2);

const blocked = createNativeReleaseAttachmentTargetedSmokeCoverage({
  checks: [
    {
      area: "signed-artifact-attachment-rehearsal",
      blockedScenarioHash: "",
      readyScenarioHash: "sha256:signed-artifact-attachment-ready",
      reportHash: "",
      scriptName: "",
      status: "ready",
    },
  ],
  releaseCandidateId: "native-1.6.0-attachment",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.coverageScore < 50);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.missingCoverageCount, 4);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-attachment-rehearsal")
    ?.scriptLinked,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "signed-artifact-attachment-rehearsal")
    ?.blockedScenarioCovered,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.area === "native-release-attachment-approval")
    ?.reportHashAttached,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native release attachment targeted smoke coverage/,
);

console.log("native release attachment targeted smoke coverage smoke passed");
