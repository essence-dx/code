"use client";

import type { ReactNode } from "react";
import { Gauge, RotateCcw, SlidersHorizontal, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TimelineLayer } from "@/lib/editor/types";
import { MAX_PLAYBACK_RATE, MIN_PLAYBACK_RATE, normalizeLayerSpeed } from "@/lib/editor/speed";
import { TIMELINE_MIN_LAYER_SECONDS } from "@/lib/editor/timeline";
import { NumberField } from "@/features/editor/components/inspector-fields";

type SelectionBounds = {
  start: number;
  end: number;
  duration: number;
};

type InspectorTimingSectionProps = {
  layer: TimelineLayer;
  selectedLayers: TimelineLayer[];
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
  onUpdateSelectionBounds: (patch: Partial<SelectionBounds>) => number;
};

export function InspectorTimingSection({
  layer,
  selectedLayers,
  onUpdateLayer,
  onUpdateSelectionBounds,
}: InspectorTimingSectionProps) {
  const selectionBounds = getSelectionBounds(selectedLayers.filter((item) => !item.locked));

  return (
    <>
      {selectedLayers.length > 1 && selectionBounds ? (
        <SelectionTimingEditor bounds={selectionBounds} onChange={onUpdateSelectionBounds} />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Start" value={layer.start} min={0} onChange={(start) => onUpdateLayer(layer.id, { start })} />
        <NumberField
          label="Duration"
          value={layer.duration}
          min={TIMELINE_MIN_LAYER_SECONDS}
          onChange={(duration) => onUpdateLayer(layer.id, { duration })}
        />
        <NumberField label="Trim" value={layer.trimStart} min={0} onChange={(trimStart) => onUpdateLayer(layer.id, { trimStart })} />
        <NumberField
          label="Speed"
          value={layer.playbackRate}
          min={MIN_PLAYBACK_RATE}
          max={MAX_PLAYBACK_RATE}
          onChange={(playbackRate) =>
            onUpdateLayer(layer.id, {
              playbackRate,
              speed: normalizeLayerSpeed(layer.speed, playbackRate),
            })
          }
        />
      </div>
      {isSpeedEditableLayer(layer) ? <MediaSpeedEditor layer={layer} onUpdateLayer={onUpdateLayer} /> : null}
    </>
  );
}

function MediaSpeedEditor({
  layer,
  onUpdateLayer,
}: {
  layer: TimelineLayer;
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
}) {
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
  const presets = [0.25, 0.5, 1, 1.5, 2, 4];

  function updateSpeed(patch: Partial<typeof speed>) {
    onUpdateLayer(layer.id, {
      speed: normalizeLayerSpeed({ ...speed, ...patch }, layer.playbackRate),
    });
  }

  function updateRamp(patch: Partial<typeof speed.ramp>) {
    updateSpeed({ ramp: { ...speed.ramp, ...patch } });
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Gauge className="size-4 text-muted-foreground" />
        Media speed
      </div>
      <div className="grid grid-cols-3 gap-1">
        {presets.map((rate) => (
          <Button
            key={rate}
            type="button"
            size="sm"
            variant={layer.playbackRate === rate ? "secondary" : "outline"}
            onClick={() =>
              onUpdateLayer(layer.id, {
                playbackRate: rate,
                speed: normalizeLayerSpeed(
                  {
                    ...speed,
                    ramp: {
                      ...speed.ramp,
                      startRate: rate,
                      endRate: rate,
                    },
                  },
                  rate,
                ),
              })
            }
          >
            {rate}x
          </Button>
        ))}
      </div>
      <SpeedSwitch
        icon={<RotateCcw className="size-4 text-muted-foreground" />}
        label="Reverse"
        checked={speed.reversed}
        onChange={(reversed) => updateSpeed({ reversed })}
      />
      <SpeedSwitch
        icon={<Waves className="size-4 text-muted-foreground" />}
        label="Preserve pitch"
        checked={speed.preservePitch}
        onChange={(preservePitch) => updateSpeed({ preservePitch })}
      />
      <SpeedSwitch
        icon={<SlidersHorizontal className="size-4 text-muted-foreground" />}
        label="Speed ramp"
        checked={speed.ramp.enabled}
        onChange={(enabled) => updateRamp({ enabled })}
      />
      {speed.ramp.enabled ? (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Ramp start"
            value={speed.ramp.startRate}
            min={MIN_PLAYBACK_RATE}
            max={MAX_PLAYBACK_RATE}
            onChange={(startRate) => updateRamp({ startRate })}
          />
          <NumberField
            label="Ramp end"
            value={speed.ramp.endRate}
            min={MIN_PLAYBACK_RATE}
            max={MAX_PLAYBACK_RATE}
            onChange={(endRate) => updateRamp({ endRate })}
          />
        </div>
      ) : null}
    </div>
  );
}

function SpeedSwitch({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2">
      <Label className="flex items-center gap-2 text-sm">
        {icon}
        {label}
      </Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function isSpeedEditableLayer(layer: TimelineLayer) {
  return layer.kind === "video" || layer.kind === "audio";
}

function SelectionTimingEditor({
  bounds,
  onChange,
}: {
  bounds: SelectionBounds;
  onChange: (patch: Partial<SelectionBounds>) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-md border border-border p-2">
      <NumberField label="Selection start" value={roundInspectorNumber(bounds.start)} min={0} onChange={(start) => onChange({ start })} />
      <NumberField
        label="Selection end"
        value={roundInspectorNumber(bounds.end)}
        min={TIMELINE_MIN_LAYER_SECONDS}
        onChange={(end) => onChange({ end })}
      />
      <NumberField
        label="Selection duration"
        value={roundInspectorNumber(bounds.duration)}
        min={TIMELINE_MIN_LAYER_SECONDS}
        onChange={(duration) => onChange({ duration })}
      />
    </div>
  );
}

function getSelectionBounds(layers: TimelineLayer[]) {
  if (layers.length === 0) return null;

  const start = Math.min(...layers.map((layer) => layer.start));
  const end = Math.max(...layers.map((layer) => layer.start + layer.duration));
  return { start, end, duration: Math.max(TIMELINE_MIN_LAYER_SECONDS, end - start) };
}

function roundInspectorNumber(value: number) {
  return Math.round(value * 100) / 100;
}
