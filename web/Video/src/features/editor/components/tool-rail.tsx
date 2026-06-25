"use client";

import type { ReactNode } from "react";
import { Captions, Circle, FileVideo, Gauge, Timer, Type, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorStore } from "@/features/editor/state/editor-store";

type ToolRailProps = {
  variant?: "rail" | "bottom";
};

export function ToolRail({ variant = "rail" }: ToolRailProps) {
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addSubtitleLayer = useEditorStore((state) => state.addSubtitleLayer);
  const addShapeLayer = useEditorStore((state) => state.addShapeLayer);
  const addProgressLayer = useEditorStore((state) => state.addProgressLayer);
  const addTimerLayer = useEditorStore((state) => state.addTimerLayer);
  const isBottom = variant === "bottom";
  const content = (
    <>
      <RailButton label="Media" tooltipSide={isBottom ? "top" : "right"}>
        <FileVideo className="size-4" />
      </RailButton>
      <RailButton label="Text" tooltipSide={isBottom ? "top" : "right"} onClick={addTextLayer}>
        <Type className="size-4" />
      </RailButton>
      <RailButton label="Captions" tooltipSide={isBottom ? "top" : "right"} onClick={addSubtitleLayer}>
        <Captions className="size-4" />
      </RailButton>
      <RailButton label="Shape" tooltipSide={isBottom ? "top" : "right"} onClick={addShapeLayer}>
        <Circle className="size-4" />
      </RailButton>
      <RailButton label="Progress" tooltipSide={isBottom ? "top" : "right"} onClick={addProgressLayer}>
        <Gauge className="size-4" />
      </RailButton>
      <RailButton label="Timer" tooltipSide={isBottom ? "top" : "right"} onClick={addTimerLayer}>
        <Timer className="size-4" />
      </RailButton>
      <RailButton label="AI" tooltipSide={isBottom ? "top" : "right"}>
        <WandSparkles className="size-4" />
      </RailButton>
    </>
  );

  if (isBottom) {
    return (
      <nav
        className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-hidden rounded-full border border-border bg-background/90 p-1 shadow-xl backdrop-blur"
        aria-label="Create tools"
      >
        {content}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col items-center gap-2 border-r border-border bg-sidebar py-3">
      {content}
    </nav>
  );
}

function RailButton({
  label,
  children,
  tooltipSide = "right",
  onClick,
}: {
  label: string;
  children: ReactNode;
  tooltipSide?: "top" | "right";
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}
