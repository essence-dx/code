"use client";

import { FilePlus2, Merge, Replace, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SubtitleCue } from "@/lib/editor/types";
import { formatTime } from "@/lib/editor/factory";

interface CaptionImportPreviewProps {
  filename: string;
  cues: SubtitleCue[];
  onReplace: () => void;
  onMerge: () => void;
  onNewLayer: () => void;
  onCancel: () => void;
}

export function CaptionImportPreview({ filename, cues, onReplace, onMerge, onNewLayer, onCancel }: CaptionImportPreviewProps) {
  const firstCue = cues[0];
  const lastCue = cues.at(-1);

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">{filename}</div>
          <div className="text-[11px] text-muted-foreground">
            {firstCue && lastCue ? `${formatTime(firstCue.start)} - ${formatTime(lastCue.end)}` : "No timing"}
          </div>
        </div>
        <Badge variant="secondary">{cues.length}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-8 justify-start px-2 text-xs" onClick={onReplace}>
          <Replace className="size-3.5" />
          Replace
        </Button>
        <Button size="sm" variant="outline" className="h-8 justify-start px-2 text-xs" onClick={onMerge}>
          <Merge className="size-3.5" />
          Merge
        </Button>
        <Button size="sm" variant="outline" className="h-8 justify-start px-2 text-xs" onClick={onNewLayer}>
          <FilePlus2 className="size-3.5" />
          New layer
        </Button>
        <Button size="sm" variant="ghost" className="h-8 justify-start px-2 text-xs" onClick={onCancel}>
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
