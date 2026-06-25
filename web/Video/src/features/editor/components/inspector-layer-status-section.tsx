"use client";

import { EyeOff, Group, Lock, Ungroup, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/features/editor/components/inspector-fields";
import type { TimelineLayer } from "@/lib/editor/types";

type InspectorLayerStatusSectionProps = {
  layer: TimelineLayer;
  selectedLayers: TimelineLayer[];
  selectedHasGroup: boolean;
  onSetSelectedLayersHidden: (hidden: boolean) => number;
  onSetSelectedLayersLocked: (locked: boolean) => number;
  onGroupSelectedLayers: () => { grouped: boolean; layerCount: number };
  onUngroupSelectedLayers: () => number;
  onSelectLayerGroup: (groupId: string) => void;
  onMoveLayerTrack: (layerId: string, direction: -1 | 1) => void;
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
};

export function InspectorLayerStatusSection({
  layer,
  selectedLayers,
  selectedHasGroup,
  onSetSelectedLayersHidden,
  onSetSelectedLayersLocked,
  onGroupSelectedLayers,
  onUngroupSelectedLayers,
  onSelectLayerGroup,
  onMoveLayerTrack,
  onUpdateLayer,
}: InspectorLayerStatusSectionProps) {
  return (
    <>
      <div className="grid gap-3">
        <Toggle label="Locked" icon={<Lock className="size-4" />} checked={layer.locked} onChange={onSetSelectedLayersLocked} />
        <Toggle label="Hidden" icon={<EyeOff className="size-4" />} checked={layer.hidden} onChange={onSetSelectedLayersHidden} />
        <Toggle label="Muted" icon={<VolumeX className="size-4" />} checked={layer.muted} onChange={(muted) => onUpdateLayer(layer.id, { muted })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={onGroupSelectedLayers} disabled={selectedLayers.length < 2}>
          <Group className="size-4" />
          Group
        </Button>
        <Button variant="outline" onClick={() => layer.groupId && onSelectLayerGroup(layer.groupId)} disabled={!layer.groupId}>
          Select group
        </Button>
        <Button variant="outline" onClick={onUngroupSelectedLayers} disabled={!selectedHasGroup}>
          <Ungroup className="size-4" />
          Ungroup
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onMoveLayerTrack(layer.id, -1)}>
          Track up
        </Button>
        <Button variant="outline" onClick={() => onMoveLayerTrack(layer.id, 1)}>
          Track down
        </Button>
      </div>
    </>
  );
}
