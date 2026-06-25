"use client";

import { Crosshair, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, NumberField } from "@/features/editor/components/inspector-fields";
import {
  availableTrackingRegions,
  layerCanAttachToTracking,
  normalizeLayerTrackingAttachment,
  trackingRegionId,
} from "@/lib/editor/tracking";
import type { LayerTrackingAttachment, TimelineLayer } from "@/lib/editor/types";

type TrackingAttachmentPanelProps = {
  layer: TimelineLayer;
  layers: TimelineLayer[];
  onChange: (tracking: LayerTrackingAttachment | undefined) => void;
};

export function TrackingAttachmentPanel({ layer, layers, onChange }: TrackingAttachmentPanelProps) {
  if (!layerCanAttachToTracking(layer)) return null;

  const regions = availableTrackingRegions(layers, layer.id);
  const attachment = normalizeLayerTrackingAttachment(layer.tracking);
  const selectedRegionId = trackingRegionId(attachment);

  function updateAttachment(patch: Partial<LayerTrackingAttachment>) {
    if (!attachment) return;
    onChange(normalizeLayerTrackingAttachment({ ...attachment, ...patch }));
  }

  function chooseRegion(regionId: string) {
    if (regionId === "none") {
      onChange(undefined);
      return;
    }

    const region = regions.find((item) => item.id === regionId);
    if (!region) return;

    onChange({
      enabled: true,
      targetLayerId: region.targetLayerId,
      targetMaskId: region.targetMaskId,
      offsetX: attachment?.offsetX ?? 0,
      offsetY: attachment?.offsetY ?? -0.06,
      scaleWithTarget: attachment?.scaleWithTarget ?? false,
    });
  }

  return (
    <Field label="Tracking attach">
      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Crosshair className="size-4" />
          <span>{attachment ? "Attached" : "Detached"}</span>
        </div>
        <Select value={selectedRegionId} onValueChange={chooseRegion}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Choose tracked region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No attachment</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {attachment ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Offset X %"
                value={Math.round(attachment.offsetX * 100)}
                min={-100}
                max={100}
                step={1}
                onChange={(offsetX) => updateAttachment({ offsetX: offsetX / 100 })}
              />
              <NumberField
                label="Offset Y %"
                value={Math.round(attachment.offsetY * 100)}
                min={-100}
                max={100}
                step={1}
                onChange={(offsetY) => updateAttachment({ offsetY: offsetY / 100 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={attachment.scaleWithTarget ? "secondary" : "outline"}
                onClick={() => updateAttachment({ scaleWithTarget: !attachment.scaleWithTarget })}
              >
                Scale follow
              </Button>
              <Button size="sm" variant="outline" onClick={() => onChange(undefined)}>
                <Link2Off className="size-4" />
                Detach
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Field>
  );
}
