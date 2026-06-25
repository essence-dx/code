"use client";

import { AlertTriangle, CloudUpload, FolderMinus, FolderPlus, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioPreviewButton } from "@/features/editor/components/audio-preview-button";
import { WaveformBars } from "@/features/editor/components/waveform-bars";
import type { MediaAsset, MediaCollection } from "@/lib/editor/types";
import type { MediaHealthAsset } from "@/lib/media/media-health";

type MediaAssetCardProps = {
  asset: MediaAsset;
  assetHealth: MediaHealthAsset | undefined;
  activeCollection: MediaCollection | undefined;
  isFavorite: boolean;
  isInActiveCollection: boolean;
  isImporting: boolean;
  onToggleFavorite: (assetId: string) => void;
  onToggleCollection: (assetId: string) => void;
  onAddLayer: (assetId: string) => void;
  onStartReconnect: (assetId: string) => void;
  onUploadToStorage: (assetId: string) => void;
  onRemove: (assetId: string) => void;
};

export function MediaAssetCard({
  asset,
  assetHealth,
  activeCollection,
  isFavorite,
  isInActiveCollection,
  isImporting,
  onToggleFavorite,
  onToggleCollection,
  onAddLayer,
  onStartReconnect,
  onUploadToStorage,
  onRemove,
}: MediaAssetCardProps) {
  const linkedLayerCount = assetHealth?.linkedLayerCount ?? 0;
  const impactSummary = assetHealth?.impactedLayers.length ? assetHealth.impactedLayers.slice(0, 2).map((layer) => layer.name).join(", ") : null;

  return (
    <div
      className="w-full rounded-md border border-border bg-background p-2 text-left transition hover:border-primary/70"
      onDoubleClick={() => {
        if (asset.objectUrl) onAddLayer(asset.id);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{asset.name}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className={`size-7 shrink-0 ${isFavorite ? "text-primary" : "text-muted-foreground"}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(asset.id);
            }}
            aria-label={`${isFavorite ? "Unfavorite" : "Favorite"} ${asset.name}`}
          >
            <Star className={isFavorite ? "size-4 fill-current" : "size-4"} />
          </Button>
          {asset.objectUrl ? <AudioPreviewButton asset={asset} /> : null}
          {activeCollection ? (
            <Button
              size="icon"
              variant="ghost"
              className={`size-7 shrink-0 ${isInActiveCollection ? "text-primary" : "text-muted-foreground"}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollection(asset.id);
              }}
              aria-label={`${isInActiveCollection ? "Remove from" : "Add to"} ${activeCollection.name}`}
            >
              {isInActiveCollection ? <FolderMinus className="size-4" /> : <FolderPlus className="size-4" />}
            </Button>
          ) : null}
          {asset.objectUrl ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              onClick={(event) => {
                event.stopPropagation();
                onAddLayer(asset.id);
              }}
              aria-label={`Add ${asset.name}`}
            >
              <Plus className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-destructive"
              onClick={() => onStartReconnect(asset.id)}
              disabled={isImporting}
              aria-label={`Reconnect ${asset.name}`}
            >
              <RefreshCw className="size-4" />
            </Button>
          )}
          {asset.objectUrl ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-muted-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onUploadToStorage(asset.id);
              }}
              disabled={isImporting}
              aria-label={`Upload ${asset.name}`}
            >
              <CloudUpload className="size-4" />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(asset.id);
            }}
            disabled={isImporting}
            aria-label={`Remove ${asset.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {!asset.objectUrl ? (
        <div className="mt-2 flex items-start gap-2 rounded-sm border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {assetHealth?.isRecoverable ? "Media can be recovered from local storage." : "Media file needs reconnecting."}
            {impactSummary ? ` Affects ${impactSummary}.` : ""}
          </span>
        </div>
      ) : null}
      {asset.objectUrl && asset.type === "audio" ? <WaveformBars peaks={asset.waveformPeaks} className="mt-2 text-primary" /> : null}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="capitalize">
          {asset.type}
        </Badge>
        {!asset.objectUrl ? <Badge variant="secondary">Missing</Badge> : null}
        {assetHealth?.isRecoverable ? <Badge variant="outline">Recoverable</Badge> : null}
        {assetHealth?.needsReconnect ? <Badge variant="secondary">Reconnect</Badge> : null}
        {isFavorite ? <Badge variant="outline">Favorite</Badge> : null}
        {activeCollection && isInActiveCollection ? <Badge variant="secondary">{activeCollection.name}</Badge> : null}
        {linkedLayerCount > 0 ? (
          <Badge variant="secondary">
            {linkedLayerCount} {linkedLayerCount === 1 ? "layer" : "layers"}
          </Badge>
        ) : null}
        <span>{Math.round(asset.size / 1024)} KB</span>
      </div>
    </div>
  );
}
