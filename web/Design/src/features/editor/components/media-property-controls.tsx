"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  AdjustmentSlider,
  Field,
  NumberField,
  ToggleRow,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import type {
  AudioElement,
  DesignElement,
  LottieElement,
  PdfElement,
  SvgElement,
  VideoElement,
} from "@/features/editor/types";

export function MediaControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: DesignElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  switch (element.type) {
    case "video":
      return (
        <VideoControls
          element={element}
          onUpdateElement={onUpdateElement}
        />
      );
    case "audio":
      return (
        <AudioControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      );
    case "pdf":
      return (
        <PdfControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      );
    case "svg":
      return (
        <SvgControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      );
    case "lottie":
      return (
        <LottieControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      );
    default:
      return null;
  }
}

export function VideoControls({
  element,
  onUpdateElement,
}: {
  element: VideoElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input
          value={element.title}
          onChange={(event) =>
            onUpdateElement({
              title: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Fit">
        <Select
          value={element.objectFit}
          onValueChange={(objectFit: VideoElement["objectFit"]) =>
            onUpdateElement({ objectFit } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Fill frame</SelectItem>
            <SelectItem value="contain">Fit video</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-3">
        <ToggleRow
          label="Controls"
          checked={element.showControls}
          onCheckedChange={(showControls) =>
            onUpdateElement({ showControls } as Partial<DesignElement>)
          }
        />
        <ToggleRow
          label="Muted"
          checked={element.muted}
          onCheckedChange={(muted) =>
            onUpdateElement({ muted } as Partial<DesignElement>)
          }
        />
        <ToggleRow
          label="Loop"
          checked={element.loop}
          onCheckedChange={(loop) =>
            onUpdateElement({ loop } as Partial<DesignElement>)
          }
        />
        <ToggleRow
          label="Autoplay"
          checked={element.autoplay}
          onCheckedChange={(autoplay) =>
            onUpdateElement({ autoplay } as Partial<DesignElement>)
          }
        />
      </div>
    </div>
  );
}

export function AudioControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: AudioElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input
          value={element.title}
          onChange={(event) =>
            onUpdateElement({
              title: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      {element.licenseName || element.sourceProvider ? (
        <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            {element.licenseName ?? "Licensed audio"}
          </div>
          <div className="mt-1">
            {[element.authorName, element.sourceProvider]
              .filter(Boolean)
              .join(" / ")}
          </div>
          {element.licenseUrl ? (
            <a
              href={element.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-foreground underline-offset-4 hover:underline"
            >
              License details
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3">
        <ToggleRow
          label="Controls"
          checked={element.showControls}
          onCheckedChange={(showControls) =>
            onUpdateElement({ showControls } as Partial<DesignElement>)
          }
        />
        <ToggleRow
          label="Loop"
          checked={element.loop}
          onCheckedChange={(loop) =>
            onUpdateElement({ loop } as Partial<DesignElement>)
          }
        />
      </div>
      <NumberField
        label="Radius"
        value={element.radius}
        min={0}
        onChange={(radius) =>
          onUpdateElement({ radius } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Padding"
        value={element.padding}
        min={0}
        onChange={(padding) =>
          onUpdateElement({ padding } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Border"
        value={element.borderWidth}
        min={0}
        onChange={(borderWidth) =>
          onUpdateElement({ borderWidth } as Partial<DesignElement>)
        }
      />
      <Field label="Text color">
        <Input
          type="color"
          value={element.textColor}
          onChange={(event) =>
            onUpdateElement({
              textColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.textColor}
          palettes={palettes}
          onSelectColor={(textColor) =>
            onUpdateElement({ textColor } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Accent color">
        <Input
          type="color"
          value={element.accentColor}
          onChange={(event) =>
            onUpdateElement({
              accentColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.accentColor}
          palettes={palettes}
          onSelectColor={(accentColor) =>
            onUpdateElement({ accentColor } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Surface color">
        <Input
          type="color"
          value={element.surfaceColor}
          onChange={(event) =>
            onUpdateElement({
              surfaceColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Border color">
        <Input
          type="color"
          value={element.borderColor}
          onChange={(event) =>
            onUpdateElement({
              borderColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
    </div>
  );
}

export function PdfControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: PdfElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input
          value={element.title}
          onChange={(event) =>
            onUpdateElement({
              title: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <NumberField
        label="Page"
        value={element.pageNumber}
        min={1}
        onChange={(pageNumber) =>
          onUpdateElement({
            pageNumber: Math.max(1, Math.round(pageNumber)),
          } as Partial<DesignElement>)
        }
      />
      <ToggleRow
        label="PDF toolbar"
        checked={element.showToolbar}
        onCheckedChange={(showToolbar) =>
          onUpdateElement({ showToolbar } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Radius"
        value={element.radius}
        min={0}
        onChange={(radius) =>
          onUpdateElement({ radius } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Padding"
        value={element.padding}
        min={0}
        onChange={(padding) =>
          onUpdateElement({ padding } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Border"
        value={element.borderWidth}
        min={0}
        onChange={(borderWidth) =>
          onUpdateElement({ borderWidth } as Partial<DesignElement>)
        }
      />
      <Field label="Text color">
        <Input
          type="color"
          value={element.textColor}
          onChange={(event) =>
            onUpdateElement({
              textColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.textColor}
          palettes={palettes}
          onSelectColor={(textColor) =>
            onUpdateElement({ textColor } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Accent color">
        <Input
          type="color"
          value={element.accentColor}
          onChange={(event) =>
            onUpdateElement({
              accentColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.accentColor}
          palettes={palettes}
          onSelectColor={(accentColor) =>
            onUpdateElement({ accentColor } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Surface color">
        <Input
          type="color"
          value={element.surfaceColor}
          onChange={(event) =>
            onUpdateElement({
              surfaceColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Border color">
        <Input
          type="color"
          value={element.borderColor}
          onChange={(event) =>
            onUpdateElement({
              borderColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
    </div>
  );
}

export function SvgControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: SvgElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="SVG vector">
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
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Preserve original colors
          </span>
          <Switch
            size="sm"
            checked={element.preserveColors}
            onCheckedChange={(preserveColors) =>
              onUpdateElement({
                preserveColors,
              } as Partial<DesignElement>)
            }
            aria-label="Toggle original SVG colors"
          />
        </div>
        {!element.preserveColors ? (
          <>
            <Field label="Fill">
              <Input
                type="color"
                value={element.fillColor}
                onChange={(event) =>
                  onUpdateElement({
                    fillColor: event.target.value,
                  } as Partial<DesignElement>)
                }
              />
              <ColorPalettePicker
                selectedColor={element.fillColor}
                palettes={palettes}
                onSelectColor={(fillColor) =>
                  onUpdateElement({ fillColor } as Partial<DesignElement>)
                }
              />
            </Field>
            <Field label="Stroke">
              <Input
                type="color"
                value={element.strokeColor}
                onChange={(event) =>
                  onUpdateElement({
                    strokeColor: event.target.value,
                  } as Partial<DesignElement>)
                }
              />
            </Field>
            <AdjustmentSlider
              label="Stroke"
              value={element.strokeWidth}
              min={0}
              max={12}
              suffix="px"
              onChange={(strokeWidth) =>
                onUpdateElement({ strokeWidth } as Partial<DesignElement>)
              }
            />
          </>
        ) : null}
      </div>
    </Field>
  );
}

export function LottieControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: LottieElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
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
      <div className="grid gap-3">
        <ToggleRow
          label="Loop"
          checked={element.loop}
          onCheckedChange={(loop) =>
            onUpdateElement({ loop } as Partial<DesignElement>)
          }
        />
        <ToggleRow
          label="Autoplay"
          checked={element.autoplay}
          onCheckedChange={(autoplay) =>
            onUpdateElement({ autoplay } as Partial<DesignElement>)
          }
        />
      </div>
      <AdjustmentSlider
        label="Speed"
        value={Math.round(element.playbackSpeed * 10) / 10}
        min={0.1}
        max={4}
        step={0.1}
        suffix="x"
        onChange={(playbackSpeed) =>
          onUpdateElement({
            playbackSpeed: Math.max(0.1, Math.min(4, playbackSpeed)),
          } as Partial<DesignElement>)
        }
      />
      <Field label="Background">
        <Input
          type="color"
          value={element.backgroundColor}
          onChange={(event) =>
            onUpdateElement({
              backgroundColor: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.backgroundColor}
          palettes={palettes}
          onSelectColor={(backgroundColor) =>
            onUpdateElement({ backgroundColor } as Partial<DesignElement>)
          }
        />
      </Field>
    </div>
  );
}
