"use client";

import { audioBufferToWavFile, clampSample } from "@/lib/audio/wav";

export interface VocalSplitResult {
  vocalFile: File;
  instrumentalFile: File;
  summary: string;
  warnings: string[];
}

const targetPeak = 0.92;

export async function createVocalSplitFiles(blob: Blob, input: { filename: string }): Promise<VocalSplitResult> {
  if (blob.size <= 0) {
    throw new VocalSplitError("Choose a non-empty stereo audio file before splitting vocals.");
  }

  const source = await decodeAudioBlob(blob);
  if (source.numberOfChannels < 2) {
    throw new VocalSplitError("Vocal splitting needs a stereo audio file so center and side channels can be separated.");
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextCtor();

  try {
    const vocalBuffer = context.createBuffer(2, source.length, source.sampleRate);
    const instrumentalBuffer = context.createBuffer(2, source.length, source.sampleRate);
    const left = source.getChannelData(0);
    const right = source.getChannelData(1);
    const vocalLeft = vocalBuffer.getChannelData(0);
    const vocalRight = vocalBuffer.getChannelData(1);
    const instrumentalLeft = instrumentalBuffer.getChannelData(0);
    const instrumentalRight = instrumentalBuffer.getChannelData(1);

    for (let index = 0; index < source.length; index += 1) {
      const leftSample = left[index] ?? 0;
      const rightSample = right[index] ?? 0;
      const mid = (leftSample + rightSample) / 2;
      const side = (leftSample - rightSample) / 2;

      vocalLeft[index] = clampSample(mid);
      vocalRight[index] = clampSample(mid);
      instrumentalLeft[index] = clampSample(side);
      instrumentalRight[index] = clampSample(-side);
    }

    normalizeAudioBuffer(vocalBuffer);
    normalizeAudioBuffer(instrumentalBuffer);

    const warnings = [
      "This local split uses stereo mid-side separation, so it works best when vocals are centered and instruments are wide.",
    ];

    return {
      vocalFile: audioBufferToWavFile(vocalBuffer, vocalStemFilename(input.filename, "voice")),
      instrumentalFile: audioBufferToWavFile(instrumentalBuffer, vocalStemFilename(input.filename, "instrumental")),
      summary: vocalSplitSummary(warnings),
      warnings,
    };
  } finally {
    await context.close();
  }
}

export function vocalStemFilename(filename: string, stem: "voice" | "instrumental") {
  const base = filename
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  return `${base || "audio"}-${stem}-stem.wav`;
}

export function vocalSplitSummary(warnings: string[] = []) {
  const warningText = warnings.length ? ` ${warnings[0]}` : "";
  return `Created separate voice and instrumental WAV stems from the source stereo mix.${warningText}`;
}

async function decodeAudioBlob(blob: Blob) {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextCtor();
    const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    await audioContext.close();
    return buffer;
  } catch {
    throw new VocalSplitError("This audio file could not be decoded for vocal splitting.");
  }
}

function normalizeAudioBuffer(buffer: AudioBuffer) {
  let peak = 0;

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += 1) {
      peak = Math.max(peak, Math.abs(channel[index] ?? 0));
    }
  }

  if (peak <= 0.001) return;
  const gain = Math.min(6, targetPeak / peak);

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = clampSample((channel[index] ?? 0) * gain);
    }
  }
}

export class VocalSplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VocalSplitError";
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
