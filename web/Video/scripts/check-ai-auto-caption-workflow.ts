import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { captionsFromTranscriptionSegments } from "../src/lib/ai/transcription";

const captions = captionsFromTranscriptionSegments(
  [
    { startSecond: 0, endSecond: 1.25, text: "  Start strong. " },
    { startSecond: 1.25, endSecond: 3.5, text: "Then explain the offer." },
  ],
  "Start strong. Then explain the offer.",
  3.5,
);

assert.deepEqual(captions, [
  { start: 0, end: 1.25, text: "Start strong.", emphasis: "normal" },
  { start: 1.25, end: 3.5, text: "Then explain the offer.", emphasis: "normal" },
]);

const fallbackCaptions = captionsFromTranscriptionSegments(undefined, "One fallback transcript.", 4);
assert.deepEqual(fallbackCaptions, [{ start: 0, end: 4, text: "One fallback transcript.", emphasis: "normal" }]);

const route = readFileSync(new URL("../src/app/api/ai/transcribe/route.ts", import.meta.url), "utf8");
assert.match(route, /request\.formData\(\)/);
assert.match(route, /runAiTranscription/);
assert.match(route, /InvalidTranscriptionFileError/);
assert.match(route, /AiRateLimitError/);

const transcription = readFileSync(new URL("../src/lib/ai/transcription.ts", import.meta.url), "utf8");
assert.match(transcription, /experimental_transcribe as transcribe/);
assert.match(transcription, /groq\.transcription/);
assert.match(transcription, /timestampGranularities/);
assert.match(transcription, /assertAiUsageAllowed/);
assert.match(transcription, /captionsFromTranscriptionSegments/);

const aiPanel = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
assert.match(aiPanel, /\/api\/ai\/transcribe/);
assert.match(aiPanel, /loadBrowserMediaBlob/);
assert.match(aiPanel, /loadTauriMediaBlob/);
assert.match(aiPanel, /addAiCaptions/);
assert.match(aiPanel, /Auto-caption/);

const aiCapabilities = readFileSync(new URL("../src/lib/product/capabilities/ai.ts", import.meta.url), "utf8");
assert.match(aiCapabilities, /id: "automatic-captions"/);
assert.match(aiCapabilities, /status: "partial"/);
assert.match(aiCapabilities, /AI SDK transcription/);

console.log("AI auto-caption workflow checks passed.");
