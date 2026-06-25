"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Captions,
  ChevronDown,
  Circle,
  Copy,
  Download,
  Gauge,
  Grid3X3,
  LayoutDashboard,
  Maximize2,
  Redo2,
  RotateCcwSquare,
  Timer,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { aspectPresets } from "@/lib/editor/presets";
import { CloudSyncButton } from "@/features/projects/components/cloud-sync-button";
import { LocalSaveButton } from "@/features/projects/components/local-save-button";
import { ReviewWorkspaceDialog } from "@/features/projects/components/review-workspace-dialog";
import { SnapshotButton } from "@/features/projects/components/snapshot-button";

type ProjectTopbarProps = {
  embedded?: boolean;
};

export function ProjectTopbar({ embedded = false }: ProjectTopbarProps) {
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const setProjectTitle = useEditorStore((state) => state.setProjectTitle);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const addSubtitleLayer = useEditorStore((state) => state.addSubtitleLayer);
  const addShapeLayer = useEditorStore((state) => state.addShapeLayer);
  const addProgressLayer = useEditorStore((state) => state.addProgressLayer);
  const addTimerLayer = useEditorStore((state) => state.addTimerLayer);
  const duplicateSelectedLayers = useEditorStore((state) => state.duplicateSelectedLayers);
  const removeSelectedLayers = useEditorStore((state) => state.removeSelectedLayers);
  const centerSelectedLayers = useEditorStore((state) => state.centerSelectedLayers);
  const fitSelectedLayersToCanvas = useEditorStore((state) => state.fitSelectedLayersToCanvas);
  const toggleSafeZones = useEditorStore((state) => state.toggleSafeZones);
  const showSafeZones = useEditorStore((state) => state.showSafeZones);
  const hasSelection = selectedLayerIds.length > 0;

  return (
    <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        {embedded ? null : (
          <Button asChild size="icon" variant="ghost">
            <Link href="/dashboard" aria-label="Dashboard">
              <LayoutDashboard className="size-4" />
            </Link>
          </Button>
        )}
        <Input
          className="h-8 min-w-28 max-w-[min(32vw,260px)] border-transparent bg-transparent text-sm font-medium shadow-none hover:border-border"
          value={project.title}
          onChange={(event) => setProjectTitle(event.target.value)}
          aria-label="Project title"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1">
        <ProjectMenu label="File">
          <DropdownMenuLabel>Local project</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => focusEditorRegion("media-library")}>
            <Grid3X3 className="size-4" />
            Open media library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => focusEditorRegion("export-workspace")}>
            <Download className="size-4" />
            Open export tray
          </DropdownMenuItem>
          {embedded ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </ProjectMenu>
        <ProjectMenu label="Edit">
          <DropdownMenuItem onSelect={undo} disabled={!canUndo}>
            <Undo2 className="size-4" />
            Undo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={redo} disabled={!canRedo}>
            <Redo2 className="size-4" />
            Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={duplicateSelectedLayers} disabled={!hasSelection}>
            <Copy className="size-4" />
            Duplicate selection
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={removeSelectedLayers} disabled={!hasSelection} variant="destructive">
            <Trash2 className="size-4" />
            Delete selection
          </DropdownMenuItem>
        </ProjectMenu>
        <ProjectMenu label="Insert">
          <DropdownMenuLabel>Create layer</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={addTextLayer}>
              <Type className="size-4" />
              Text
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={addSubtitleLayer}>
              <Captions className="size-4" />
              Captions
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={addShapeLayer}>
              <Circle className="size-4" />
              Shape
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={addProgressLayer}>
              <Gauge className="size-4" />
              Progress
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={addTimerLayer}>
              <Timer className="size-4" />
              Timer
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </ProjectMenu>
        <ProjectMenu label="View">
          <DropdownMenuItem onSelect={toggleSafeZones}>
            <Grid3X3 className="size-4" />
            {showSafeZones ? "Hide safe zones" : "Show safe zones"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => focusEditorRegion("preview-stage")}>
            <Maximize2 className="size-4" />
            Focus stage
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Aspect ratio</DropdownMenuLabel>
          {aspectPresets.map((preset) => (
            <DropdownMenuItem key={preset.id} onSelect={() => setAspectRatio(preset.id)}>
              {preset.label} {preset.id}
            </DropdownMenuItem>
          ))}
        </ProjectMenu>
        <ProjectMenu label="Arrange">
          <DropdownMenuItem onSelect={centerSelectedLayers} disabled={!hasSelection}>
            <Maximize2 className="size-4" />
            Center selection
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fitSelectedLayersToCanvas("contain")} disabled={!hasSelection}>
            <RotateCcwSquare className="size-4" />
            Fit contain
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fitSelectedLayersToCanvas("cover")} disabled={!hasSelection}>
            <RotateCcwSquare className="size-4" />
            Fit cover
          </DropdownMenuItem>
        </ProjectMenu>
        <ProjectMenu label="Export">
          <DropdownMenuItem onSelect={() => focusEditorRegion("export-workspace")}>
            <Download className="size-4" />
            Use export tray
          </DropdownMenuItem>
        </ProjectMenu>
        <Select value={project.aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger className="hidden h-8 w-[132px] xl:inline-flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aspectPresets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label} {preset.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton label="Undo" onClick={undo} disabled={!canUndo} className="hidden md:inline-flex">
          <Undo2 className="size-4" />
        </IconButton>
        <IconButton label="Redo" onClick={redo} disabled={!canRedo} className="hidden md:inline-flex">
          <Redo2 className="size-4" />
        </IconButton>
        {embedded ? null : (
          <>
            <LocalSaveButton project={project} mediaAssets={mediaAssets} />
            <SnapshotButton project={project} mediaAssets={mediaAssets} />
            <ReviewWorkspaceDialog />
            <CloudSyncButton project={project} mediaAssets={mediaAssets} />
          </>
        )}
      </div>
    </header>
  );
}

function ProjectMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
          {label}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
  className,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="outline" className={className} onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function focusEditorRegion(region: "media-library" | "preview-stage" | "export-workspace") {
  const element = document.querySelector<HTMLElement>(`[data-editor-region="${region}"]`);
  element?.focus({ preventScroll: true });
  element?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
