"use client";

import { useEffect, useRef, useState } from "react";

type WaveformCanvasProps = {
  blob?: Blob;
  startMs?: number;
  endMs?: number;
  durationMs?: number;
};

export function WaveformCanvas({
  blob,
  startMs = 0,
  endMs = 0,
  durationMs = 0,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPeaks() {
      if (!blob) {
        setPeaks([]);
        return;
      }

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      const context = new AudioContextClass();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
      await context.close();
      const channel = audioBuffer.getChannelData(0);
      const bucketCount = 220;
      const bucketSize = Math.max(1, Math.floor(channel.length / bucketCount));
      const nextPeaks: number[] = [];

      for (let bucket = 0; bucket < bucketCount; bucket += 1) {
        let max = 0;
        const start = bucket * bucketSize;
        const end = Math.min(channel.length, start + bucketSize);

        for (let index = start; index < end; index += 1) {
          max = Math.max(max, Math.abs(channel[index]));
        }

        nextPeaks.push(max);
      }

      if (!cancelled) {
        setPeaks(nextPeaks);
      }
    }

    loadPeaks().catch(() => {
      if (!cancelled) {
        setPeaks([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [blob]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#10141f";
    context.fillRect(0, 0, width, height);

    const center = height / 2;
    const barWidth = width / Math.max(1, peaks.length);

    peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(2, peak * height * 0.82);
      const isInRegion =
        durationMs > 0 &&
        (index / peaks.length) * durationMs >= startMs &&
        (index / peaks.length) * durationMs <= (endMs || durationMs);
      context.fillStyle = isInRegion ? "#6ee7b7" : "#556070";
      context.fillRect(x, center - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    });

    if (!peaks.length) {
      context.fillStyle = "#5f6d82";
      context.font = `${13 * window.devicePixelRatio}px sans-serif`;
      context.fillText("Import an audio file to render the waveform", 18, center);
    }
  }, [peaks, startMs, endMs, durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="h-32 w-full rounded-md border border-white/10 bg-slate-950"
    />
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
