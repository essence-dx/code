"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaAsset } from "@/lib/editor/types";

export function AudioPreviewButton({ asset }: { asset: MediaAsset }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [asset.objectUrl],
  );

  if (asset.type !== "audio" || !asset.objectUrl) return null;

  async function togglePreview() {
    if (!audioRef.current) {
      audioRef.current = new Audio(asset.objectUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    await audioRef.current.play();
    setIsPlaying(true);
  }

  async function previewAudio() {
    try {
      await togglePreview();
    } catch {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7 shrink-0"
      onClick={(event) => {
        event.stopPropagation();
        void previewAudio();
      }}
      aria-label={isPlaying ? `Pause ${asset.name}` : `Preview ${asset.name}`}
    >
      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
    </Button>
  );
}
