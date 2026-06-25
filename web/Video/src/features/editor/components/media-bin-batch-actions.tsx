"use client";

import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MediaCollection } from "@/lib/editor/types";

type MediaBinBatchActionsProps = {
  activeCollection: MediaCollection | undefined;
  filteredAssetCount: number;
  unusedAssetCount: number;
  renamePrefix: string;
  isImporting: boolean;
  onRenamePrefixChange: (value: string) => void;
  onAssignFilteredToCollection: () => void;
  onPrefixRenameFiltered: () => void;
  onRemoveUnused: () => void;
};

export function MediaBinBatchActions({
  activeCollection,
  filteredAssetCount,
  unusedAssetCount,
  renamePrefix,
  isImporting,
  onRenamePrefixChange,
  onAssignFilteredToCollection,
  onPrefixRenameFiltered,
  onRemoveUnused,
}: MediaBinBatchActionsProps) {
  const canUseFilteredAssets = filteredAssetCount > 0 && !isImporting;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">Batch</span>
        <span className="text-xs text-muted-foreground">{filteredAssetCount} filtered</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAssignFilteredToCollection}
          disabled={!activeCollection || !canUseFilteredAssets}
        >
          <FolderPlus className="size-4" />
          Collect
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onRemoveUnused} disabled={unusedAssetCount === 0 || isImporting}>
          <Trash2 className="size-4" />
          Unused
        </Button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          value={renamePrefix}
          onChange={(event) => onRenamePrefixChange(event.target.value)}
          placeholder="Prefix filtered"
          disabled={isImporting}
        />
        <Button type="button" size="icon-sm" variant="outline" onClick={onPrefixRenameFiltered} disabled={!canUseFilteredAssets || !renamePrefix.trim()}>
          <Pencil className="size-4" />
          <span className="sr-only">Rename filtered media</span>
        </Button>
      </div>
    </div>
  );
}
