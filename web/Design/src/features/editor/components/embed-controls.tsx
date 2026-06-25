"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ColorField,
  Field,
  NumberField,
} from "@/features/editor/components/form-control-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import { getSafeHttpUrl } from "@/features/editor/link-utils";
import type {
  DesignElement,
  EmbedElement,
  EmbedMode,
} from "@/features/editor/types";

type EmbedControlsProps = {
  element: EmbedElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

const embedModes = [
  { value: "card", label: "Link card" },
  { value: "iframe", label: "Iframe preview" },
] satisfies Array<{ value: EmbedMode; label: string }>;

export function EmbedControls({
  element,
  palettes,
  onUpdateElement,
}: EmbedControlsProps) {
  const safeUrl = getSafeHttpUrl(element.url);

  return (
    <div className="space-y-4">
      <Field label="Mode">
        <Select
          value={element.embedMode}
          onValueChange={(embedMode) =>
            onUpdateElement({
              embedMode: embedMode as EmbedMode,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {embedModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="URL">
        <div className="flex gap-2">
          <Input
            type="url"
            value={element.url}
            onChange={(event) =>
              onUpdateElement({
                url: event.target.value,
                linkUrl: event.target.value,
              } as Partial<DesignElement>)
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!safeUrl}
            onClick={() => {
              if (safeUrl) {
                window.open(safeUrl, "_blank", "noopener");
              }
            }}
            aria-label="Open embed URL"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </Field>

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

      <Field label="Description">
        <Textarea
          value={element.description}
          onChange={(event) =>
            onUpdateElement({
              description: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
        <span className="text-xs text-muted-foreground">Show URL</span>
        <Switch
          checked={element.showUrl}
          onCheckedChange={(showUrl) =>
            onUpdateElement({ showUrl } as Partial<DesignElement>)
          }
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Size"
          value={element.fontSize}
          min={8}
          max={80}
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
        <NumberField
          label="Radius"
          value={element.radius}
          min={0}
          max={80}
          onChange={(radius) =>
            onUpdateElement({ radius } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Padding"
          value={element.padding}
          min={0}
          max={60}
          onChange={(padding) =>
            onUpdateElement({ padding } as Partial<DesignElement>)
          }
        />
      </div>

      <NumberField
        label="Border width"
        value={element.borderWidth}
        min={0}
        max={16}
        onChange={(borderWidth) =>
          onUpdateElement({ borderWidth } as Partial<DesignElement>)
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Text"
          value={element.textColor}
          palettes={palettes}
          onChange={(textColor) =>
            onUpdateElement({ textColor } as Partial<DesignElement>)
          }
        />
        <ColorField
          label="Accent"
          value={element.accentColor}
          palettes={palettes}
          onChange={(accentColor) =>
            onUpdateElement({ accentColor } as Partial<DesignElement>)
          }
        />
        <ColorField
          label="Surface"
          value={element.surfaceColor}
          palettes={palettes}
          onChange={(surfaceColor) =>
            onUpdateElement({ surfaceColor } as Partial<DesignElement>)
          }
        />
        <ColorField
          label="Border"
          value={element.borderColor}
          palettes={palettes}
          onChange={(borderColor) =>
            onUpdateElement({ borderColor } as Partial<DesignElement>)
          }
        />
      </div>
    </div>
  );
}
