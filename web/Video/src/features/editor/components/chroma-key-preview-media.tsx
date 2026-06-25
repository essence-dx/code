"use client";

import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { drawChromaKeyedMedia, hasActiveChromaKey } from "@/lib/editor/chroma-key";
import type { TimelineLayer } from "@/lib/editor/types";

type ChromaKeyPreviewMediaProps = {
  layer: TimelineLayer;
  assetUrl: string;
  localTime: number;
  isPlaying: boolean;
  mediaRef: MutableRefObject<HTMLMediaElement | null>;
};

export function ChromaKeyPreviewMedia({ layer, assetUrl, localTime, isPlaying, mediaRef }: ChromaKeyPreviewMediaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [readyVersion, setReadyVersion] = useState(0);

  useEffect(() => {
    let animationFrame = 0;

    const paint = () => {
      const canvas = canvasRef.current;
      const media = layer.kind === "video" ? videoElement(mediaRef.current) : imageRef.current;
      if (!canvas || !media || !hasActiveChromaKey(layer.style.chromaKey)) return;

      const width = Math.max(1, Math.round(canvas.clientWidth || layer.transform.width));
      const height = Math.max(1, Math.round(canvas.clientHeight || layer.transform.height));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawChromaKeyedMedia(context, media, layer, 0, 0, canvas.width, canvas.height);
    };

    const tick = () => {
      paint();
      if (isPlaying && layer.kind === "video") {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    tick();
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [assetUrl, isPlaying, layer, localTime, mediaRef, readyVersion]);

  if (layer.kind === "video") {
    return (
      <>
        <video
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={assetUrl}
          className="pointer-events-none absolute size-px opacity-0"
          muted={layer.muted}
          playsInline
          preload="auto"
        />
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={assetUrl}
        alt=""
        className="pointer-events-none absolute size-px opacity-0"
        onLoad={() => setReadyVersion((version) => version + 1)}
      />
      <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
    </>
  );
}

function videoElement(media: HTMLMediaElement | null): HTMLVideoElement | null {
  return media instanceof HTMLVideoElement ? media : null;
}
