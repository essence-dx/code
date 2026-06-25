import { strict as assert } from "node:assert";

import { runPackagedCadRuntimeExecutionAdapter } from "@/features/projects/packaged-cad-runtime-execution-adapter";

const generatedAt = "2026-05-28T11:00:00.000Z";
const releaseCandidateId = "native-2.4.0-fulfillment-reality";
const workspaceId = "Essence Runtime";
const executedCommands: string[] = [];

const report = await runPackagedCadRuntimeExecutionAdapter({
  generatedAt,
  releaseCandidateId,
  runtimes: [
    {
      adapterId: "freecad",
      commandArguments: [
        "scripts/cad/freecad-mesh-export.py",
        "fixtures/cad/bracket.step",
        "--output",
        "evidence/freecad/bracket.glb",
      ],
      desktopBundleRoot:
        "C:/Program Files/EssenceSpline/resources/cad/freecad",
      executableExists: true,
      executableRelativePath: "bin/freecadcmd.exe",
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureInputPath: "fixtures/cad/bracket.step",
      installedVersion: "FreeCAD 1.0.2",
      outputPath: "evidence/freecad/bracket.glb",
      owner: "CAD Runtime",
      packagedLayoutHash: "sha256:freecad-packaged-layout",
      sandboxProfile: "desktop-cad-runtime-2048mb-120s-readonly",
      timeoutMs: 120_000,
    },
    {
      adapterId: "occt",
      commandArguments: [
        "fixtures/cad/enclosure.iges",
        "--format",
        "glb",
        "--output",
        "evidence/occt/enclosure.glb",
      ],
      desktopBundleRoot:
        "/Applications/EssenceSpline.app/Contents/Resources/cad/occt",
      executableExists: true,
      executableRelativePath: "bin/essence-occt-convert",
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureInputPath: "fixtures/cad/enclosure.iges",
      installedVersion: "OCCT 7.9.1",
      outputPath: "evidence/occt/enclosure.glb",
      owner: "CAD Runtime",
      packagedLayoutHash: "sha256:occt-packaged-layout",
      sandboxProfile: "desktop-cad-runtime-4096mb-180s-readonly",
      timeoutMs: 180_000,
    },
  ],
  executor: async ({ command, runtime }) => {
    executedCommands.push(command);

    return {
      durationMs: runtime.adapterId === "freecad" ? 17_200 : 21_450,
      exitCode: 0,
      finishedAt:
        runtime.adapterId === "freecad"
          ? "2026-05-28T11:04:20.000Z"
          : "2026-05-28T11:07:20.000Z",
      outputHash:
        runtime.adapterId === "freecad"
          ? "sha256:freecad-packaged-output"
          : "sha256:occt-packaged-output",
      outputPath: runtime.outputPath,
      startedAt:
        runtime.adapterId === "freecad"
          ? "2026-05-28T11:04:00.000Z"
          : "2026-05-28T11:07:00.000Z",
      stderr: "",
      stdout:
        runtime.adapterId === "freecad"
          ? "FreeCAD packaged runtime completed"
          : "OCCT packaged runtime completed",
    };
  },
  workspaceId,
});

assert.equal(executedCommands.length, 2);
assert.match(executedCommands[0] ?? "", /freecadcmd\.exe/);
assert.match(executedCommands[1] ?? "", /essence-occt-convert/);
assert.equal(report.summary.status, "ready");
assert.equal(report.summary.releaseBlocked, false);
assert.equal(report.summary.executionScore, 100);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.resolvedExecutableCount, 2);
assert.equal(report.summary.transcriptReadyCount, 2);
assert.equal(report.summary.outputReadyCount, 2);
assert.ok(report.summary.executionHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(report.rows.every((row) => row.bundleReady));
assert.ok(report.rows.every((row) => row.executableResolved));
assert.ok(report.rows.every((row) => row.commandReady));
assert.ok(report.rows.every((row) => row.transcriptReady));
assert.ok(report.rows.every((row) => row.outputReady));
assert.ok(report.rows.every((row) => row.stdoutHash.startsWith("sha256:")));
assert.ok(report.rows.every((row) => row.stderrHash.startsWith("sha256:")));
assert.match(
  report.csvContent,
  /^adapter_id,status,resolved_executable_path,bundle_ready,executable_resolved,command_ready,transcript_ready,output_ready,execution_hash,next_action/,
);
assert.ok(report.jsonContent.includes("OCCT packaged runtime completed"));
assert.equal(
  report.csvFileName,
  "essence-runtime-packaged-cad-runtime-execution-adapter-native-2-4-0-fulfillment-reality-20260528.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-packaged-cad-runtime-execution-adapter-native-2-4-0-fulfillment-reality-20260528.json",
);
assert.equal(report.files.length, 2);

let blockedExecutorCalls = 0;
const blocked = await runPackagedCadRuntimeExecutionAdapter({
  generatedAt,
  releaseCandidateId,
  runtimes: [
    {
      adapterId: "freecad",
      commandArguments: ["fixtures/cad/bracket.step"],
      desktopBundleRoot: "C:/Program Files/EssenceSpline/resources/cad/freecad",
      executableExists: false,
      executableRelativePath: "bin/freecadcmd.exe",
      fixtureInputHash: "",
      fixtureInputPath: "fixtures/cad/bracket.step",
      installedVersion: "",
      outputPath: "",
      owner: "",
      packagedLayoutHash: "",
      sandboxProfile: "",
      timeoutMs: 0,
    },
  ],
  executor: async () => {
    blockedExecutorCalls += 1;
    throw new Error("missing packaged runtimes should not execute");
  },
  workspaceId,
});

assert.equal(blockedExecutorCalls, 0);
assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.executionScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.executableResolved, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "occt")?.status, "blocked");
assert.match(
  blocked.rows.find((row) => row.adapterId === "freecad")?.failureReason ?? "",
  /Missing packaged executable/,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked packaged CAD runtime execution adapter/,
);

console.log("packaged CAD runtime execution adapter smoke passed");
