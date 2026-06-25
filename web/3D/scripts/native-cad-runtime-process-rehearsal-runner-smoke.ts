import { strict as assert } from "node:assert";

import { runNativeCadRuntimeProcessRehearsalRunner } from "@/features/projects/native-cad-runtime-process-rehearsal-runner";

const generatedAt = "2026-06-02T10:00:00.000Z";
const releaseCandidateId = "native-2.5.0-runtime-integration";
const workspaceId = "Essence Runtime";
const executedCommands: string[] = [];
const persistedTranscripts: string[] = [];

const report = await runNativeCadRuntimeProcessRehearsalRunner({
  generatedAt,
  releaseCandidateId,
  requiredAdapters: ["freecad", "occt"],
  runtimes: [
    {
      adapterId: "freecad",
      commandArguments: [
        "scripts/cad/freecad-mesh-export.py",
        "fixtures/cad/bracket.step",
        "--output",
        "evidence/freecad/bracket.glb",
      ],
      desktopBundleRoot: "C:/Program Files/EssenceSpline/resources/cad/freecad",
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
      durationMs: runtime.adapterId === "freecad" ? 18_200 : 22_450,
      exitCode: 0,
      finishedAt:
        runtime.adapterId === "freecad"
          ? "2026-06-02T10:04:22.000Z"
          : "2026-06-02T10:07:22.000Z",
      outputHash:
        runtime.adapterId === "freecad"
          ? "sha256:freecad-rehearsal-output"
          : "sha256:occt-rehearsal-output",
      outputPath: runtime.outputPath,
      startedAt:
        runtime.adapterId === "freecad"
          ? "2026-06-02T10:04:00.000Z"
          : "2026-06-02T10:07:00.000Z",
      stderr: "",
      stdout:
        runtime.adapterId === "freecad"
          ? "FreeCAD process rehearsal completed"
          : "OCCT process rehearsal completed",
    };
  },
  transcriptStore: async ({ adapterId, transcriptHash }) => {
    persistedTranscripts.push(`${adapterId}:${transcriptHash}`);

    return {
      persisted: true,
      persistedAt:
        adapterId === "freecad"
          ? "2026-06-02T10:04:30.000Z"
          : "2026-06-02T10:07:30.000Z",
      receiptHash:
        adapterId === "freecad"
          ? "sha256:freecad-transcript-receipt"
          : "sha256:occt-transcript-receipt",
      storagePath: `evidence/native-cad/${adapterId}/${adapterId}-native-2-5-0-runtime-integration-20260602.json`,
    };
  },
  workspaceId,
});

assert.equal(executedCommands.length, 2);
assert.equal(persistedTranscripts.length, 2);
assert.match(executedCommands[0] ?? "", /freecadcmd\.exe/);
assert.match(executedCommands[1] ?? "", /essence-occt-convert/);
assert.equal(report.summary.status, "ready");
assert.equal(report.summary.releaseBlocked, false);
assert.equal(report.summary.rehearsalScore, 100);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.processExecutedCount, 2);
assert.equal(report.summary.transcriptReadyCount, 2);
assert.equal(report.summary.transcriptPersistedCount, 2);
assert.equal(report.summary.receiptReadyCount, 2);
assert.ok(report.summary.rehearsalHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(report.rows.every((row) => row.processExecuted));
assert.ok(report.rows.every((row) => row.transcriptReady));
assert.ok(report.rows.every((row) => row.transcriptPersisted));
assert.ok(report.rows.every((row) => row.receiptHashAttached));
assert.ok(report.rows.every((row) => row.storagePathReady));
assert.ok(report.rows.every((row) => row.rehearsalHash.startsWith("sha256:")));
assert.match(
  report.csvContent,
  /^adapter_id,status,process_executed,transcript_ready,transcript_persisted,receipt_hash_attached,rehearsal_hash,next_action/,
);
assert.ok(
  report.jsonContent.includes(
    "evidence/native-cad/freecad/freecad-native-2-5-0-runtime-integration-20260602.json",
  ),
);
assert.equal(
  report.csvFileName,
  "essence-runtime-native-cad-runtime-process-rehearsal-runner-native-2-5-0-runtime-integration-20260602.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-native-cad-runtime-process-rehearsal-runner-native-2-5-0-runtime-integration-20260602.json",
);
assert.equal(report.files.length, 2);

let blockedExecutorCalls = 0;
let blockedTranscriptStoreCalls = 0;
const blocked = await runNativeCadRuntimeProcessRehearsalRunner({
  generatedAt,
  releaseCandidateId,
  requiredAdapters: ["freecad", "occt"],
  runtimes: [],
  executor: async () => {
    blockedExecutorCalls += 1;
    throw new Error("missing CAD runtimes should not execute");
  },
  transcriptStore: async () => {
    blockedTranscriptStoreCalls += 1;

    return {
      persisted: false,
      persistedAt: "",
      receiptHash: "",
      storagePath: "",
    };
  },
  workspaceId,
});

assert.equal(blockedExecutorCalls, 0);
assert.equal(blockedTranscriptStoreCalls, 0);
assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.rehearsalScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.summary.transcriptPersistedCount, 0);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.processExecuted, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "occt")?.transcriptPersisted, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native CAD runtime process rehearsal runner/,
);

console.log("native CAD runtime process rehearsal runner smoke passed");
