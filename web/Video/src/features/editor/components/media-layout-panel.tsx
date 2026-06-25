"use client";

import { useState } from "react";
import { Check, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { findImageToolPreset, imageToolPresets } from "@/lib/editor/image-tool-presets";
import type { MediaLayoutMode } from "@/lib/editor/media-layouts";
import { exportPresets } from "@/lib/editor/presets";

const modeLabels: Record<MediaLayoutMode, string> = {
  collage: "Collage",
  "split-screen": "Split screen",
  slideshow: "Slideshow",
  montage: "Montage",
};

export function MediaLayoutPanel() {
  const [imageToolId, setImageToolId] = useState(imageToolPresets[0]?.id ?? "");
  const [mode, setMode] = useState<MediaLayoutMode>("collage");
  const [clipSeconds, setClipSeconds] = useState("4");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const addMediaLayout = useEditorStore((state) => state.addMediaLayout);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const selectedImageTool = findImageToolPreset(imageToolId);
  const selectedExportPreset = exportPresets.find((preset) => preset.id === selectedImageTool.exportPresetId);
  const layoutAssets = mediaAssets.filter((asset) => asset.type === "image" || asset.type === "video");
  const effectiveAssets = selectedIds.length
    ? layoutAssets.filter((asset) => selectedIds.includes(asset.id))
    : layoutAssets.slice(0, Math.min(selectedImageTool.assetLimit, limitForMode(mode)));

  function applyImageTool(toolId: string) {
    const tool = findImageToolPreset(toolId);
    setImageToolId(tool.id);
    setMode(tool.mode);
    setClipSeconds(tool.clipSeconds.toString());
    setSelectedIds((current) =>
      current.filter((assetId) => mediaAssets.some((asset) => asset.id === assetId && (asset.type === "image" || asset.type === "video"))),
    );
    setAspectRatio(tool.aspectRatio);
  }

  function toggleAsset(assetId: string) {
    setSelectedIds((current) => (current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]));
  }

  function createLayout() {
    setAspectRatio(selectedImageTool.aspectRatio);
    addMediaLayout({
      assetIds: effectiveAssets.slice(0, selectedImageTool.assetLimit).map((asset) => asset.id),
      mode,
      clipSeconds: readSeconds(clipSeconds),
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Image tools</Label>
        <div className="grid grid-cols-2 gap-2">
          {imageToolPresets.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`rounded-md border p-2 text-left text-xs transition ${
                selectedImageTool.id === tool.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
              }`}
              onClick={() => applyImageTool(tool.id)}
            >
              <span className="font-medium">{tool.label}</span>
              <span className="mt-1 block text-muted-foreground">{tool.bestFor}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
        {selectedImageTool.aspectRatio} / {selectedExportPreset?.label ?? selectedImageTool.exportPresetId}
      </div>
      <div className="grid grid-cols-[1fr_82px] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Layout</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as MediaLayoutMode)}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(modeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Seconds</Label>
          <Input type="number" min={1} max={30} value={clipSeconds} onChange={(event) => setClipSeconds(event.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Media</Label>
          <Badge variant="outline">{effectiveAssets.length}</Badge>
        </div>
        {layoutAssets.length ? (
          <div className="space-y-1">
            {layoutAssets.slice(0, 12).map((asset) => {
              const selected = selectedIds.includes(asset.id) || (!selectedIds.length && effectiveAssets.some((item) => item.id === asset.id));
              return (
                <button
                  key={asset.id}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-left text-xs transition hover:border-primary/70"
                  onClick={() => toggleAsset(asset.id)}
                >
                  <span className="truncate">{asset.name}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary" className="capitalize">
                      {asset.type}
                    </Badge>
                    {selected ? <Check className="size-3.5 text-primary" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Import images or videos first.</div>
        )}
      </div>

      <Button size="sm" className="w-full" onClick={createLayout} disabled={!effectiveAssets.length}>
        <LayoutDashboard className="size-4" />
        Create {modeLabels[mode]}
      </Button>
    </div>
  );
}

function limitForMode(mode: MediaLayoutMode) {
  if (mode === "split-screen") return 4;
  if (mode === "slideshow") return 12;
  return 6;
}

function readSeconds(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(30, Math.max(1, parsed));
}
