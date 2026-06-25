"use client";

import * as React from "react";
import { Check, Pipette, Slash } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  blendMode?: string;
  onBlendModeChange?: (value: string) => void;
  allowTransparent?: boolean;
  className?: string;
  swatches?: string[];
  "aria-label"?: string;
};

const defaultSwatches = [
  "#ffffff",
  "#f4f4f5",
  "#a1a1aa",
  "#27272a",
  "#18181b",
  "#5eead4",
  "#38bdf8",
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#fb7185",
  "#f97316",
  "#facc15",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
];

const blendModes = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

const checkerboardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
  backgroundSize: "8px 8px",
};

function ColorPicker({
  value,
  onChange,
  blendMode = "normal",
  onBlendModeChange,
  allowTransparent = true,
  className,
  swatches = defaultSwatches,
  "aria-label": ariaLabel = "Choose color",
}: ColorPickerProps) {
  const [draft, setDraft] = React.useState(value);
  const [gradientAngle, setGradientAngle] = React.useState(90);
  const [imageUrl, setImageUrl] = React.useState(extractImageUrl(value));
  const normalizedValue = normalizeColorValue(value);
  const nativeColorValue = toNativeColorValue(normalizedValue);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  function applyColor(nextValue: string) {
    const nextColor = normalizeColorValue(nextValue);

    setDraft(nextColor);
    onChange(nextColor);
  }

  function applyLinearGradient(angle = gradientAngle) {
    applyColor(`linear-gradient(${angle}deg, #5eead4 0%, #38bdf8 45%, #18181b 100%)`);
  }

  function applyRadialGradient() {
    applyColor(
      "radial-gradient(circle at 35% 30%, #ffffff 0%, #5eead4 22%, #0f172a 72%, #020617 100%)",
    );
  }

  function applyMeshGradient() {
    applyColor(
      "radial-gradient(circle at 15% 20%, #5eead4 0%, transparent 28%), radial-gradient(circle at 80% 10%, #818cf8 0%, transparent 30%), radial-gradient(circle at 65% 85%, #f472b6 0%, transparent 34%), linear-gradient(135deg, #020617 0%, #18181b 100%)",
    );
  }

  function applyNoiseGradient() {
    applyColor(
      "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.24) 1px, transparent 0), linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
    );
  }

  function applyImageFill(nextUrl = imageUrl) {
    const trimmedUrl = nextUrl.trim();

    if (!trimmedUrl) {
      return;
    }

    applyColor(`url("${trimmedUrl}") center / cover no-repeat`);
  }

  function commitDraft() {
    const nextColor = normalizeColorValue(draft);

    if (!nextColor) {
      setDraft(value);
      return;
    }

    setDraft(nextColor);
    onChange(nextColor);
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            className="size-8 shrink-0 rounded-md p-1"
            aria-label={ariaLabel}
          >
            <ColorPreview value={normalizedValue} />
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            className="z-50 w-64 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 overflow-hidden rounded-md border border-border">
                  <ColorPreview value={normalizedValue} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Current
                  </div>
                  <div className="truncate font-mono text-xs">
                    {normalizedValue}
                  </div>
                </div>
                <label className="grid size-8 cursor-pointer place-items-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground">
                  <Pipette className="size-4" />
                  <input
                    type="color"
                    value={nativeColorValue}
                    className="sr-only"
                    aria-label={`${ariaLabel} native input`}
                    onChange={(event) => applyColor(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <PaintPresetButton
                  label="Solid"
                  active={isSolidPaint(normalizedValue)}
                  onClick={() => applyColor(nativeColorValue)}
                />
                <PaintPresetButton
                  label="Linear"
                  active={normalizedValue.startsWith("linear-gradient")}
                  onClick={() => applyLinearGradient()}
                />
                <PaintPresetButton
                  label="Radial"
                  active={normalizedValue.startsWith("radial-gradient")}
                  onClick={applyRadialGradient}
                />
                <PaintPresetButton
                  label="Mesh"
                  active={isMeshPaint(normalizedValue)}
                  onClick={applyMeshGradient}
                />
                <PaintPresetButton
                  label="Noise"
                  active={normalizedValue.includes("1px 1px")}
                  onClick={applyNoiseGradient}
                />
                <PaintPresetButton
                  label="Image"
                  active={normalizedValue.startsWith("url(")}
                  onClick={() => applyImageFill()}
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">
                    Linear angle
                  </div>
                  <NumberInput
                    value={gradientAngle}
                    min={0}
                    max={360}
                    onChange={(nextAngle) => {
                      setGradientAngle(nextAngle);
                      if (normalizedValue.startsWith("linear-gradient")) {
                        applyLinearGradient(nextAngle);
                      }
                    }}
                    aria-label={`${ariaLabel} gradient angle`}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyLinearGradient()}
                >
                  Apply
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Image fill URL
                </div>
                <div className="flex gap-2">
                  <Input
                    value={imageUrl}
                    className="min-w-0 flex-1 font-mono text-xs"
                    placeholder="https://..."
                    onChange={(event) => setImageUrl(event.target.value)}
                    onBlur={() => applyImageFill()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyImageFill();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyImageFill()}
                  >
                    Use
                  </Button>
                </div>
              </div>

              {onBlendModeChange ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">
                    Blend mode
                  </div>
                  <Select
                    value={blendMode}
                    onValueChange={onBlendModeChange}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {blendModes.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {formatBlendMode(mode)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid grid-cols-8 gap-1.5">
                {swatches.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={cn(
                      "relative size-6 overflow-hidden rounded-md border border-border outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring",
                      colorsMatch(normalizedValue, swatch) &&
                        "ring-2 ring-primary ring-offset-1 ring-offset-popover",
                    )}
                    style={{ background: swatch }}
                    aria-label={`Use ${swatch}`}
                    onClick={() => applyColor(swatch)}
                  >
                    {colorsMatch(normalizedValue, swatch) ? (
                      <Check className="absolute inset-1 size-4 text-background drop-shadow" />
                    ) : null}
                  </button>
                ))}
              </div>

              {allowTransparent ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => applyColor("transparent")}
                >
                  <Slash className="size-4" />
                  Transparent
                </Button>
              ) : null}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <Input
        value={draft}
        className="min-w-0 flex-1 font-mono text-xs"
        spellCheck={false}
        aria-label={`${ariaLabel} value`}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraft(nextValue);

          if (isHexColor(nextValue) || isTransparent(nextValue)) {
            onChange(normalizeColorValue(nextValue));
          }
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function PaintPresetButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size="sm"
      className="h-7 px-2 text-[11px]"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function ColorPreview({ value }: { value: string }) {
  const transparent = isTransparent(value);

  return (
    <span
      className="block size-full rounded-[calc(var(--radius-sm)*0.8)] border border-foreground/10"
      style={transparent ? checkerboardStyle : { background: value }}
    />
  );
}

function normalizeColorValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (isTransparent(trimmed)) {
    return "transparent";
  }

  const shortHex = trimmed.match(/^#([0-9a-fA-F]{3})$/);

  if (shortHex?.[1]) {
    return `#${shortHex[1]
      .split("")
      .map((character) => character + character)
      .join("")
      .toLowerCase()}`;
  }

  if (isHexColor(trimmed)) {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

function toNativeColorValue(value: string) {
  return isHexColor(value) ? normalizeColorValue(value) : "#000000";
}

function extractImageUrl(value: string) {
  const match = value.match(/^url\(["']?(.+?)["']?\)/);

  return match?.[1] ?? "";
}

function isSolidPaint(value: string) {
  return (
    isHexColor(value) ||
    isTransparent(value) ||
    (!value.includes("gradient(") && !value.startsWith("url("))
  );
}

function isMeshPaint(value: string) {
  return (
    value.includes("radial-gradient") &&
    value.includes("linear-gradient") &&
    value.includes("transparent")
  );
}

function formatBlendMode(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isHexColor(value: string) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function isTransparent(value: string) {
  return value.trim().toLowerCase() === "transparent";
}

function colorsMatch(first: string, second: string) {
  return normalizeColorValue(first) === normalizeColorValue(second);
}

export { ColorPicker };
