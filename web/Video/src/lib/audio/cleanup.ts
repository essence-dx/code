"use client";

import {
  audioCleanupAdapterId,
  audioCleanupProfiles,
  normalizeAudioCleanupMode,
  normalizeAudioCleanupIntensity,
  resolveAudioCleanupProfile,
  type AudioCleanupAdapterId,
  type AudioCleanupMode,
  type AudioCleanupProfile,
} from "@/lib/audio/cleanup-contract";
import { audioBufferToWavFile, clampSample } from "@/lib/audio/wav";
export { audioCleanupAdapterId };

export interface AudioCleanupMetrics {
  peakDb: number;
  rmsDb: number;
  noiseFloorDb: number;
}

export interface AudioCleanupResult {
  file: File;
  adapter: AudioCleanupAdapterId;
  mode: AudioCleanupMode;
  intensity: number;
  profileLabel: string;
  before: AudioCleanupMetrics;
  after: AudioCleanupMetrics;
  summary: string;
}

export async function createCleanedAudioFile(blob: Blob, input: { filename: string; mode?: AudioCleanupMode; intensity?: number }): Promise<AudioCleanupResult> {
  if (blob.size <= 0) {
    throw new AudioCleanupError("Choose a non-empty audio file before cleaning audio.");
  }

  const mode = normalizeAudioCleanupMode(input.mode);
  const intensity = normalizeAudioCleanupIntensity(input.intensity);
  const profile = resolveAudioCleanupProfile(mode, intensity);
  const source = await decodeAudioBlob(blob);
  const before = measureAudioBuffer(source);
  const filtered = await renderVoiceCleanupFilters(source, profile);
  applyCleanupPostProcessing(filtered, profile);
  const after = measureAudioBuffer(filtered);
  const cleanName = cleanedAudioFilename(input.filename, mode);
  const file = audioBufferToWavFile(filtered, cleanName);

  return {
    file,
    adapter: profile.adapter,
    mode,
    intensity,
    profileLabel: profile.label,
    before,
    after,
    summary: audioCleanupSummary(before, after, profile),
  };
}

export function cleanedAudioFilename(filename: string, mode: AudioCleanupMode = "noise-reduction") {
  const profile = audioCleanupProfiles[normalizeAudioCleanupMode(mode)];
  const base = filename
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  return `${base || "audio"}-${profile.filenameSuffix}.wav`;
}

export function audioCleanupSummary(before: AudioCleanupMetrics, after: AudioCleanupMetrics, profile = audioCleanupProfiles["noise-reduction"], intensity = 1) {
  const noiseReduction = Math.max(0, before.noiseFloorDb - after.noiseFloorDb);
  const peakLift = Math.max(0, after.peakDb - before.peakDb);
  return `${profile.label} applied at ${Math.round(normalizeAudioCleanupIntensity(intensity) * 100)}% strength with voice-focused filtering, adaptive gating, and peak normalization. Noise floor improved by ${noiseReduction.toFixed(1)} dB; peak level changed by ${peakLift.toFixed(1)} dB.`;
}

async function decodeAudioBlob(blob: Blob) {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextCtor();
    const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    await audioContext.close();
    return buffer;
  } catch {
    throw new AudioCleanupError("This audio file could not be decoded for cleanup.");
  }
}

async function renderVoiceCleanupFilters(source: AudioBuffer, profile: AudioCleanupProfile) {
  const channels = Math.min(2, Math.max(1, source.numberOfChannels));
  const offline = new OfflineAudioContext(channels, source.length, source.sampleRate);
  const bufferSource = offline.createBufferSource();
  const highPass = offline.createBiquadFilter();
  const presence = offline.createBiquadFilter();
  const lowPass = offline.createBiquadFilter();

  highPass.type = "highpass";
  highPass.frequency.value = profile.highPassHz;
  highPass.Q.value = 0.7;
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.Q.value = 0.85;
  presence.gain.value = profile.presenceGainDb;
  lowPass.type = "lowpass";
  lowPass.frequency.value = profile.lowPassHz;
  lowPass.Q.value = 0.7;

  bufferSource.buffer = source;
  bufferSource.connect(highPass);
  highPass.connect(presence);
  presence.connect(lowPass);
  lowPass.connect(offline.destination);
  bufferSource.start(0);

  return offline.startRendering();
}

function applyCleanupPostProcessing(buffer: AudioBuffer, profile: AudioCleanupProfile) {
  applyStereoCenterBlend(buffer, profile.centerBlend);
  applyEchoTailDamping(buffer, profile.echoTailDamping);
  applyNoiseGateAndNormalize(buffer, profile);
}

function applyNoiseGateAndNormalize(buffer: AudioBuffer, profile: AudioCleanupProfile) {
  const threshold = dbToAmplitude(profile.noiseGateDb);
  let peak = 0;

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += 1) {
      const sample = channel[index] ?? 0;
      const gated = Math.abs(sample) < threshold ? sample * profile.floorGain : sample;
      channel[index] = gated;
      peak = Math.max(peak, Math.abs(gated));
    }
  }

  if (peak <= 0.001) return;
  const gain = Math.min(4, profile.targetPeak / peak);

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = clampSample((channel[index] ?? 0) * gain);
    }
  }
}

function applyStereoCenterBlend(buffer: AudioBuffer, amount: number) {
  if (buffer.numberOfChannels < 2 || amount <= 0) return;

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  for (let index = 0; index < buffer.length; index += 1) {
    const mid = ((left[index] ?? 0) + (right[index] ?? 0)) / 2;
    left[index] = clampSample(lerp(left[index] ?? 0, mid, amount));
    right[index] = clampSample(lerp(right[index] ?? 0, mid, amount));
  }
}

function applyEchoTailDamping(buffer: AudioBuffer, amount: number) {
  if (amount <= 0) return;

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    let envelope = 0;
    for (let index = 0; index < channel.length; index += 1) {
      const sample = channel[index] ?? 0;
      const magnitude = Math.abs(sample);
      envelope = Math.max(magnitude, envelope * 0.995);
      const tailRatio = envelope > 0.0001 ? magnitude / envelope : 1;
      const damping = tailRatio < 0.34 ? 1 - amount * (0.34 - tailRatio) * 2.2 : 1;
      channel[index] = clampSample(sample * Math.max(0.18, damping));
    }
  }
}

function measureAudioBuffer(buffer: AudioBuffer): AudioCleanupMetrics {
  const samples: number[] = [];
  let sumSquares = 0;
  let sampleCount = 0;
  let peak = 0;
  const stride = Math.max(1, Math.floor(buffer.length / 24000));

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += stride) {
      const value = Math.abs(channel[index] ?? 0);
      samples.push(value);
      sumSquares += value * value;
      sampleCount += 1;
      peak = Math.max(peak, value);
    }
  }

  samples.sort((a, b) => a - b);
  const floorSample = samples[Math.floor(samples.length * 0.2)] ?? 0;
  const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));

  return {
    peakDb: roundDb(amplitudeToDb(peak)),
    rmsDb: roundDb(amplitudeToDb(rms)),
    noiseFloorDb: roundDb(amplitudeToDb(floorSample)),
  };
}

function dbToAmplitude(db: number) {
  return Math.pow(10, db / 20);
}

function amplitudeToDb(value: number) {
  return 20 * Math.log10(Math.max(value, 0.00001));
}

function roundDb(value: number) {
  return Number(value.toFixed(1));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export class AudioCleanupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioCleanupError";
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
