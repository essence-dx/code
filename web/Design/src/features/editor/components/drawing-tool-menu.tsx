"use client";

import { Eraser, Highlighter, MousePointer2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { drawToolLabels } from "@/features/editor/draw-strokes";
import type { DrawTool } from "@/features/editor/types";

const drawToolIcons = {
  pen: PenLine,
  highlighter: Highlighter,
  eraser: Eraser,
} satisfies Record<DrawTool, typeof PenLine>;

const drawTools = ["pen", "highlighter", "eraser"] satisfies DrawTool[];

export function DrawingToolMenu({
  activeTool,
  onActiveToolChange,
}: {
  activeTool: DrawTool | null;
  onActiveToolChange: (tool: DrawTool | null) => void;
}) {
  const ActiveIcon = activeTool ? drawToolIcons[activeTool] : PenLine;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={activeTool ? "secondary" : "outline"}
          aria-label={activeTool ? `${drawToolLabels[activeTool]} active` : "Draw tools"}
        >
          <ActiveIcon className="h-4 w-4" />
          {activeTool ? drawToolLabels[activeTool] : "Draw"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>Drawing tools</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onActiveToolChange(null)}>
          <MousePointer2 className="h-4 w-4" />
          Select layers
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {drawTools.map((tool) => {
          const Icon = drawToolIcons[tool];

          return (
            <DropdownMenuItem
              key={tool}
              onClick={() => onActiveToolChange(tool)}
            >
              <Icon className="h-4 w-4" />
              {drawToolLabels[tool]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
