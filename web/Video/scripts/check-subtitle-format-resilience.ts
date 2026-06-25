import assert from "node:assert/strict";
import type { SubtitleCue } from "../src/lib/editor/types";
import { formatSrt, formatTranscript, formatVtt, parseSubtitleFile } from "../src/lib/subtitles/srt-vtt";

const validSrt = `1
00:00:01,000 --> 00:00:03,500
Ready now`;

const validVtt = `WEBVTT

00:04.000 --> 00:06.250 align:center
Second cue`;

assert.deepEqual(
  parseSubtitleFile(validSrt).map((cue) => ({ start: cue.start, end: cue.end, text: cue.text })),
  [{ start: 1, end: 3.5, text: "Ready now" }],
);
assert.deepEqual(
  parseSubtitleFile(validVtt).map((cue) => ({ start: cue.start, end: cue.end, text: cue.text })),
  [{ start: 4, end: 6.25, text: "Second cue" }],
);
assert.deepEqual(parseSubtitleFile("00:00:03,000 --> 00:00:01,000\nBackwards"), []);
assert.deepEqual(parseSubtitleFile("00:00:61,000 --> 00:01:02,000\nBad seconds"), []);
assert.deepEqual(parseSubtitleFile("just text"), []);

const cues: SubtitleCue[] = [
  cue("later", 4, 5, "Later"),
  cue("invalid", 8, 7, "Invalid"),
  cue("blank", 1, 2, "   "),
  cue("earlier", 0, 1, "Earlier"),
];
const originalOrder = cues.map((item) => item.id);

assert.equal(formatTranscript(cues), "Earlier\nLater");
assert.deepEqual(cues.map((item) => item.id), originalOrder);
assert.equal(formatSrt(cues).includes("Invalid"), false);
assert.equal(formatVtt(cues).includes("Invalid"), false);

console.log("Subtitle format resilience checks passed.");

function cue(id: string, start: number, end: number, text: string): SubtitleCue {
  return { id, start, end, text, emphasis: "normal" };
}
