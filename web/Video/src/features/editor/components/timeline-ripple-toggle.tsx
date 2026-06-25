"use client";

import { MoveRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineRippleToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function TimelineRippleToggle({ enabled, onEnabledChange }: TimelineRippleToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden h-8 items-center gap-2 rounded-md border border-input bg-background px-2 text-xs font-medium xl:flex">
            <MoveRight className="size-4 text-muted-foreground" />
            <span>Ripple</span>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-label="Ripple move mode" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Move downstream layers with selected timeline edits</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
