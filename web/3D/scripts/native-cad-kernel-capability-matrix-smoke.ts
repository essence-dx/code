import { strict as assert } from "node:assert";
import { createNativeCadKernelCapabilityMatrix } from "@/features/projects/native-cad-kernel-capability-matrix";

const generatedAt = "2026-05-30T09:30:00.000Z";
const workspaceId = "Workspace CAD";

const matrix = createNativeCadKernelCapabilityMatrix({
  generatedAt,
  workspaceId,
});

assert.equal(matrix.summary.status, "review");
assert.equal(matrix.summary.rowCount, 4);
assert.equal(matrix.summary.readyCount, 1);
assert.equal(matrix.summary.reviewCount, 2);
assert.equal(matrix.summary.unsupportedCount, 1);
assert.equal(matrix.summary.capabilityScore, 57);
assert.deepEqual(
  matrix.rows.map((row) => row.format),
  ["STEP", "IGES", "SAT", "STL"],
);
assert.match(matrix.summary.nextAction, /Validate review CAD kernel formats before promising native conversion parity/);
assert.equal(matrix.csvFileName, "workspace-cad-native-cad-kernel-capability-matrix-20260530.csv");
assert.equal(matrix.jsonFileName, "workspace-cad-native-cad-kernel-capability-matrix-20260530.json");
assert.match(matrix.csvContent, /^format,status,adapter,unit_handling,tessellation_quality,unsupported_features,next_action/);

const blocked = createNativeCadKernelCapabilityMatrix({
  generatedAt,
  igesStatus: "unsupported",
  satStatus: "unsupported",
  stepStatus: "unsupported",
  stlStatus: "review",
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.unsupportedCount >= 3);
assert.match(blocked.summary.nextAction, /Native CAD kernel coverage is blocked/);

const ready = createNativeCadKernelCapabilityMatrix({
  generatedAt,
  igesStatus: "ready",
  satStatus: "ready",
  stepStatus: "ready",
  stlStatus: "ready",
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.capabilityScore, 100);
assert.match(ready.summary.nextAction, /Native CAD kernel capability matrix is ready/);

console.log("native CAD kernel capability matrix smoke passed");
