"use client";

import { useMemo, useState } from "react";
import { Palette, RefreshCw, Save, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  CellStyle,
  WorkbookCellStyleDefinition,
} from "@/features/workbooks/types";
import type { CellStylePreset } from "@/features/workbooks/workbook-themes";

export function CellStyleManagerDropdown({
  cellStylePresets,
  disabled,
  managedStyles,
  selectedStyle,
  onApplyStyle,
  onDeleteManagedStyle,
  onSaveManagedStyle,
  onUpdateManagedStyle,
}: {
  cellStylePresets: CellStylePreset[];
  disabled: boolean;
  managedStyles: WorkbookCellStyleDefinition[];
  selectedStyle: CellStyle;
  onApplyStyle: (style: CellStyle) => void;
  onDeleteManagedStyle: (styleId: string) => void;
  onSaveManagedStyle: (name: string) => void;
  onUpdateManagedStyle: (styleId: string, name?: string) => void;
}) {
  const [styleName, setStyleName] = useState("Custom style");
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const managedStyleIds = useMemo(
    () => new Set(managedStyles.map((style) => style.id)),
    [managedStyles],
  );
  const themePresets = useMemo(
    () => cellStylePresets.filter((preset) => !managedStyleIds.has(preset.id)),
    [cellStylePresets, managedStyleIds],
  );
  const selectedStyleCount = Object.keys(selectedStyle).length;
  const canCaptureSelection = !disabled && selectedStyleCount > 0;

  function saveCurrentStyle() {
    onSaveManagedStyle(styleName);
    setStyleName("Custom style");
  }

  function updateStyleName(styleId: string, value: string) {
    setEditedNames((currentNames) => ({
      ...currentNames,
      [styleId]: value,
    }));
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
            >
              <Palette />
              <span className="sr-only">Cell styles</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Cell styles</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="max-h-[75vh] w-96 overflow-y-auto">
        <DropdownMenuLabel>Cell styles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-2 p-2">
          <div className="flex gap-2">
            <Input
              value={styleName}
              aria-label="Workbook style name"
              className="h-8"
              disabled={disabled}
              onChange={(event) => setStyleName(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <Button
              type="button"
              size="sm"
              disabled={!canCaptureSelection}
              onClick={saveCurrentStyle}
            >
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme presets</DropdownMenuLabel>
        {themePresets.map((preset) => (
          <DropdownMenuItem
            key={preset.id}
            onSelect={() => onApplyStyle(preset.style)}
          >
            <StylePreview style={preset.style} className="mr-2" />
            {preset.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Workbook styles</DropdownMenuLabel>
        {managedStyles.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No workbook styles saved.
          </p>
        ) : (
          <div className="space-y-1 p-2 pt-0">
            {managedStyles.map((style) => {
              const editedName = editedNames[style.id] ?? style.name;

              return (
                <div
                  key={style.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border p-2"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => onApplyStyle(style.style)}
                  >
                    <StylePreview style={style.style} />
                    <span className="sr-only">Apply {style.name}</span>
                  </Button>
                  <Input
                    value={editedName}
                    aria-label={`${style.name} style name`}
                    className="h-8 min-w-0 text-xs"
                    disabled={disabled}
                    onChange={(event) =>
                      updateStyleName(style.id, event.target.value)
                    }
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canCaptureSelection}
                    onClick={() => onUpdateManagedStyle(style.id, editedName)}
                  >
                    <RefreshCw className="size-4" />
                    <span className="sr-only">Update {style.name}</span>
                  </Button>
                  <ConfirmDestructiveButton
                    title="Delete workbook style?"
                    description="This removes the saved style. Existing cells keep their current direct formatting."
                    label={`Delete ${style.name}`}
                    disabled={disabled}
                    onConfirm={() => onDeleteManagedStyle(style.id)}
                  >
                    <Trash2 className="size-4" />
                  </ConfirmDestructiveButton>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StylePreview({
  className = "",
  style,
}: {
  className?: string;
  style: CellStyle;
}) {
  return (
    <span
      className={`grid size-5 shrink-0 place-items-center rounded-sm border text-[10px] font-semibold ${className}`}
      style={{
        backgroundColor: style.background ?? "transparent",
        color: style.foreground,
      }}
    >
      A
    </span>
  );
}
