"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  AdjustmentSlider,
  Field,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import {
  fillPatterns,
  fillStyleModes,
  fillTextures,
  getFillMode,
  getFillStyleDefaults,
  getGradientAngle,
  getGradientFrom,
  getGradientTo,
  getPatternColor,
  getPatternKind,
  getPatternScale,
  getTextureKind,
  getTextureOpacity,
} from "@/features/editor/fill-styles";
import type {
  DesignElement,
  FillPatternKind,
  FillStyleMode,
  FillTextureKind,
  ShapeElement,
  VectorPathElement,
} from "@/features/editor/types";

type FillableElement = ShapeElement | VectorPathElement;

export function FillStyleControls({
  element,
  palettes,
  disabled = false,
  onUpdateElement,
}: {
  element: FillableElement;
  palettes: readonly EditorColorPalette[];
  disabled?: boolean;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const mode = getFillMode(element);

  return (
    <Field label="Fill">
      <div className="space-y-4">
        <Field label="Style">
          <Select
            value={mode}
            disabled={disabled}
            onValueChange={(value) => {
              const fillMode = value as FillStyleMode;

              onUpdateElement({
                ...getFillStyleDefaults(fillMode, element.fill),
              } as Partial<DesignElement>);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fillStyleModes.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {mode === "solid" ? (
          <ColorField
            label="Color"
            value={element.fill}
            palettes={palettes}
            disabled={disabled}
            onChange={(fill) =>
              onUpdateElement({ fill } as Partial<DesignElement>)
            }
          />
        ) : null}

        {mode === "linear-gradient" || mode === "radial-gradient" ? (
          <div className="space-y-4">
            <ColorField
              label="Start"
              value={getGradientFrom(element)}
              palettes={palettes}
              disabled={disabled}
              onChange={(fillGradientFrom) =>
                onUpdateElement({
                  fillGradientFrom,
                  fill: fillGradientFrom,
                } as Partial<DesignElement>)
              }
            />
            <ColorField
              label="End"
              value={getGradientTo(element)}
              palettes={palettes}
              disabled={disabled}
              onChange={(fillGradientTo) =>
                onUpdateElement({ fillGradientTo } as Partial<DesignElement>)
              }
            />
            {mode === "linear-gradient" ? (
              <AdjustmentSlider
                label="Angle"
                value={getGradientAngle(element)}
                min={0}
                max={360}
                suffix="deg"
                onChange={(fillGradientAngle) =>
                  onUpdateElement({
                    fillGradientAngle,
                  } as Partial<DesignElement>)
                }
              />
            ) : null}
          </div>
        ) : null}

        {mode === "pattern" ? (
          <div className="space-y-4">
            <Field label="Pattern">
              <Select
                value={getPatternKind(element)}
                disabled={disabled}
                onValueChange={(fillPattern) =>
                  onUpdateElement({
                    fillPattern: fillPattern as FillPatternKind,
                  } as Partial<DesignElement>)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fillPatterns.map((pattern) => (
                    <SelectItem key={pattern.id} value={pattern.id}>
                      {pattern.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ColorField
              label="Base"
              value={element.fill}
              palettes={palettes}
              disabled={disabled}
              onChange={(fill) =>
                onUpdateElement({ fill } as Partial<DesignElement>)
              }
            />
            <ColorField
              label="Pattern color"
              value={getPatternColor(element)}
              palettes={palettes}
              disabled={disabled}
              onChange={(fillPatternColor) =>
                onUpdateElement({
                  fillPatternColor,
                } as Partial<DesignElement>)
              }
            />
            <AdjustmentSlider
              label="Scale"
              value={getPatternScale(element)}
              min={6}
              max={64}
              suffix="px"
              onChange={(fillPatternScale) =>
                onUpdateElement({
                  fillPatternScale,
                } as Partial<DesignElement>)
              }
            />
          </div>
        ) : null}

        {mode === "texture" ? (
          <div className="space-y-4">
            <Field label="Texture">
              <Select
                value={getTextureKind(element)}
                disabled={disabled}
                onValueChange={(fillTexture) =>
                  onUpdateElement({
                    fillTexture: fillTexture as FillTextureKind,
                  } as Partial<DesignElement>)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fillTextures.map((texture) => (
                    <SelectItem key={texture.id} value={texture.id}>
                      {texture.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ColorField
              label="Base"
              value={element.fill}
              palettes={palettes}
              disabled={disabled}
              onChange={(fill) =>
                onUpdateElement({ fill } as Partial<DesignElement>)
              }
            />
            <ColorField
              label="Texture color"
              value={getPatternColor(element)}
              palettes={palettes}
              disabled={disabled}
              onChange={(fillPatternColor) =>
                onUpdateElement({
                  fillPatternColor,
                } as Partial<DesignElement>)
              }
            />
            <AdjustmentSlider
              label="Scale"
              value={getPatternScale(element)}
              min={6}
              max={64}
              suffix="px"
              onChange={(fillPatternScale) =>
                onUpdateElement({
                  fillPatternScale,
                } as Partial<DesignElement>)
              }
            />
            <AdjustmentSlider
              label="Intensity"
              value={Math.round(getTextureOpacity(element) * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(fillTextureIntensity) =>
                onUpdateElement({
                  fillTextureIntensity,
                } as Partial<DesignElement>)
              }
            />
          </div>
        ) : null}
      </div>
    </Field>
  );
}

function ColorField({
  label,
  value,
  palettes,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  palettes: readonly EditorColorPalette[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="color"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {disabled ? null : (
        <ColorPalettePicker
          selectedColor={value}
          palettes={palettes}
          onSelectColor={onChange}
        />
      )}
    </Field>
  );
}
