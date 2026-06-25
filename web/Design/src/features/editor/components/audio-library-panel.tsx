"use client";

import { Music2, Play, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  audioLibraryItems,
  type AudioLibraryItem,
} from "@/features/editor/audio-library";
import { createAudioLibraryDataUrl } from "@/features/editor/audio-library-synthesis";

type AudioLibraryPanelProps = {
  onAddAudio: (item: AudioLibraryItem, dataUrl: string) => void;
};

export function AudioLibraryPanel({ onAddAudio }: AudioLibraryPanelProps) {
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  function previewItem(item: AudioLibraryItem) {
    previewRef.current?.pause();

    const audio = new Audio(createAudioLibraryDataUrl(item));
    previewRef.current = audio;
    setPreviewingId(item.id);
    audio.onended = () => setPreviewingId(null);
    audio.onpause = () => setPreviewingId(null);
    void audio.play().catch(() => setPreviewingId(null));
  }

  function addItem(item: AudioLibraryItem) {
    onAddAudio(item, createAudioLibraryDataUrl(item));
  }

  return (
    <div className="grid gap-2">
      {audioLibraryItems.map((item) => (
        <div
          key={item.id}
          className="rounded-md border border-border bg-background p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h4 className="truncate text-sm font-medium">{item.name}</h4>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {item.kind === "music" ? "Music" : "SFX"}
            </Badge>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1">
              <Badge variant="secondary">{item.licenseName}</Badge>
              {item.bpm ? <Badge variant="secondary">{item.bpm} BPM</Badge> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => previewItem(item)}
                aria-label={`Preview ${item.name}`}
              >
                <Play
                  className={
                    previewingId === item.id
                      ? "h-4 w-4 fill-current"
                      : "h-4 w-4"
                  }
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addItem(item)}
                aria-label={`Add ${item.name}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
