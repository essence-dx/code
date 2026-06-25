"use client";

import { Separator } from "@/components/ui/separator";
import { AudioMixPanel } from "@/features/editor/components/audio-mix-panel";
import { FreezeFramePanel } from "@/features/editor/components/freeze-frame-panel";
import { VideoAudioWorkflowPanel } from "@/features/editor/components/video-audio-workflow-panel";
import type { MediaAsset, TimelineLayer } from "@/lib/editor/types";

type InspectorMediaSectionProps = {
  layer: TimelineLayer;
  asset?: MediaAsset;
  audioAssets: MediaAsset[];
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
  onExtractAudio: () => number;
  onReplaceAudio: (assetId: string) => number;
  onCreateFreezeFrames: () => Promise<{ created: number; skipped: number }>;
};

export function InspectorMediaSection({
  layer,
  asset,
  audioAssets,
  onUpdateLayer,
  onExtractAudio,
  onReplaceAudio,
  onCreateFreezeFrames,
}: InspectorMediaSectionProps) {
  const hasAudioControls = layer.kind === "audio" || layer.kind === "video";
  const hasVideoControls = layer.kind === "video";

  if (!hasAudioControls && !hasVideoControls) return null;

  return (
    <>
      <Separator />
      {hasAudioControls ? <AudioMixPanel layer={layer} asset={asset} onChange={(patch) => onUpdateLayer(layer.id, patch)} /> : null}
      {hasVideoControls ? (
        <>
          <VideoAudioWorkflowPanel audioAssets={audioAssets} onExtract={onExtractAudio} onReplace={onReplaceAudio} />
          <FreezeFramePanel onCreate={onCreateFreezeFrames} />
        </>
      ) : null}
    </>
  );
}
