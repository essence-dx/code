"use client";

import { Check, Sparkles, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  videoEnhancementModes,
  videoEnhancementStrength,
  type VideoEnhancementMode,
} from "@/lib/ai/video-enhancement-contract";

interface AiVideoEnhancementControlsProps {
  targetName?: string;
  mode: VideoEnhancementMode;
  strength: number;
  serviceConfigured: boolean;
  serviceStatusLabel?: string;
  onModeChange: (mode: VideoEnhancementMode) => void;
  onStrengthChange: (strength: number) => void;
}

const enhancementLabels: Record<VideoEnhancementMode, { label: string; description: string }> = {
  stabilization: {
    label: "Stabilization",
    description: "Reduce camera shake through a connected video service.",
  },
  "eye-contact": {
    label: "Eye contact",
    description: "Correct gaze only when a consent-safe service is connected.",
  },
  "lip-sync": {
    label: "Lip-sync",
    description: "Align mouth motion to supplied guidance or audio service output.",
  },
};

export function AiVideoEnhancementControls({
  targetName,
  mode,
  strength,
  serviceConfigured,
  serviceStatusLabel,
  onModeChange,
  onStrengthChange,
}: AiVideoEnhancementControlsProps) {
  const strengthPercent = Math.round(strength * 100);

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Video className="size-4 text-muted-foreground" />
            Video enhancement
          </div>
          <div className="truncate text-xs text-muted-foreground">{targetName ?? "Choose a video layer"}</div>
        </div>
        <Badge variant={serviceConfigured ? "secondary" : "outline"} className="shrink-0">
          {serviceConfigured ? "Ready" : "Connect"}
        </Badge>
      </div>
      <div className="rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">
        {serviceStatusLabel ?? "Connect your own video enhancement service to enable these tools."}
      </div>
      <div className="grid gap-1">
        {videoEnhancementModes.map((option) => {
          const details = enhancementLabels[option];
          const isSelected = option === mode;

          return (
            <Button
              key={option}
              type="button"
              variant={isSelected ? "secondary" : "ghost"}
              className="h-auto justify-start gap-2 px-2 py-2 text-left"
              disabled={!serviceConfigured}
              onClick={() => onModeChange(option)}
            >
              {isSelected ? <Check className="size-3.5 shrink-0" /> : <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="min-w-0">
                <span className="block text-xs font-medium">{details.label}</span>
                <span className="block text-[11px] font-normal leading-4 text-muted-foreground">{details.description}</span>
              </span>
            </Button>
          );
        })}
      </div>
      <div className="space-y-2 rounded-md border border-border bg-background p-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">Strength</span>
          <span className="font-mono text-muted-foreground">{strengthPercent}%</span>
        </div>
        <Slider
          min={videoEnhancementStrength.min * 100}
          max={videoEnhancementStrength.max * 100}
          step={videoEnhancementStrength.step * 100}
          value={[strengthPercent]}
          disabled={!serviceConfigured}
          onValueChange={(value) => onStrengthChange((value[0] ?? videoEnhancementStrength.defaultValue * 100) / 100)}
          aria-label="Video enhancement strength"
        />
      </div>
    </div>
  );
}
