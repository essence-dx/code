"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  ConditionalFormatOperator,
  ConditionalFormatStyle,
} from "@/features/workbooks/types";

const operatorOptions: Array<{
  value: ConditionalFormatOperator;
  label: string;
  needsValue: boolean;
}> = [
  { value: "greaterThan", label: "Greater than", needsValue: true },
  { value: "lessThan", label: "Less than", needsValue: true },
  { value: "contains", label: "Contains text", needsValue: true },
  { value: "notEmpty", label: "Not empty", needsValue: false },
  { value: "duplicate", label: "Duplicate values", needsValue: false },
  { value: "topValues", label: "Top values", needsValue: true },
  { value: "bottomValues", label: "Bottom values", needsValue: true },
  { value: "colorScale", label: "Color scale", needsValue: false },
  { value: "dataBar", label: "Data bars", needsValue: false },
  { value: "iconSet", label: "Icon set", needsValue: false },
  { value: "formula", label: "Formula", needsValue: true },
];

const defaultFill = "#dcfce7";
const defaultText = "#14532d";
const fillSwatches = [defaultFill, "#dbeafe", "#fef3c7", "#fee2e2", "#f5d0fe"];
const textSwatches = [defaultText, "#1e3a8a", "#713f12", "#7f1d1d", "#581c87"];
const scaleColors = ["#fee2e2", "#fef3c7", "#dcfce7", "#dbeafe", "#e9d5ff"];

function needsRuleValue(operator: ConditionalFormatOperator) {
  return operatorOptions.some(
    (option) => option.value === operator && option.needsValue,
  );
}

function clampThreshold(value: string, fallback: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(numericValue), 0), 100);
}

function defaultThresholdsForOperator(operator: ConditionalFormatOperator) {
  return operator === "dataBar"
    ? { low: 0, high: 100 }
    : { low: 34, high: 67 };
}

export function ConditionalFormatDialog({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (rule: {
    operator: ConditionalFormatOperator;
    value: string;
    style: ConditionalFormatStyle;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [operator, setOperator] =
    useState<ConditionalFormatOperator>("greaterThan");
  const [value, setValue] = useState("");
  const [background, setBackground] = useState(defaultFill);
  const [foreground, setForeground] = useState(defaultText);
  const [scaleMinColor, setScaleMinColor] = useState("#fee2e2");
  const [scaleMaxColor, setScaleMaxColor] = useState("#dcfce7");
  const [lowThreshold, setLowThreshold] = useState("34");
  const [highThreshold, setHighThreshold] = useState("67");
  const [bold, setBold] = useState(true);
  const needsValue = needsRuleValue(operator);
  const canCreate = !needsValue || value.trim().length > 0;

  function handleCreate() {
    if (!canCreate) {
      return;
    }

    onCreate({
      operator,
      value: needsValue ? value.trim() : "",
      style:
        operator === "colorScale" ||
          operator === "dataBar" ||
          operator === "iconSet"
          ? {
              foreground: "#111827",
              scale: {
                minColor:
                  operator === "dataBar" || operator === "iconSet"
                    ? "#dbeafe"
                    : scaleMinColor,
                maxColor: scaleMaxColor,
                thresholds:
                  operator === "dataBar" || operator === "iconSet"
                    ? {
                        low: Math.min(
                          clampThreshold(
                            lowThreshold,
                            defaultThresholdsForOperator(operator).low,
                          ),
                          clampThreshold(
                            highThreshold,
                            defaultThresholdsForOperator(operator).high,
                          ),
                        ),
                        high: Math.max(
                          clampThreshold(
                            lowThreshold,
                            defaultThresholdsForOperator(operator).low,
                          ),
                          clampThreshold(
                            highThreshold,
                            defaultThresholdsForOperator(operator).high,
                          ),
                        ),
                      }
                    : undefined,
              },
            }
          : {
              background,
              foreground,
              bold,
            },
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}>
              <Palette />
              <span className="sr-only">Conditional format</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Conditional format</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conditional format</DialogTitle>
          <DialogDescription>Selected range rule</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="conditional-format-operator">Rule</Label>
            <select
              id="conditional-format-operator"
              value={operator}
              onChange={(event) => {
                const nextOperator = event.target.value as ConditionalFormatOperator;
                const nextThresholds = defaultThresholdsForOperator(nextOperator);

                setOperator(nextOperator);
                setLowThreshold(String(nextThresholds.low));
                setHighThreshold(String(nextThresholds.high));
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {operatorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {needsValue ? (
            <div className="grid gap-2">
              <Label htmlFor="conditional-format-value">Value</Label>
              <Input
                id="conditional-format-value"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          ) : null}
          {operator === "colorScale" ||
          operator === "dataBar" ||
          operator === "iconSet" ? (
            <div className="grid gap-3">
              {operator === "colorScale" ? (
                <div className="grid gap-2">
                  <Label>Low color</Label>
                  <div className="flex gap-2">
                    {scaleColors.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className={cn(scaleMinColor === color && "ring-2 ring-primary")}
                        onClick={() => setScaleMinColor(color)}
                      >
                        <span
                          className="size-4 rounded-sm border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="sr-only">Low color {color}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label>
                  {operator === "dataBar"
                    ? "Bar color"
                    : operator === "iconSet"
                      ? "Icon color"
                      : "High color"}
                </Label>
                <div className="flex gap-2">
                  {scaleColors.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(scaleMaxColor === color && "ring-2 ring-primary")}
                      onClick={() => setScaleMaxColor(color)}
                    >
                      <span
                        className="size-4 rounded-sm border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="sr-only">High color {color}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div
                className="h-8 rounded-md border"
                style={{
                  background:
                    operator === "dataBar"
                      ? `linear-gradient(90deg, ${scaleMaxColor} 70%, transparent 70%)`
                      : operator === "iconSet"
                        ? scaleMaxColor
                      : `linear-gradient(90deg, ${scaleMinColor}, ${scaleMaxColor})`,
                }}
              />
              {operator === "dataBar" || operator === "iconSet" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="conditional-format-low-threshold">
                      Low %
                    </Label>
                    <Input
                      id="conditional-format-low-threshold"
                      type="number"
                      min={0}
                      max={100}
                      value={lowThreshold}
                      onChange={(event) => setLowThreshold(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="conditional-format-high-threshold">
                      High %
                    </Label>
                    <Input
                      id="conditional-format-high-threshold"
                      type="number"
                      min={0}
                      max={100}
                      value={highThreshold}
                      onChange={(event) => setHighThreshold(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Fill</Label>
                <div className="flex gap-2">
                  {fillSwatches.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(background === color && "ring-2 ring-primary")}
                      onClick={() => setBackground(color)}
                    >
                      <span
                        className="size-4 rounded-sm border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="sr-only">Fill {color}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Text</Label>
                <div className="flex gap-2">
                  {textSwatches.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={cn(foreground === color && "ring-2 ring-primary")}
                      onClick={() => setForeground(color)}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color }}
                      >
                        A
                      </span>
                      <span className="sr-only">Text {color}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(event) => setBold(event.target.checked)}
                  className="size-4 accent-primary"
                />
                Bold
              </label>
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleCreate} disabled={!canCreate}>
            Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
