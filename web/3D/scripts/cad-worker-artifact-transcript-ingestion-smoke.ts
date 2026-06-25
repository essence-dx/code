import { strict as assert } from "node:assert";
import { createCadWorkerArtifactTranscriptIngestion } from "@/features/projects/cad-worker-artifact-transcript-ingestion";

const report = createCadWorkerArtifactTranscriptIngestion({
  generatedAt: "2026-05-18T18:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  transcripts: [
    {
      actualRegressionHash: "sha256:freecad-regression",
      adapterId: "freecad",
      command: "freecadcmd --console --run-test bracket_mm.step",
      diagnosticOutput: "loaded bracket_mm.step; exported 4280 triangles; bounding box valid",
      expectedRegressionHash: "sha256:freecad-regression",
      exitCode: 0,
      fixtureName: "bracket_mm.step",
      outputArtifactHash: "sha256:freecad-output",
      sandboxDiagnostics: "2048MB memory cap, 120s timeout, network disabled, temp dir purged",
      stderr: "",
      stdout: "shape imported\nmesh exported\nfixture passed",
      transcriptId: "freecad-bracket-mm-20260518",
      workerVersion: "1.0.2",
    },
    {
      actualRegressionHash: "sha256:occt-regression",
      adapterId: "occt",
      command: "essence-occt-convert --fixture housing_mm.step",
      diagnosticOutput: "shape healed; tessellation complete; diagnostics attached",
      expectedRegressionHash: "sha256:occt-regression",
      exitCode: 0,
      fixtureName: "housing_mm.step",
      outputArtifactHash: "sha256:occt-output",
      sandboxDiagnostics: "4096MB memory cap, 180s timeout, network disabled, fixture cache readonly",
      stderr: "",
      stdout: "healed shell\ntriangulation complete\nfixture passed",
      transcriptId: "occt-housing-mm-20260518",
      workerVersion: "7.9.1",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.ingestionScore, 100);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.ok(report.summary.ingestionHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(report.rows.every((row) => row.transcriptCaptured));
assert.ok(report.rows.every((row) => row.sandboxDiagnosticsCaptured));
assert.ok(report.rows.every((row) => row.regressionHashMatched));
assert.ok(report.rows.every((row) => row.outputArtifactCaptured));
assert.match(
  report.csvContent,
  /^transcript_id,adapter_id,fixture_name,status,transcript_captured,sandbox_diagnostics_captured,regression_hash_matched,output_artifact_hash,transcript_hash,next_action/,
);
assert.ok(report.jsonContent.includes("shape imported\\nmesh exported\\nfixture passed"));
assert.equal(report.csvFileName, "essence-runtime-cad-worker-artifact-transcript-ingestion-native-1-4-0-stable-20260518.csv");
assert.equal(report.jsonFileName, "essence-runtime-cad-worker-artifact-transcript-ingestion-native-1-4-0-stable-20260518.json");
assert.equal(report.files.length, 2);

const blocked = createCadWorkerArtifactTranscriptIngestion({
  releaseCandidateId: "native-1.4.0-stable",
  transcripts: [
    {
      actualRegressionHash: "sha256:changed-output",
      adapterId: "freecad",
      command: "",
      diagnosticOutput: "fixture output missing",
      expectedRegressionHash: "sha256:freecad-regression",
      exitCode: 1,
      fixtureName: "bracket_mm.step",
      outputArtifactHash: "",
      sandboxDiagnostics: "",
      stderr: "freecadcmd failed before writing artifact",
      stdout: "",
      transcriptId: "freecad-bracket-mm-20260518",
      workerVersion: null,
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.ingestionScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.regressionHashMatched, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.sandboxDiagnosticsCaptured, false);
assert.match(blocked.summary.nextAction, /Resolve blocked CAD worker artifact transcript ingestion/);

console.log("CAD worker artifact transcript ingestion smoke passed");
