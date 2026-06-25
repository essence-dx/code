"use client";

import { useState } from "react";
import { Palette, RefreshCw, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cellFontFamilyOptions } from "@/features/workbooks/font-families";
import {
  workbookThemePresets,
  type WorkbookThemeUpdate,
} from "@/features/workbooks/workbook-themes";
import type {
  CellStyle,
  WorkbookCellStyleDefinition,
  WorkbookTheme,
  WorkbookThemeColorKey,
} from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

const editableColorKeys = [
  "primary",
  "accent1",
  "accent2",
  "accent3",
  "headerFill",
  "headerText",
  "good",
  "warning",
  "danger",
] satisfies WorkbookThemeColorKey[];

const colorLabels = {
  accent1: "Accent 1",
  accent2: "Accent 2",
  accent3: "Accent 3",
  accent4: "Accent 4",
  danger: "Danger",
  good: "Good",
  headerFill: "Header fill",
  headerText: "Header text",
  neutral: "Neutral",
  primary: "Primary",
  secondary: "Secondary",
  warning: "Warning",
} satisfies Record<WorkbookThemeColorKey, string>;

export function WorkbookThemePanel({
  disabled,
  managedStyles,
  selectedStyle,
  theme,
  onApplyStyle,
  onDeleteManagedStyle,
  onSaveManagedStyle,
  onUpdateManagedStyle,
  onUpdateTheme,
}: {
  disabled: boolean;
  managedStyles: WorkbookCellStyleDefinition[];
  selectedStyle: CellStyle;
  theme: WorkbookTheme;
  onApplyStyle: (style: CellStyle) => void;
  onDeleteManagedStyle: (styleId: string) => void;
  onSaveManagedStyle: (name: string) => void;
  onUpdateManagedStyle: (styleId: string) => void;
  onUpdateTheme: (updates: WorkbookThemeUpdate) => void;
}) {
  const [styleName, setStyleName] = useState("Custom style");
  const selectedStyleCount = Object.keys(selectedStyle).length;

  return (
    <section className="rounded-md border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Workbook theme</h2>
          <p className="text-xs text-muted-foreground">{theme.name}</p>
        </div>
        <Palette className="size-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {workbookThemePresets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={theme.id === preset.id ? "secondary" : "outline"}
            disabled={disabled}
            className="justify-start gap-1 px-2"
            onClick={() => onUpdateTheme({ presetId: preset.id })}
          >
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: preset.colors.accent1 }}
            />
            <span className="truncate">{preset.name}</span>
          </Button>
        ))}
      </div>
      <Separator className="my-3" />
      <div className="grid grid-cols-2 gap-2">
        <ThemeFontSelect
          disabled={disabled}
          label="Body"
          value={theme.fonts.body}
          onChange={(body) => onUpdateTheme({ fonts: { body } })}
        />
        <ThemeFontSelect
          disabled={disabled}
          label="Heading"
          value={theme.fonts.heading}
          onChange={(heading) => onUpdateTheme({ fonts: { heading } })}
        />
      </div>
      <div className="mt-3 grid gap-2">
        {editableColorKeys.map((key) => (
          <ThemeColorInput
            key={key}
            colorKey={key}
            disabled={disabled}
            value={theme.colors[key]}
            onChange={(value) => onUpdateTheme({ colors: { [key]: value } })}
          />
        ))}
      </div>
      <Separator className="my-3" />
      <div className="space-y-2">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Managed styles
          </h3>
          <p className="text-xs text-muted-foreground">
            {managedStyles.length}/24 saved
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={styleName}
            disabled={disabled}
            onChange={(event) => setStyleName(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={disabled || selectedStyleCount === 0}
            onClick={() => onSaveManagedStyle(styleName)}
          >
            Save
          </Button>
        </div>
        {managedStyles.length === 0 ? (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            No saved cell styles.
          </p>
        ) : (
          <div className="space-y-1">
            {managedStyles.map((style) => (
              <div
                key={style.id}
                className="flex items-center gap-2 rounded-md border p-2"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  disabled={disabled}
                  onClick={() => onApplyStyle(style.style)}
                >
                  <StylePreview style={style.style} />
                  <span className="truncate">{style.name}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || selectedStyleCount === 0}
                  onClick={() => onUpdateManagedStyle(style.id)}
                >
                  <RefreshCw className="size-4" />
                  <span className="sr-only">Update {style.name}</span>
                </Button>
                <ConfirmDestructiveButton
                  title="Delete managed style?"
                  description="This removes the saved style. Cells already using it keep their direct formatting."
                  label="Delete managed style"
                  size="icon-sm"
                  disabled={disabled}
                  onConfirm={() => onDeleteManagedStyle(style.id)}
                >
                  <Trash2 className="size-4" />
                </ConfirmDestructiveButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ThemeFontSelect({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  value: CellStyle["fontFamily"];
  onChange: (value: NonNullable<CellStyle["fontFamily"]>) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      <select
        value={value}
        disabled={disabled}
        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) =>
          onChange(event.target.value as NonNullable<CellStyle["fontFamily"]>)
        }
      >
        {cellFontFamilyOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeColorInput({
  colorKey,
  disabled,
  onChange,
  value,
}: {
  colorKey: WorkbookThemeColorKey;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs font-medium">
      <span>{colorLabels[colorKey]}</span>
      <span className="flex items-center gap-1">
        <span
          className={cn("size-5 rounded-sm border", disabled && "opacity-60")}
          style={{ backgroundColor: value }}
        />
        <Input
          value={value}
          disabled={disabled}
          className="h-7 w-24 font-mono text-xs"
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function StylePreview({ style }: { style: CellStyle }) {
  return (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-sm border text-[10px] font-semibold"
      style={{
        backgroundColor: style.background ?? "transparent",
        color: style.foreground,
      }}
    >
      A
    </span>
  );
}
