"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConditionalFormatVisualOptionsUpdate } from "@/features/spreadsheet/state/rule-state";
import type { ConditionalFormatRule } from "@/features/workbooks/types";

function clampThreshold(value: string, fallback: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(numericValue), 0), 100);
}

function getDefaultThresholds(rule: ConditionalFormatRule) {
  return rule.operator === "dataBar"
    ? { low: 0, high: 100 }
    : { low: 34, high: 67 };
}

export function ConditionalFormatVisualOptionsControl({
  disabled,
  rule,
  onUpdate,
}: {
  disabled?: boolean;
  rule: ConditionalFormatRule;
  onUpdate: (
    ruleId: string,
    updates: ConditionalFormatVisualOptionsUpdate,
  ) => void;
}) {
  const defaults = getDefaultThresholds(rule);
  const [minColor, setMinColor] = useState(
    rule.style.scale?.minColor ?? "#dbeafe",
  );
  const [maxColor, setMaxColor] = useState(
    rule.style.scale?.maxColor ?? "#60a5fa",
  );
  const [foreground, setForeground] = useState(
    rule.style.foreground ?? "#111827",
  );
  const [lowThreshold, setLowThreshold] = useState(
    String(rule.style.scale?.thresholds?.low ?? defaults.low),
  );
  const [highThreshold, setHighThreshold] = useState(
    String(rule.style.scale?.thresholds?.high ?? defaults.high),
  );

  useEffect(() => {
    const nextDefaults = getDefaultThresholds(rule);

    setMinColor(rule.style.scale?.minColor ?? "#dbeafe");
    setMaxColor(rule.style.scale?.maxColor ?? "#60a5fa");
    setForeground(rule.style.foreground ?? "#111827");
    setLowThreshold(
      String(rule.style.scale?.thresholds?.low ?? nextDefaults.low),
    );
    setHighThreshold(
      String(rule.style.scale?.thresholds?.high ?? nextDefaults.high),
    );
  }, [rule]);

  function applyOptions() {
    const low = clampThreshold(lowThreshold, defaults.low);
    const high = clampThreshold(highThreshold, defaults.high);

    onUpdate(rule.id, {
      foreground,
      scale: {
        minColor,
        maxColor,
        thresholds: {
          low: Math.min(low, high),
          high: Math.max(low, high),
        },
      },
    });
  }

  return (
    <div className="mt-3 rounded-md border bg-background p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Visual thresholds
        </span>
        <SlidersHorizontal className="size-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Label className="space-y-1 text-xs">
          Low %
          <Input
            type="number"
            min={0}
            max={100}
            value={lowThreshold}
            disabled={disabled}
            className="h-8"
            onChange={(event) => setLowThreshold(event.target.value)}
          />
        </Label>
        <Label className="space-y-1 text-xs">
          High %
          <Input
            type="number"
            min={0}
            max={100}
            value={highThreshold}
            disabled={disabled}
            className="h-8"
            onChange={(event) => setHighThreshold(event.target.value)}
          />
        </Label>
        <Label className="space-y-1 text-xs">
          {rule.operator === "dataBar" ? "Track" : "Low"}
          <Input
            type="color"
            value={minColor}
            disabled={disabled}
            className="h-8 p-1"
            onChange={(event) => setMinColor(event.target.value)}
          />
        </Label>
        <Label className="space-y-1 text-xs">
          {rule.operator === "dataBar" ? "Bar" : "Icon"}
          <Input
            type="color"
            value={maxColor}
            disabled={disabled}
            className="h-8 p-1"
            onChange={(event) => setMaxColor(event.target.value)}
          />
        </Label>
        <Label className="space-y-1 text-xs">
          Text
          <Input
            type="color"
            value={foreground}
            disabled={disabled}
            className="h-8 p-1"
            onChange={(event) => setForeground(event.target.value)}
          />
        </Label>
        <div className="flex items-end">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={disabled}
            onClick={applyOptions}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
