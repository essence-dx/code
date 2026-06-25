import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chunkSpeechText, concatenateWavAudio, createGroqSpeechModel, maxSpeechRequestChars, normalizeAiSpeechRequest } from "../src/lib/ai/speech";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const speech = read("src/lib/ai/speech.ts");
assert.match(speech, /experimental_generateSpeech as generateSpeech/);
assert.match(speech, /SpeechModelV3/);
assert.match(speech, /https:\/\/api\.groq\.com\/openai\/v1\/audio\/speech/);
assert.match(speech, /canopylabs\/orpheus-v1-english/);
assert.match(speech, /GROQ_SPEECH_MODEL/);
assert.match(speech, /assertAiUsageAllowed\(context\.userId, "voiceover"/);
assert.match(speech, /chunkSpeechText/);
assert.match(speech, /concatenateWavAudio/);

const route = read("src/app/api/ai/speech/route.ts");
assert.match(route, /runAiSpeech/);
assert.match(route, /corsPreflight/);
assert.match(route, /apiJson/);
assert.match(route, /readJsonRequest/);
assert.match(route, /InvalidJsonRequestError/);
assert.match(route, /AiRateLimitError/);

const panel = read("src/features/editor/components/ai-assistant-panel.tsx");
assert.match(panel, /\/api\/ai\/speech/);
assert.match(panel, /Generate voiceover/);
assert.match(panel, /saveBrowserMedia\(file\)/);
assert.match(panel, /addLayerFromAsset\(asset\.id\)/);
assert.match(panel, /fileFromGeneratedSpeech/);
assert.match(panel, /isAiSpeechSuccess/);

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /"voiceover"/);

const settings = read("src/app/settings/page.tsx");
assert.match(settings, /voiceover: "Voiceover"/);

const aiCapabilities = read("src/lib/product/capabilities/ai.ts");
assert.match(aiCapabilities, /Groq speech adapter/);
assert.match(aiCapabilities, /replaceable audio layer/);
assert.match(aiCapabilities, /long-script chunking/);

const normalized = normalizeAiSpeechRequest({ text: "  Short creator intro.  ", language: "auto", outputFormat: "wav" });
assert.equal(normalized.text, "Short creator intro.");
assert.equal(normalized.language, "auto");

const longText = Array.from({ length: 18 }, (_, index) => `Sentence ${index + 1} explains the edit rhythm, visual tone, and creator handoff clearly.`).join(" ");
const longNormalized = normalizeAiSpeechRequest({ text: longText, language: "en", outputFormat: "wav" });
assert.equal(longNormalized.text, longText);
assert.ok(longNormalized.text.length > 200);
const speechChunks = chunkSpeechText(longText);
assert.ok(speechChunks.length > 1);
assert.ok(speechChunks.every((chunk) => chunk.length <= 200));
assert.equal(speechChunks.join(" "), longText);

assert.throws(
  () => normalizeAiSpeechRequest({ text: "x".repeat(maxSpeechRequestChars + 1) }),
  new RegExp(`between 1 and ${maxSpeechRequestChars} characters`),
);

const wavA = testWavBase64([1, 2]);
const wavB = testWavBase64([3, 4, 5]);
const combined = concatenateWavAudio([
  { base64: wavA, format: "wav", mediaType: "audio/wav" },
  { base64: wavB, format: "wav", mediaType: "audio/wav" },
]);
const combinedBytes = Buffer.from(combined.base64, "base64");
assert.equal(combined.format, "wav");
assert.equal(combined.mediaType, "audio/wav");
assert.equal(combinedBytes.toString("ascii", 0, 4), "RIFF");
assert.equal(combinedBytes.toString("ascii", 8, 12), "WAVE");
assert.equal(combinedBytes.readUInt32LE(40), 5);

process.env["GROQ" + "_API_KEY"] = "placeholder";
const model = createGroqSpeechModel("canopylabs/orpheus-v1-english");
assert.equal(model.specificationVersion, "v3");
assert.equal(model.provider, "groq");
assert.equal(model.modelId, "canopylabs/orpheus-v1-english");

console.log("AI voiceover workflow guard passed.");

function testWavBase64(samples: number[]) {
  const formatChunk = Buffer.alloc(16);
  formatChunk.writeUInt16LE(1, 0);
  formatChunk.writeUInt16LE(1, 2);
  formatChunk.writeUInt32LE(8000, 4);
  formatChunk.writeUInt32LE(8000, 8);
  formatChunk.writeUInt16LE(1, 12);
  formatChunk.writeUInt16LE(8, 14);

  const data = Buffer.from(samples);
  const riffSize = 4 + 8 + formatChunk.length + 8 + data.length;
  const wav = Buffer.alloc(12 + 8 + formatChunk.length + 8 + data.length);
  let offset = 0;
  wav.write("RIFF", offset, "ascii");
  offset += 4;
  wav.writeUInt32LE(riffSize, offset);
  offset += 4;
  wav.write("WAVE", offset, "ascii");
  offset += 4;
  wav.write("fmt ", offset, "ascii");
  offset += 4;
  wav.writeUInt32LE(formatChunk.length, offset);
  offset += 4;
  formatChunk.copy(wav, offset);
  offset += formatChunk.length;
  wav.write("data", offset, "ascii");
  offset += 4;
  wav.writeUInt32LE(data.length, offset);
  offset += 4;
  data.copy(wav, offset);
  return wav.toString("base64");
}
