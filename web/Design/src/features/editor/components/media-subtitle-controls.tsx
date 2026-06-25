"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadTextFile } from "@/features/editor/download-text-file";
import {
  createMediaSubtitlesSrt,
  createMediaSubtitlesVtt,
  parseMediaSubtitles,
} from "@/features/editor/media-subtitles";
import type { DesignElement, VideoElement } from "@/features/editor/types";

type MediaSubtitleControlsProps = {
  element: VideoElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

const emptySubtitleCues: VideoElement["subtitleCues"] = [];

export function MediaSubtitleControls({
  element,
  onUpdateElement,
}: MediaSubtitleControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const subtitleCues = element.subtitleCues ?? emptySubtitleCues;
  const cueCount = subtitleCues.length;
  const normalizedSubtitles = useMemo(
    () => createMediaSubtitlesVtt(subtitleCues),
    [subtitleCues],
  );
  const [draft, setDraft] = useState(normalizedSubtitles);

  useEffect(() => {
    setDraft(normalizedSubtitles);
  }, [element.id, normalizedSubtitles]);

  async function importSubtitleFile(file: File | undefined) {
    if (!file) return;

    const cues = parseMediaSubtitles(await file.text());

    onUpdateElement({ subtitleCues: cues } as Partial<DesignElement>);
    setDraft(createMediaSubtitlesVtt(cues));
  }

  function applyDraft() {
    const cues = parseMediaSubtitles(draft);

    onUpdateElement({ subtitleCues: cues } as Partial<DesignElement>);
    setDraft(createMediaSubtitlesVtt(cues));
  }

  function exportVtt() {
    downloadTextFile({
      fileName: `${element.title}-captions.vtt`,
      text: createMediaSubtitlesVtt(subtitleCues),
      type: "text/vtt;charset=utf-8",
    });
  }

  function exportSrt() {
    downloadTextFile({
      fileName: `${element.title}-captions.srt`,
      text: createMediaSubtitlesSrt(subtitleCues),
      type: "text/plain;charset=utf-8",
    });
  }

  return (
    <div className="col-span-2 space-y-2 rounded-md border border-border p-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt,text/vtt,text/plain"
        className="hidden"
        onChange={(event) => {
          void importSubtitleFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Captions</span>
        <Badge variant="outline">{cueCount} cues</Badge>
      </div>
      <Textarea
        value={draft}
        rows={5}
        className="min-h-24 font-mono text-xs"
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={applyDraft}>
          <Check className="h-3.5 w-3.5" />
          Apply
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportVtt}
          disabled={!cueCount}
        >
          <Download className="h-3.5 w-3.5" />
          VTT
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportSrt}
          disabled={!cueCount}
        >
          <Download className="h-3.5 w-3.5" />
          SRT
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => {
          onUpdateElement({ subtitleCues: [] } as Partial<DesignElement>);
          setDraft(createMediaSubtitlesVtt([]));
        }}
        disabled={!cueCount}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear captions
      </Button>
    </div>
  );
}
