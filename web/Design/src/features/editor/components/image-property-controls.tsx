"use client";

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
import { ImageAltTextControls } from "@/features/editor/components/image-alt-text-controls";
import { ImageBackgroundCutoutControls } from "@/features/editor/components/image-background-cutout-controls";
import { ImageObjectRetouchControls } from "@/features/editor/components/image-object-retouch-controls";
import { ImageSelectionBatchControls } from "@/features/editor/components/image-selection-batch-controls";
import {
  AdjustmentSlider,
  Field,
} from "@/features/editor/components/property-fields";
import type {
  DesignElement,
  ImageElement,
  ImageMaskShape,
} from "@/features/editor/types";

const imageMaskShapes = [
  {
    value: "rectangle",
    label: "Rectangle",
  },
  {
    value: "rounded",
    label: "Rounded",
  },
  {
    value: "circle",
    label: "Circle",
  },
  {
    value: "diamond",
    label: "Diamond",
  },
  {
    value: "arch",
    label: "Arch",
  },
] satisfies Array<{
  value: ImageMaskShape;
  label: string;
}>;

const duotonePresets = [
  {
    name: "Ink",
    shadow: "#111827",
    highlight: "#f8fafc",
  },
  {
    name: "Ocean",
    shadow: "#172554",
    highlight: "#67e8f9",
  },
  {
    name: "Sunset",
    shadow: "#7f1d1d",
    highlight: "#fde68a",
  },
  {
    name: "Violet",
    shadow: "#312e81",
    highlight: "#f5d0fe",
  },
] satisfies Array<{
  name: string;
  shadow: string;
  highlight: string;
}>;

export function ImageControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <ImageAltTextControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <ImageCropControls element={element} onUpdateElement={onUpdateElement} />
      <ImageFrameControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <ImageAdjustmentControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <ImageBackgroundCutoutControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <ImageSelectionBatchControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <ImageObjectRetouchControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <ImageDuotoneControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
    </div>
  );
}

