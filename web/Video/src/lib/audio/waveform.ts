"use client";

export async function extractWaveformPeaks(file: Blob, peakCount = 64) {
  try {
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    const channelData = buffer.getChannelData(0);
    const samplesPerPeak = Math.max(1, Math.floor(channelData.length / peakCount));
    const peaks: number[] = [];

    for (let index = 0; index < peakCount; index++) {
      const start = index * samplesPerPeak;
      const end = Math.min(channelData.length, start + samplesPerPeak);
      let max = 0;

      for (let sample = start; sample < end; sample++) {
        max = Math.max(max, Math.abs(channelData[sample] ?? 0));
      }

      peaks.push(Number(max.toFixed(3)));
    }

    await audioContext.close();
    const loudest = Math.max(...peaks, 0.001);
    return peaks.map((peak) => Number((peak / loudest).toFixed(3)));
  } catch {
    return [];
  }
}
