import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import { applyAutoDuckingToLayers, isLikelyDialogueLayer, isLikelyMusicLayer } from "../src/lib/audio/auto-ducking";
import { beatMarkerColor, beatMarkerLabel, detectBeatMarkerTimes, isBeatMarker } from "../src/lib/audio/beat-markers";
import { audioMixPresets } from "../src/lib/audio/mix-presets";
import { layerAudioGainAtTime, normalizeLayerAudioMix } from "../src/lib/audio/mix";
import { vocalSplitSummary, vocalStemFilename } from "../src/lib/audio/vocal-split";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const now = "2026-05-14T00:00:00.000Z";
const audioAsset: MediaAsset = {
  id: "asset_audio",
  name: "voice.wav",
  type: "audio",
  mimeType: "audio/wav",
  size: 1024,
  duration: 10,
  waveformPeaks: [0.1, 0.2, 0.95, 0.24, 0.18, 0.9, 0.2, 0.16, 0.88, 0.18, 0.12, 0.86],
  storageKey: "audio-key",
  source: "browser-indexeddb",
  objectUrl: "blob:audio",
  createdAt: now,
};

const project = createProject("Audio check", "16:9");
const audioLayer = createLayerFromAsset(audioAsset, 0);
audioLayer.name = "Warm music bed";
audioLayer.volume = 1.5;
audioLayer.fadeIn = 2;
audioLayer.fadeOut = 2;
const dialogueAsset: MediaAsset = { ...audioAsset, id: "asset_dialogue", name: "voiceover.wav", waveformPeaks: [0.02, 0.88, 0.91, 0.05, 0.01, 0.82, 0.86, 0.04] };
const dialogueLayer = createLayerFromAsset(dialogueAsset, 1);
dialogueLayer.name = "Voiceover narration";
dialogueLayer.start = 2;
dialogueLayer.duration = 5;
project.layers = [audioLayer];
project.duration = 10;
project.audioMixPresets = [
  {
    id: "mix_1",
    name: "Saved mix",
    volume: 0.5,
    fadeIn: 0.25,
    fadeOut: 0.5,
    muted: false,
    createdAt: now,
    updatedAt: now,
  },
];

assert.equal(normalizeLayerAudioMix({ duration: 10, volume: 3, fadeIn: 12, fadeOut: -1 }).volume, 2);
assert.equal(layerAudioGainAtTime(audioLayer, 1), 0.75);
assert.equal(layerAudioGainAtTime(audioLayer, 9), 0.75);
assert.deepEqual(
  audioMixPresets.map((preset) => preset.id),
  ["voiceover", "music-bed", "mute-under-video"],
);
assert.equal(beatMarkerColor, "#a855f7");
assert.equal(beatMarkerLabel(2), "Beat 3");
assert.equal(isBeatMarker({ label: "Beat 12" }), true);
assert.equal(isBeatMarker({ label: "Intro" }), false);
assert.equal(detectBeatMarkerTimes({ layer: audioLayer, asset: audioAsset, maxMarkers: 8 }).length > 0, true);
assert.equal(isLikelyMusicLayer(audioLayer, audioAsset), true);
assert.equal(isLikelyDialogueLayer(dialogueLayer, dialogueAsset), true);
const duckingResult = applyAutoDuckingToLayers({
  layers: [audioLayer, dialogueLayer],
  mediaAssets: [audioAsset, dialogueAsset],
  targetLayerId: audioLayer.id,
});
assert.equal(duckingResult.summary.changedLayerCount, 1);
assert.equal(duckingResult.summary.createdLayerCount > 1, true);
assert.equal(duckingResult.layers.some((layer) => layer.name.includes("ducked") && (layer.volume ?? 1) < (audioLayer.volume ?? 1)), true);
assert.equal(vocalStemFilename("Lead vocal mix.wav", "voice"), "Lead-vocal-mix-voice-stem.wav");
assert.equal(vocalStemFilename("Lead vocal mix.wav", "instrumental"), "Lead-vocal-mix-instrumental-stem.wav");
assert.match(vocalSplitSummary(["Stereo warning"]), /voice and instrumental WAV stems/);
assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [audioAsset] }).success, true);
assert.equal(createRenderPlan(project, [audioAsset], "wav-audio", "wav").supported, true);
assert.equal(createRenderPlan(project, [audioAsset], "mp4-1080p", "mp4").supported, false);

const audioPanel = readFileSync(new URL("../src/features/editor/components/audio-mix-panel.tsx", import.meta.url), "utf8");
assert.match(audioPanel, /audioMixPresets/);
assert.match(audioPanel, /saveSelectedAudioMixPreset/);
assert.match(audioPanel, /WaveformBars/);
assert.match(audioPanel, /detectBeatMarkerTimes/);
assert.match(audioPanel, /addTimelineMarker/);
assert.match(audioPanel, /Beat markers/);
assert.match(audioPanel, /applyAutoDuckingToLayer/);
assert.match(audioPanel, /Analyze dialogue regions/);
assert.match(audioPanel, /createVocalSplitFiles/);
assert.match(audioPanel, /Create voice and instrumental stems/);
assert.match(audioPanel, /addLayerFromAsset/);

const vocalSplit = readFileSync(new URL("../src/lib/audio/vocal-split.ts", import.meta.url), "utf8");
assert.match(vocalSplit, /mid = \(leftSample \+ rightSample\) \/ 2/);
assert.match(vocalSplit, /side = \(leftSample - rightSample\) \/ 2/);
assert.match(vocalSplit, /numberOfChannels < 2/);

const videoWorkflow = readFileSync(new URL("../src/features/editor/components/video-audio-workflow-panel.tsx", import.meta.url), "utf8");
assert.match(videoWorkflow, /Extract editable audio layer/);
assert.match(videoWorkflow, /Replace/);

const renderer = readFileSync(new URL("../src/lib/render/browser-renderer.ts", import.meta.url), "utf8");
assert.match(renderer, /plan\.format === "wav"/);
assert.match(renderer, /pcm_s16le/);

const preflight = readFileSync(new URL("../src/lib/render/render-preflight.ts", import.meta.url), "utf8");
assert.match(preflight, /Use the WAV Audio preset/);

console.log("Audio workflow checks passed.");
