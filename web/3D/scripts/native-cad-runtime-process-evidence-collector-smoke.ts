import { strict as assert } from "node:assert";
import { createNativeCadRuntimeProcessEvidenceCollector } from "@/features/projects/native-cad-runtime-process-evidence-collector";

const collector = createNativeCadRuntimeProcessEvidenceCollector({
  generatedAt: "2026-05-20T07:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  transcripts: [
    {
      adapterId: "freecad",
      bundleRoot: "resources/cad/freecad",
      command: "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step",
      executionDurationMs: 18420,
      executionExitCode: 0,
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureOutputHash: "sha256:freecad-bracket-glb-output",
      processTranscriptHash: "sha256:freecad-process-transcript",
      sandboxProfile: "cad-runtime-2048mb-120s-readonly",
      stderrHash: "sha256:freecad-stderr-empty",
      stdoutHash: "sha256:freecad-stdout-mesh-export",
      transcriptCapturedAt: "2026-05-20T07:12:00.000Z",
      verifierOwner: "CAD Runtime",
      workingDirectory: "packages/desktop",
    },
    {
      adapterId: "occt",
      bundleRoot: "resources/cad/occt",
      command: "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb",
      executionDurationMs: 22950,
      executionExitCode: 0,
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureOutputHash: "sha256:occt-enclosure-glb-output",
      processTranscriptHash: "sha256:occt-process-transcript",
      sandboxProfile: "cad-runtime-4096mb-180s-readonly",
      stderrHash: "sha256:occt-stderr-empty",
      stdoutHash: "sha256:occt-stdout-conversion",
      transcriptCapturedAt: "2026-05-20T07:18:00.000Z",
      verifierOwner: "CAD Runtime",
      workingDirectory: "packages/desktop",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(collector.summary.status, "ready");
assert.equal(collector.summary.evidenceScore, 100);
assert.equal(collector.summary.readyCount, 2);
assert.equal(collector.summary.blockedCount, 0);
assert.equal(collector.summary.reviewCount, 0);
assert.equal(collector.summary.commandReadyCount, 2);
assert.equal(collector.summary.fixtureReadyCount, 2);
assert.equal(collector.summary.transcriptReadyCount, 2);
assert.ok(collector.summary.evidenceHash.startsWith("sha256:"));
assert.deepEqual(
  collector.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(collector.rows.every((row) => row.bundleReady));
assert.ok(collector.rows.every((row) => row.commandReady));
assert.ok(collector.rows.every((row) => row.fixtureReady));
assert.ok(collector.rows.every((row) => row.sandboxReady));
assert.ok(collector.rows.every((row) => row.transcriptReady));
assert.match(
  collector.csvContent,
  /^adapter_id,status,bundle_ready,command_ready,fixture_ready,transcript_ready,evidence_hash,next_action/,
);
assert.ok(collector.jsonContent.includes("freecad-process-transcript"));
assert.equal(collector.csvFileName, "essence-runtime-native-cad-runtime-process-evidence-collector-native-1-4-0-stable-20260520.csv");
assert.equal(collector.jsonFileName, "essence-runtime-native-cad-runtime-process-evidence-collector-native-1-4-0-stable-20260520.json");
assert.equal(collector.files.length, 2);

const blocked = createNativeCadRuntimeProcessEvidenceCollector({
  releaseCandidateId: "native-1.4.0-stable",
  transcripts: [
    {
      adapterId: "freecad",
      bundleRoot: "",
      command: "",
      executionDurationMs: 0,
      executionExitCode: 1,
      fixtureInputHash: "",
      fixtureOutputHash: "",
      processTranscriptHash: "",
      sandboxProfile: "",
      stderrHash: "",
      stdoutHash: "",
      transcriptCapturedAt: "",
      verifierOwner: "",
      workingDirectory: "",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.evidenceScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.bundleReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.fixtureReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "occt")?.transcriptReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native CAD runtime process evidence collector/);

console.log("native CAD runtime process evidence collector smoke passed");
