"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canContainTwoDLayer, canUseTwoDShapeFillSource, createTwoDPostProcessEffect, resolveTwoDLayerSettings, updateTwoDLayerSettings } from "../../scene/two-d";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, TwoDBlendMode, TwoDConstraint, TwoDLayerFilter, TwoDLayoutMode, TwoDPostProcessEffect, TwoDPostProcessEffectKind, TwoDShapeFillFit } from "../../types";

const constraintOptions: Array<{ label: string; value: TwoDConstraint }> = [
  { label: "Start", value: "start" },
  { label: "Center", value: "center" },
  { label: "End", value: "end" },
  { label: "Stretch", value: "stretch" },
];

const layoutModeOptions: Array<{ label: string; value: TwoDLayoutMode }> = [
  { label: "Free", value: "free" },
  { label: "Rows", value: "horizontal" },
  { label: "Stack", value: "vertical" },
];

const blendModeOptions: Array<{ label: string; value: TwoDBlendMode }> = [
  { label: "Normal", value: "normal" },
  { label: "Multiply", value: "multiply" },
  { label: "Screen", value: "screen" },
  { label: "Add", value: "add" },
  { label: "Subtract", value: "subtract" },
];

const filterOptions: Array<{ label: string; value: TwoDLayerFilter }> = [
  { label: "None", value: "none" },
  { label: "Blur", value: "blur" },
  { label: "Tint", value: "tint" },
  { label: "Glass", value: "glass" },
];

const postProcessEffectOptions: Array<{ label: string; value: TwoDPostProcessEffectKind }> = [
  { label: "Backdrop blur", value: "backdropBlur" },
  { label: "Brightness", value: "brightness" },
  { label: "Contrast", value: "contrast" },
  { label: "Saturate", value: "saturate" },
  { label: "Hue", value: "hueRotate" },
  { label: "Grayscale", value: "grayscale" },
];

