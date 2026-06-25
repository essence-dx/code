"use client";

import { Blend } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LayerTransition, LayerTransitionPreset } from "@/lib/editor/types";
import { normalizeLayerTransition } from "@/lib/editor/transitions";

interface TransitionPanelProps {
  transition: LayerTransition | undefined;
  duration: number;
  onChange: (transition: LayerTransition) => void;
}

const transitionOptions: Array<{ value: LayerTransitionPreset; label: string }> = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "crossfade", label: "Crossfade" },
  { value: "push", label: "Push" },
  { value: "zoom", label: "Zoom" },
  { value: "pop", label: "Pop" },
  { value: "wipe-left", label: "Wipe L" },
  { value: "wipe-up", label: "Wipe Up" },
];

export function TransitionPanel({ transition, duration, onChange }: TransitionPanelProps) {
  const normalizedTransition = normalizeLayerTransition(transition, duration);

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Blend className="size-4 text-muted-foreground" />
        Transitions
      </div>
      <TransitionOptionGroup
        label="In"
        value={normalizedTransition.in}
        onChange={(value) => onChange({ ...normalizedTransition, in: value })}
      />
      <TransitionOptionGroup
        label="Out"
        value={normalizedTransition.out}
        onChange={(value) => onChange({ ...normalizedTransition, out: value })}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Label>Duration</Label>
          <span>{normalizedTransition.duration.toFixed(1)}s</span>
        </div>
        <Slider
          value={[normalizedTransition.duration]}
          min={0}
          max={Math.min(3, Math.max(0.1, duration / 2))}
          step={0.1}
          onValueChange={([nextDuration]) => onChange({ ...normalizedTransition, duration: nextDuration ?? 0.5 })}
        />
      </div>
    </div>
  );
}

function TransitionOptionGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LayerTransitionPreset;
  onChange: (value: LayerTransitionPreset) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-1">
        {transitionOptions.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={value === option.value ? "secondary" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
