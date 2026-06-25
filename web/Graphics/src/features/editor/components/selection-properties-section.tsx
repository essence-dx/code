"use client";

import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getContrastReport } from "@/features/editor/color-contrast";
import { getPrimaryFillPaintPatch } from "@/features/editor/paint-stack";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  strokeLineCapOptions,
  strokeLineJoinOptions,
} from "@/features/editor/stroke-options";
import {
  fontFamilyOptions,
  textAlignOptions,
  textResizeModeOptions,
} from "@/features/editor/text-options";
import { TextLayerReviewPanel } from "@/features/editor/components/text-layer-review-panel";
import {
  getTextLayerResizeModePatches,
  getTextLayerTypographyPatch,
} from "@/features/editor/text-layer-review";
import { imageFitOptions } from "@/features/editor/image-options";
import {
  centerLayerMask,
  fitLayerMaskToLayer,
} from "@/features/editor/vector-operations";
import type {
  DesignLayer,
  DesignTextResizeMode,
  ImageFit,
  StrokeLineCap,
  StrokeLineJoin,
  TextAlign,
} from "@/features/editor/types";
import { getLayerBounds } from "@/features/editor/viewport-utils";

type SelectionPropertiesSectionProps = {
  layers: DesignLayer[];
  variables: Record<string, string>;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function SelectionPropertiesSection({
  layers,
  variables,
  onUpdateLayers,
}: SelectionPropertiesSectionProps) {
  const bounds = getLayerBounds(layers);
  const visibleCount = layers.filter((layer) => layer.visible).length;
  const lockedCount = layers.filter((layer) => layer.locked).length;
  const readyForDevCount = layers.filter((layer) => layer.readyForDev).length;
  const maskedCount = layers.filter((layer) => layer.mask).length;
  const maskSourceCount = layers.filter((layer) => layer.maskSource).length;
  const editableMaskCount = layers.filter(
    (layer) => layer.mask && layer.mask.kind !== "path",
  ).length;
  const textLayers = layers.filter((layer) => layer.text !== undefined);
  const imageLayers = layers.filter((layer) => layer.type === "image");
  const commonFill = getCommonLayerValue(layers, "fill");
  const commonBlendMode = getCommonLayerValue(layers, "blendMode");
  const commonStroke = getCommonLayerValue(layers, "stroke");
  const commonStrokeDash = getCommonLayerValue(layers, "strokeDash");
  const commonStrokeLineCap = getCommonLayerValue(layers, "strokeLineCap");
  const commonStrokeLineJoin = getCommonLayerValue(layers, "strokeLineJoin");
  const commonShadowEnabled = getCommonLayerValue(layers, "shadowEnabled");
  const commonShadowColor = getCommonLayerValue(layers, "shadowColor");
  const commonShadowX = getCommonLayerValue(layers, "shadowX");
  const commonShadowY = getCommonLayerValue(layers, "shadowY");
  const commonShadowBlur = getCommonLayerValue(layers, "shadowBlur");
  const commonShadowSpread = getCommonLayerValue(layers, "shadowSpread");
  const commonLayerBlur = getCommonLayerValue(layers, "layerBlur");
  const commonBackgroundBlur = getCommonLayerValue(layers, "backgroundBlur");
  const commonEffectsVisible = getCommonLayerValue(layers, "effectsVisible");
  const commonClipContent = getCommonLayerValue(layers, "clipContent");
  const commonReadyForDev = getCommonLayerValue(layers, "readyForDev");
  const commonRotation = getCommonLayerValue(layers, "rotation");
  const commonCornerRadius = getCommonLayerValue(layers, "cornerRadius");
  const commonStrokeWidth = getCommonLayerValue(layers, "strokeWidth");
  const commonFontSize = getCommonLayerValue(textLayers, "fontSize");
  const commonFontWeight = getCommonLayerValue(textLayers, "fontWeight");
  const commonFontFamily = getCommonLayerValue(textLayers, "fontFamily");
  const commonLineHeight = getCommonLayerValue(textLayers, "lineHeight");
  const commonLetterSpacing = getCommonLayerValue(textLayers, "letterSpacing");
  const commonTextAlign = getCommonLayerValue(textLayers, "textAlign");
  const commonTextColor = getCommonLayerValue(textLayers, "textColor");
  const commonTextResizeMode = getCommonLayerValue(textLayers, "textResizeMode");
  const commonImageFit = getCommonLayerValue(imageLayers, "imageFit");
  const fill = commonFill ?? layers.at(-1)?.fill ?? "#000000";
  const stroke =
    commonStroke ?? layers.at(-1)?.stroke ?? "#000000";
  const strokeDash = commonStrokeDash ?? layers.at(-1)?.strokeDash ?? "";
  const strokeLineCap =
    commonStrokeLineCap ?? layers.at(-1)?.strokeLineCap ?? "butt";
  const strokeLineJoin =
    commonStrokeLineJoin ?? layers.at(-1)?.strokeLineJoin ?? "miter";
  const shadowEnabled =
    commonShadowEnabled ?? layers.some((layer) => layer.shadowEnabled);
  const shadowColor =
    commonShadowColor ?? layers.at(-1)?.shadowColor ?? "rgb(0 0 0 / 0.24)";
  const shadowX =
    commonShadowX ?? Math.round(getAverageOptionalLayerNumber(layers, "shadowX", 0));
  const shadowY =
    commonShadowY ?? Math.round(getAverageOptionalLayerNumber(layers, "shadowY", 12));
  const shadowBlur =
    commonShadowBlur ??
    Math.round(getAverageOptionalLayerNumber(layers, "shadowBlur", 24));
  const shadowSpread =
    commonShadowSpread ??
    Math.round(getAverageOptionalLayerNumber(layers, "shadowSpread", 0));
  const layerBlur =
    commonLayerBlur ?? Math.round(getAverageOptionalLayerNumber(layers, "layerBlur", 0));
  const backgroundBlur =
    commonBackgroundBlur ??
    Math.round(getAverageOptionalLayerNumber(layers, "backgroundBlur", 0));
  const effectsVisible =
    commonEffectsVisible ?? layers.some((layer) => layer.effectsVisible ?? true);
  const opacity = Math.round(getAverageLayerNumber(layers, "opacity") * 100);
  const clipContent =
    commonClipContent ?? layers.some((layer) => layer.clipContent);
  const readyForDev =
    commonReadyForDev ?? layers.some((layer) => layer.readyForDev);
  const rotation =
    commonRotation ?? Math.round(getAverageLayerNumber(layers, "rotation"));
  const cornerRadius =
    commonCornerRadius ??
    Math.round(getAverageLayerNumber(layers, "cornerRadius"));
  const strokeWidth =
    commonStrokeWidth ?? Math.round(getAverageLayerNumber(layers, "strokeWidth"));
  const fontSize =
    commonFontSize ??
    Math.round(getAverageOptionalLayerNumber(textLayers, "fontSize", 16));
  const fontWeight =
    commonFontWeight ??
    Math.round(getAverageOptionalLayerNumber(textLayers, "fontWeight", 400));
  const fontFamily =
    commonFontFamily ??
    textLayers.at(-1)?.fontFamily ??
    "Inter, Arial, sans-serif";
  const lineHeight =
    commonLineHeight ??
    getAverageOptionalLayerNumber(textLayers, "lineHeight", 1.25);
  const letterSpacing =
    commonLetterSpacing ??
    getAverageOptionalLayerNumber(textLayers, "letterSpacing", 0);
  const textAlign = commonTextAlign ?? textLayers.at(-1)?.textAlign ?? "left";
  const textColor = commonTextColor ?? textLayers.at(-1)?.textColor ?? "#ffffff";
  const textResizeMode =
    commonTextResizeMode ?? textLayers.at(-1)?.textResizeMode ?? "fixed";
  const imageFit = commonImageFit ?? imageLayers.at(-1)?.imageFit ?? "cover";
  const textContrast = getContrastReport(
    textColor,
    fill === "transparent" ? "#0f0f10" : fill,
  );

  if (!bounds) {
    return null;
  }

  return (
    <div className="space-y-5 p-3">
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Selection
        </div>
        <div className="text-sm text-foreground">{layers.length} layers</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X"
          value={Math.round(bounds.x)}
          onChange={(x) => moveSelection(layers, onUpdateLayers, x - bounds.x, 0)}
        />
        <NumberField
          label="Y"
          value={Math.round(bounds.y)}
          onChange={(y) => moveSelection(layers, onUpdateLayers, 0, y - bounds.y)}
        />
        <NumberField
          label="W"
          value={Math.round(bounds.width)}
          min={1}
          onChange={(width) =>
            resizeSelection(layers, onUpdateLayers, bounds, width, bounds.height)
          }
        />
        <NumberField
          label="H"
          value={Math.round(bounds.height)}
          min={1}
          onChange={(height) =>
            resizeSelection(layers, onUpdateLayers, bounds, bounds.width, height)
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => updateSelection(layers, onUpdateLayers, { visible: true })}
        >
          <Eye className="size-4" />
          Show all
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => updateSelection(layers, onUpdateLayers, { visible: false })}
        >
          <EyeOff className="size-4" />
          Hide all
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => updateSelection(layers, onUpdateLayers, { locked: true })}
        >
          <Lock className="size-4" />
          Lock all
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => updateSelection(layers, onUpdateLayers, { locked: false })}
        >
          <Unlock className="size-4" />
          Unlock all
        </Button>
      </div>

      <div className="rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
        {visibleCount} visible / {lockedCount} locked / {readyForDevCount} ready
        {maskedCount + maskSourceCount > 0
          ? ` / ${maskedCount + maskSourceCount} mask`
          : ""}
      </div>

      <Button
        type="button"
        variant={clipContent ? "secondary" : "outline"}
        className="w-full"
        onClick={() =>
          updateSelection(layers, onUpdateLayers, {
            clipContent: !clipContent,
          })
        }
      >
        {clipContent
          ? commonClipContent === null
            ? "Clip mixed"
            : "Clip content on"
          : "Clip content off"}
      </Button>

      <Button
        type="button"
        variant={readyForDev ? "secondary" : "outline"}
        className="w-full"
        onClick={() =>
          updateSelection(layers, onUpdateLayers, {
            readyForDev: !readyForDev,
          })
        }
      >
        {readyForDev
          ? commonReadyForDev === null
            ? "Ready status mixed"
            : "Ready for dev"
          : "Mark ready for dev"}
      </Button>

      {maskedCount + maskSourceCount > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {editableMaskCount > 0 ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  updateSelectionWithLayerPatch(layers, onUpdateLayers, (layer) => {
                    const mask = fitLayerMaskToLayer(layer);

                    return mask ? { mask } : {};
                  })
                }
              >
                Fit masks
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  updateSelectionWithLayerPatch(layers, onUpdateLayers, (layer) => {
                    const mask = centerLayerMask(layer);

                    return mask ? { mask } : {};
                  })
                }
              >
                Center masks
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="col-span-2"
            onClick={() =>
              updateSelectionWithLayerPatch(layers, onUpdateLayers, (layer) => ({
                mask: undefined,
                maskSource: false,
                visible: layer.maskSource ? true : layer.visible,
              }))
            }
          >
            Release selected masks
          </Button>
        </div>
      ) : null}

      <Separator />

      <NumberField
        label="Opacity"
        value={opacity}
        min={0}
        max={100}
        onChange={(nextOpacity) =>
          updateSelection(layers, onUpdateLayers, { opacity: nextOpacity / 100 })
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={commonRotation === null ? "Rotation mixed" : "Rotation"}
          value={rotation}
          onChange={(nextRotation) =>
            updateSelection(layers, onUpdateLayers, { rotation: nextRotation })
          }
        />
        <NumberField
          label={commonCornerRadius === null ? "Radius mixed" : "Radius"}
          value={cornerRadius}
          min={0}
          onChange={(nextRadius) =>
            updateSelection(layers, onUpdateLayers, {
              cornerRadius: nextRadius,
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label={commonFill === null ? "Fill mixed" : "Fill"}
          value={fill}
          blendMode={commonBlendMode ?? layers.at(-1)?.blendMode ?? "normal"}
          onChange={(nextFill) =>
            updateSelectionWithLayerPatch(layers, onUpdateLayers, (layer) =>
              getPrimaryFillPaintPatch(layer, { value: nextFill }),
            )
          }
          onBlendModeChange={(nextBlendMode) =>
            updateSelectionWithLayerPatch(layers, onUpdateLayers, (layer) =>
              getPrimaryFillPaintPatch(layer, { blendMode: nextBlendMode }),
            )
          }
        />
        <ColorField
          label={commonStroke === null ? "Stroke mixed" : "Stroke"}
          value={stroke}
          onChange={(nextStroke) =>
            updateSelection(layers, onUpdateLayers, { stroke: nextStroke })
          }
        />
      </div>

      <NumberField
        label={commonStrokeWidth === null ? "Stroke width mixed" : "Stroke width"}
        value={strokeWidth}
        min={0}
        onChange={(nextStrokeWidth) =>
          updateSelection(layers, onUpdateLayers, {
            strokeWidth: nextStrokeWidth,
          })
        }
      />

      <Field label={commonStrokeDash === null ? "Dash pattern mixed" : "Dash pattern"}>
        <Input
          value={strokeDash}
          placeholder="6 4"
          spellCheck={false}
          onChange={(event) =>
            updateSelection(layers, onUpdateLayers, {
              strokeDash: event.target.value.trim() || undefined,
            })
          }
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <SelectField<StrokeLineCap>
          label={commonStrokeLineCap === null ? "Cap mixed" : "Cap"}
          value={strokeLineCap}
          options={strokeLineCapOptions}
          onChange={(strokeLineCap) =>
            updateSelection(layers, onUpdateLayers, { strokeLineCap })
          }
        />
        <SelectField<StrokeLineJoin>
          label={commonStrokeLineJoin === null ? "Join mixed" : "Join"}
          value={strokeLineJoin}
          options={strokeLineJoinOptions}
          onChange={(strokeLineJoin) =>
            updateSelection(layers, onUpdateLayers, { strokeLineJoin })
          }
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Effects
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={effectsVisible ? "secondary" : "outline"}
            onClick={() =>
              updateSelection(layers, onUpdateLayers, {
                effectsVisible: !effectsVisible,
              })
            }
          >
            {effectsVisible ? "Visible" : "Hidden"}
          </Button>
          <Button
            type="button"
            variant={shadowEnabled ? "secondary" : "outline"}
            onClick={() =>
              updateSelection(layers, onUpdateLayers, {
                effectsVisible: true,
                shadowEnabled: !shadowEnabled,
                shadowColor: shadowColor,
                shadowX: shadowX,
                shadowY: shadowY,
                shadowBlur: shadowBlur,
                shadowSpread: shadowSpread,
              })
            }
          >
            {shadowEnabled ? "Shadow on" : "Shadow off"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateSelection(layers, onUpdateLayers, {
                shadowEnabled: false,
                shadowColor: undefined,
                shadowX: undefined,
                shadowY: undefined,
                shadowBlur: undefined,
                shadowSpread: undefined,
                layerBlur: undefined,
                backgroundBlur: undefined,
                effectsVisible: true,
              })
            }
          >
            Reset
          </Button>
        </div>
        {shadowEnabled ? (
          <>
            <ColorField
              label={commonShadowColor === null ? "Shadow mixed" : "Shadow"}
              value={shadowColor}
              onChange={(nextShadowColor) =>
                updateSelection(layers, onUpdateLayers, {
                  shadowColor: nextShadowColor,
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={commonShadowX === null ? "Shadow X mixed" : "Shadow X"}
                value={shadowX}
                onChange={(nextShadowX) =>
                  updateSelection(layers, onUpdateLayers, {
                    shadowX: nextShadowX,
                  })
                }
              />
              <NumberField
                label={commonShadowY === null ? "Shadow Y mixed" : "Shadow Y"}
                value={shadowY}
                onChange={(nextShadowY) =>
                  updateSelection(layers, onUpdateLayers, {
                    shadowY: nextShadowY,
                  })
                }
              />
              <NumberField
                label={
                  commonShadowBlur === null ? "Shadow blur mixed" : "Shadow blur"
                }
                value={shadowBlur}
                min={0}
                onChange={(nextShadowBlur) =>
                  updateSelection(layers, onUpdateLayers, {
                    shadowBlur: nextShadowBlur,
                  })
                }
              />
              <NumberField
                label={
                  commonShadowSpread === null
                    ? "Shadow spread mixed"
                    : "Shadow spread"
                }
                value={shadowSpread}
                onChange={(nextShadowSpread) =>
                  updateSelection(layers, onUpdateLayers, {
                    shadowSpread: nextShadowSpread,
                  })
                }
              />
            </div>
          </>
        ) : null}
        <NumberField
          label={commonLayerBlur === null ? "Layer blur mixed" : "Layer blur"}
          value={layerBlur}
          min={0}
          onChange={(nextLayerBlur) =>
            updateSelection(layers, onUpdateLayers, {
              effectsVisible: true,
              layerBlur: nextLayerBlur > 0 ? nextLayerBlur : undefined,
            })
          }
        />
        <NumberField
          label={
            commonBackgroundBlur === null
              ? "Background blur mixed"
              : "Background blur"
          }
          value={backgroundBlur}
          min={0}
          onChange={(nextBackgroundBlur) =>
            updateSelection(layers, onUpdateLayers, {
              effectsVisible: true,
              backgroundBlur:
                nextBackgroundBlur > 0 ? nextBackgroundBlur : undefined,
            })
          }
        />
      </div>

      {imageLayers.length > 0 ? (
        <>
          <Separator />

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Image
            </div>
            <div className="text-xs text-muted-foreground">
              {imageLayers.length} image layers
            </div>
          </div>
          <SelectField<ImageFit>
            label={commonImageFit === null ? "Fit mixed" : "Fit"}
            value={imageFit}
            options={imageFitOptions}
            onChange={(nextImageFit) =>
              updateSelection(imageLayers, onUpdateLayers, {
                imageFit: nextImageFit,
              })
            }
          />
        </>
      ) : null}

      {textLayers.length > 0 ? (
        <>
          <Separator />

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Text
            </div>
            <div className="text-xs text-muted-foreground">
              {textLayers.length} text layers
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label={commonFontSize === null ? "Size mixed" : "Size"}
              value={fontSize}
              min={8}
              onChange={(nextFontSize) =>
                updateTextSelection(textLayers, onUpdateLayers, {
                  fontSize: nextFontSize,
                })
              }
            />
            <NumberField
              label={commonFontWeight === null ? "Weight mixed" : "Weight"}
              value={fontWeight}
              min={100}
              max={900}
              step={100}
              onChange={(nextFontWeight) =>
                updateTextSelection(textLayers, onUpdateLayers, {
                  fontWeight: nextFontWeight,
                })
              }
            />
          </div>
          <SelectField
            label={commonFontFamily === null ? "Font mixed" : "Font"}
            value={fontFamily}
            options={fontFamilyOptions}
            onChange={(nextFontFamily) =>
              updateTextSelection(textLayers, onUpdateLayers, {
                fontFamily: nextFontFamily,
              })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectField<TextAlign>
              label={commonTextAlign === null ? "Align mixed" : "Align"}
              value={textAlign}
              options={textAlignOptions}
              onChange={(nextTextAlign) =>
                updateTextSelection(textLayers, onUpdateLayers, {
                  textAlign: nextTextAlign,
                })
              }
            />
            <SelectField<DesignTextResizeMode>
              label={
                commonTextResizeMode === null ? "Resize mixed" : "Resize"
              }
              value={textResizeMode}
              options={textResizeModeOptions}
              onChange={(nextTextResizeMode) =>
                onUpdateLayers(
                  getTextLayerResizeModePatches(
                    textLayers,
                    nextTextResizeMode,
                  ),
                )
              }
            />
            <NumberField
              label={commonLineHeight === null ? "Line mixed" : "Line"}
              value={lineHeight}
              min={0.5}
              step={0.05}
              onChange={(nextLineHeight) =>
                updateTextSelection(textLayers, onUpdateLayers, {
                  lineHeight: nextLineHeight,
                })
              }
            />
            <NumberField
              label={
                commonLetterSpacing === null ? "Tracking mixed" : "Tracking"
              }
              value={letterSpacing}
              step={0.5}
              onChange={(nextLetterSpacing) =>
                updateTextSelection(textLayers, onUpdateLayers, {
                  letterSpacing: nextLetterSpacing,
                })
              }
            />
          </div>

          <ColorField
            label={commonTextColor === null ? "Text mixed" : "Text"}
            value={textColor}
            onChange={(nextTextColor) =>
              updateSelection(textLayers, onUpdateLayers, {
                textColor: nextTextColor,
              })
            }
          />
          <ContrastBadge report={textContrast} />
          <TextLayerReviewPanel
            layers={textLayers}
            variables={variables}
            onUpdateLayers={onUpdateLayers}
          />
        </>
      ) : null}
    </div>
  );
}

function moveSelection(
  layers: DesignLayer[],
  onUpdateLayers: (patches: LayerPatch[]) => void,
  deltaX: number,
  deltaY: number,
) {
  onUpdateLayers(
    layers.map((layer) => ({
      layerId: layer.id,
      patch: {
        x: Math.round(layer.x + deltaX),
        y: Math.round(layer.y + deltaY),
      },
    })),
  );
}

function resizeSelection(
  layers: DesignLayer[],
  onUpdateLayers: (patches: LayerPatch[]) => void,
  bounds: NonNullable<ReturnType<typeof getLayerBounds>>,
  width: number,
  height: number,
) {
  const scaleX = Math.max(1, width) / bounds.width;
  const scaleY = Math.max(1, height) / bounds.height;

  onUpdateLayers(
    layers.map((layer) => ({
      layerId: layer.id,
      patch: {
        x: Math.round(bounds.x + (layer.x - bounds.x) * scaleX),
        y: Math.round(bounds.y + (layer.y - bounds.y) * scaleY),
        width: Math.max(1, Math.round(layer.width * scaleX)),
        height: Math.max(1, Math.round(layer.height * scaleY)),
      },
    })),
  );
}

function updateSelection(
  layers: DesignLayer[],
  onUpdateLayers: (patches: LayerPatch[]) => void,
  patch: Partial<DesignLayer>,
) {
  onUpdateLayers(layers.map((layer) => ({ layerId: layer.id, patch })));
}

function updateSelectionWithLayerPatch(
  layers: DesignLayer[],
  onUpdateLayers: (patches: LayerPatch[]) => void,
  getPatch: (layer: DesignLayer) => Partial<DesignLayer>,
) {
  onUpdateLayers(
    layers.map((layer) => ({
      layerId: layer.id,
      patch: getPatch(layer),
    })),
  );
}

function updateTextSelection(
  layers: DesignLayer[],
  onUpdateLayers: (patches: LayerPatch[]) => void,
  patch: Parameters<typeof getTextLayerTypographyPatch>[1],
) {
  onUpdateLayers(
    layers.map((layer) => ({
      layerId: layer.id,
      patch: getTextLayerTypographyPatch(layer, patch),
    })),
  );
}

function getCommonLayerValue<K extends keyof DesignLayer>(
  layers: DesignLayer[],
  key: K,
) {
  const firstValue = layers[0]?.[key];

  return layers.every((layer) => layer[key] === firstValue) ? firstValue : null;
}

function getAverageLayerNumber(
  layers: DesignLayer[],
  key: keyof Pick<
    DesignLayer,
    "cornerRadius" | "opacity" | "rotation" | "strokeWidth"
  >,
) {
  if (layers.length === 0) {
    return 0;
  }

  return layers.reduce((sum, layer) => sum + layer[key], 0) / layers.length;
}

function getAverageOptionalLayerNumber(
  layers: DesignLayer[],
  key: keyof Pick<
    DesignLayer,
    | "fontSize"
    | "fontWeight"
    | "shadowX"
    | "shadowY"
    | "shadowBlur"
    | "shadowSpread"
    | "layerBlur"
    | "backgroundBlur"
    | "lineHeight"
    | "letterSpacing"
  >,
  fallback: number,
) {
  if (layers.length === 0) {
    return fallback;
  }

  return (
    layers.reduce((sum, layer) => sum + (layer[key] ?? fallback), 0) /
    layers.length
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <NumberInput
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
    </Field>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
  blendMode,
  onBlendModeChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  blendMode?: string;
  onBlendModeChange?: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <ColorPicker
        value={value}
        blendMode={blendMode}
        onChange={onChange}
        onBlendModeChange={onBlendModeChange}
        aria-label={label}
      />
    </Field>
  );
}

function ContrastBadge({ report }: { report: ReturnType<typeof getContrastReport> }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
      {report ? (
        <>
          Contrast{" "}
          <span className="font-mono text-foreground">
            {report.ratio.toFixed(2)}:1
          </span>{" "}
          / {report.label}
        </>
      ) : (
        "Contrast unavailable for this paint"
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
