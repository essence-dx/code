"use client";

import { RotateCcw, Scissors } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AdjustmentSlider,
  Field,
} from "@/features/editor/components/property-fields";
import {
  createBackgroundCutoutDataUrl,
  defaultBackgroundCutoutColor,
  defaultBackgroundCutoutFeather,
  defaultBackgroundCutoutTolerance,
  getImageBackgroundCutoutSettings,
  normalizeCutoutFeather,
  normalizeCutoutTolerance,
  normalizeHexColor,
} from "@/features/editor/image-background-cutout";
import type { DesignElement, ImageElement } from "@/features/editor/types";

const cutoutColorPresets = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Green", value: "#00ff00" },
  { label: "Blue", value: "#0000ff" },
] as const;

export function ImageBackgroundCutoutControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const settings = getImageBackgroundCutoutSettings(element);
  const hasOriginal = Boolean(element.backgroundCutoutOriginalSrc);

  function updateSettings(updates: Partial<ImageElement>) {
    setMessage(null);
    onUpdateElement(updates as Partial<DesignElement>);
  }

  async function applyCutout() {
    setIsProcessing(true);
    setMessage(null);

    try {
      const originalSrc = element.backgroundCutoutOriginalSrc ?? element.src;
      const src = await createBackgroundCutoutDataUrl({
        src: originalSrc,
        ...settings,
      });

      onUpdateElement({
        src,
        backgroundCutoutOriginalSrc: originalSrc,
        backgroundCutoutEnabled: true,
        backgroundCutoutColor: settings.color,
        backgroundCutoutTolerance: settings.tolerance,
        backgroundCutoutFeather: settings.feather,
        backgroundCutoutInvert: settings.invert,
      } as Partial<DesignElement>);
      setMessage("Cutout applied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cutout failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  function restoreOriginal() {
    if (!element.backgroundCutoutOriginalSrc) return;

    onUpdateElement({
      src: element.backgroundCutoutOriginalSrc,
      backgroundCutoutOriginalSrc: undefined,
      backgroundCutoutEnabled: false,
      backgroundCutoutColor: defaultBackgroundCutoutColor,
      backgroundCutoutTolerance: defaultBackgroundCutoutTolerance,
      backgroundCutoutFeather: defaultBackgroundCutoutFeather,
      backgroundCutoutInvert: false,
    } as Partial<DesignElement>);
    setMessage("Original restored.");
  }

  return (
    <Field label="Background cutout">
      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-3">
          <Field label="Color">
            <Input
              type="color"
              value={settings.color}
              onChange={(event) =>
                updateSettings({
                  backgroundCutoutColor: normalizeHexColor(event.target.value),
                })
              }
            />
          </Field>
          <div className="flex items-end">
            <span
              className="h-10 w-full rounded-md border border-border"
              style={{ backgroundColor: settings.color }}
              aria-label="Selected cutout color"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {cutoutColorPresets.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateSettings({
                  backgroundCutoutColor: preset.value,
                })
              }
            >
              <span
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: preset.value }}
              />
              {preset.label}
            </Button>
          ))}
        </div>

        <AdjustmentSlider
          label="Tolerance"
          value={settings.tolerance}
          min={0}
          max={100}
          suffix="%"
          onChange={(backgroundCutoutTolerance) =>
            updateSettings({
              backgroundCutoutTolerance: normalizeCutoutTolerance(
                backgroundCutoutTolerance,
              ),
            })
          }
        />
        <AdjustmentSlider
          label="Feather"
          value={settings.feather}
          min={0}
          max={40}
          suffix="%"
          onChange={(backgroundCutoutFeather) =>
            updateSettings({
              backgroundCutoutFeather: normalizeCutoutFeather(
                backgroundCutoutFeather,
              ),
            })
          }
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Invert mask</span>
          <Switch
            size="sm"
            checked={settings.invert}
            onCheckedChange={(backgroundCutoutInvert) =>
              updateSettings({ backgroundCutoutInvert })
            }
            aria-label="Invert background cutout mask"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={applyCutout}
            disabled={isProcessing}
          >
            <Scissors className="h-4 w-4" />
            {isProcessing ? "Applying" : "Apply cutout"}
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
