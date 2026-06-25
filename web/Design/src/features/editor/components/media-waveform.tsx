"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type MediaWaveformProps = {
  src: string;
  className?: string;
};

export function MediaWaveform({ src, className }: MediaWaveformProps) {
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let audioContext: AudioContext | null = null;

    setPeaks(null);

    async function decodeWaveform() {
      if (!src || typeof window === "undefined" || !window.AudioContext) {
        setPeaks([]);
        return;
      }

      try {
        audioContext = new AudioContext();
        const response = await fetch(src);
        const audioData = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        if (!cancelled) {
          setPeaks(createWaveformPeaks(audioBuffer));
        }
      } catch {
        if (!cancelled) setPeaks([]);
      } finally {
        await closeAudioContext(audioContext);
      }
    }

    void decodeWaveform();

    return () => {
      cancelled = true;
      void closeAudioContext(audioContext);
    };
  }, [src]);

  if (!peaks?.length) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex h-full items-center gap-px px-1 py-0.5",
        className,
      )}
    >
      {peaks.map((peak, index) => (
        <span
          key={`${index}-${peak}`}
          className="min-h-1 flex-1 rounded-full bg-primary-foreground/80"
          style={{ height: `${Math.max(12, peak * 100)}%` }}
        />
      ))}
    </div>
  );
}

function createWaveformPeaks(audioBuffer: AudioBuffer, barCount = 48) {
  const channelCount = Math.min(2, audioBuffer.numberOfChannels);
  const channels = Array.from({ length: channelCount }, (_, index) =>
    audioBuffer.getChannelData(index),
  );
  const sampleCount = audioBuffer.length;

  if (!channels.length || sampleCount === 0) return [];

  const peaks = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor((index / barCount) * sampleCount);
    const end = Math.max(
      start + 1,
      Math.floor(((index + 1) / barCount) * sampleCount),
    );
    const sampleStep = Math.max(1, Math.floor((end - start) / 96));
    let peak = 0;

    for (const channel of channels) {
      for (
        let sampleIndex = start;
        sampleIndex < end;
        sampleIndex += sampleStep
      ) {
        peak = Math.max(peak, Math.abs(channel[sampleIndex] ?? 0));
      }
    }

    return Math.min(1, peak);
  });
  const highestPeak = Math.max(0.01, ...peaks);

  return peaks.map((peak) => Math.max(0.08, peak / highestPeak));
}

async function closeAudioContext(audioContext: AudioContext | null) {
  if (!audioContext || audioContext.state === "closed") return;

  await audioContext.close().catch(() => undefined);
}
