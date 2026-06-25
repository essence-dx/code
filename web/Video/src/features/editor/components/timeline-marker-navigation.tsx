"use client";

import { SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineMarkerNavigationProps {
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function TimelineMarkerNavigation({ disabled, onPrevious, onNext }: TimelineMarkerNavigationProps) {
  return (
    <TooltipProvider>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={disabled} onClick={onPrevious} aria-label="Go to previous marker">
              <SkipBack className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to previous marker</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={disabled} onClick={onNext} aria-label="Go to next marker">
              <SkipForward className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go to next marker</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </TooltipProvider>
  );
}
