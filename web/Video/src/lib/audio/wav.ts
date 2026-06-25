"use client";

export function audioBufferToWavFile(buffer: AudioBuffer, filename: string) {
  const wavBytes = encodeWav(buffer);
  const wavBuffer = wavBytes.buffer.slice(wavBytes.byteOffset, wavBytes.byteOffset + wavBytes.byteLength) as ArrayBuffer;
  return new File([new Blob([wavBuffer], { type: "audio/wav" })], filename, { type: "audio/wav" });
}

export function encodeWav(buffer: AudioBuffer) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < buffer.length; index += 1) {
    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      view.setInt16(offset, Math.round(clampSample(channel[index] ?? 0) * 32767), true);
      offset += bytesPerSample;
    }
  }

  return bytes;
}

export function clampSample(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
