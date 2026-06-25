"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  List,
  ListOrdered,
  Pilcrow,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import { BrandFontControls } from "@/features/editor/components/brand-font-controls";
import { Textarea } from "@/components/ui/textarea";
import {
  toBulletList,
  toNumberedList,
  toPlainParagraphs,
} from "@/features/editor/text-list-formatting";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import { getTextContrastStatus } from "@/features/editor/color-contrast";
import type {
  BrandFontSummary,
  DesignElement,
  TextElement,
} from "@/features/editor/types";

const fontOptions = ["Geist", "Arial", "Georgia", "Times New Roman", "Verdana"];

const textStylePresets = [
  {
    name: "Heading",
    updates: {
      fontSize: 64,
      fontWeight: 800,
      letterSpacing: -0.5,
      lineHeight: 1,
    },
  },
  {
    name: "Subhead",
    updates: {
      fontSize: 36,
      fontWeight: 700,
      letterSpacing: 0,
      lineHeight: 1.1,
    },
  },
  {
    name: "Body",
    updates: {
      fontSize: 22,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
  },
  {
    name: "Caption",
    updates: {
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 1,
      lineHeight: 1.3,
    },
  },
] satisfies Array<{
  name: string;
  updates: Pick<
    TextElement,
    "fontSize" | "fontWeight" | "letterSpacing" | "lineHeight"
  >;
}>;

export function TextControls({
  element,
  palettes,
  brandFonts,
  pageBackground,
  onUpdateElement,
  onSaveBrandFont,
}: {
  element: TextElement;
  palettes: readonly EditorColorPalette[];
  brandFonts: BrandFontSummary[];
  pageBackground: string;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
  onSaveBrandFont: (
    font: Omit<BrandFontSummary, "id" | "createdAt" | "updatedAt">,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Text">
        <Textarea
          value={element.content}
          autoCapitalize="sentences"
          spellCheck
          onChange={(event) =>
            onUpdateElement({
              content: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <TextListControls
        content={element.content}
        onUpdateElement={onUpdateElement}
      />
      <FindReplaceControls
        content={element.content}
        onUpdateElement={onUpdateElement}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Size"
          value={element.fontSize}
          min={6}
          onChange={(fontSize) =>
            onUpdateElement({ fontSize } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Weight"
          value={element.fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(fontWeight) =>
            onUpdateElement({ fontWeight } as Partial<DesignElement>)
          }
        />
      </div>
      <Field label="Font">
        <Select
          value={element.fontFamily}
          onValueChange={(fontFamily) =>
            onUpdateElement({
              fontFamily,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontOptions.map((font) => (
              <SelectItem key={font} value={font}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <BrandFontControls
        element={element}
        brandFonts={brandFonts}
        onUpdateElement={onUpdateElement}
        onSaveBrandFont={onSaveBrandFont}
      />
      <TextStyleControls onUpdateElement={onUpdateElement} />
      <TextCurveControls element={element} onUpdateElement={onUpdateElement} />
      <TextFillControls
        element={element}
        palettes={palettes}
        pageBackground={pageBackground}
        onUpdateElement={onUpdateElement}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Letter"
          value={element.letterSpacing}
          min={-5}
          max={40}
          step={0.5}
          onChange={(letterSpacing) =>
            onUpdateElement({
              letterSpacing,
            } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Line"
          value={element.lineHeight}
          min={0.7}
          max={3}
          step={0.05}
          onChange={(lineHeight) =>
            onUpdateElement({
              lineHeight,
            } as Partial<DesignElement>)
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={element.textAlign === "left" ? "secondary" : "outline"}
          size="icon"
          onClick={() =>
            onUpdateElement({
              textAlign: "left",
            } as Partial<DesignElement>)
          }
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={element.textAlign === "center" ? "secondary" : "outline"}
          size="icon"
          onClick={() =>
            onUpdateElement({
              textAlign: "center",
            } as Partial<DesignElement>)
          }
          aria-label="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={element.textAlign === "right" ? "secondary" : "outline"}
          size="icon"
          onClick={() =>
            onUpdateElement({
              textAlign: "right",
            } as Partial<DesignElement>)
          }
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      <TextEffectControls element={element} onUpdateElement={onUpdateElement} />
    </div>
  );
}

export function FindReplaceControls({
  content,
  onUpdateElement,
}: {
  content: string;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const matchCount = findText ? content.split(findText).length - 1 : 0;
  const canReplace = findText.length > 0 && matchCount > 0;

  return (
    <Field label="Find and replace">
      <div className="space-y-2">
        <Input
          value={findText}
          onChange={(event) => setFindText(event.target.value)}
          placeholder="Find text"
          aria-label="Find text"
        />
        <Input
          value={replaceText}
          onChange={(event) => setReplaceText(event.target.value)}
          placeholder="Replace with"
          aria-label="Replace with"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {matchCount} matches
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canReplace}
              onClick={() =>
                onUpdateElement({
                  content: content.replace(findText, replaceText),
                } as Partial<DesignElement>)
              }
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canReplace}
              onClick={() =>
                onUpdateElement({
                  content: content.split(findText).join(replaceText),
                } as Partial<DesignElement>)
              }
            >
              All
            </Button>
          </div>
        </div>
      </div>
    </Field>
  );
}

export function TextListControls({
  content,
  onUpdateElement,
}: {
  content: string;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Paragraph">
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement({
              content: toBulletList(content),
            } as Partial<DesignElement>)
          }
        >
          <List className="h-4 w-4" />
          Bullet
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement({
              content: toNumberedList(content),
            } as Partial<DesignElement>)
          }
        >
          <ListOrdered className="h-4 w-4" />
          Number
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement({
              content: toPlainParagraphs(content),
            } as Partial<DesignElement>)
          }
        >
          <Pilcrow className="h-4 w-4" />
          Plain
        </Button>
      </div>
    </Field>
  );
}

export function TextStyleControls({
  onUpdateElement,
}: {
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Style">
      <div className="grid grid-cols-2 gap-2">
        {textStylePresets.map((preset) => (
          <Button
            key={preset.name}
            variant="outline"
            size="sm"
            onClick={() =>
              onUpdateElement(preset.updates as Partial<DesignElement>)
            }
          >
            {preset.name}
          </Button>
        ))}
      </div>
    </Field>
  );
}

export function TextCurveControls({
  element,
  onUpdateElement,
}: {
  element: TextElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const curveEnabled = element.textCurveEnabled ?? false;
  const curveAmount = element.textCurveAmount ?? 50;

  return (
    <Field label="Curve">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Use curved text</span>
          <Switch
            size="sm"
            checked={curveEnabled}
            onCheckedChange={(textCurveEnabled) =>
              onUpdateElement({
                textCurveEnabled,
                textCurveAmount: element.textCurveAmount ?? 50,
              } as Partial<DesignElement>)
            }
            aria-label="Toggle curved text"
          />
        </div>
        {curveEnabled ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Arc</span>
              <span>{curveAmount}</span>
            </div>
            <Slider
              value={[curveAmount]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([textCurveAmount]) =>
                onUpdateElement({
                  textCurveAmount,
                } as Partial<DesignElement>)
              }
              aria-label="Curved text arc"
            />
          </div>
        ) : null}
      </div>
    </Field>
  );
}

export function TextFillControls({
  element,
  palettes,
  pageBackground,
  onUpdateElement,
}: {
  element: TextElement;
  palettes: readonly EditorColorPalette[];
  pageBackground: string;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const gradientEnabled = element.textGradientEnabled ?? false;
  const contrast = getTextContrastStatus({
    textColor: element.color,
    textColors: gradientEnabled
      ? [
          element.textGradientFrom ?? "#0ea5e9",
          element.textGradientTo ?? "#a855f7",
        ]
      : undefined,
    backgroundColor: pageBackground,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
  });
  const shouldSuggestColor =
    !contrast.passesAA &&
    (gradientEnabled ||
      contrast.suggestedTextColor.toLowerCase() !== element.color.toLowerCase());
  const suggestedColorLabel = `Use ${contrast.suggestedTextColor} (${contrast.suggestedRatio.toFixed(2)}:1)`;

  return (
    <div className="space-y-4">
      <Field label="Text color">
        <Input
          type="color"
          value={element.color}
          onChange={(event) =>
            onUpdateElement({
              color: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.color}
          palettes={palettes}
          onSelectColor={(color) =>
            onUpdateElement({ color } as Partial<DesignElement>)
          }
        />
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={contrast.passesAA ? "secondary" : "destructive"}>
              {contrast.passesAA ? "AA pass" : "Low contrast"}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {contrast.formattedRatio}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Required: {contrast.requiredRatio.toFixed(1)}:1
            {contrast.isLargeText ? " for large text" : " for normal text"}.
          </p>
          {shouldSuggestColor ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() =>
                onUpdateElement({
                  color: contrast.suggestedTextColor,
                  textGradientEnabled: false,
                } as Partial<DesignElement>)
              }
            >
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: contrast.suggestedTextColor }}
                aria-hidden
              />
              <span>{suggestedColorLabel}</span>
            </Button>
          ) : null}
        </div>
      </Field>
      <Field label="Gradient fill">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Use gradient text
            </span>
            <Switch
              size="sm"
              checked={gradientEnabled}
              onCheckedChange={(textGradientEnabled) =>
                onUpdateElement({
                  textGradientEnabled,
                } as Partial<DesignElement>)
              }
              aria-label="Toggle gradient text"
            />
          </div>
          {gradientEnabled ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <Input
                    type="color"
                    value={element.textGradientFrom ?? "#0ea5e9"}
                    onChange={(event) =>
                      onUpdateElement({
                        textGradientFrom: event.target.value,
                      } as Partial<DesignElement>)
                    }
                  />
                </Field>
                <Field label="To">
                  <Input
                    type="color"
                    value={element.textGradientTo ?? "#a855f7"}
                    onChange={(event) =>
                      onUpdateElement({
                        textGradientTo: event.target.value,
                      } as Partial<DesignElement>)
                    }
                  />
                </Field>
              </div>
              <NumberField
                label="Angle"
                value={element.textGradientAngle ?? 90}
                min={0}
                max={360}
                onChange={(textGradientAngle) =>
                  onUpdateElement({
                    textGradientAngle,
                  } as Partial<DesignElement>)
                }
              />
            </>
          ) : null}
        </div>
      </Field>
    </div>
  );
}

export function TextEffectControls({
  element,
  onUpdateElement,
}: {
  element: TextElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const effect = element.textEffect ?? "none";
  const effectColor = element.textEffectColor ?? "#0f172a";

  return (
    <div className="space-y-4">
      <Field label="Effect">
        <Select
          value={effect}
          onValueChange={(textEffect) =>
            onUpdateElement({ textEffect } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="shadow">Shadow</SelectItem>
            <SelectItem value="glow">Glow</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {effect !== "none" ? (
        <Field label="Effect color">
          <Input
            type="color"
            value={effectColor}
            onChange={(event) =>
              onUpdateElement({
                textEffectColor: event.target.value,
              } as Partial<DesignElement>)
            }
          />
        </Field>
      ) : null}

      {effect === "shadow" || effect === "glow" ? (
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Blur"
            value={element.textEffectBlur ?? 8}
            min={0}
            max={80}
            onChange={(textEffectBlur) =>
              onUpdateElement({ textEffectBlur } as Partial<DesignElement>)
            }
          />
          <NumberField
            label="X"
            value={element.textEffectOffsetX ?? 2}
            min={-80}
            max={80}
            onChange={(textEffectOffsetX) =>
              onUpdateElement({ textEffectOffsetX } as Partial<DesignElement>)
            }
          />
          <NumberField
            label="Y"
            value={element.textEffectOffsetY ?? 2}
            min={-80}
            max={80}
            onChange={(textEffectOffsetY) =>
              onUpdateElement({ textEffectOffsetY } as Partial<DesignElement>)
            }
          />
        </div>
      ) : null}

      {effect === "outline" ? (
        <NumberField
          label="Outline width"
          value={element.textOutlineWidth ?? 2}
          min={0}
          max={24}
          onChange={(textOutlineWidth) =>
            onUpdateElement({ textOutlineWidth } as Partial<DesignElement>)
          }
        />
      ) : null}
    </div>
  );
}
