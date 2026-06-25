"use client";

import { FolderPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mediaFilters, type MediaFilter } from "@/features/editor/components/media-filters";
import type { MediaCollection } from "@/lib/editor/types";

type MediaBinCollectionControlsProps = {
  mediaFilter: MediaFilter;
  collectionName: string;
  activeCollectionId: string;
  activeCollection: MediaCollection | undefined;
  mediaCollections: MediaCollection[];
  onMediaFilterChange: (filter: MediaFilter) => void;
  onCollectionNameChange: (name: string) => void;
  onAddCollection: () => void;
  onActiveCollectionChange: (collectionId: string) => void;
  onRemoveActiveCollection: () => void;
};

export function MediaBinCollectionControls({
  mediaFilter,
  collectionName,
  activeCollectionId,
  activeCollection,
  mediaCollections,
  onMediaFilterChange,
  onCollectionNameChange,
  onAddCollection,
  onActiveCollectionChange,
  onRemoveActiveCollection,
}: MediaBinCollectionControlsProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {mediaFilters.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={mediaFilter === filter.value ? "default" : "outline"}
            className="h-7 px-1 text-xs"
            onClick={() => onMediaFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          className="h-8"
          value={collectionName}
          onChange={(event) => onCollectionNameChange(event.target.value)}
          placeholder="New collection"
          onKeyDown={(event) => {
            if (event.key === "Enter") onAddCollection();
          }}
        />
        <Button size="sm" variant="outline" className="h-8" onClick={onAddCollection}>
          <FolderPlus className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Select value={activeCollectionId} onValueChange={onActiveCollectionChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All collections</SelectItem>
            {mediaCollections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name} ({collection.assetIds.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          onClick={onRemoveActiveCollection}
          disabled={!activeCollection}
          aria-label="Remove active collection"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </>
  );
}
