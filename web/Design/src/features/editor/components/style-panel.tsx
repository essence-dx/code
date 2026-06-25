"use client";

import { Paintbrush } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  stylePresets,
  type StylePreset,
} from "@/features/editor/style-presets";

type StylePanelProps = {
  onApplyStyle: (preset: StylePreset) => void;
};

export function StylePanel({ onApplyStyle }: StylePanelProps) {
  return (
    <div className="space-y-1.5">
      {stylePresets.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          variant="outline"
          className="h-8 w-full justify-start gap-2 px-2 text-left"
          onClick={() => onApplyStyle(preset)}
        >
          <span
            className="grid h-4 w-9 shrink-0 grid-cols-4 overflow-hidden rounded-sm border border-border"
            aria-hidden="true"
          >
            <span style={{ background: preset.background }} />
            <span style={{ background: preset.primary }} />
            <span style={{ background: preset.secondary }} />
            <span style={{ background: preset.accent }} />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-xs font-medium">
            <Paintbrush className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{preset.name}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}
