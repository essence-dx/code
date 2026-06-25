import { strict as assert } from "node:assert";
import { createCadConversionFixtureDrillRunner } from "@/features/projects/cad-conversion-fixture-drill-runner";

const report = createCadConversionFixtureDrillRunner({
  generatedAt: "2026-05-21T09:15:00.000Z",
  releaseCandidateId: "native-1.5.0-drill",
  workspaceId: "Essence Runtime",
  drills: [
    {
      adapterId: "freecad",
      commandPlan: [
        "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step --output .cad-drills/bracket.glb",
        "Record mesh bounds, triangle count, stdout, stderr, and output hash.",
      ],
      expectedOutputHash: "sha256:freecad-bracket-expected-output",
      failureTranscript: "",
      fixtureCorpus: [
        {
          fixtureName: "bracket_mm.step",
          format: "STEP",
          sourceSha256: "sha256:freecad-bracket-step-source",
        },
        {
          fixtureName: "hinge_mm.step",
          format: "STEP",
          sourceSha256: "sha256:freecad-hinge-step-source",
        },
      ],
      outputHash: "sha256:freecad-bracket-expected-output",
      owner: "CAD Runtime",
    },
    {
      adapterId: "occt",
      commandPlan: [
        "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb --output .cad-drills/enclosure.glb",
        "Record OCCT reader version, tessellation diagnostics, stderr, and output hash.",
      ],
      expectedOutputHash: "sha256:occt-enclosure-expected-output",
      failureTranscript: "OCCT dry-run failure route captured: non-manifold shell recovery transcript retained.",
      fixtureCorpus: [
        {
          fixtureName: "enclosure_mm.iges",
          format: "IGES",
          sourceSha256: "sha256:occt-enclosure-iges-source",
        },
        {
          fixtureName: "cover_mm.sat",
          format: "SAT",
          sourceSha256: "sha256:occt-cover-sat-source",
        },
      ],
      outputHash: "sha256:occt-enclosure-expected-output",
      owner: "CAD Runtime",
    },
  ],
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.drillScore, 100);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.commandPlanReadyCount, 2);
assert.equal(report.summary.fixtureCoverageReadyCount, 2);
assert.equal(report.summary.outputHashReadyCount, 2);
assert.equal(report.summary.failureTranscriptReadyCount, 2);
assert.ok(report.summary.drillHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(report.rows.every((row) => row.commandPlanReady));
assert.ok(report.rows.every((row) => row.fixtureCoverageReady));
assert.ok(report.rows.every((row) => row.outputHashReady));
assert.ok(report.rows.every((row) => row.failureTranscriptReady));
assert.equal(report.rows.find((row) => row.adapterId === "freecad")?.coveredFormats, "STEP");
assert.equal(report.rows.find((row) => row.adapterId === "occt")?.coveredFormats, "IGES, SAT");
assert.match(report.rows.find((row) => row.adapterId === "freecad")?.commandPlan[0] ?? "", /freecadcmd/);
assert.match(report.rows.find((row) => row.adapterId === "occt")?.failureTranscript ?? "", /non-manifold shell/);
assert.match(
  report.csvContent,
  /^adapter_id,status,covered_formats,command_plan_ready,fixture_coverage_ready,output_hash_ready,failure_transcript_ready,drill_hash,next_action/,
);
assert.ok(report.jsonContent.includes("resources/cad/occt/bin/essence-occt-convert"));
assert.equal(report.csvFileName, "essence-runtime-cad-conversion-fixture-drill-runner-native-1-5-0-drill-20260521.csv");
assert.equal(report.jsonFileName, "essence-runtime-cad-conversion-fixture-drill-runner-native-1-5-0-drill-20260521.json");
assert.equal(report.files.length, 2);

const blocked = createCadConversionFixtureDrillRunner({
  drills: [
    {
      adapterId: "freecad",
      commandPlan: [],
      expectedOutputHash: "",
      failureTranscript: "",
      fixtureCorpus: [],
      outputHash: "",
      owner: "",
    },
  ],
  releaseCandidateId: "native-1.5.0-drill",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.drillScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.commandPlanReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.fixtureCoverageReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "occt")?.outputHashReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked CAD conversion fixture drills/);

console.log("CAD conversion fixture drill runner smoke passed");
