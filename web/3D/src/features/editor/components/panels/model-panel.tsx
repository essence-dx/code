"use client";

import { PackageOpen, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ModelSettings, SceneObject } from "../../types";
import { applyModelImportRepairAction, createModelImportRepairPlan, type ModelImportRepairActionId, type ModelImportRepairSeverity } from "../../utils/model-import-repair";

type UpdateObject = (id: string, updater: (object: SceneObject) => SceneObject) => void;

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getRepairVariant(severity: ModelImportRepairSeverity) {
  return severity === "danger" ? "destructive" : "secondary";
}

export function ModelPanel({ object, updateObject }: { object: SceneObject; updateObject: UpdateObject }) {
  const model = object.model;
  const format = model?.format ?? "gltf";
  const repairPlan = createModelImportRepairPlan(object);

  function updateModel(updates: Partial<ModelSettings>) {
    updateObject(object.id, (entry) => ({
      ...entry,
      model: entry.model ? { ...entry.model, ...updates } : entry.model,
    }));
  }

  function applyRepair(actionId: ModelImportRepairActionId) {
    updateObject(object.id, (entry) => applyModelImportRepairAction(entry, actionId));
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Model</div>
      <div className="rounded-md border border-border p-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <PackageOpen className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{model?.fileName ?? "Imported model"}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{model?.sourceDataUrl ? `${format.toUpperCase()} asset is stored with this scene.` : "Model source is missing."}</p>
      </div>

      {model?.importDiagnostics ? (
        <div className="space-y-2 rounded-md border border-border p-3 text-xs">
          <div className="font-medium uppercase tracking-wide text-muted-foreground">Import Diagnostics</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block font-mono text-foreground">{model.importDiagnostics.sourceUnit}</span>
              <span className="text-muted-foreground">Units</span>
            </div>
            <div>
              <span className="block font-mono text-foreground">{model.importDiagnostics.estimatedTriangleCount.toLocaleString()}</span>
              <span className="text-muted-foreground">Triangles</span>
            </div>
            <div>
              <span className="block font-mono text-foreground">{model.importDiagnostics.complexity}</span>
              <span className="text-muted-foreground">Complexity</span>
            </div>
          </div>
          {model.importDiagnostics.warnings.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {model.importDiagnostics.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {model ? (
        <div className="space-y-3 rounded-md border border-border p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 font-medium uppercase tracking-wide text-muted-foreground">
              <Wrench className="size-3.5 shrink-0" />
              <span className="truncate">Import Repair</span>
            </div>
            <Badge className="rounded-md text-[10px]" variant={repairPlan.availableActions.length > 0 ? "secondary" : "default"}>
              {repairPlan.availableActions.length > 0 ? `${repairPlan.availableActions.length} available` : "Ready"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{repairPlan.summary}</p>
          <div className="space-y-2">
            {repairPlan.actions.map((action) => (
              <div key={action.id} className="rounded-md bg-muted/50 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-foreground">{action.label}</span>
                      <Badge className="rounded-md text-[10px]" variant={getRepairVariant(action.severity)}>
                        {action.severity}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{action.detail}</p>
                  </div>
                  <Button className="h-7 shrink-0 px-2 text-xs" disabled={!action.available} size="sm" type="button" variant="outline" onClick={() => applyRepair(action.id)}>
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {format === "gltf" ? (
        <>
          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Animation</div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={model?.animationAutoPlay ?? true} onCheckedChange={(checked) => updateModel({ animationAutoPlay: checked === true })} />
              Autoplay
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={model?.animationLoop ?? true} onCheckedChange={(checked) => updateModel({ animationLoop: checked === true })} />
              Loop
            </Label>
            <div className="space-y-1">
              <Label htmlFor="model-animation-clip">Clip name</Label>
              <Input id="model-animation-clip" value={model?.animationClipName ?? ""} onChange={(event) => updateModel({ animationClipName: event.target.value.trim() || undefined })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model-animation-speed">Speed</Label>
              <Input
                id="model-animation-speed"
                inputMode="decimal"
                max={4}
                min={0}
                step={0.05}
                type="number"
                value={model?.animationSpeed ?? 1}
                onChange={(event) => updateModel({ animationSpeed: clamp(toNumber(event.target.value, model?.animationSpeed ?? 1), 0, 4) })}
              />
            </div>
          </div>
          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Morph Target</div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={model?.morphTargetAutoPlay ?? false} onCheckedChange={(checked) => updateModel({ morphTargetAutoPlay: checked === true })} />
              Animate weight
            </Label>
            <div className="space-y-1">
              <Label htmlFor="model-morph-name">Target name</Label>
              <Input id="model-morph-name" value={model?.morphTargetName ?? ""} onChange={(event) => updateModel({ morphTargetName: event.target.value.trim() || undefined })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="model-morph-index">Index</Label>
                <Input
                  id="model-morph-index"
                  inputMode="numeric"
                  max={128}
                  min={0}
                  step={1}
                  type="number"
                  value={model?.morphTargetIndex ?? 0}
                  onChange={(event) => updateModel({ morphTargetIndex: Math.round(clamp(toNumber(event.target.value, model?.morphTargetIndex ?? 0), 0, 128)) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="model-morph-speed">Speed</Label>
                <Input
                  id="model-morph-speed"
                  inputMode="decimal"
                  max={4}
                  min={0}
                  step={0.05}
                  type="number"
                  value={model?.morphTargetSpeed ?? 1}
                  onChange={(event) => updateModel({ morphTargetSpeed: clamp(toNumber(event.target.value, model?.morphTargetSpeed ?? 1), 0, 4) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Weight</Label>
                <span className="font-mono text-[11px] text-muted-foreground">{Number((model?.morphTargetWeight ?? 0).toFixed(2))}</span>
              </div>
              <Slider max={1} min={0} step={0.01} value={[model?.morphTargetWeight ?? 0]} onValueChange={(value) => updateModel({ morphTargetWeight: firstSliderValue(value) })} />
            </div>
          </div>
        </>
      ) : null}

      {format === "splat" ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gaussian Splat</div>
          <Label className="flex items-center gap-2 text-sm">
            <Checkbox checked={model?.splatAlphaHash ?? false} onCheckedChange={(checked) => updateModel({ splatAlphaHash: checked === true })} />
            Alpha hash
          </Label>
          <Label className="flex items-center gap-2 text-sm">
            <Checkbox checked={model?.splatToneMapped ?? false} onCheckedChange={(checked) => updateModel({ splatToneMapped: checked === true })} />
            Tone mapped colors
          </Label>
          <div className="space-y-1">
            <Label htmlFor="model-splat-scale">Point scale</Label>
            <Input
              id="model-splat-scale"
              inputMode="decimal"
              max={4}
              min={0.1}
              step={0.05}
              type="number"
              value={model?.splatPointScale ?? 1}
              onChange={(event) => updateModel({ splatPointScale: clamp(toNumber(event.target.value, model?.splatPointScale ?? 1), 0.1, 4) })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Alpha threshold</Label>
              <span className="font-mono text-[11px] text-muted-foreground">{Number((model?.splatAlphaTest ?? 0).toFixed(2))}</span>
            </div>
            <Slider max={1} min={0} step={0.01} value={[model?.splatAlphaTest ?? 0]} onValueChange={(value) => updateModel({ splatAlphaTest: firstSliderValue(value) })} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
