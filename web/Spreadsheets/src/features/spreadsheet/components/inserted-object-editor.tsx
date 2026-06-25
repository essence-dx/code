"use client";

import {
  ArrowDown,
  ArrowUp,
  BringToFront,
  SendToBack,
  Trash2,
} from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  insertedObjectColorSwatches,
  type InsertedObjectLayerAction,
  type InsertedObjectUpdate,
} from "@/features/spreadsheet/inserted-objects";
import type { InsertedObjectDefinition } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function InsertedObjectEditor({
  disabled,
  object,
  onDeleteObject,
  onReorderObject,
  onUpdateObject,
}: {
  disabled: boolean;
  object: InsertedObjectDefinition;
  onDeleteObject: (objectId: string) => void;
  onReorderObject: (
    objectId: string,
    action: InsertedObjectLayerAction,
  ) => void;
  onUpdateObject: (objectId: string, updates: InsertedObjectUpdate) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`${object.id}-name`}>
          Name
        </label>
        <Input
          id={`${object.id}-name`}
          value={object.name}
          disabled={disabled}
          onChange={(event) =>
            onUpdateObject(object.id, { name: event.target.value })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          disabled={disabled}
          id={`${object.id}-width`}
          label="Width"
          value={object.anchor.width}
          onChange={(width) => onUpdateObject(object.id, { anchor: { width } })}
        />
        <NumberInput
          disabled={disabled}
          id={`${object.id}-height`}
          label="Height"
          value={object.anchor.height}
          onChange={(height) => onUpdateObject(object.id, { anchor: { height } })}
        />
        <NumberInput
          disabled={disabled}
          id={`${object.id}-offset-x`}
          label="Offset X"
          value={object.anchor.offsetX}
          onChange={(offsetX) =>
            onUpdateObject(object.id, { anchor: { offsetX } })
          }
        />
        <NumberInput
          disabled={disabled}
          id={`${object.id}-offset-y`}
          label="Offset Y"
          value={object.anchor.offsetY}
          onChange={(offsetY) =>
            onUpdateObject(object.id, { anchor: { offsetY } })
          }
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium">Fill</p>
        <ColorPicker
          disabled={disabled}
          value={object.format.fillColor ?? "#dbeafe"}
          onChange={(fillColor) =>
            onUpdateObject(object.id, { format: { fillColor } })
          }
        />
        <p className="text-xs font-medium">Stroke</p>
        <ColorPicker
          disabled={disabled}
          value={object.format.strokeColor ?? "#2563eb"}
          onChange={(strokeColor) =>
            onUpdateObject(object.id, { format: { strokeColor } })
          }
        />
      </div>
      {object.kind !== "image" ? (
        <div className="space-y-1">
          <label className="text-xs font-medium" htmlFor={`${object.id}-text`}>
            Text
          </label>
          <Textarea
            id={`${object.id}-text`}
            value={object.text ?? ""}
            disabled={disabled}
            className="min-h-20"
            onChange={(event) =>
              onUpdateObject(object.id, { text: event.target.value })
            }
          />
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-medium" htmlFor={`${object.id}-alt`}>
            Alt text
          </label>
          <Textarea
            id={`${object.id}-alt`}
            value={object.altText ?? ""}
            disabled={disabled}
            className="min-h-16"
            onChange={(event) =>
              onUpdateObject(object.id, { altText: event.target.value })
            }
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        <LayerButton
          disabled={disabled}
          label="Front"
          onClick={() => onReorderObject(object.id, "bringToFront")}
        >
          <BringToFront className="h-3.5 w-3.5" />
        </LayerButton>
        <LayerButton
          disabled={disabled}
          label="Forward"
          onClick={() => onReorderObject(object.id, "bringForward")}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </LayerButton>
        <LayerButton
          disabled={disabled}
          label="Backward"
          onClick={() => onReorderObject(object.id, "sendBackward")}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </LayerButton>
        <LayerButton
          disabled={disabled}
          label="Back"
          onClick={() => onReorderObject(object.id, "sendToBack")}
        >
          <SendToBack className="h-3.5 w-3.5" />
        </LayerButton>
        <ConfirmDestructiveButton
          title="Delete object?"
          description="This removes the selected worksheet object from the workbook."
          label="Delete object"
          disabled={disabled}
          size="sm"
          variant="outline"
          onConfirm={() => onDeleteObject(object.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ConfirmDestructiveButton>
      </div>
    </div>
  );
}

function ColorPicker({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {insertedObjectColorSwatches.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Use ${color}`}
          className={cn(
            "h-6 w-6 rounded-sm border",
            value === color && "ring-2 ring-primary",
          )}
          style={{ backgroundColor: color }}
          disabled={disabled}
          onClick={() => onChange(color)}
        />
      ))}
      <Input
        value={value}
        disabled={disabled}
        className="h-6 w-24 font-mono text-xs"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberInput({
  disabled,
  id,
  label,
  value,
  onChange,
}: {
  disabled: boolean;
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-medium" htmlFor={id}>
      {label}
      <Input
        id={id}
        type="number"
        value={Math.round(value)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function LayerButton({
  children,
  disabled,
  label,
  onClick,
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </Button>
  );
}
