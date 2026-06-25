"use client";

import { FileText, Music, Video } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  isAcceptedAudioMimeType,
  isAcceptedDocumentMimeType,
  isAcceptedVideoMimeType,
} from "@/features/assets/asset-constraints";
import type { UserAssetSummary } from "@/features/assets/types";

type AssetUploadsPanelProps = {
  assets: UserAssetSummary[];
  onAddAsset: (asset: UserAssetSummary) => void;
};

export function AssetUploadsPanel({
  assets,
  onAddAsset,
}: AssetUploadsPanelProps) {
  return (
    <section className="min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Uploads
            </h3>
            <span className="text-xs text-muted-foreground">
              {assets.length}
            </span>
          </div>
          {assets.length ? (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="group aspect-square overflow-hidden rounded-md border border-border bg-muted text-left transition hover:border-foreground"
                  onClick={() => onAddAsset(asset)}
                  title={asset.name}
                >
                  <AssetThumbnail asset={asset} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Uploaded images, SVGs, videos, and audio you save here will be
              reusable.
            </p>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

function AssetThumbnail({ asset }: { asset: UserAssetSummary }) {
  if (isAcceptedVideoMimeType(asset.mimeType)) {
    return (
      <div className="relative h-full w-full">
        <video
          src={asset.dataUrl}
          className="h-full w-full object-cover"
          muted
          preload="metadata"
        />
        <div className="absolute bottom-1 left-1 rounded bg-background/90 p-1">
          <Video className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  if (isAcceptedAudioMimeType(asset.mimeType)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-background p-2 text-center text-xs">
        <Music className="h-5 w-5 text-muted-foreground" />
        <span className="line-clamp-2 break-all">{asset.name}</span>
      </div>
    );
  }

  if (isAcceptedDocumentMimeType(asset.mimeType)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-background p-2 text-center text-xs">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="line-clamp-2 break-all">{asset.name}</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <img
        src={asset.dataUrl}
        alt={asset.name}
        className="h-full w-full object-cover"
        draggable={false}
      />
      {asset.sourceProvider ? (
        <div className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
          {asset.licenseName || asset.sourceProvider}
        </div>
      ) : null}
    </div>
  );
}
