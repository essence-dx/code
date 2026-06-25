import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { audioCleanupAdapterId, audioCleanupSummary, cleanedAudioFilename } from "../src/lib/audio/cleanup";
import {
  audioCleanupAdapterIds,
  audioCleanupIntensity,
  audioCleanupModes,
  audioCleanupProfiles,
  normalizeAudioCleanupIntensity,
  resolveAudioCleanupProfile,
} from "../src/lib/audio/cleanup-contract";
import { aiGenerationAssetMetadata, summarizeAiGenerationOutput } from "../src/lib/ai/generation-records";
import { audioRestorationServiceStatus, normalizeAudioRestorationRequest } from "../src/lib/ai/audio-restoration";
import { reviewAiTextSafety } from "../src/lib/ai/safety";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

assert.equal(audioCleanupAdapterId, "local/noise-cleanup-v1");
assert.deepEqual(audioCleanupModes, ["noise-reduction", "voice-isolation", "room-echo", "speech-enhancement"]);
assert.deepEqual(audioCleanupAdapterIds, [
  "local/noise-cleanup-v1",
  "local/voice-isolation-v1",
  "local/room-echo-reduction-v1",
  "local/speech-enhancement-v1",
]);
assert.equal(cleanedAudioFilename("  noisy voice.MP3  "), "noisy-voice-cleaned.wav");
assert.equal(cleanedAudioFilename("  noisy voice.MP3  ", "voice-isolation"), "noisy-voice-voice-isolated.wav");
assert.equal(cleanedAudioFilename("  noisy voice.MP3  ", "room-echo"), "noisy-voice-de-echoed.wav");
assert.equal(cleanedAudioFilename("  noisy voice.MP3  ", "speech-enhancement"), "noisy-voice-speech-enhanced.wav");
assert.equal(audioCleanupIntensity.defaultValue, 1);
assert.equal(normalizeAudioCleanupIntensity(9), 1.5);
assert.equal(normalizeAudioCleanupIntensity(0.1), 0.5);
assert.equal(resolveAudioCleanupProfile("voice-isolation", 1.5).floorGain < audioCleanupProfiles["voice-isolation"].floorGain, true);
assert.equal(audioRestorationServiceStatus().ok, true);
assert.deepEqual(audioRestorationServiceStatus().modes, audioCleanupModes);
assert.equal(normalizeAudioRestorationRequest({ sourceAssetName: "voice.wav", mode: "voice-isolation", intensity: "1.25" }).intensity, 1.25);
assert.match(
  audioCleanupSummary(
    { peakDb: -12, rmsDb: -30, noiseFloorDb: -50 },
    { peakDb: -1, rmsDb: -19, noiseFloorDb: -62 },
    audioCleanupProfiles["room-echo"],
    1.25,
  ),
  /Room echo reduction applied at 125% strength.+Noise floor improved by 12\.0 dB/,
);
assert.match(audioCleanupProfiles["speech-enhancement"].description, /dialogue clarity/);
assert.equal(reviewAiTextSafety({ action: "audio-cleanup", text: "Clean audio: noisy.wav -> noisy-cleaned.wav" }).status, "allowed");
assert.equal(summarizeAiGenerationOutput("audio-cleanup", { filename: "voice-cleaned.wav" }), "Cleaned audio generated: voice-cleaned.wav.");
assert.deepEqual(aiGenerationAssetMetadata("audio-cleanup", { filename: "voice-cleaned.wav" }), { kind: "audio", name: "voice-cleaned.wav" });

const cleanup = read("src/lib/audio/cleanup.ts");
assert.match(cleanup, /OfflineAudioContext/);
assert.match(cleanup, /highpass/);
assert.match(cleanup, /lowpass/);
assert.match(cleanup, /applyStereoCenterBlend/);
assert.match(cleanup, /applyEchoTailDamping/);
assert.match(cleanup, /applyNoiseGateAndNormalize/);
assert.match(cleanup, /audioBufferToWavFile/);

const panel = read("src/features/editor/components/ai-assistant-panel.tsx");
assert.match(panel, /Clean audio/);
assert.match(panel, /createCleanedAudioFile/);
assert.match(panel, /AiAudioCleanupControls/);
assert.match(panel, /audioCleanupMode/);
assert.match(panel, /audioCleanupIntensity/);
assert.match(panel, /setAudioCleanupPreview/);
assert.match(panel, /saveBrowserMedia\(cleanup\.file\)/);
assert.match(panel, /\/api\/ai\/audio-cleanup/);
assert.match(panel, /restoreAudioWithConnectedService/);
assert.match(panel, /fileFromAudioRestorationOutput/);

const controls = read("src/features/editor/components/ai-audio-cleanup-controls.tsx");
assert.match(controls, /AudioPreviewButton/);
assert.match(controls, /Slider/);
assert.match(controls, /audioCleanupModes/);
assert.match(controls, /audioCleanupIntensity/);
assert.match(controls, /Advanced service/);
assert.match(controls, /serviceConfigured/);
assert.match(controls, /profile\.description/);
assert.match(controls, /Strength/);
assert.match(controls, /Before/);
assert.match(controls, /After/);

const restoration = read("src/lib/ai/audio-restoration.ts");
assert.match(restoration, /AUDIO_RESTORATION_ENDPOINT/);
assert.match(restoration, /AUDIO_RESTORATION_API_KEY/);
assert.match(restoration, /runAiAudioRestoration/);
assert.match(restoration, /FormData/);
assert.match(restoration, /logAiGenerationRecord/);

const restorationRoute = read("src/app/api/ai/audio-restoration/route.ts");
assert.match(restorationRoute, /audioRestorationServiceStatus/);
assert.match(restorationRoute, /runAiAudioRestoration/);
assert.match(restorationRoute, /request\.formData/);

const restorationClient = read("src/features/editor/lib/audio-restoration-client.ts");
assert.match(restorationClient, /fetchAudioRestorationStatus/);
assert.match(restorationClient, /restoreAudioWithConnectedService/);
assert.match(restorationClient, /fileFromAudioRestorationOutput/);

const route = read("src/app/api/ai/audio-cleanup/route.ts");
assert.match(route, /recordAiAudioCleanup/);
assert.match(route, /AiRateLimitError/);
const record = read("src/lib/ai/audio-cleanup-record.ts");
assert.match(record, /intensity/);
assert.match(record, /audioCleanupIntensity/);

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /"audio-cleanup"/);

const settings = read("src/app/settings/page.tsx");
assert.match(settings, /"audio-cleanup": "Audio cleanup"/);

console.log("AI audio cleanup workflow guard passed.");
