"use client";

import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LayerStyle } from "@/lib/editor/types";
import { normalizeLayerBackgroundReplacement, normalizeLayerChromaKey } from "@/lib/editor/chroma-key";
import { visualEffectPresets } from "@/lib/editor/visual-effect-presets";
import { normalizeLayerVisualStyle } from "@/lib/editor/visual-effects";

interface VisualEffectsPanelProps {
  style: LayerStyle;
  onChange: (patch: Partial<LayerStyle>) => void;
  supportsChromaKey?: boolean;
}

export function VisualEffectsPanel({ style, onChange, supportsChromaKey = false }: VisualEffectsPanelProps) {
  const visualStyle = normalizeLayerVisualStyle(style);
  const chromaKey = normalizeLayerChromaKey(visualStyle.chromaKey);
  const backgroundReplacement = normalizeLayerBackgroundReplacement(visualStyle.backgroundReplacement);

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-muted-foreground" />
        Visual effects
      </div>
      <EffectSlider label="Brightness" value={visualStyle.brightness ?? 1} min={0} max={2} step={0.01} onChange={(brightness) => onChange({ brightness })} />
      <EffectSlider label="Contrast" value={visualStyle.contrast ?? 1} min={0} max={2} step={0.01} onChange={(contrast) => onChange({ contrast })} />
      <EffectSlider label="Saturation" value={visualStyle.saturation ?? 1} min={0} max={2} step={0.01} onChange={(saturation) => onChange({ saturation })} />
      <EffectSlider label="Exposure" value={visualStyle.exposure ?? 0} min={-1} max={1} step={0.01} suffix="" onChange={(exposure) => onChange({ exposure })} />
      <EffectSlider
        label="Temperature"
        value={visualStyle.temperature ?? 0}
        min={-1}
        max={1}
        step={0.01}
        suffix=""
        onChange={(temperature) => onChange({ temperature })}
      />
      <EffectSlider label="Tint" value={visualStyle.tint ?? 0} min={-1} max={1} step={0.01} suffix="" onChange={(tint) => onChange({ tint })} />
      <EffectSlider label="Vignette" value={visualStyle.vignette ?? 0} min={0} max={1} step={0.01} suffix="" onChange={(vignette) => onChange({ vignette })} />
      <EffectSlider label="Blur" value={visualStyle.blur} min={0} max={40} step={0.5} onChange={(blur) => onChange({ blur })} suffix="px" />
      {supportsChromaKey ? (
        <div className="space-y-2 rounded-md border border-border p-2">
          <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Chroma key</span>
            <input
              type="checkbox"
              checked={chromaKey.enabled}
              onChange={(event) => onChange({ chromaKey: { ...chromaKey, enabled: event.target.checked } })}
            />
          </label>
          {chromaKey.enabled ? (
            <>
              <ColorField label="Key color" value={chromaKey.color} onChange={(color) => onChange({ chromaKey: { ...chromaKey, color } })} />
              <EffectSlider
                label="Similarity"
                value={chromaKey.similarity}
                min={0}
                max={1}
                step={0.01}
                suffix=""
                onChange={(similarity) => onChange({ chromaKey: { ...chromaKey, similarity } })}
              />
              <EffectSlider
                label="Smoothness"
                value={chromaKey.smoothness}
                min={0}
                max={0.5}
                step={0.01}
                suffix=""
                onChange={(smoothness) => onChange({ chromaKey: { ...chromaKey, smoothness } })}
              />
              <EffectSlider
                label="Spill"
                value={chromaKey.spill}
                min={0}
                max={1}
                step={0.01}
                suffix=""
                onChange={(spill) => onChange({ chromaKey: { ...chromaKey, spill } })}
              />
              <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Replace keyed background</span>
                <input
                  type="checkbox"
                  checked={backgroundReplacement.enabled}
                  onChange={(event) =>
                    onChange({ backgroundReplacement: { ...backgroundReplacement, enabled: event.target.checked, mode: "color" } })
                  }
                />
              </label>
              {backgroundReplacement.enabled ? (
                <div className="grid grid-cols-2 gap-2">
                  <ColorField
                    label="Replacement"
                    value={backgroundReplacement.color}
                    onChange={(color) => onChange({ backgroundReplacement: { ...backgroundReplacement, color, mode: "color" } })}
                  />
                  <EffectNumber
                    label="Opacity"
                    value={Math.round(backgroundReplacement.opacity * 100)}
                    min={0}
                    max={100}
                    onChange={(opacity) => onChange({ backgroundReplacement: { ...backgroundReplacement, opacity: opacity / 100, mode: "color" } })}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-1">
        {visualEffectPresets.map((preset) => (
          <button
            key={preset.id}
            className="rounded-md border border-border bg-background px-2 py-1 text-left transition-colors hover:bg-muted"
            onClick={() => onChange(preset.patch)}
            type="button"
          >
            <span className="block text-xs font-medium">{preset.label}</span>
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{preset.description}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Border" value={visualStyle.stroke} onChange={(stroke) => onChange({ stroke })} />
        <EffectNumber label="Border width" value={visualStyle.borderWidth ?? 0} min={0} max={80} onChange={(borderWidth) => onChange({ borderWidth })} />
        <ColorField label="Shadow" value={visualStyle.shadowColor ?? "#000000"} onChange={(shadowColor) => onChange({ shadowColor })} />
        <EffectNumber label="Shadow blur" value={visualStyle.shadowBlur ?? 0} min={0} max={120} onChange={(shadowBlur) => onChange({ shadowBlur })} />
      </div>
    </div>
  );
}

function EffectSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "x",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Label>{label}</Label>
        <span>
          {value.toFixed(step < 0.1 ? 2 : 1)}
          {suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next ?? value)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <Input className="h-8 p-1" type="color" value={toColor(value)} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EffectNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  function handleChange(rawValue: string) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(min, Math.min(max, parsed)));
  }

  return (
    <label className="space-y-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <Input className="h-8 font-mono text-xs" type="number" min={min} max={max} step={0.5} value={value} onChange={(event) => handleChange(event.target.value)} />
    </label>
  );
}

function toColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}
