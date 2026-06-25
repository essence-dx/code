import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  aiGenerationAssetMetadata,
  promptForGenerationRecord,
  summarizeAiGenerationOutput,
} from "../src/lib/ai/generation-records";
import { AiPromptSafetyError, assertAiSafety, reviewAiTextSafety } from "../src/lib/ai/safety";

const safeReview = reviewAiTextSafety({ action: "video-project", text: "Turn this article about creator workflows into a short explainer." });
assert.equal(safeReview.status, "allowed");

const flaggedReview = reviewAiTextSafety({ action: "image", text: "Create a celebrity-style thumbnail with rights cleared by the user." });
assert.equal(flaggedReview.status, "flagged");

const blockedReview = reviewAiTextSafety({ action: "voiceover", text: "Clone voice of a real person without consent." });
assert.equal(blockedReview.status, "blocked");
assert.throws(() => assertAiSafety(blockedReview), AiPromptSafetyError);

assert.equal(promptForGenerationRecord("  hello   world  "), "hello world");
assert.equal(summarizeAiGenerationOutput("image", { images: [{ filename: "asset.png" }] }), "1 image asset generated.");
assert.equal(summarizeAiGenerationOutput("b-roll", { suggestions: [{ query: "desk" }, { query: "city" }] }), "2 B-roll suggestions generated.");
assert.deepEqual(aiGenerationAssetMetadata("voiceover", { filename: "voice.wav" }), { kind: "audio", name: "voice.wav" });
assert.deepEqual(aiGenerationAssetMetadata("video-project", { title: "Launch reel" }), { kind: "project", name: "Launch reel" });
assert.equal(summarizeAiGenerationOutput("scene-video", { filename: "scene.mp4" }), "Scene video generated: scene.mp4.");
assert.deepEqual(aiGenerationAssetMetadata("scene-video", { filename: "scene.mp4" }), { kind: "video", name: "scene.mp4" });

const schema = readFileSync(new URL("../src/lib/db/schema.ts", import.meta.url), "utf8");
const records = readFileSync(new URL("../src/lib/ai/generation-records.ts", import.meta.url), "utf8");
const safety = readFileSync(new URL("../src/lib/ai/safety.ts", import.meta.url), "utf8");
const editorAi = readFileSync(new URL("../src/lib/ai/editor-ai.ts", import.meta.url), "utf8");
const speech = readFileSync(new URL("../src/lib/ai/speech.ts", import.meta.url), "utf8");
const transcription = readFileSync(new URL("../src/lib/ai/transcription.ts", import.meta.url), "utf8");
const settings = readFileSync(new URL("../src/app/settings/page.tsx", import.meta.url), "utf8");
const settingsServerData = readFileSync(new URL("../src/app/settings/settings-server-data.ts", import.meta.url), "utf8");

assert.match(schema, /aiGenerationRecords/);
assert.match(schema, /"scene-video"/);
assert.match(schema, /prompt_text/);
assert.match(schema, /safety_status/);
assert.match(records, /getAiGenerationReview/);
assert.match(records, /logAiGenerationRecord/);
assert.match(safety, /blockedPromptPatterns/);
assert.match(editorAi, /reviewEditorAiSafety/);
assert.match(editorAi, /recordEditorGeneration/);
assert.match(speech, /reviewAiTextSafety/);
assert.match(transcription, /logAiGenerationRecord/);
assert.match(settings, /Generation history/);
assert.match(settingsServerData, /getAiGenerationReview/);

console.log("AI generation persistence checks passed.");
