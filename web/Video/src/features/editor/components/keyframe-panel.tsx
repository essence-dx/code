"use client";

import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, NumberField } from "@/features/editor/components/inspector-fields";
import { createLayerKeyframeSnapshot, normalizeLayerKeyframes } from "@/lib/editor/keyframes";
import type { LayerKeyframe, LayerKeyframeEasing, TimelineLayer } from "@/lib/editor/types";

const easingOptions: Array<{ value: LayerKeyframeEasing; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "In" },
  { value: "ease-out", label: "Out" },
  { value: "ease-in-out", label: "In out" },
];

type KeyframePanelProps = {
  layer: TimelineLayer;
  currentTime: number;
  onChange: (keyframes: LayerKeyframe[]) => void;
};

export function KeyframePanel({ layer, currentTime, onChange }: KeyframePanelProps) {
  const keyframes = normalizeLayerKeyframes(layer.keyframes, layer.duration);
  const localTime = clamp(currentTime - layer.start, 0, layer.duration);

  function addKeyframe(time = localTime) {
    const snapshot = createLayerKeyframeSnapshot(layer, time);
    const nextKeyframes = keyframes.filter((keyframe) => Math.abs(keyframe.time - snapshot.time) > 0.05);
    onChange(normalizeLayerKeyframes([...nextKeyframes, snapshot], layer.duration));
  }

  function captureKeyframe(keyframeId: string) {
    const current = keyframes.find((keyframe) => keyframe.id === keyframeId);
    if (!current) return;
    const snapshot = createLayerKeyframeSnapshot(layer, current.time);
    onChange(keyframes.map((keyframe) => (keyframe.id === keyframeId ? { ...snapshot, id: keyframe.id, easing: keyframe.easing } : keyframe)));
  }

  function updateKeyframe(keyframeId: string, patch: Partial<Pick<LayerKeyframe, "time" | "easing">>) {
    onChange(normalizeLayerKeyframes(keyframes.map((keyframe) => (keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe)), layer.duration));
  }

  function removeKeyframe(keyframeId: string) {
    onChange(keyframes.filter((keyframe) => keyframe.id !== keyframeId));
  }

  return (
    <Field label="Keyframes">
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => addKeyframe(0)}>
            Start
          </Button>
          <Button variant="outline" onClick={() => addKeyframe()}>
            <Plus className="size-4" />
            Current
          </Button>
          <Button variant="outline" onClick={() => addKeyframe(layer.duration)}>
            End
          </Button>
        </div>
        {keyframes.length ? (
          <div className="space-y-2">
            {keyframes.map((keyframe) => (
              <div key={keyframe.id} className="rounded-md border border-border p-2">
                <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
                  <NumberField
                    label="Time"
                    value={Number(keyframe.time.toFixed(2))}
                    min={0}
                    max={layer.duration}
                    step={0.05}
                    onChange={(time) => updateKeyframe(keyframe.id, { time })}
                  />
                  <Button size="icon" variant="outline" title="Capture current values" onClick={() => captureKeyframe(keyframe.id)}>
                    <RefreshCcw className="size-4" />
                  </Button>
                  <Button size="icon" variant="outline" title="Remove keyframe" onClick={() => removeKeyframe(keyframe.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {easingOptions.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={keyframe.easing === option.value ? "secondary" : "outline"}
                      onClick={() => updateKeyframe(keyframe.id, { easing: option.value })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  );
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}
