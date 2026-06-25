"use client";

import {
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TimelineAlignmentMode } from "@/lib/editor/types";

interface TimelineAlignmentControlsProps {
  disabled: boolean;
  onAlign: (mode: TimelineAlignmentMode) => void;
}

const alignmentActions: Array<{ mode: TimelineAlignmentMode; label: string; Icon: LucideIcon }> = [
  { mode: "start", label: "Align selected layers to start", Icon: AlignStartHorizontal },
  { mode: "center", label: "Align selected layers to center", Icon: AlignCenterHorizontal },
  { mode: "end", label: "Align selected layers to end", Icon: AlignEndHorizontal },
  { mode: "playhead", label: "Align selected layers to playhead", Icon: Target },
];

export function TimelineAlignmentControls({ disabled, onAlign }: TimelineAlignmentControlsProps) {
  return (
    <TooltipProvider>
      <ButtonGroup className="hidden xl:flex">
        {alignmentActions.map(({ mode, label, Icon }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={disabled}
                onClick={() => onAlign(mode)}
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
