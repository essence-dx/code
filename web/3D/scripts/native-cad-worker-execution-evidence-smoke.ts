import { strict as assert } from "node:assert";
import { createNativeCadWorkerExecutionEvidence } from "@/features/projects/native-cad-worker-execution-evidence";

const report = createNativeCadWorkerExecutionEvidence({
  generatedAt: "2026-05-18T12:00:00.000Z",
  workers: [
    {
      adapterId: "freecad",
      available: true,
      command: "freecadcmd --console --run-test bracket_mm.step",
      diagnosticOutput: "loaded bracket_mm.step; exported 4280 triangles; bounding box valid",
      exitCode: 0,
      fixtureName: "bracket_mm.step",
      outputHash: "sha256:freecad-output",
      sandboxMemoryMb: 2048,
      sandboxTimeoutSeconds: 120,
      version: "1.0.2",
    },
    {
      adapterId: "occt",
      available: true,
      command: "essence-occt-convert --fixture housing_mm.step",
      diagnosticOutput: "shape healed; tessellation complete; diagnostics attached",
      exitCode: 0,
      fixtureName: "housing_mm.step",
      outputHash: "sha256:occt-output",
      sandboxMemoryMb: 4096,
      sandboxTimeoutSeconds: 180,
      version: "7.9.1",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.evidenceScore, 100);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.ok(report.summary.evidenceHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.equal(report.rows.every((row) => row.commandAvailable), true);
assert.equal(report.rows.every((row) => row.fixturePassed), true);
assert.equal(report.rows.every((row) => row.sandboxReady), true);
assert.match(report.csvContent, /^worker_id,adapter_id,status,command_available,fixture_passed,sandbox_ready,output_hash,evidence_hash,next_action/);
assert.ok(report.jsonContent.includes("housing_mm.step"));
assert.equal(report.csvFileName, "essence-runtime-native-cad-worker-execution-evidence-20260518.csv");
assert.equal(report.jsonFileName, "essence-runtime-native-cad-worker-execution-evidence-20260518.json");
assert.ok(report.csvDataUri.startsWith("data:text/csv"));
assert.ok(report.jsonDataUri.startsWith("data:application/json"));

const blocked = createNativeCadWorkerExecutionEvidence({
  requiredAdapters: ["freecad", "occt"],
  workers: [
    {
      adapterId: "freecad",
      available: false,
      command: "",
      diagnosticOutput: "freecadcmd was not found on PATH",
      exitCode: 127,
      fixtureName: "bracket_mm.step",
      outputHash: null,
      sandboxMemoryMb: 512,
      sandboxTimeoutSeconds: 30,
      version: null,
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.evidenceScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.commandAvailable, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.sandboxReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native CAD worker execution evidence/);

console.log("native CAD worker execution evidence smoke passed");
