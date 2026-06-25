import { strict as assert } from "node:assert";

import { runNativeCadRuntimeExecutionProbe } from "@/features/projects/native-cad-runtime-execution-probe";

const generatedAt = "2026-05-26T12:00:00.000Z";
const releaseCandidateId = "native-2.2.0-runtime-execution";
const workspaceId = "Essence Runtime";
const executedCommands: string[] = [];

const report = await runNativeCadRuntimeExecutionProbe({
  generatedAt,
  releaseCandidateId,
  probes: [
    {
      adapterId: "freecad",
      bundleRoot: "resources/cad/freecad",
      command:
        "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step --output evidence/freecad/bracket.glb",
      executablePath: "resources/cad/freecad/bin/freecadcmd",
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureInputPath: "fixtures/cad/bracket.step",
      outputPath: "evidence/freecad/bracket.glb",
      runtimeAvailable: true,
      sandboxProfile: "cad-runtime-2048mb-120s-readonly",
      timeoutMs: 120_000,
      verifierOwner: "CAD Runtime",
      workingDirectory: "packages/desktop",
    },
    {
      adapterId: "occt",
      bundleRoot: "resources/cad/occt",
      command:
        "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb --output evidence/occt/enclosure.glb",
      executablePath: "resources/cad/occt/bin/essence-occt-convert",
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureInputPath: "fixtures/cad/enclosure.iges",
      outputPath: "evidence/occt/enclosure.glb",
      runtimeAvailable: true,
      sandboxProfile: "cad-runtime-4096mb-180s-readonly",
      timeoutMs: 180_000,
      verifierOwner: "CAD Runtime",
      workingDirectory: "packages/desktop",
    },
  ],
  executor: async ({ command, probe }) => {
    executedCommands.push(command);

    return {
      durationMs: probe.adapterId === "freecad" ? 18_420 : 22_950,
      exitCode: 0,
      finishedAt:
        probe.adapterId === "freecad"
          ? "2026-05-26T12:03:20.000Z"
          : "2026-05-26T12:06:20.000Z",
      outputHash:
        probe.adapterId === "freecad"
          ? "sha256:freecad-bracket-glb-output"
          : "sha256:occt-enclosure-glb-output",
      outputPath: probe.outputPath,
      startedAt:
        probe.adapterId === "freecad"
          ? "2026-05-26T12:03:00.000Z"
          : "2026-05-26T12:06:00.000Z",
      stderr: "",
      stdout:
        probe.adapterId === "freecad"
          ? "FreeCAD mesh export completed"
          : "OCCT conversion completed",
    };
  },
  workspaceId,
});

assert.equal(executedCommands.length, 2);
assert.equal(report.summary.status, "ready");
assert.equal(report.summary.executionScore, 100);
assert.equal(report.summary.releaseBlocked, false);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.runtimeAvailableCount, 2);
assert.equal(report.summary.commandReadyCount, 2);
assert.equal(report.summary.fixtureReadyCount, 2);
assert.equal(report.summary.outputReadyCount, 2);
assert.equal(report.summary.transcriptReadyCount, 2);
assert.ok(report.summary.probeHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(report.rows.every((row) => row.runtimeAvailable));
assert.ok(report.rows.every((row) => row.commandReady));
assert.ok(report.rows.every((row) => row.fixtureReady));
assert.ok(report.rows.every((row) => row.outputReady));
assert.ok(report.rows.every((row) => row.transcriptReady));
assert.ok(report.rows.every((row) => row.stdoutHash.startsWith("sha256:")));
assert.ok(report.rows.every((row) => row.stderrHash.startsWith("sha256:")));
assert.ok(report.rows.every((row) => row.transcriptHash.startsWith("sha256:")));
assert.match(
  report.csvContent,
  /^adapter_id,status,runtime_available,command_ready,fixture_ready,output_ready,transcript_ready,probe_hash,next_action/,
);
assert.ok(report.jsonContent.includes("OCCT conversion completed"));
assert.equal(
  report.csvFileName,
  "essence-runtime-native-cad-runtime-execution-probe-native-2-2-0-runtime-execution-20260526.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-native-cad-runtime-execution-probe-native-2-2-0-runtime-execution-20260526.json",
);
assert.equal(report.files.length, 2);

let blockedExecutorCalls = 0;
const blocked = await runNativeCadRuntimeExecutionProbe({
  releaseCandidateId,
  probes: [
    {
      adapterId: "freecad",
      bundleRoot: "resources/cad/freecad",
      command:
        "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step",
      executablePath: "",
      fixtureInputHash: "",
      fixtureInputPath: "fixtures/cad/bracket.step",
      outputPath: "",
      runtimeAvailable: false,
      sandboxProfile: "",
      timeoutMs: 0,
      verifierOwner: "",
      workingDirectory: "",
    },
  ],
  executor: async () => {
    blockedExecutorCalls += 1;
    throw new Error("missing runtimes should not execute");
  },
  workspaceId,
});

assert.equal(blockedExecutorCalls, 0);
assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.executionScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.runtimeAvailable, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.outputReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "occt")?.status, "blocked");
assert.match(
  blocked.rows.find((row) => row.adapterId === "freecad")?.failureReason ?? "",
  /unavailable or missing executable/,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native CAD runtime execution probe/,
);

console.log("native CAD runtime execution probe smoke passed");
