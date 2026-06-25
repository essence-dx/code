"use client";

import type { ChangeEvent, RefObject } from "react";
import { FolderOpen, Link2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MediaBinImportControlsProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  reconnectInputRef: RefObject<HTMLInputElement | null>;
  batchReconnectInputRef: RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  canImportDesktopFiles: boolean;
  favoriteAssetCount: number;
  missingAssetCount: number;
  totalAssetCount: number;
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onReconnectMissingMedia: (event: ChangeEvent<HTMLInputElement>) => void;
  onReconnectMissingMediaBatch: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportDesktopFiles: () => void;
  onOpenSelfHostedImport: () => void;
};

export function MediaBinImportControls({
  inputRef,
  reconnectInputRef,
  batchReconnectInputRef,
  isImporting,
  canImportDesktopFiles,
  favoriteAssetCount,
  missingAssetCount,
  totalAssetCount,
  onFiles,
  onReconnectMissingMedia,
  onReconnectMissingMediaBatch,
  onImportDesktopFiles,
  onOpenSelfHostedImport,
}: MediaBinImportControlsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Media</h2>
        <div className="flex items-center gap-1">
          {favoriteAssetCount > 0 ? (
            <Badge variant="outline">
              {favoriteAssetCount} {favoriteAssetCount === 1 ? "favorite" : "favorites"}
            </Badge>
          ) : null}
          {missingAssetCount > 0 ? <Badge variant="destructive">{missingAssetCount} missing</Badge> : null}
          <Badge variant="secondary">{totalAssetCount}</Badge>
        </div>
      </div>
      <input ref={inputRef} hidden multiple type="file" accept="video/*,image/*,audio/*,.gif" aria-label="Import media files" onChange={onFiles} />
      <input
        ref={reconnectInputRef}
        hidden
        type="file"
        accept="video/*,image/*,audio/*,.gif"
        aria-label="Reconnect selected media file"
        onChange={onReconnectMissingMedia}
      />
      <input
        ref={batchReconnectInputRef}
        hidden
        multiple
        type="file"
        accept="video/*,image/*,audio/*,.gif"
        aria-label="Batch reconnect missing media files"
        onChange={onReconnectMissingMediaBatch}
      />
      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={isImporting} aria-label="Import media files">
          <Upload className="size-4" />
          Import
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onImportDesktopFiles}
          disabled={isImporting || !canImportDesktopFiles}
          aria-label="Import desktop media files"
        >
          <FolderOpen className="size-4" />
          Desktop
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenSelfHostedImport} disabled={isImporting} aria-label="Import media from URL">
          <Link2 className="size-4" />
          URL
        </Button>
      </div>
    </>
  );
}
