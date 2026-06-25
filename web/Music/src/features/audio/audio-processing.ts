export type EditAudioOptions = {
  startMs: number;
  endMs: number;
  fadeInMs: number;
  fadeOutMs: number;
};

export type EditedAudio = {
  blob: Blob;
  durationMs: number;
};

async function decodeBlob(blob: Blob) {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  const buffer = await blob.arrayBuffer();

  try {
    return await context.decodeAudioData(buffer.slice(0));
  } finally {
    await context.close();
  }
}

export async function getAudioDurationMs(blob: Blob) {
  const buffer = await decodeBlob(blob);
  return Math.round(buffer.duration * 1000);
}

export async function cropAndFadeAudio(
  blob: Blob,
  options: EditAudioOptions,
): Promise<EditedAudio> {
  const decoded = await decodeBlob(blob);
  const startMs = Math.max(0, Math.min(options.startMs, decoded.duration * 1000));
  const endMs = Math.max(startMs + 100, Math.min(options.endMs, decoded.duration * 1000));
  const startFrame = Math.floor((startMs / 1000) * decoded.sampleRate);
  const endFrame = Math.floor((endMs / 1000) * decoded.sampleRate);
  const frameCount = Math.max(1, endFrame - startFrame);
  const output = new OfflineAudioContext(
    decoded.numberOfChannels,
    frameCount,
    decoded.sampleRate,
  );
  const rendered = output.createBuffer(
    decoded.numberOfChannels,
    frameCount,
    decoded.sampleRate,
  );

  for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
    const source = decoded.getChannelData(channel);
    const target = rendered.getChannelData(channel);

    for (let frame = 0; frame < frameCount; frame += 1) {
      const sourceFrame = startFrame + frame;
      const positionMs = (frame / decoded.sampleRate) * 1000;
      const remainingMs = ((frameCount - frame) / decoded.sampleRate) * 1000;
      const fadeInGain =
        options.fadeInMs > 0 ? Math.min(1, positionMs / options.fadeInMs) : 1;
      const fadeOutGain =
        options.fadeOutMs > 0 ? Math.min(1, remainingMs / options.fadeOutMs) : 1;
      target[frame] = source[sourceFrame] * Math.min(fadeInGain, fadeOutGain);
    }
  }

  const wavBuffer = encodeWav(rendered);

  return {
    blob: new Blob([wavBuffer], { type: "audio/wav" }),
    durationMs: Math.round((frameCount / decoded.sampleRate) * 1000),
  };
}

function encodeWav(buffer: AudioBuffer) {
  const channelCount = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = interleave(buffer);
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

function interleave(buffer: AudioBuffer) {
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length * channelCount;
  const result = new Float32Array(length);
  let index = 0;

  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      result[index] = buffer.getChannelData(channel)[frame];
      index += 1;
    }
  }

  return result;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
