"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type {
  DesignElement,
  FormElement,
  FormFieldKind,
} from "@/features/editor/types";

type FormControlsProps = {
  element: FormElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

const fieldKinds = [
  { value: "input", label: "Input" },
  { value: "textarea", label: "Textarea" },
  { value: "checkbox", label: "Checkbox" },
  { value: "dropdown", label: "Dropdown" },
  { value: "button", label: "Button" },
] satisfies Array<{ value: FormFieldKind; label: string }>;

export function FormControls({
  element,
  palettes,
  onUpdateElement,
}: FormControlsProps) {
  const optionsText = element.options.join("\n");
  const dropdownOptions =
    element.options.length > 0 ? element.options : ["Option"];

  return (
    <div className="space-y-4">
      <Field label="Kind">
        <Select
          value={element.fieldKind}
          onValueChange={(fieldKind) =>
            onUpdateElement(
              getFieldKindUpdates(element, fieldKind as FormFieldKind),
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldKinds.map((fieldKind) => (
              <SelectItem key={fieldKind.value} value={fieldKind.value}>
                {fieldKind.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {element.fieldKind !== "button" ? (
        <Field label="Label">
          <Input
            value={element.label}
            onChange={(event) =>
              onUpdateElement({
                label: event.target.value,
              } as Partial<DesignElement>)
            }
          />
        </Field>
      ) : null}

      {element.fieldKind === "checkbox" ? (
        <>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <Label className="text-xs text-muted-foreground">Checked</Label>
            <Switch
              checked={element.checked}
              onCheckedChange={(checked) =>
                onUpdateElement({ checked } as Partial<DesignElement>)
              }
            />
          </div>
          <Field label="Checkbox text">
            <Input
              value={element.value}
              onChange={(event) =>
                onUpdateElement({
                  value: event.target.value,
                } as Partial<DesignElement>)
              }
            />
          </Field>
        </>
      ) : null}

      {element.fieldKind === "button" ? (
        <Field label="Button text">
          <Input
            value={element.value}
            onChange={(event) =>
              onUpdateElement({
                value: event.target.value,
              } as Partial<DesignElement>)
            }
          />
        </Field>
      ) : null}

      {element.fieldKind === "dropdown" ? (
        <>
          <Field label="Options">
            <Textarea
              value={optionsText}
              onChange={(event) =>
                onUpdateElement({
                  options: normalizeOptions(event.target.value),
                } as Partial<DesignElement>)
              }
            />
          </Field>
          <Field label="Selected">
            <Select
              value={element.value || dropdownOptions[0]}
              onValueChange={(value) =>
                onUpdateElement({ value } as Partial<DesignElement>)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                {dropdownOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}

      {element.fieldKind === "input" || element.fieldKind === "textarea" ? (
        <>
          <Field label="Value">
            <Input
              value={element.value}
              onChange={(event) =>
                onUpdateElement({
                  value: event.target.value,
                } as Partial<DesignElement>)
              }
            />
          </Field>
          <Field label="Placeholder">
            <Input
              value={element.placeholder}
              onChange={(event) =>
                onUpdateElement({
                  placeholder: event.target.value,
                } as Partial<DesignElement>)
              }
            />
          </Field>
        </>
      ) : null}

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
          label="Field"
          value={element.fieldColor}
          palettes={palettes}
          onChange={(fieldColor) =>
            onUpdateElement({ fieldColor } as Partial<DesignElement>)
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

function normalizeOptions(value: string) {
  const options = value
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 12);

  return options.length > 0 ? options : ["Option"];
}

function getFieldKindUpdates(
  element: FormElement,
  fieldKind: FormFieldKind,
): Partial<DesignElement> {
  const updates: Partial<FormElement> = { fieldKind };

  if (fieldKind === "button" && element.fieldKind !== "button") {
    updates.label = "";
    updates.value = element.value || "Submit";
    updates.textColor = "#ffffff";
  }

  if (fieldKind === "dropdown" && element.fieldKind !== "dropdown") {
    const options =
      element.options.length > 0
        ? element.options
        : ["Small", "Medium", "Large"];

    updates.options = options;
    updates.value = element.value || options[0];
  }

  if (fieldKind === "checkbox" && element.fieldKind !== "checkbox") {
    updates.label = element.label || "I agree";
  }

  if (fieldKind === "input" && element.fieldKind !== "input") {
    updates.placeholder = element.placeholder || "name@example.com";
  }

  if (fieldKind === "textarea" && element.fieldKind !== "textarea") {
    updates.placeholder = element.placeholder || "Write a message";
  }

  return updates as Partial<DesignElement>;
}
