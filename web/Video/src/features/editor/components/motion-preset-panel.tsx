"use client";

import { MoveDiagonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LayerMotion, LayerMotionPreset } from "@/lib/editor/types";
import { normalizeLayerMotion } from "@/lib/editor/motion";

interface MotionPresetPanelProps {
  motion: LayerMotion | undefined;
  onChange: (motion: LayerMotion) => void;
}

const motionPresets: Array<{ preset: LayerMotionPreset; label: string }> = [
  { preset: "none", label: "None" },
  { preset: "slow-zoom", label: "Zoom" },
  { preset: "pan-left", label: "Pan left" },
  { preset: "pan-right", label: "Pan right" },
  { preset: "settle", label: "Settle" },
];

export function MotionPresetPanel({ motion, onChange }: MotionPresetPanelProps) {
  const normalizedMotion = normalizeLayerMotion(motion);

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MoveDiagonal className="size-4 text-muted-foreground" />
        Motion
      </div>
      <div className="grid grid-cols-3 gap-1">
        {motionPresets.map((item) => (
          <Button
            key={item.preset}
            size="sm"
            variant={normalizedMotion.preset === item.preset ? "secondary" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => onChange({ ...normalizedMotion, preset: item.preset })}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Label>Intensity</Label>
          <span>{normalizedMotion.intensity.toFixed(1)}x</span>
        </div>
        <Slider
          value={[normalizedMotion.intensity]}
          min={0.1}
          max={3}
          step={0.1}
          onValueChange={([intensity]) => onChange({ ...normalizedMotion, intensity: intensity ?? 1 })}
        />
      </div>
    </div>
  );
}