const shapeFillFitOptions: Array<{ label: string; value: TwoDShapeFillFit }> = [
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
  { label: "Native", value: "native" },
];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function TwoDLayerPanel({
  object,
  updateObject,
}: {
  object: SceneObject;
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
}) {
  const settings = resolveTwoDLayerSettings(object);
  const objects = useEditorStore((state) => state.document.objects);
  const alignTwoDLayerToParent = useEditorStore((state) => state.alignTwoDLayerToParent);
  const applyTwoDLayout = useEditorStore((state) => state.applyTwoDLayout);

  if (!settings) {
    return null;
  }

  const layerSettings = settings;
  const shapeFillSources = objects.filter((candidate) => candidate.id !== object.id && canUseTwoDShapeFillSource(candidate));
  const activeShapeFillSource = shapeFillSources.find((candidate) => candidate.id === settings.shapeFillObjectId);

  function updateLayer(updates: Parameters<typeof updateTwoDLayerSettings>[1]) {
    updateObject(object.id, (currentObject) => updateTwoDLayerSettings(currentObject, updates));
  }

  function updatePostProcessEffects(nextEffects: TwoDPostProcessEffect[]) {
    updateLayer({ postProcessEffects: nextEffects });
  }

  function updatePostProcessEffect(effectId: string, updates: Partial<TwoDPostProcessEffect>) {
    updatePostProcessEffects(layerSettings.postProcessEffects.map((effect) => (effect.id === effectId ? { ...effect, ...updates } : effect)));
  }

  function changePostProcessEffectKind(effectId: string, kind: TwoDPostProcessEffectKind) {
    const defaults = createTwoDPostProcessEffect(kind);
    updatePostProcessEffect(effectId, {
      amount: defaults.amount,
      enabled: defaults.enabled,
      kind,
      radius: defaults.radius,
    });
  }

  function movePostProcessEffect(effectId: string, direction: -1 | 1) {
    const currentIndex = layerSettings.postProcessEffects.findIndex((effect) => effect.id === effectId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= layerSettings.postProcessEffects.length) {
      return;
    }

    const nextEffects = [...layerSettings.postProcessEffects];
    [nextEffects[currentIndex], nextEffects[nextIndex]] = [nextEffects[nextIndex], nextEffects[currentIndex]];
    updatePostProcessEffects(nextEffects);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">2D Layer</div>
        <span className="rounded-md border border-border px-2 py-1 text-[11px] capitalize text-muted-foreground">{settings.kind}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="two-d-width">Width</Label>
          <Input
            id="two-d-width"
            inputMode="numeric"
            min={8}
            step={1}
            type="number"
            value={Math.round(settings.width)}
            onChange={(event) => updateLayer({ width: toNumber(event.target.value, settings.width) })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="two-d-height">Height</Label>
          <Input
            id="two-d-height"
            inputMode="numeric"
            min={8}
            step={1}
            type="number"
            value={Math.round(settings.height)}
            onChange={(event) => updateLayer({ height: toNumber(event.target.value, settings.height) })}
          />
        </div>
      </div>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox checked={settings.clipsContent} onCheckedChange={(checked) => updateLayer({ clipsContent: checked === true })} />
        Clip content
      </Label>
      <div className="space-y-1">
        <Label htmlFor="two-d-radius">Corner radius</Label>
        <Input
          id="two-d-radius"
          inputMode="numeric"
          min={0}
          step={1}
          type="number"
          value={Math.round(settings.borderRadius)}
          onChange={(event) => updateLayer({ borderRadius: toNumber(event.target.value, settings.borderRadius) })}
        />
      </div>
      <div className="space-y-2 rounded-md border border-border p-3">
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox checked={settings.shadowEnabled} onCheckedChange={(checked) => updateLayer({ shadowEnabled: checked === true })} />
          Drop shadow
        </Label>
        <div className="grid grid-cols-[1fr_44px] items-center gap-3">
          <Label htmlFor="two-d-shadow-color">Color</Label>
          <Input id="two-d-shadow-color" className="h-9 p-1" type="color" value={settings.shadowColor} onChange={(event) => updateLayer({ shadowColor: event.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="two-d-shadow-opacity">Opacity</Label>
            <Input
              id="two-d-shadow-opacity"
              inputMode="decimal"
              max={1}
              min={0}
              step={0.01}
              type="number"
              value={settings.shadowOpacity}
              onChange={(event) => updateLayer({ shadowOpacity: toNumber(event.target.value, settings.shadowOpacity) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="two-d-shadow-blur">Softness</Label>
            <Input
              id="two-d-shadow-blur"
              inputMode="numeric"
              min={0}
              step={1}
              type="number"
              value={Math.round(settings.shadowBlur)}
              onChange={(event) => updateLayer({ shadowBlur: toNumber(event.target.value, settings.shadowBlur) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="two-d-shadow-x">Offset X</Label>
            <Input
              id="two-d-shadow-x"
              inputMode="numeric"
              step={1}
              type="number"
              value={Math.round(settings.shadowOffsetX)}
              onChange={(event) => updateLayer({ shadowOffsetX: toNumber(event.target.value, settings.shadowOffsetX) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="two-d-shadow-y">Offset Y</Label>
            <Input
              id="two-d-shadow-y"
              inputMode="numeric"
              step={1}
              type="number"
              value={Math.round(settings.shadowOffsetY)}
              onChange={(event) => updateLayer({ shadowOffsetY: toNumber(event.target.value, settings.shadowOffsetY) })}
            />
          </div>
        </div>
      </div>
      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Blend mode</Label>
            <Select value={settings.blendMode} onValueChange={(value) => updateLayer({ blendMode: value as TwoDBlendMode })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {blendModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Filter</Label>
            <Select value={settings.filterKind} onValueChange={(value) => updateLayer({ filterKind: value as TwoDLayerFilter })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {settings.filterKind !== "none" ? (
          <>
            <div className="grid grid-cols-[1fr_44px] items-center gap-3">
              <Label htmlFor="two-d-filter-color">Color</Label>
              <Input id="two-d-filter-color" className="h-9 p-1" type="color" value={settings.filterColor} onChange={(event) => updateLayer({ filterColor: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="two-d-filter-intensity">Intensity</Label>
                <Input
                  id="two-d-filter-intensity"
                  inputMode="decimal"
                  max={1}
                  min={0}
                  step={0.01}
                  type="number"
                  value={settings.filterIntensity}
                  onChange={(event) => updateLayer({ filterIntensity: toNumber(event.target.value, settings.filterIntensity) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="two-d-filter-blur">Blur</Label>
                <Input
                  id="two-d-filter-blur"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  type="number"
                  value={Math.round(settings.filterBlur)}
                  onChange={(event) => updateLayer({ filterBlur: toNumber(event.target.value, settings.filterBlur) })}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filter chain</div>
          <span className="text-[11px] text-muted-foreground">{settings.postProcessEffects.length} effects</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {postProcessEffectOptions.map((option) => (
            <Button key={option.value} size="sm" variant="outline" onClick={() => updatePostProcessEffects([...settings.postProcessEffects, createTwoDPostProcessEffect(option.value)])}>
              {option.label}
            </Button>
          ))}
        </div>
        {settings.postProcessEffects.length > 0 ? (
          <div className="space-y-2">
            {settings.postProcessEffects.map((effect, index) => (
              <div key={effect.id} className="space-y-2 rounded-md border border-border/70 p-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select value={effect.kind} onValueChange={(value) => changePostProcessEffectKind(effect.id, value as TwoDPostProcessEffectKind)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {postProcessEffectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="flex items-center gap-2 rounded-md border border-border px-2 text-xs">
                    <Checkbox checked={effect.enabled} onCheckedChange={(checked) => updatePostProcessEffect(effect.id, { enabled: checked === true })} />
                    On
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`two-d-effect-amount-${effect.id}`}>{effect.kind === "hueRotate" ? "Degrees" : "Amount"}</Label>
                    <Input
                      id={`two-d-effect-amount-${effect.id}`}
                      inputMode="decimal"
                      max={effect.kind === "hueRotate" ? 360 : effect.kind === "grayscale" ? 1 : 4}
                      min={effect.kind === "hueRotate" ? -360 : 0}
                      step={effect.kind === "hueRotate" ? 1 : 0.01}
                      type="number"
                      value={effect.amount}
                      onChange={(event) => updatePostProcessEffect(effect.id, { amount: toNumber(event.target.value, effect.amount) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`two-d-effect-radius-${effect.id}`}>Radius</Label>
                    <Input
                      id={`two-d-effect-radius-${effect.id}`}
                      disabled={effect.kind !== "backdropBlur"}
                      inputMode="numeric"
                      min={0}
                      step={1}
                      type="number"
                      value={Math.round(effect.radius)}
                      onChange={(event) => updatePostProcessEffect(effect.id, { radius: toNumber(event.target.value, effect.radius) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button disabled={index === 0} size="sm" variant="secondary" onClick={() => movePostProcessEffect(effect.id, -1)}>
                    Up
                  </Button>
                  <Button disabled={index === settings.postProcessEffects.length - 1} size="sm" variant="secondary" onClick={() => movePostProcessEffect(effect.id, 1)}>
                    Down
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updatePostProcessEffects(settings.postProcessEffects.filter((candidate) => candidate.id !== effect.id))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="flex items-center gap-2 text-sm">
            <Checkbox checked={settings.shapeFillEnabled} onCheckedChange={(checked) => updateLayer({ shapeFillEnabled: checked === true })} />
            3D shape fill
          </Label>
          <span className="max-w-28 truncate text-[11px] text-muted-foreground">{activeShapeFillSource?.name ?? "No source"}</span>
        </div>
        <div className="space-y-1">
          <Label>Source object</Label>
          <Select
            value={settings.shapeFillObjectId ?? "none"}
            onValueChange={(value) => {
              const nextSourceId = value && value !== "none" ? value : undefined;

              updateLayer({
                shapeFillEnabled: Boolean(nextSourceId),
                shapeFillObjectId: nextSourceId,
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="none">None</SelectItem>
              {shapeFillSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Fit</Label>
            <Select value={settings.shapeFillFit} onValueChange={(value) => updateLayer({ shapeFillFit: value as TwoDShapeFillFit })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {shapeFillFitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="two-d-shape-fill-scale">Scale</Label>
            <Input
              id="two-d-shape-fill-scale"
              inputMode="decimal"
              max={4}
              min={0.05}
              step={0.05}
              type="number"
              value={settings.shapeFillScale}
              onChange={(event) => updateLayer({ shapeFillScale: toNumber(event.target.value, settings.shapeFillScale) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="two-d-shape-fill-x">Offset X</Label>
            <Input
              id="two-d-shape-fill-x"
              inputMode="numeric"
              step={1}
              type="number"
              value={Math.round(settings.shapeFillOffsetX)}
              onChange={(event) => updateLayer({ shapeFillOffsetX: toNumber(event.target.value, settings.shapeFillOffsetX) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="two-d-shape-fill-y">Offset Y</Label>
            <Input
              id="two-d-shape-fill-y"
              inputMode="numeric"
              step={1}
              type="number"
              value={Math.round(settings.shapeFillOffsetY)}
              onChange={(event) => updateLayer({ shapeFillOffsetY: toNumber(event.target.value, settings.shapeFillOffsetY) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="two-d-shape-fill-depth">Depth</Label>
            <Input
              id="two-d-shape-fill-depth"
              inputMode="numeric"
              max={128}
              min={-128}
              step={1}
              type="number"
              value={Math.round(settings.shapeFillDepth)}
              onChange={(event) => updateLayer({ shapeFillDepth: toNumber(event.target.value, settings.shapeFillDepth) })}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={!object.parentId} size="sm" variant="secondary" onClick={() => alignTwoDLayerToParent(object.id)}>
          Align to parent
        </Button>
        <Button disabled={!canContainTwoDLayer(object) || settings.layoutMode === "free"} size="sm" variant="secondary" onClick={() => applyTwoDLayout(object.id)}>
          Apply layout
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Horizontal constraint</Label>
        <div className="grid grid-cols-2 gap-2">
          {constraintOptions.map((option) => (
            <Button key={option.value} size="sm" variant={settings.xConstraint === option.value ? "default" : "outline"} onClick={() => updateLayer({ xConstraint: option.value })}>
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Vertical constraint</Label>
        <div className="grid grid-cols-2 gap-2">
          {constraintOptions.map((option) => (
            <Button key={option.value} size="sm" variant={settings.yConstraint === option.value ? "default" : "outline"} onClick={() => updateLayer({ yConstraint: option.value })}>
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <div className="grid grid-cols-3 gap-2">
          {layoutModeOptions.map((option) => (
            <Button key={option.value} size="sm" variant={settings.layoutMode === option.value ? "default" : "outline"} onClick={() => updateLayer({ layoutMode: option.value })}>
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="two-d-padding">Padding</Label>
          <Input
            id="two-d-padding"
            inputMode="numeric"
            min={0}
            step={1}
            type="number"
            value={Math.round(settings.padding)}
            onChange={(event) => updateLayer({ padding: toNumber(event.target.value, settings.padding) })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="two-d-gap">Gap</Label>
          <Input
            id="two-d-gap"
            inputMode="numeric"
            min={0}
            step={1}
            type="number"
            value={Math.round(settings.gap)}
            onChange={(event) => updateLayer({ gap: toNumber(event.target.value, settings.gap) })}
          />
        </div>
      </div>
    </div>
  );
}
