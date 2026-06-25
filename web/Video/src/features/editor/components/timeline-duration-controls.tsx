"use client";

import { AlignHorizontalSpaceBetween, StretchHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TimelineDurationDistributionMode } from "@/lib/editor/types";

interface TimelineDurationControlsProps {
  disabled: boolean;
  onDistribute: (mode: TimelineDurationDistributionMode) => void;
}

const durationActions: Array<{ mode: TimelineDurationDistributionMode; label: string; Icon: LucideIcon }> = [
  { mode: "equal", label: "Make selected layer durations equal", Icon: StretchHorizontal },
  { mode: "fill-selection", label: "Fill selection span with selected layers", Icon: AlignHorizontalSpaceBetween },
];

export function TimelineDurationControls({ disabled, onDistribute }: TimelineDurationControlsProps) {
  return (
    <TooltipProvider>
      <ButtonGroup className="hidden 2xl:flex">
        {durationActions.map(({ mode, label, Icon }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={disabled}
                onClick={() => onDistribute(mode)}
                aria-label={label}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </ButtonGroup>
    </TooltipProvider>
  );
}
