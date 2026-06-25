"use client";

import { useState } from "react";
import { Music, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MediaAsset } from "@/lib/editor/types";

interface VideoAudioWorkflowPanelProps {
  audioAssets: MediaAsset[];
  onExtract: () => number;
  onReplace: (assetId: string) => number;
}

export function VideoAudioWorkflowPanel({ audioAssets, onExtract, onReplace }: VideoAudioWorkflowPanelProps) {
  const [selectedAssetId, setSelectedAssetId] = useState(audioAssets[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function extractAudio() {
    const count = onExtract();
    setMessage(count > 0 ? `${count} audio ${count === 1 ? "layer" : "layers"} extracted.` : "Select an editable video layer.");
  }

  function replaceAudio() {
    const count = selectedAssetId ? onReplace(selectedAssetId) : 0;
    setMessage(count > 0 ? `${count} replacement audio ${count === 1 ? "layer" : "layers"} added.` : "Choose an audio asset first.");
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Music className="size-4 text-muted-foreground" />
        Video audio
      </div>
      <Button size="sm" variant="outline" className="w-full justify-start" onClick={extractAudio}>
        <Scissors className="size-4" />
        Extract editable audio layer
      </Button>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Select value={selectedAssetId} onValueChange={setSelectedAssetId} disabled={audioAssets.length === 0}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Choose audio asset" />
          </SelectTrigger>
          <SelectContent>
            {audioAssets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={replaceAudio} disabled={audioAssets.length === 0}>
          Replace
        </Button>
      </div>
      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}
