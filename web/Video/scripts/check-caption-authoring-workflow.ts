import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SubtitleCue } from "../src/lib/editor/types";
import {
  cleanSubtitleTranscriptCasing,
  countSubtitleTranscriptMatches,
  duplicateSubtitleCue,
  mergeSubtitleCues,
  normalizeSubtitleCues,
  removeSubtitleCue,
  repairSubtitleCueTiming,
  replaceSubtitleTranscriptText,
  shiftSubtitleCues,
  splitSubtitleCue,
  updateSubtitleCue,
} from "../src/lib/subtitles/cue-operations";

const cues: SubtitleCue[] = [
  cue("two", 2.5, 3.5, " SECOND LINE "),
  cue("bad", 5, 4, "Bad"),
  cue("one", 0, 2, "first line"),
];

const normalized = normalizeSubtitleCues(cues);
assert.deepEqual(
  normalized.map((item) => item.id),
  ["one", "two"],
);
assert.equal(normalized[1].text, "SECOND LINE");
assert.equal(shiftSubtitleCues(normalized, 0.5)[0].start, 0.5);
assert.equal(splitSubtitleCue(normalized, "one", 1).length, 3);
assert.equal(mergeSubtitleCues(normalized, "one", "two").length, 1);
assert.equal(duplicateSubtitleCue(normalized, "one").length, 3);
assert.equal(removeSubtitleCue(normalized, "one").length, 1);
assert.equal(updateSubtitleCue(normalized, "one", { text: "Updated" })[0].text, "Updated");

const repaired = repairSubtitleCueTiming([
  cue("a", 0, 1, "A"),
  cue("b", 0.8, 1.4, "B"),
]);
assert.ok(repaired[1].start > repaired[0].end);
assert.equal(countSubtitleTranscriptMatches(normalized, "line"), 2);
assert.equal(replaceSubtitleTranscriptText(normalized, "line", "caption")[0].text, "first caption");
assert.equal(cleanSubtitleTranscriptCasing([cue("caps", 0, 1, "HELLO WORLD")])[0].text, "Hello world");

const inspector = readFileSync(new URL("../src/features/editor/components/inspector-panel.tsx", import.meta.url), "utf8");
assert.match(inspector, /CaptionCueListEditor/);
assert.match(inspector, /CaptionImportPreview/);
assert.match(inspector, /addSubtitleLayerFromCues/);

const cueEditor = readFileSync(new URL("../src/features/editor/components/caption-cue-list-editor.tsx", import.meta.url), "utf8");
assert.match(cueEditor, /CaptionTranscriptTools/);
assert.match(cueEditor, /splitSubtitleCue/);
assert.match(cueEditor, /mergeSubtitleCues/);
assert.match(cueEditor, /duplicateSubtitleCue/);
assert.match(cueEditor, /repairSubtitleCueTiming/);

console.log("Caption authoring workflow checks passed.");

function cue(id: string, start: number, end: number, text: string): SubtitleCue {
  return {
    id,
    start,
    end,
    text,
    emphasis: "normal",
  };
}
