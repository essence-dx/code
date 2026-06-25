import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SubtitleCue } from "../src/lib/editor/types";
import { createTranscriptCutProposals, totalTranscriptCutDuration } from "../src/lib/subtitles/transcript-cuts";
import { coreEditorCapabilities } from "../src/lib/product/capabilities/core-editor";

const cues: SubtitleCue[] = [
  cue("intro", 0, 1.2, "welcome to the edit"),
  cue("filler-a", 1.4, 2, "um this part should go"),
  cue("filler-b", 2.1, 2.8, "um another filler phrase"),
  cue("keeper", 5, 6, "keep this product line"),
  cue("later", 7, 8, "um final mistake"),
];

const queryProposals = createTranscriptCutProposals(cues, { query: "um" });
assert.equal(queryProposals.length, 2);
assert.deepEqual(queryProposals[0].cueIds, ["filler-a", "filler-b"]);
assert.equal(queryProposals[0].start, 1.4);
assert.equal(queryProposals[0].end, 2.8);
assert.equal(queryProposals[0].duration, 1.4);
assert.equal(queryProposals[0].reason, 'Matched "um" in 2 captions.');
assert.equal(totalTranscriptCutDuration(queryProposals), 2.4);

const selectedCueProposals = createTranscriptCutProposals(cues, { cueIds: ["keeper"] });
assert.equal(selectedCueProposals.length, 1);
assert.equal(selectedCueProposals[0].text, "keep this product line");
assert.equal(selectedCueProposals[0].reason, "1 selected caption.");

assert.deepEqual(createTranscriptCutProposals(cues, { query: "" }), []);
assert.equal(createTranscriptCutProposals(cues, { query: "um", maxProposals: 1 }).length, 1);

const transcriptTools = readFileSync(new URL("../src/features/editor/components/caption-transcript-tools.tsx", import.meta.url), "utf8");
const cueListEditor = readFileSync(new URL("../src/features/editor/components/caption-cue-list-editor.tsx", import.meta.url), "utf8");
const inspectorPanel = readFileSync(new URL("../src/features/editor/components/inspector-panel.tsx", import.meta.url), "utf8");
assert.match(transcriptTools, /createTranscriptCutProposals/);
assert.match(transcriptTools, /totalTranscriptCutDuration/);
assert.match(transcriptTools, /Preview transcript cuts/);
assert.match(transcriptTools, /showCutProposals/);
assert.match(transcriptTools, /proposal\.cueIds/);
assert.match(transcriptTools, /Apply transcript cuts/);
assert.match(cueListEditor, /onApplyCuts/);
assert.match(inspectorPanel, /applyTimelineCutRanges/);
assert.match(inspectorPanel, /applyTranscriptCuts/);

const transcriptCapability = coreEditorCapabilities.find((capability) => capability.id === "transcript-editing");
assert.equal(transcriptCapability?.status, "partial");
assert.match(transcriptCapability?.ownerPath ?? "", /transcript-cuts/);

console.log("Transcript cut workflow checks passed.");

function cue(id: string, start: number, end: number, text: string): SubtitleCue {
  return { id, start, end, text, emphasis: "normal" };
}
