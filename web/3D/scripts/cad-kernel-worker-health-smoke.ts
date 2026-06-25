import { strict as assert } from "node:assert";
import { createCadKernelWorkerHealthReport } from "@/features/projects/cad-kernel-worker-health";

const generatedAt = "2026-05-31T11:00:00.000Z";
const workspaceId = "Workspace CAD Runtime";

const ready = createCadKernelWorkerHealthReport({
  adapters: [
    {
      adapterId: "freecad",
      available: true,
      binaryPath: "C:/Program Files/FreeCAD/bin/freecadcmd.exe",
      detectedVersion: "1.0.2",
      expectedVersion: "1.0.2",
      fixtureExecutedAt: "2026-05-31T10:42:00.000Z",
      fixtureName: "bracket_mm.step",
      fixtureResult: "passed",
      sandboxMemoryMb: 2048,
      sandboxTimeoutSeconds: 120,
    },
    {
      adapterId: "occt",
      available: true,
      binaryPath: "C:/tools/essence-occt-convert.exe",
      detectedVersion: "7.9.1",
      expectedVersion: "7.9.1",
      fixtureExecutedAt: "2026-05-31T10:44:00.000Z",
      fixtureName: "housing_mm.step",
      fixtureResult: "passed",
      sandboxMemoryMb: 4096,
      sandboxTimeoutSeconds: 180,
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.rowCount, 2);
assert.equal(ready.summary.readyCount, 2);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.healthScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(ready.rows.every((row) => row.healthHash.startsWith("sha256:")));
assert.match(ready.summary.nextAction, /CAD kernel worker health is ready/);
assert.equal(ready.csvFileName, "workspace-cad-runtime-cad-kernel-worker-health-20260531.csv");
assert.equal(ready.jsonFileName, "workspace-cad-runtime-cad-kernel-worker-health-20260531.json");
assert.match(ready.csvContent, /^adapter_id,status,binary_path,detected_version,expected_version,sandbox_limits,fixture_result,health_hash,next_action/);

const blocked = createCadKernelWorkerHealthReport({
  adapters: [
    {
      adapterId: "freecad",
      available: false,
      binaryPath: null,
      detectedVersion: null,
      expectedVersion: "1.0.2",
      fixtureExecutedAt: null,
      fixtureName: "bracket_mm.step",
      fixtureResult: "not-run",
      sandboxMemoryMb: 2048,
      sandboxTimeoutSeconds: 120,
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.blockedCount, 1);
assert.match(blocked.summary.nextAction, /Install or expose blocked CAD kernel workers/);

const review = createCadKernelWorkerHealthReport({
  adapters: [
    {
      adapterId: "occt",
      available: true,
      binaryPath: "C:/tools/essence-occt-convert.exe",
      detectedVersion: "7.8.0",
      expectedVersion: "7.9.1",
      fixtureExecutedAt: "2026-05-31T10:44:00.000Z",
      fixtureName: "housing_mm.step",
      fixtureResult: "passed",
      sandboxMemoryMb: 512,
      sandboxTimeoutSeconds: 45,
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(review.summary.status, "review");
assert.equal(review.summary.reviewCount, 1);
assert.match(review.summary.nextAction, /Review CAD kernel worker version drift/);

console.log("CAD kernel worker health smoke passed");
