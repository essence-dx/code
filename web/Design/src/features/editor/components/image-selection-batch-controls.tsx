"use client";

import { Brush, Crosshair, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AdjustmentSlider,
  Field,
} from "@/features/editor/components/property-fields";
import {
  createColorRangeSelectionUpdates,
  createMagicBrushSelectionDataUrl,
  createObjectRegionFrameUpdates,
  createPhotoSelectionPresetUpdates,
  getPhotoBatchPreset,
  getPhotoSelectionSettings,
  normalizePhotoSelectionMode,
  normalizePhotoSelectionPresetId,
  normalizePhotoSelectionRegion,
  normalizeSelectionPercent,
  photoBatchPresets,
} from "@/features/editor/image-selection-batch";
import type {
  DesignElement,
  ImageElement,
  PhotoSelectionMode,
  PhotoSelectionPresetId,
} from "@/features/editor/types";

const selectionModes = [
  {
    value: "color-range",
    label: "Color range",
    icon: Wand2,
  },
  {
    value: "magic-brush",
    label: "Magic brush",
    icon: Brush,
  },
  {
    value: "object-region",
    label: "Object region",
    icon: Crosshair,
  },
] satisfies Array<{
  value: PhotoSelectionMode;
  label: string;
  icon: typeof Wand2;
}>;

