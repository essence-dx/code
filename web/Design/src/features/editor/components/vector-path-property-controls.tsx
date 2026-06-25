"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import { FillStyleControls } from "@/features/editor/components/fill-style-controls";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import {
  getVectorPathPresetLabel,
  updateVectorPathSegment,
} from "@/features/editor/vector-path";
import type { DesignElement, VectorPathElement } from "@/features/editor/types";

export function VectorPathControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: VectorPathElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Bezier path">
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={element.name}
            onChange={(event) =>
              onUpdateElement({
                name: event.target.value,
              } as Partial<DesignElement>)
            }
          />
        </Field>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {element.booleanOperation
            ? `${getBooleanOperationLabel(element.booleanOperation)} boolean shape`
            : element.pathPreset
              ? `${getVectorPathPresetLabel(element.pathPreset)} preset`
              : "Custom path"}
          {" / "}
          {element.booleanSourceElementIds?.length
            ? `${element.booleanSourceElementIds.length} source layers`
            : `${element.segments.length} Bezier segment${
                element.segments.length === 1 ? "" : "s"
              }`}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Closed shape</span>
          <Switch
            size="sm"
            checked={element.closed}
            onCheckedChange={(closed) =>
              onUpdateElement({ closed } as Partial<DesignElement>)
            }
            aria-label="Toggle closed Bezier path"
          />
        </div>

        <FillStyleControls
          element={element}
          palettes={palettes}
          disabled={!element.closed}
          onUpdateElement={onUpdateElement}
        />

        <Field label="Stroke">
          <Input
            type="color"
            value={element.stroke}
            onChange={(event) =>
              onUpdateElement({
                stroke: event.target.value,
              } as Partial<DesignElement>)
            }
          />
          <ColorPalettePicker
            selectedColor={element.stroke}
            palettes={palettes}
            onSelectColor={(stroke) =>
              onUpdateElement({ stroke } as Partial<DesignElement>)
            }
          />
        </Field>

        <NumberField
          label="Stroke width"
          value={element.strokeWidth}
          min={0}
          max={96}
          onChange={(strokeWidth) =>
            onUpdateElement({ strokeWidth } as Partial<DesignElement>)
          }
        />

        {element.booleanOperation ? null : (
          <>
            <Field label="Start point">
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="X"
                  value={element.startX}
                  onChange={(startX) =>
                    onUpdateElement({ startX } as Partial<DesignElement>)
                  }
                />
                <NumberField
                  label="Y"
                  value={element.startY}
                  onChange={(startY) =>
                    onUpdateElement({ startY } as Partial<DesignElement>)
                  }
                />
              </div>
            </Field>

            {element.segments.map((segment, index) => (
              <Field key={index} label={`Segment ${index + 1}`}>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="C1 X"
                    value={segment.control1X}
                    onChange={(control1X) =>
                      onUpdateElement({
                        segments: updateVectorPathSegment(
                          element.segments,
                          index,
                          { control1X },
                        ),
                      } as Partial<DesignElement>)
                    }
                  />
                  <NumberField
                    label="C1 Y"
                    value={segment.control1Y}
                    onChange={(control1Y) =>
                      onUpdateElement({
                        segments: updateVectorPathSegment(
                          element.segments,
                          index,
                          { control1Y },
                        ),
                      } as Partial<DesignElement>)
                    }
                  />
                  <NumberField
                    label="C2 X"
                    value={segment.control2X}
                    onChange={(control2X) =>
                      onUpdateElement({
                        segments: updateVectorPathSegment(
                          element.segments,
                          index,
                          { control2X },
                        ),
                      } as Partial<DesignElement>)
                    }
                  />
                  <NumberField
                    label="C2 Y"
                    value={segment.control2Y}
                    onChange={(control2Y) =>
                      onUpdateElement({
                        segments: updateVectorPathSegment(
                          element.segments,
                          index,
                          { control2Y },
                        ),
                      } as Partial<DesignElement>)
                    }
                  />
                  <NumberField
                    label="End X"
                    value={segment.x}
                    onChange={(x) =>
                      onUpdateElement({
                        segments: updateVectorPathSegment(
                          element.segments,
                          index,
                          { x },
                        ),
                      } as Partial<DesignElement>)
                    }
                  />
                  <NumberField
                    label="End Y"
                    value={segment.y}
                    onChange={(y) =>
                      onUpdateElement({
                        segments: updateVectorPathSegment(
                          element.segments,
                          index,
                          { y },
                        ),
                      } as Partial<DesignElement>)
                    }
                  />
                </div>
              </Field>
            ))}
          </>
        )}
      </div>
    </Field>
  );
}

function getBooleanOperationLabel(
  operation: NonNullable<VectorPathElement["booleanOperation"]>,
) {
  if (operation === "subtract") return "Subtract";
  if (operation === "intersect") return "Intersect";
  if (operation === "exclude") return "Exclude";
  return "Union";
}
