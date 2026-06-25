import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeProjectCommentAnchor, projectCommentAnchorLabel } from "../src/lib/projects/comment-anchors";

const rangeAnchor = normalizeProjectCommentAnchor({
  time: 12.345,
  timeEnd: 16.1,
  layerId: "layer_intro_title_card",
});
assert.equal(rangeAnchor.time, 12.35);
assert.equal(rangeAnchor.timeEnd, 16.1);
assert.equal(rangeAnchor.layerId, "layer_intro_title_card");
assert.match(projectCommentAnchorLabel(rangeAnchor), /0:12\.34-0:16\.10/);
assert.match(projectCommentAnchorLabel(rangeAnchor), /Layer intro_ti/);

const canvasAnchor = normalizeProjectCommentAnchor({
  time: 3,
  canvasX: 120,
  canvasY: -10,
});
assert.equal(canvasAnchor.canvasX, 100);
assert.equal(canvasAnchor.canvasY, 0);
assert.match(projectCommentAnchorLabel(canvasAnchor), /Canvas 100%, 0%/);

const invalidAnchor = normalizeProjectCommentAnchor({
  time: -1,
  timeEnd: 1,
  canvasX: 10,
});
assert.equal(invalidAnchor.time, undefined);
assert.equal(invalidAnchor.timeEnd, undefined);
assert.equal(invalidAnchor.canvasX, undefined);
assert.equal(invalidAnchor.canvasY, undefined);
assert.equal(projectCommentAnchorLabel(invalidAnchor), "General");

const store = read("src/lib/projects/collaboration-store.ts");
assert.match(store, /timeEnd\?: number/);
assert.match(store, /canvasX\?: number/);
assert.match(store, /normalizeProjectCommentAnchor/);

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /timeEnd: integer\("time_end"\)/);
assert.match(schema, /canvasX: integer\("canvas_x"\)/);
assert.match(schema, /canvasY: integer\("canvas_y"\)/);

const dialog = read("src/features/projects/components/review-workspace-dialog.tsx");
assert.match(dialog, /CommentAnchorControls/);
assert.match(dialog, /Time range/);
assert.match(dialog, /Canvas point/);
assert.match(dialog, /projectCommentAnchorLabel/);

const capability = read("src/lib/product/capabilities/collaboration.ts");
assert.match(capability, /timeline range anchors/);
assert.match(capability, /canvas point anchors/);
assert.match(capability, /status: "ready"/);

console.log("Review comment anchor workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
