import type { AudioLibraryItem } from "@/features/editor/audio-library";

const sampleRate = 22_050;
const twoPi = Math.PI * 2;

export function createAudioLibraryDataUrl(item: AudioLibraryItem) {
  const sampleCount = Math.max(1, Math.floor(item.durationSeconds * sampleRate));
  const samples = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const progress = index / Math.max(1, sampleCount - 1);
    samples[index] = clampSample(renderSample(item, time, progress, index));
  }

  return encodeWavDataUrl(samples);
}

function renderSample(
  item: AudioLibraryItem,
  time: number,
  progress: number,
  index: number,
) {
  const generator = item.generator;

  if (generator.type === "pulse-bed") {
    const beat = item.bpm ? item.bpm / 60 : 1;
    const pulse = 0.55 + 0.45 * Math.max(0, Math.sin(twoPi * beat * time));
    const chord =
      sine(generator.rootFrequency, time) * 0.45 +
      sine(generator.rootFrequency * 1.25, time) * 0.24 +
      sine(generator.rootFrequency * 1.5, time) * 0.18 +
      sine(generator.rootFrequency * 2, time) * 0.08;

    return chord * pulse * fadeEnvelope(progress, 0.08) * 0.42;
  }

  if (generator.type === "focus-bed") {
    const shimmer =
      sine(generator.rootFrequency * 2, time) * 0.1 +
      sine(generator.rootFrequency * 2.5, time + 0.025) * 0.08;
    const base =
      sine(generator.rootFrequency, time) * 0.38 +
      sine(generator.rootFrequency * 1.5, time) * 0.16;

    return (base + shimmer) * fadeEnvelope(progress, 0.1) * 0.38;
  }

  if (generator.type === "notification") {
    const first = bell(generator.rootFrequency, time, 0, 0.52);
    const second = bell(generator.rootFrequency * 1.25, time, 0.33, 0.62);

    return (first + second) * 0.52;
  }

  if (generator.type === "whoosh") {
    const sweep = generator.rootFrequency + progress * 940;
    const noise = seededNoise(index + generator.seed) * (0.35 + progress * 0.65);

    return (
      (sine(sweep, time) * 0.22 + noise * 0.28) *
      Math.sin(Math.PI * progress) *
      0.7
    );
  }

  const thump = sine(generator.rootFrequency, time) * Math.exp(-time * 7);
  const snap = seededNoise(index + generator.seed) * Math.exp(-time * 18);

  return (thump * 0.7 + snap * 0.25) * fadeOut(progress, 0.92);
}

function bell(
  frequency: number,
  time: number,
  start: number,
  decay: number,
) {
  const localTime = time - start;

  if (localTime < 0) return 0;

  return (
    (sine(frequency, localTime) * 0.78 +
      sine(frequency * 2, localTime) * 0.22) *
    Math.exp(-localTime / decay)
  );
}

function sine(frequency: number, time: number) {
  return Math.sin(twoPi * frequency * time);
}

function fadeEnvelope(progress: number, edge: number) {
  return Math.min(fadeIn(progress, edge), fadeOut(progress, 1 - edge));
}

function fadeIn(progress: number, end: number) {
  if (end <= 0) return 1;
  return Math.min(1, progress / end);
}

function fadeOut(progress: number, start: number) {
  if (start >= 1) return 1;
  return Math.min(1, (1 - progress) / (1 - start));
}

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function clampSample(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function encodeWavDataUrl(samples: Float32Array) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);

  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, samples[index] * 0x7fff, true);
  }

  return `data:audio/wav;base64,${toBase64(bytes)}`;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 8192;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}
