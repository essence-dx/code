"use client";

import { useState, type ReactNode } from "react";
import { Play, Save, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { columnLabel } from "@/features/workbooks/addresses";
import type {
  SheetFilterCondition,
  SheetFilterPreset,
  SheetFilterRule,
} from "@/features/workbooks/types";

const filterLabels: Record<SheetFilterRule["type"], string> = {
  equals: "=",
  notEquals: "<>",
  contains: "contains",
  doesNotContain: "does not contain",
  oneOf: "selected values",
  cellColor: "cell color",
  fontColor: "font color",
  icon: "icon",
  startsWith: "starts with",
  endsWith: "ends with",
  empty: "empty",
  notEmpty: "not empty",
  greaterThan: ">",
  greaterThanOrEqual: ">=",
  lessThan: "<",
  lessThanOrEqual: "<=",
};

function formatCondition(condition: SheetFilterCondition) {
  if (condition.type === "empty" || condition.type === "notEmpty") {
    return filterLabels[condition.type];
  }

  if (condition.type === "oneOf") {
    const values = condition.values ?? [];

    return `selected ${values.length} value${values.length === 1 ? "" : "s"}`;
  }

  if (
    condition.type === "cellColor" ||
    condition.type === "fontColor" ||
    condition.type === "icon"
  ) {
    const values = condition.values ?? [];

    return `${filterLabels[condition.type]} ${values.length} selected`;
  }

  return `${filterLabels[condition.type]} ${condition.value}`;
}

function formatFilterPreview(rule: SheetFilterRule) {
  if (rule.criteriaGroups && rule.criteriaGroups.length > 0) {
    return `${rule.criteriaGroups.length} criteria row${
      rule.criteriaGroups.length === 1 ? "" : "s"
    }`;
  }

  const column = rule.headerName
    ? `${rule.headerName} (${columnLabel(rule.columnIndex)})`
    : columnLabel(rule.columnIndex);
  const conditions = rule.conditions ?? [];

  if (conditions.length > 0) {
    return `${column} ${conditions
      .map(formatCondition)
      .join(rule.joiner === "or" ? " OR " : " AND ")}`;
  }

  return `${column} ${formatCondition({
    type: rule.type,
    value: rule.value,
    values: rule.values,
  })}`;
}

function PresetActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={onClick}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function FilterPresetsPanel({
  disabled,
  filterCount,
  presets,
  onApplyPreset,
  onDeletePreset,
  onSavePreset,
}: {
  disabled?: boolean;
  filterCount: number;
  presets: SheetFilterPreset[];
  onApplyPreset: (presetId: string) => string | null;
  onDeletePreset: (presetId: string) => void;
  onSavePreset: (name: string) => string | null;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function savePreset() {
    const result = onSavePreset(name);

    setMessage(result);

    if (!result) {
      setName("");
    }
  }

  function applyPreset(presetId: string) {
    setMessage(onApplyPreset(presetId));
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filter presets</h2>
        <Badge variant="secondary" className="font-mono">
          {presets.length}
        </Badge>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
          placeholder={`Filter preset ${presets.length + 1}`}
          className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || filterCount === 0}
          onClick={savePreset}
        >
          <Save />
          Save
        </Button>
      </div>
      {message ? (
        <p className="mt-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {presets.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No saved filter presets on this sheet.
          </p>
        ) : (
          presets.map((preset) => (
            <section
              key={preset.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{preset.name}</h3>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {preset.filters.length} filter
                  {preset.filters.length === 1 ? "" : "s"}
                  {preset.filters[0]
                    ? ` - ${formatFilterPreview(preset.filters[0])}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <PresetActionButton
                  label="Apply filter preset"
                  disabled={disabled}
                  onClick={() => applyPreset(preset.id)}
                >
                  <Play />
                </PresetActionButton>
                <ConfirmDestructiveButton
                  title="Delete this filter preset?"
                  description="This removes the saved preset. Current filters on the sheet are not changed."
                  label="Delete filter preset"
                  disabled={disabled}
                  onConfirm={() => onDeletePreset(preset.id)}
                >
                  <Trash2 />
                </ConfirmDestructiveButton>
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