export function ImageSelectionBatchControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const settings = getPhotoSelectionSettings(element);
  const activePreset = getPhotoBatchPreset(settings.presetId);
  const hasOriginal = Boolean(element.backgroundCutoutOriginalSrc);
  const region = settings.region;

  function updateSettings(updates: Partial<ImageElement>) {
    setMessage(null);
    onUpdateElement(updates as Partial<DesignElement>);
  }

  function applyPreset(presetId: PhotoSelectionPresetId) {
    const preset = getPhotoBatchPreset(presetId);

    onUpdateElement(createPhotoSelectionPresetUpdates(element, presetId));
    setMessage(`${preset.name} preset applied.`);
  }

  function enableColorRangeSelection() {
    onUpdateElement(createColorRangeSelectionUpdates(element));
    setMessage("Color range selection stored.");
  }

  async function applyMagicBrushSelection() {
    setIsProcessing(true);
    setMessage(null);

    try {
      const originalSrc = element.backgroundCutoutOriginalSrc ?? element.src;
      const src = await createMagicBrushSelectionDataUrl({
        src: element.src,
        brushX: settings.brushX,
        brushY: settings.brushY,
        brushSize: settings.brushSize,
        refine: settings.brushRefine,
        invert: element.backgroundCutoutInvert ?? false,
      });

      onUpdateElement({
        src,
        backgroundCutoutOriginalSrc: originalSrc,
        backgroundCutoutEnabled: true,
        photoSelectionMode: "magic-brush",
        photoSelectionBrushX: settings.brushX,
        photoSelectionBrushY: settings.brushY,
        photoSelectionBrushSize: settings.brushSize,
        photoSelectionBrushRefine: settings.brushRefine,
      } as Partial<DesignElement>);
      setMessage("Magic brush applied.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Magic brush selection failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function frameObjectRegion() {
    onUpdateElement({
      photoSelectionMode: "object-region",
      photoSelectionRegionX: region.x,
      photoSelectionRegionY: region.y,
      photoSelectionRegionWidth: region.width,
      photoSelectionRegionHeight: region.height,
      ...createObjectRegionFrameUpdates(element),
    } as Partial<DesignElement>);
    setMessage("Object region framed.");
  }

  function restoreOriginal() {
    if (!element.backgroundCutoutOriginalSrc) return;

    onUpdateElement({
      src: element.backgroundCutoutOriginalSrc,
      backgroundCutoutOriginalSrc: undefined,
      backgroundCutoutEnabled: false,
      photoSelectionMode: "color-range",
      photoSelectionPresetId: undefined,
    } as Partial<DesignElement>);
    setMessage("Original restored.");
  }

  return (
    <Field label="Photo selection and batch presets">
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{activePreset.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {activePreset.description}
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
              {settings.mode.replace("-", " ")}
            </span>
          </div>
        </div>

        <Field label="Preset">
          <Select
            value={settings.presetId}
            onValueChange={(presetId) =>
              applyPreset(normalizePhotoSelectionPresetId(presetId))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {photoBatchPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Selection mode">
          <div className="grid grid-cols-3 gap-2">
            {selectionModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = settings.mode === mode.value;

              return (
                <Button
                  key={mode.value}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="h-auto flex-col gap-1 py-2 text-xs"
                  onClick={() =>
                    updateSettings({
                      photoSelectionMode: normalizePhotoSelectionMode(
                        mode.value,
                      ),
                    })
                  }
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </Button>
              );
            })}
          </div>
        </Field>

        {settings.mode === "color-range" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-3">
              <Field label="Target">
                <Input
                  type="color"
                  value={element.backgroundCutoutColor ?? "#ffffff"}
                  onChange={(event) =>
                    updateSettings({
                      backgroundCutoutColor: event.target.value,
                    })
                  }
                />
              </Field>
              <div className="flex items-end">
                <span
                  className="h-10 w-full rounded-md border border-border"
                  style={{
                    backgroundColor: element.backgroundCutoutColor ?? "#ffffff",
                  }}
                  aria-label="Selected color range target"
                />
              </div>
            </div>
            <Button type="button" size="sm" onClick={enableColorRangeSelection}>
              <Wand2 className="h-4 w-4" />
              Store range
            </Button>
          </div>
        ) : null}

        {settings.mode === "magic-brush" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <AdjustmentSlider
                label="Brush X"
                value={settings.brushX}
                min={0}
                max={100}
                suffix="%"
                onChange={(photoSelectionBrushX) =>
                  updateSettings({
                    photoSelectionBrushX: normalizeSelectionPercent(
                      photoSelectionBrushX,
                      settings.brushX,
                    ),
                  })
                }
              />
              <AdjustmentSlider
                label="Brush Y"
                value={settings.brushY}
                min={0}
                max={100}
                suffix="%"
                onChange={(photoSelectionBrushY) =>
                  updateSettings({
                    photoSelectionBrushY: normalizeSelectionPercent(
                      photoSelectionBrushY,
                      settings.brushY,
                    ),
                  })
                }
              />
            </div>
            <AdjustmentSlider
              label="Brush"
              value={settings.brushSize}
              min={1}
              max={100}
              suffix="%"
              onChange={(photoSelectionBrushSize) =>
                updateSettings({
                  photoSelectionBrushSize: normalizeSelectionPercent(
                    photoSelectionBrushSize,
                    settings.brushSize,
                    1,
                  ),
                })
              }
            />
            <AdjustmentSlider
              label="Refine"
              value={settings.brushRefine}
              min={1}
              max={100}
              suffix="%"
              onChange={(photoSelectionBrushRefine) =>
                updateSettings({
                  photoSelectionBrushRefine: normalizeSelectionPercent(
                    photoSelectionBrushRefine,
                    settings.brushRefine,
                    1,
                  ),
                })
              }
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Invert mask</span>
              <Switch
                size="sm"
                checked={element.backgroundCutoutInvert ?? false}
                onCheckedChange={(backgroundCutoutInvert) =>
                  updateSettings({ backgroundCutoutInvert })
                }
                aria-label="Invert magic brush mask"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={applyMagicBrushSelection}
              disabled={isProcessing}
            >
              <Brush className="h-4 w-4" />
              {isProcessing ? "Applying" : "Apply brush"}
            </Button>
          </div>
        ) : null}

        {settings.mode === "object-region" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <AdjustmentSlider
                label="Region X"
                value={region.x}
                min={0}
                max={99}
                suffix="%"
                onChange={(photoSelectionRegionX) =>
                  updateSettings({
                    photoSelectionRegionX: normalizePhotoSelectionRegion({
                      ...region,
                      x: photoSelectionRegionX,
                    }).x,
                  })
                }
              />
              <AdjustmentSlider
                label="Region Y"
                value={region.y}
                min={0}
                max={99}
                suffix="%"
                onChange={(photoSelectionRegionY) =>
                  updateSettings({
                    photoSelectionRegionY: normalizePhotoSelectionRegion({
                      ...region,
                      y: photoSelectionRegionY,
                    }).y,
                  })
                }
              />
              <AdjustmentSlider
                label="Width"
                value={region.width}
                min={1}
                max={100}
                suffix="%"
                onChange={(photoSelectionRegionWidth) =>
                  updateSettings({
                    photoSelectionRegionWidth: normalizePhotoSelectionRegion({
                      ...region,
                      width: photoSelectionRegionWidth,
                    }).width,
                  })
                }
              />
              <AdjustmentSlider
                label="Height"
                value={region.height}
                min={1}
                max={100}
                suffix="%"
                onChange={(photoSelectionRegionHeight) =>
                  updateSettings({
                    photoSelectionRegionHeight: normalizePhotoSelectionRegion({
                      ...region,
                      height: photoSelectionRegionHeight,
                    }).height,
                  })
                }
              />
            </div>
            <Button type="button" size="sm" onClick={frameObjectRegion}>
              <Crosshair className="h-4 w-4" />
              Frame region
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(settings.presetId)}
          >
            <Sparkles className="h-4 w-4" />
            Reapply preset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restoreOriginal}
            disabled={!hasOriginal || isProcessing}
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
        </div>

        {message ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {message}
          </p>
        ) : null}
      </div>
    </Field>
  );
}