export function ImageFrameControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const maskShape = element.maskShape ?? "rectangle";
  const frameEnabled = element.frameEnabled ?? false;

  return (
    <Field label="Mask and frame">
      <div className="space-y-4">
        <Field label="Shape">
          <Select
            value={maskShape}
            onValueChange={(maskShape) =>
              onUpdateElement({
                maskShape: maskShape as ImageMaskShape,
                maskRadius:
                  maskShape === "rounded" ? (element.maskRadius ?? 24) : 0,
              } as Partial<DesignElement>)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {imageMaskShapes.map((shape) => (
                <SelectItem key={shape.value} value={shape.value}>
                  {shape.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {maskShape === "rounded" ? (
          <AdjustmentSlider
            label="Corner"
            value={element.maskRadius ?? 24}
            min={0}
            max={160}
            suffix="px"
            onChange={(maskRadius) =>
              onUpdateElement({ maskRadius } as Partial<DesignElement>)
            }
          />
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Frame stroke</span>
          <Switch
            size="sm"
            checked={frameEnabled}
            onCheckedChange={(frameEnabled) =>
              onUpdateElement({
                frameEnabled,
                frameColor: element.frameColor ?? "#ffffff",
                frameWidth: element.frameWidth ?? 8,
              } as Partial<DesignElement>)
            }
            aria-label="Toggle image frame stroke"
          />
        </div>

        {frameEnabled ? (
          <>
            <Field label="Frame color">
              <Input
                type="color"
                value={element.frameColor ?? "#ffffff"}
                onChange={(event) =>
                  onUpdateElement({
                    frameColor: event.target.value,
                  } as Partial<DesignElement>)
                }
              />
            </Field>
            <AdjustmentSlider
              label="Frame"
              value={element.frameWidth ?? 8}
              min={1}
              max={40}
              suffix="px"
              onChange={(frameWidth) =>
                onUpdateElement({ frameWidth } as Partial<DesignElement>)
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement({
                  maskShape: "rectangle",
                  maskRadius: 0,
                  frameEnabled: false,
                  frameColor: "#ffffff",
                  frameWidth: 0,
                } as Partial<DesignElement>)
              }
            >
              Reset frame
            </Button>
          </>
        ) : null}
      </div>
    </Field>
  );
}

export function ImageCropControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const cropEnabled = element.cropEnabled ?? false;

  return (
    <Field label="Crop">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Crop inside the layer frame
          </span>
          <Switch
            size="sm"
            checked={cropEnabled}
            onCheckedChange={(cropEnabled) =>
              onUpdateElement({
                cropEnabled,
                cropScale: element.cropScale ?? 100,
                cropX: element.cropX ?? 0,
                cropY: element.cropY ?? 0,
              } as Partial<DesignElement>)
            }
            aria-label="Toggle image crop"
          />
        </div>

        <Field label="Fit">
          <Select
            value={element.objectFit}
            onValueChange={(objectFit: ImageElement["objectFit"]) =>
              onUpdateElement({ objectFit } as Partial<DesignElement>)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Fill frame</SelectItem>
              <SelectItem value="contain">Fit image</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {cropEnabled ? (
          <>
            <AdjustmentSlider
              label="Zoom"
              value={element.cropScale ?? 100}
              min={100}
              max={300}
              suffix="%"
              onChange={(cropScale) =>
                onUpdateElement({ cropScale } as Partial<DesignElement>)
              }
            />
            <AdjustmentSlider
              label="Pan X"
              value={element.cropX ?? 0}
              min={-100}
              max={100}
              suffix="%"
              onChange={(cropX) =>
                onUpdateElement({ cropX } as Partial<DesignElement>)
              }
            />
            <AdjustmentSlider
              label="Pan Y"
              value={element.cropY ?? 0}
              min={-100}
              max={100}
              suffix="%"
              onChange={(cropY) =>
                onUpdateElement({ cropY } as Partial<DesignElement>)
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement({
                  cropEnabled: false,
                  cropScale: 100,
                  cropX: 0,
                  cropY: 0,
                } as Partial<DesignElement>)
              }
            >
              Reset crop
            </Button>
          </>
        ) : null}
      </div>
    </Field>
  );
}

export function ImageAdjustmentControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Image adjustments">
      <div className="space-y-4">
        <AdjustmentSlider
          label="Brightness"
          value={element.filterBrightness ?? 100}
          min={0}
          max={200}
          suffix="%"
          onChange={(filterBrightness) =>
            onUpdateElement({ filterBrightness } as Partial<DesignElement>)
          }
        />
        <AdjustmentSlider
          label="Contrast"
          value={element.filterContrast ?? 100}
          min={0}
          max={200}
          suffix="%"
          onChange={(filterContrast) =>
            onUpdateElement({ filterContrast } as Partial<DesignElement>)
          }
        />
        <AdjustmentSlider
          label="Saturation"
          value={element.filterSaturation ?? 100}
          min={0}
          max={200}
          suffix="%"
          onChange={(filterSaturation) =>
            onUpdateElement({ filterSaturation } as Partial<DesignElement>)
          }
        />
        <AdjustmentSlider
          label="Grayscale"
          value={element.filterGrayscale ?? 0}
          min={0}
          max={100}
          suffix="%"
          onChange={(filterGrayscale) =>
            onUpdateElement({ filterGrayscale } as Partial<DesignElement>)
          }
        />
        <AdjustmentSlider
          label="Blur"
          value={element.filterBlur ?? 0}
          min={0}
          max={20}
          suffix="px"
          onChange={(filterBlur) =>
            onUpdateElement({ filterBlur } as Partial<DesignElement>)
          }
        />
        <AdjustmentSlider
          label="Sharpen"
          value={element.filterSharpen ?? 0}
          min={0}
          max={100}
          suffix="%"
          onChange={(filterSharpen) =>
            onUpdateElement({ filterSharpen } as Partial<DesignElement>)
          }
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement({
              filterBrightness: 100,
              filterContrast: 100,
              filterSaturation: 100,
              filterGrayscale: 0,
              filterBlur: 0,
              filterSharpen: 0,
            } as Partial<DesignElement>)
          }
        >
          Reset adjustments
        </Button>
      </div>
    </Field>
  );
}

export function ImageDuotoneControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const duotoneEnabled = element.duotoneEnabled ?? false;

  return (
    <Field label="Duotone">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Map shadows and highlights
          </span>
          <Switch
            size="sm"
            checked={duotoneEnabled}
            onCheckedChange={(duotoneEnabled) =>
              onUpdateElement({
                duotoneEnabled,
                duotoneShadow: element.duotoneShadow ?? "#172554",
                duotoneHighlight: element.duotoneHighlight ?? "#f8fafc",
                duotoneIntensity: element.duotoneIntensity ?? 100,
              } as Partial<DesignElement>)
            }
            aria-label="Toggle duotone"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {duotonePresets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement({
                  duotoneEnabled: true,
                  duotoneShadow: preset.shadow,
                  duotoneHighlight: preset.highlight,
                  duotoneIntensity: 100,
                } as Partial<DesignElement>)
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ background: preset.shadow }}
                />
                <span
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ background: preset.highlight }}
                />
                {preset.name}
              </span>
            </Button>
          ))}
        </div>

        {duotoneEnabled ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Shadow">
                <Input
                  type="color"
                  value={element.duotoneShadow ?? "#172554"}
                  onChange={(event) =>
                    onUpdateElement({
                      duotoneShadow: event.target.value,
                    } as Partial<DesignElement>)
                  }
                />
              </Field>
              <Field label="Highlight">
                <Input
                  type="color"
                  value={element.duotoneHighlight ?? "#f8fafc"}
                  onChange={(event) =>
                    onUpdateElement({
                      duotoneHighlight: event.target.value,
                    } as Partial<DesignElement>)
                  }
                />
              </Field>
            </div>
            <AdjustmentSlider
              label="Intensity"
              value={element.duotoneIntensity ?? 100}
              min={0}
              max={100}
              suffix="%"
              onChange={(duotoneIntensity) =>
                onUpdateElement({
                  duotoneIntensity,
                } as Partial<DesignElement>)
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement({
                  duotoneEnabled: false,
                  duotoneShadow: "#172554",
                  duotoneHighlight: "#f8fafc",
                  duotoneIntensity: 100,
                } as Partial<DesignElement>)
              }
            >
              Clear duotone
            </Button>
          </>
        ) : null}
      </div>
    </Field>
  );
}
