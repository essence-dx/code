import {
  getMediaTimelineDuration,
  getMediaTrimEnd,
  getMediaTrimStart,
  snapMediaTimelineSeconds,
} from "@/features/editor/media-timeline";
import type {
  AudioElement,
  MediaBeatMarker,
  MediaBeatSyncSuggestion,
} from "@/features/editor/types";

type BeatCandidate = {
  timeSeconds: number;
  confidence: number;
};

type BrowserAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export async function detectAudioBeats(element: AudioElement) {
  const metadataBeats = createMetadataBeatCandidates(element);

  if (metadataBeats.length) {
    return createBeatDetectionResult(metadataBeats);
  }

  const audioBuffer = await decodeAudioSource(element.src);
  const candidates = detectBeatCandidatesFromBuffer(audioBuffer, element);

  return createBeatDetectionResult(candidates);
}

async function decodeAudioSource(source: string) {
  const AudioContextCtor =
    window.AudioContext ?? (window as BrowserAudioWindow).webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error("Audio decoding is unavailable in this browser.");
  }

  const response = await fetch(source);

  if (!response.ok) {
    throw new Error("Could not read audio source.");
  }

  const context = new AudioContextCtor();

  try {
    const arrayBuffer = await response.arrayBuffer();

    return await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void context.close();
  }
}

function createMetadataBeatCandidates(element: AudioElement) {
  const bpm = element.sourceBpm;

  if (!bpm || bpm <= 0) return [];

  const interval = 60 / bpm;
  const duration = getMediaTimelineDuration(element);
  const candidates: BeatCandidate[] = [];

  for (let time = 0; time <= duration; time += interval) {
    candidates.push({
      timeSeconds: snapMediaTimelineSeconds(time),
      confidence: 0.92,
    });
  }

  return uniqueCandidates(candidates).slice(0, 96);
}

function detectBeatCandidatesFromBuffer(
  audioBuffer: AudioBuffer,
  element: AudioElement,
) {
  const channel = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const trimStart = Math.min(audioBuffer.duration, getMediaTrimStart(element));
  const trimEnd = Math.min(
    audioBuffer.duration,
    getMediaTrimEnd(element) ?? trimStart + getMediaTimelineDuration(element),
  );
  const startSample = Math.max(0, Math.floor(trimStart * sampleRate));
  const endSample = Math.min(channel.length, Math.floor(trimEnd * sampleRate));
  const windowSize = 1024;
  const hopSize = 512;
  const frames: Array<{ timeSeconds: number; energy: number }> = [];

  for (
    let start = startSample;
    start + windowSize < endSample;
    start += hopSize
  ) {
    let energy = 0;

    for (let index = 0; index < windowSize; index += 1) {
      const sample = channel[start + index] ?? 0;
      energy += sample * sample;
    }

    frames.push({
      timeSeconds: (start - startSample) / sampleRate,
      energy: Math.sqrt(energy / windowSize),
    });
  }

  if (frames.length < 3) return [];

  const averageEnergy =
    frames.reduce((total, frame) => total + frame.energy, 0) / frames.length;
  const variance =
    frames.reduce(
      (total, frame) => total + (frame.energy - averageEnergy) ** 2,
      0,
    ) / frames.length;
  const standardDeviation = Math.sqrt(variance);
  const threshold = averageEnergy + standardDeviation * 0.45;
  const candidates: BeatCandidate[] = [];
  let lastBeatTime = -1;

  for (let index = 1; index < frames.length - 1; index += 1) {
    const previous = frames[index - 1];
    const current = frames[index];
    const next = frames[index + 1];
    const isLocalPeak =
      current.energy >= previous.energy && current.energy > next.energy;
    const isOnset =
      current.energy > threshold && current.energy > previous.energy * 1.1;

    if (!isLocalPeak || !isOnset || current.timeSeconds - lastBeatTime < 0.28) {
      continue;
    }

    const confidence = Math.min(
      1,
      Math.max(0.15, (current.energy - averageEnergy) / (standardDeviation * 3)),
    );

    candidates.push({
      timeSeconds: snapMediaTimelineSeconds(current.timeSeconds),
      confidence,
    });
    lastBeatTime = current.timeSeconds;
  }

  return uniqueCandidates(candidates).slice(0, 96);
}

function createBeatDetectionResult(candidates: BeatCandidate[]) {
  const safeCandidates = uniqueCandidates(candidates);
  const beatMarkers: MediaBeatMarker[] = safeCandidates.map(
    (candidate, index) => ({
      timeSeconds: candidate.timeSeconds,
      label: `Beat ${index + 1}`,
    }),
  );
  const beatSyncSuggestions: MediaBeatSyncSuggestion[] = safeCandidates
    .filter((_, index) => index % 4 === 0)
    .slice(0, 24)
    .map((candidate, index) => ({
      timeSeconds: candidate.timeSeconds,
      label: index === 0 ? "Start motion" : `Cut point ${index}`,
      confidence: candidate.confidence,
    }));

  return {
    beatMarkers,
    beatSyncSuggestions,
  };
}

function uniqueCandidates(candidates: BeatCandidate[]) {
  const byTime = new Map<number, BeatCandidate>();

  for (const candidate of candidates) {
    const current = byTime.get(candidate.timeSeconds);

    if (!current || candidate.confidence > current.confidence) {
      byTime.set(candidate.timeSeconds, candidate);
    }
  }

  return [...byTime.values()].sort(
    (first, second) => first.timeSeconds - second.timeSeconds,
  );
}
