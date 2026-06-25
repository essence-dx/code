import { strict as assert } from "node:assert";
import { createNativeRuntimeExceptionRoutingReport } from "@/features/projects/native-runtime-exception-routing";

const report = createNativeRuntimeExceptionRoutingReport({
  exceptions: [
    {
      ageHours: 2,
      dueAt: "2026-05-19T12:00:00.000Z",
      evidenceHash: "sha256:signature-missing",
      kind: "missing-signature",
      owner: "Release signing owner",
      severity: "critical",
      sourceId: "windows-signed-artifact",
      sourceStatus: "blocked",
    },
    {
      ageHours: 1,
      dueAt: "2026-05-18T20:00:00.000Z",
      evidenceHash: "sha256:cad-worker-failed",
      kind: "failed-cad-worker-execution",
      owner: "CAD runtime owner",
      severity: "critical",
      sourceId: "freecad-fixture-bracket",
      sourceStatus: "blocked",
    },
    {
      ageHours: 6,
      dueAt: "2026-05-19T18:00:00.000Z",
      evidenceHash: "sha256:linux-install-regression",
      kind: "install-rehearsal-regression",
      owner: "Desktop release owner",
      severity: "high",
      sourceId: "linux-appimage-install",
      sourceStatus: "review",
    },
    {
      ageHours: 80,
      dueAt: "2026-05-18T16:00:00.000Z",
      evidenceHash: "sha256:stale-approval",
      kind: "stale-artifact-approval",
      owner: "Release approver",
      severity: "medium",
      sourceId: "macos-approval",
      sourceStatus: "review",
    },
  ],
  generatedAt: "2026-05-18T14:00:00.000Z",
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.routedCount, 4);
assert.equal(report.summary.escalationCount, 3);
assert.equal(report.summary.blockedCount, 2);
assert.ok(report.summary.routingScore < 80);
assert.ok(report.summary.routingHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.kind),
  ["missing-signature", "failed-cad-worker-execution", "install-rehearsal-regression", "stale-artifact-approval"],
);
assert.equal(report.rows.every((row) => row.routeEligible), true);
assert.equal(report.rows.find((row) => row.kind === "missing-signature")?.routeTarget, "release-signing-incident");
assert.equal(report.rows.find((row) => row.kind === "failed-cad-worker-execution")?.routeTarget, "cad-runtime-incident");
assert.equal(report.rows.find((row) => row.kind === "install-rehearsal-regression")?.routeTarget, "desktop-install-release-review");
assert.equal(report.rows.find((row) => row.kind === "stale-artifact-approval")?.routeTarget, "artifact-approval-renewal");
assert.match(report.csvContent, /^exception_id,kind,status,severity,route_target,route_eligible,owner,due_at,evidence_hash,routing_hash,next_action/);
assert.ok(report.jsonContent.includes("Release signing owner"));
assert.equal(report.csvFileName, "essence-runtime-native-runtime-exception-routing-20260518.csv");
assert.equal(report.jsonFileName, "essence-runtime-native-runtime-exception-routing-20260518.json");

const ready = createNativeRuntimeExceptionRoutingReport({
  exceptions: [
    {
      ageHours: 4,
      dueAt: "2026-05-20T12:00:00.000Z",
      evidenceHash: "sha256:signature-ok",
      kind: "missing-signature",
      owner: "Release signing owner",
      severity: "medium",
      sourceId: "windows-signed-artifact",
      sourceStatus: "ready",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.routedCount, 0);
assert.equal(ready.rows[0]?.routeEligible, false);
assert.match(ready.rows[0]?.nextAction ?? "", /Keep native runtime exception routing evidence current/);

console.log("native runtime exception routing smoke passed");
