"use client";

import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimelineLayer } from "@/lib/editor/types";

type InspectorLayerHeaderProps = {
  layer: TimelineLayer;
  selectedLayers: TimelineLayer[];
  editableSelectionCount: number;
  hasHiddenLayers: boolean;
  onIsolateSelectedLayers: () => void;
  onShowAllLayers: () => void;
  onDuplicateSelectedLayers: () => void;
  onRemoveSelectedLayers: () => void;
};

export function InspectorLayerHeader({
  layer,
  selectedLayers,
  editableSelectionCount,
  hasHiddenLayers,
  onIsolateSelectedLayers,
  onShowAllLayers,
  onDuplicateSelectedLayers,
  onRemoveSelectedLayers,
}: InspectorLayerHeaderProps) {
  const subtitle =
    selectedLayers.length > 1 ? `${selectedLayers.length} layers selected` : layer.groupId ? `${layer.kind} - grouped` : layer.kind;

  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-medium">Inspector</h2>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onIsolateSelectedLayers}
          disabled={!selectedLayers.length}
          aria-label="Isolate selected layers"
        >
          <EyeOff className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onShowAllLayers} disabled={!hasHiddenLayers} aria-label="Show all layers">
          <Eye className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDuplicateSelectedLayers}
          disabled={!editableSelectionCount}
          aria-label="Duplicate"
        >
          <Copy className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemoveSelectedLayers}
          disabled={!editableSelectionCount}
          aria-label="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
