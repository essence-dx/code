import { strict as assert } from "node:assert";
import { createCadConversionFixtureCorpusReport } from "@/features/projects/cad-conversion-fixture-corpus";

const generatedAt = "2026-05-31T13:00:00.000Z";
const workspaceId = "Workspace CAD Runtime";

const ready = createCadConversionFixtureCorpusReport({
  fixtures: [
    {
      adapterId: "freecad",
      actualBoundsMm: [120, 80, 16],
      actualTriangleCount: 2448,
      expectedBoundsMm: [120, 80, 16],
      expectedTriangleCount: 2450,
      format: "STEP",
      fixtureName: "bracket_mm.step",
      sourceSha256: "sha256:fixture-step-bracket",
    },
    {
      adapterId: "occt",
      actualBoundsMm: [48, 48, 90],
      actualTriangleCount: 3202,
      expectedBoundsMm: [48, 48, 90],
      expectedTriangleCount: 3200,
      format: "IGES",
      fixtureName: "knob_mm.iges",
      sourceSha256: "sha256:fixture-iges-knob",
    },
    {
      adapterId: "occt",
      actualBoundsMm: [160, 92, 30],
      actualTriangleCount: 6108,
      expectedBoundsMm: [160, 92, 30],
      expectedTriangleCount: 6100,
      format: "SAT",
      fixtureName: "enclosure_mm.sat",
      sourceSha256: "sha256:fixture-sat-enclosure",
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.rowCount, 3);
assert.equal(ready.summary.readyCount, 3);
assert.equal(ready.summary.blockedCount, 0);
assert.equal(ready.summary.corpusScore, 100);
assert.deepEqual(
  ready.rows.map((row) => row.format),
  ["STEP", "IGES", "SAT"],
);
assert.ok(ready.rows.every((row) => row.fixtureHash.startsWith("sha256:")));
assert.match(ready.summary.nextAction, /CAD conversion fixture corpus is ready/);
assert.equal(ready.csvFileName, "workspace-cad-runtime-cad-conversion-fixture-corpus-20260531.csv");
assert.equal(ready.jsonFileName, "workspace-cad-runtime-cad-conversion-fixture-corpus-20260531.json");
assert.match(ready.csvContent, /^fixture_id,format,adapter_id,status,triangle_delta,bounds_delta_mm,source_sha256,fixture_hash,next_action/);

const blocked = createCadConversionFixtureCorpusReport({
  fixtures: [
    {
      adapterId: "freecad",
      actualBoundsMm: [120, 70, 16],
      actualTriangleCount: 800,
      expectedBoundsMm: [120, 80, 16],
      expectedTriangleCount: 2450,
      format: "STEP",
      fixtureName: "broken_bracket_mm.step",
      sourceSha256: null,
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.blockedCount, 1);
assert.match(blocked.summary.nextAction, /Fix blocked CAD conversion fixture regressions/);

const review = createCadConversionFixtureCorpusReport({
  fixtures: [
    {
      adapterId: "occt",
      actualBoundsMm: [48, 47.1, 90],
      actualTriangleCount: 3520,
      expectedBoundsMm: [48, 48, 90],
      expectedTriangleCount: 3200,
      format: "IGES",
      fixtureName: "review_knob_mm.iges",
      sourceSha256: "sha256:fixture-iges-review",
    },
  ],
  generatedAt,
  workspaceId,
});

assert.equal(review.summary.status, "review");
assert.equal(review.summary.reviewCount, 1);
assert.match(review.summary.nextAction, /Review CAD conversion fixture drift/);

console.log("CAD conversion fixture corpus smoke passed");
