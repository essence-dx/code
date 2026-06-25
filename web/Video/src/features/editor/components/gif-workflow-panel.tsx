"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { createGifFramePreview, type GifFramePreview } from "@/lib/editor/gif-frame-preview";
import {
  canExtractGifFrameThumbnails,
  createGifFrameThumbnails,
  type GifFrameThumbnail,
} from "@/lib/editor/gif-frame-thumbnails";
import {
  createGifWorkflowLayerPatch,
  findGifWorkflowPreset,
  gifWorkflowPresets,
  gifWorkflowSupportsAsset,
} from "@/lib/editor/gif-workflows";
import { exportPresets, getAspectPreset } from "@/lib/editor/presets";

export function GifWorkflowPanel() {
  const [workflowId, setWorkflowId] = useState(gifWorkflowPresets[0]?.id ?? "");
  const [assetId, setAssetId] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [duration, setDuration] = useState("4");
  const [trimStart, setTrimStart] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [frameThumbnails, setFrameThumbnails] = useState<GifFrameThumbnail[]>([]);
  const [thumbnailState, setThumbnailState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const addLayerFromAsset = useEditorStore((state) => state.addLayerFromAsset);
  const addMediaLayout = useEditorStore((state) => state.addMediaLayout);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const queueExport = useEditorStore((state) => state.queueExport);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const selectedWorkflow = findGifWorkflowPreset(workflowId);
  const selectedExportPreset = exportPresets.find((preset) => preset.id === selectedWorkflow.exportPresetId);
  const eligibleAssets = useMemo(
    () => mediaAssets.filter((asset) => gifWorkflowSupportsAsset(selectedWorkflow, asset)),
    [mediaAssets, selectedWorkflow],
  );
  const selectedAsset = eligibleAssets.find((asset) => asset.id === assetId) ?? eligibleAssets[0];
  const effectiveAssetIds = selectedAssetIds.length
    ? eligibleAssets.filter((asset) => selectedAssetIds.includes(asset.id)).map((asset) => asset.id)
    : eligibleAssets.slice(0, selectedWorkflow.assetLimit).map((asset) => asset.id);
  const framePreview = useMemo(
    () =>
      createGifFramePreview({
        preset: selectedWorkflow,
        asset: selectedAsset,
        exportPreset: selectedExportPreset,
        duration: Number(duration),
        trimStart: Number(trimStart),
      }),
    [duration, selectedAsset, selectedExportPreset, selectedWorkflow, trimStart],
  );

  useEffect(() => {
    const controller = new AbortController();
    setFrameThumbnails([]);

    if (!canExtractGifFrameThumbnails(selectedAsset)) {
      setThumbnailState("unavailable");
      return () => controller.abort();
    }

    setThumbnailState("loading");
    void createGifFrameThumbnails({
      asset: selectedAsset,
      frames: framePreview.frames,
      signal: controller.signal,
    })
      .then((thumbnails) => {
        if (controller.signal.aborted) return;
        setFrameThumbnails(thumbnails);
        setThumbnailState(thumbnails.length > 0 ? "ready" : "unavailable");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFrameThumbnails([]);
        setThumbnailState("unavailable");
      });

    return () => controller.abort();
  }, [
    framePreview.duration,
    framePreview.frameCount,
    framePreview.fps,
    framePreview.trimStart,
    selectedAsset,
  ]);

  function chooseWorkflow(id: string) {
    const workflow = findGifWorkflowPreset(id);
    setWorkflowId(workflow.id);
    setDuration(workflow.defaultDuration.toString());
    setTrimStart(workflow.defaultTrimStart.toString());
    setSelectedAssetIds((current) =>
      current.filter((currentAssetId) => mediaAssets.some((asset) => asset.id === currentAssetId && gifWorkflowSupportsAsset(workflow, asset))),
    );
    setMessage(null);
  }

  function toggleAsset(id: string) {
    setSelectedAssetIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id].slice(0, selectedWorkflow.assetLimit);
    });
  }

  function applyWorkflow() {
    const seconds = framePreview.duration;
    const trimSeconds = framePreview.trimStart;
    const exportPreset = selectedExportPreset ?? exportPresets[0];
    setAspectRatio(selectedWorkflow.aspectRatio);

    if (selectedWorkflow.layoutMode) {
      const assetIds = effectiveAssetIds.slice(0, selectedWorkflow.assetLimit);
      if (assetIds.length === 0) {
        setMessage("Import a supported GIF, image, or video source first.");
        return;
      }

      addMediaLayout({ assetIds, mode: selectedWorkflow.layoutMode, clipSeconds: seconds });
      queueExport(exportPreset.format, exportPreset.id);
      setMessage(`${assetIds.length} source${assetIds.length === 1 ? "" : "s"} added and ${exportPreset.label} queued.`);
      return;
    }

    if (!selectedAsset) {
      setMessage("Import a supported GIF, image, or video source first.");
      return;
    }

    const layerId = addLayerFromAsset(selectedAsset.id, {
      duration: seconds,
      name: `${selectedAsset.name} ${selectedWorkflow.label}`,
      notes: `${selectedWorkflow.label} workflow. Recommended export: ${exportPreset.id}.`,
    });
    const layer = layerId ? useEditorStore.getState().project.layers.find((item) => item.id === layerId) : null;
    if (!layerId || !layer) {
      setMessage("The workflow could not create an editable layer.");
      return;
    }

    updateLayer(
      layerId,
      createGifWorkflowLayerPatch({
        preset: selectedWorkflow,
        layer,
        asset: selectedAsset,
        canvas: getAspectPreset(selectedWorkflow.aspectRatio),
        duration: seconds,
        trimStart: trimSeconds,
      }),
      { history: false },
    );
    queueExport(exportPreset.format, exportPreset.id);
    setMessage(`${selectedWorkflow.label} layer added and ${exportPreset.label} queued.`);
  }

  function updateTrimStart(value: number) {
    const nextValue = Math.min(framePreview.maxTrimStart, Math.max(0, value));
    setTrimStart(formatSecondsInput(nextValue));
  }

  function choosePreviewFrame(sourceTime: number, projectTime: number) {
    updateTrimStart(sourceTime);
    setCurrentTime(projectTime);
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">GIF tools</h4>
          <p className="text-xs text-muted-foreground">{selectedExportPreset?.label ?? selectedWorkflow.exportPresetId}</p>
        </div>
        <Badge variant="outline">{selectedWorkflow.aspectRatio}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {gifWorkflowPresets.map((workflow) => (
          <button
            key={workflow.id}
            type="button"
            className={`rounded-md border p-2 text-left text-xs transition ${
              selectedWorkflow.id === workflow.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
            }`}
            onClick={() => chooseWorkflow(workflow.id)}
          >
            <span className="font-medium">{workflow.label}</span>
            <span className="mt-1 block text-muted-foreground">{workflow.bestFor}</span>
          </button>
        ))}
      </div>
      {selectedWorkflow.layoutMode ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sources</Label>
          <div className="space-y-1">
            {eligibleAssets.slice(0, 12).map((asset) => {
              const selected = selectedAssetIds.includes(asset.id) || (!selectedAssetIds.length && effectiveAssetIds.includes(asset.id));
              return (
                <button
                  key={asset.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-left text-xs transition hover:border-primary/70"
                  onClick={() => toggleAsset(asset.id)}
                >
                  <span className="truncate">{asset.name}</span>
                  <Badge variant={selected ? "default" : "outline"}>{asset.type}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Source</Label>
          <Select value={selectedAsset?.id ?? ""} onValueChange={setAssetId}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Choose media" />
            </SelectTrigger>
            <SelectContent>
              {eligibleAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Trim start</span>
          <Input type="number" min={0} max={120} step={0.1} value={trimStart} onChange={(event) => setTrimStart(event.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Seconds</span>
          <Input type="number" min={0.5} max={30} step={0.5} value={duration} onChange={(event) => setDuration(event.target.value)} />
        </label>
      </div>
      <GifFrameStrip
        preview={framePreview}
        thumbnails={frameThumbnails}
        thumbnailState={thumbnailState}
        onTrimChange={updateTrimStart}
        onChooseFrame={choosePreviewFrame}
      />
      <Button className="w-full" size="sm" onClick={applyWorkflow} disabled={eligibleAssets.length === 0}>
        Apply and queue export
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {!eligibleAssets.length ? <p className="text-xs text-muted-foreground">Import a supported GIF, image, or video source.</p> : null}
    </div>
  );
}

function GifFrameStrip({
  preview,
  thumbnails,
  thumbnailState,
  onTrimChange,
  onChooseFrame,
}: {
  preview: GifFramePreview;
  thumbnails: GifFrameThumbnail[];
  thumbnailState: "idle" | "loading" | "ready" | "unavailable";
  onTrimChange: (value: number) => void;
  onChooseFrame: (sourceTime: number, projectTime: number) => void;
}) {
  const canScrub = preview.maxTrimStart > 0;
  const thumbnailsByFrame = new Map(thumbnails.map((thumbnail) => [thumbnail.frameIndex, thumbnail]));
  const thumbnailLabel =
    thumbnailState === "ready" ? "Thumbnails" : thumbnailState === "loading" ? "Loading" : thumbnailState === "unavailable" ? "No thumbnails" : "Preview";

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Frame strip</span>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline">{preview.frameCount} frames</Badge>
          <Badge variant="outline">{preview.fps} fps</Badge>
          <Badge variant={thumbnailState === "ready" ? "default" : "outline"}>{thumbnailLabel}</Badge>
          <Badge variant={preview.transparency.status === "alpha-ready" ? "default" : "secondary"}>{preview.transparency.label}</Badge>
        </div>
      </div>
      <Slider
        min={0}
        max={Math.max(0.1, preview.maxTrimStart)}
        step={1 / preview.fps}
        value={[preview.trimStart]}
        disabled={!canScrub}
        onValueChange={(value) => onTrimChange(value[0] ?? 0)}
        aria-label="GIF trim start"
      />
      <div className="grid grid-cols-4 gap-1">
        {preview.frames.map((frame) => {
          const thumbnail = thumbnailsByFrame.get(frame.index);

          return (
            <Button
              key={frame.index}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto w-full flex-col items-start gap-1 px-1.5 py-1 text-left"
              onClick={() => onChooseFrame(frame.sourceTime, frame.projectTime)}
              title={`Use ${frame.timeLabel}`}
            >
              <span className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-muted text-[10px] text-muted-foreground">
                {thumbnail ? (
                  <img src={thumbnail.dataUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  `${frame.positionPercent}%`
                )}
              </span>
              <span className="text-[11px] font-medium">{frame.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{frame.timeLabel}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function formatSecondsInput(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}
