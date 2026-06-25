"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChartColumn,
  Clock3,
  Eye,
  EyeOff,
  FileCode2,
  FileText,
  GitBranch,
  Group as GroupIcon,
  ImageIcon,
  ListChecks,
  Link2,
  Lock,
  Music,
  PenLine,
  QrCode,
  Shapes,
  Sparkles,
  StickyNote,
  Table2,
  Type,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createPanelWindow } from "@/features/editor/panel-list-window";
import type { DesignElement, DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  page: DesignPage;
  selectedElementIds: string[];
  onSelectElement: (elementId: string, additive?: boolean) => void;
  onToggleVisibility: (elementId: string) => void;
  onReorderElement: (
    elementId: string,
    direction: "forward" | "backward",
  ) => void;
};

export function LayersPanel({
  page,
  selectedElementIds,
  onSelectElement,
  onToggleVisibility,
  onReorderElement,
}: LayersPanelProps) {
  const [showAllLayers, setShowAllLayers] = useState(false);
  const selectedElementIdSet = useMemo(
    () => new Set(selectedElementIds),
    [selectedElementIds],
  );
  const orderedElements = useMemo(
    () => [...page.elements].reverse(),
    [page.elements],
  );
  const layerWindow = useMemo(
    () =>
      showAllLayers
        ? {
            items: orderedElements,
            hiddenCount: 0,
            isWindowed: false,
          }
        : createPanelWindow(orderedElements, {
            activeIds: selectedElementIds,
            limit: 80,
          }),
    [orderedElements, selectedElementIds, showAllLayers],
  );

  return (
    <section className="border-t border-border">
      <div className="p-4">
        <h2 className="text-sm font-semibold">Layers</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Top layers render last.
        </p>
      </div>
      <Separator />
      <ScrollArea className="max-h-72">
        <div className="flex flex-col gap-2 p-2">
          {layerWindow.items.map((element) => (
            <div
              key={element.id}
              className={cn(
                "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border border-border p-2",
                selectedElementIdSet.has(element.id) && "bg-secondary",
              )}
            >
              <Button
                variant="ghost"
                className="h-8 min-w-0 justify-start gap-2 px-2"
                onClick={(event) =>
                  onSelectElement(
                    element.id,
                    event.shiftKey || event.ctrlKey || event.metaKey,
                  )
                }
              >
                <LayerIcon element={element} />
                <span
                  className={cn(
                    "truncate text-xs",
                    element.hidden && "text-muted-foreground line-through",
                  )}
                >
                  {layerName(element)}
                </span>
              </Button>
              <div className="grid shrink-0 grid-cols-3 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggleVisibility(element.id)}
                  aria-label={element.hidden ? "Show layer" : "Hide layer"}
                >
                  {element.hidden ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onReorderElement(element.id, "forward")}
                  aria-label="Move layer forward"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onReorderElement(element.id, "backward")}
                  aria-label="Move layer backward"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {layerWindow.isWindowed || showAllLayers ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAllLayers((current) => !current)}
            >
              {showAllLayers
                ? "Collapse layers"
                : `Show ${layerWindow.hiddenCount} more layers`}
            </Button>
          ) : null}
          {page.elements.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No layers yet.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}

function LayerIcon({ element }: { element: DesignElement }) {
  if (element.locked) return <Lock className="h-3.5 w-3.5" />;
  if (element.groupId) return <GroupIcon className="h-3.5 w-3.5" />;
  if (element.type === "text") return <Type className="h-3.5 w-3.5" />;
  if (element.type === "document") return <FileText className="h-3.5 w-3.5" />;
  if (element.type === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  if (element.type === "draw") return <PenLine className="h-3.5 w-3.5" />;
  if (element.type === "path") return <PenLine className="h-3.5 w-3.5" />;
  if (element.type === "video") return <Video className="h-3.5 w-3.5" />;
  if (element.type === "audio") return <Music className="h-3.5 w-3.5" />;
  if (element.type === "pdf") return <FileText className="h-3.5 w-3.5" />;
  if (element.type === "svg") return <FileCode2 className="h-3.5 w-3.5" />;
  if (element.type === "lottie") return <Sparkles className="h-3.5 w-3.5" />;
  if (element.type === "sticky-note") {
    return <StickyNote className="h-3.5 w-3.5" />;
  }
  if (element.type === "connector") {
    return <GitBranch className="h-3.5 w-3.5" />;
  }
  if (element.type === "qr") return <QrCode className="h-3.5 w-3.5" />;
  if (element.type === "table") return <Table2 className="h-3.5 w-3.5" />;
  if (element.type === "chart") return <ChartColumn className="h-3.5 w-3.5" />;
  if (element.type === "form") return <ListChecks className="h-3.5 w-3.5" />;
  if (element.type === "embed") return <Link2 className="h-3.5 w-3.5" />;
  if (element.type === "timer") return <Clock3 className="h-3.5 w-3.5" />;
  return <Shapes className="h-3.5 w-3.5" />;
}

function layerName(element: DesignElement) {
  if (element.type === "text") return element.content || "Text";
  if (element.type === "document") return element.title || "Document";
  if (element.type === "image") return element.alt || "Image";
  if (element.type === "draw") return element.name || "Draw stroke";
  if (element.type === "path") return element.name || "Bezier path";
  if (element.type === "video") return element.title || "Video";
  if (element.type === "audio") return element.title || "Audio";
  if (element.type === "pdf") return element.title || "PDF";
  if (element.type === "svg") return element.name || "SVG";
  if (element.type === "lottie") return element.name || "Lottie";
  if (element.type === "sticky-note") return element.content || "Sticky note";
  if (element.type === "connector") return element.label || "Connector";
  if (element.type === "qr") return "QR code";
  if (element.type === "table") return "Table";
  if (element.type === "chart") return "Chart";
  if (element.type === "form") return element.label || element.value || "Form";
  if (element.type === "embed") return element.title || "Embed";
  if (element.type === "timer") return element.label || "Timer";
  return element.shape;
}
