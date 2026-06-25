"use client";

import { nanoid } from "nanoid";
import { BoxSelect, ChevronLeft, ChevronRight, Grid3X3, MousePointer2, Move3d, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  applyMeshModifierPreset,
  applyMeshSelectionSet,
  captureMeshModifierPreset,
  captureMeshSelectionSet,
  estimateMeshTopology,
  getUniqueMeshEntryName,
  resolveMeshEditSettings,
} from "../../scene/mesh-editing";
import type { MeshCutAxis, MeshEditOperation, MeshEditSettings, MeshModifierPreset, MeshSelectionMode, MeshSelectionSet, SceneObject, Vec3 } from "../../types";

type UpdateObject = (id: string, updater: (object: SceneObject) => SceneObject) => void;

const selectionModes: Array<{ icon: typeof MousePointer2; label: string; value: MeshSelectionMode }> = [
  { icon: MousePointer2, label: "Object", value: "object" },
  { icon: Move3d, label: "Vertex", value: "vertex" },
  { icon: BoxSelect, label: "Edge", value: "edge" },
  { icon: Grid3X3, label: "Face", value: "face" },
];

const operations: Array<{ label: string; value: MeshEditOperation }> = [
  { label: "None", value: "none" },
  { label: "Extrude", value: "extrude" },
  { label: "Inset", value: "inset" },
  { label: "Bevel", value: "bevel" },
  { label: "Loop cut", value: "loopCut" },
  { label: "Bridge", value: "bridge" },
];

const cutAxes: Array<{ label: string; value: MeshCutAxis }> = [
  { label: "X", value: "x" },
  { label: "Y", value: "y" },
  { label: "Z", value: "z" },
];

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function updateVec3(value: Vec3, index: number, nextValue: number): Vec3 {
  const next: Vec3 = [...value];
  next[index] = nextValue;
  return next;
}

function getSelectionLimit(mode: MeshSelectionMode, topology: { faces: number; vertices: number }) {
  if (mode === "face") {
    return Math.max(1, topology.faces);
  }

  if (mode === "edge" || mode === "vertex") {
    return Math.max(1, topology.vertices);
  }

  return 1;
}

function getSelectionSpanMax(mode: MeshSelectionMode, selectionLimit: number) {
  if (mode === "object") {
    return 1;
  }

  return Math.max(1, Math.min(128, selectionLimit));
}

export function MeshEditingPanel({ object, updateObject }: { object: SceneObject; updateObject: UpdateObject }) {
  const settings = resolveMeshEditSettings(object);
  const topology = estimateMeshTopology(object);
  const selectionLimit = getSelectionLimit(settings.selectionMode, topology);
  const selectionMax = Math.max(0, selectionLimit - 1);
  const selectionSpanMax = getSelectionSpanMax(settings.selectionMode, selectionLimit);
  const selectionSpan = Math.min(settings.selectionSpan, selectionSpanMax);
  const selectionSets = settings.selectionSets ?? [];
  const modifierPresets = settings.modifierPresets ?? [];

  function updateMeshEdit(updates: Partial<MeshEditSettings>) {
    updateObject(object.id, (entry) => ({
      ...entry,
      meshEdit: {
        ...settings,
        ...entry.meshEdit,
        ...updates,
      },
    }));
  }

  function stepSelection(direction: -1 | 1) {
    const nextIndex = (settings.selectionIndex + direction + selectionLimit) % selectionLimit;

    updateMeshEdit({ enabled: true, selectionIndex: nextIndex });
  }

  function saveSelectionSet() {
    const now = new Date().toISOString();
    const selectionSet = captureMeshSelectionSet(settings, {
      id: nanoid(),
      name: getUniqueMeshEntryName(selectionSets, `${settings.selectionMode === "object" ? "Vertex" : settings.selectionMode} Selection`),
      now,
    });

    updateMeshEdit({ enabled: true, selectionSets: [...selectionSets, selectionSet] });
  }

  function applySelectionSet(selectionSet: MeshSelectionSet) {
    updateMeshEdit(applyMeshSelectionSet(settings, selectionSet));
  }

  function renameSelectionSet(id: string, name: string) {
    const nextName = name.trim() || "Selection Set";
    const now = new Date().toISOString();

    updateMeshEdit({
      selectionSets: selectionSets.map((selectionSet) => (selectionSet.id === id ? { ...selectionSet, name: nextName, updatedAt: now } : selectionSet)),
    });
  }

  function deleteSelectionSet(id: string) {
    updateMeshEdit({ selectionSets: selectionSets.filter((selectionSet) => selectionSet.id !== id) });
  }

  function saveModifierPreset() {
    const now = new Date().toISOString();
    const modifierPreset = captureMeshModifierPreset(settings, {
      id: nanoid(),
      name: getUniqueMeshEntryName(modifierPresets, `${settings.operation === "none" ? "Mesh" : settings.operation} Preset`),
      now,
    });

    updateMeshEdit({ modifierPresets: [...modifierPresets, modifierPreset] });
  }

  function applyModifierPreset(preset: MeshModifierPreset) {
    updateMeshEdit(applyMeshModifierPreset(settings, preset));
  }

  function renameModifierPreset(id: string, name: string) {
    const nextName = name.trim() || "Modifier Preset";
    const now = new Date().toISOString();

    updateMeshEdit({
      modifierPresets: modifierPresets.map((preset) => (preset.id === id ? { ...preset, name: nextName, updatedAt: now } : preset)),
    });
  }

  function deleteModifierPreset(id: string) {
    updateMeshEdit({ modifierPresets: modifierPresets.filter((preset) => preset.id !== id) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mesh Editing</div>
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox checked={settings.enabled} onCheckedChange={(checked) => updateMeshEdit({ enabled: checked === true })} />
          Enabled
        </Label>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {selectionModes.map((mode) => {
          const Icon = mode.icon;

          return (
            <Button key={mode.value} className="h-8 px-2" size="sm" type="button" variant={settings.selectionMode === mode.value ? "default" : "outline"} onClick={() => updateMeshEdit({ selectionMode: mode.value })}>
              <Icon className="size-3.5" />
              <span className="sr-only">{mode.label}</span>
            </Button>
          );
        })}
      </div>

      {settings.selectionMode !== "object" ? (
        <div className="space-y-3 rounded-md border border-border p-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="mesh-selection-index">Selection</Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {Math.min(settings.selectionIndex, selectionMax)} / {selectionMax}
                </span>
              </div>
              <div className="grid grid-cols-[2rem_1fr_2rem] gap-1">
                <Button aria-label="Previous mesh selection" className="size-8" size="icon" type="button" variant="outline" onClick={() => stepSelection(-1)}>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Input
                  id="mesh-selection-index"
                  inputMode="numeric"
                  max={selectionMax}
                  min={0}
                  step={1}
                  type="number"
                  value={Math.min(settings.selectionIndex, selectionMax)}
                  onChange={(event) => updateMeshEdit({ enabled: true, selectionIndex: Math.round(clamp(toNumber(event.target.value, settings.selectionIndex), 0, selectionMax)) })}
                />
                <Button aria-label="Next mesh selection" className="size-8" size="icon" type="button" variant="outline" onClick={() => stepSelection(1)}>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesh-selection-span">Span</Label>
              <Input
                id="mesh-selection-span"
                inputMode="numeric"
                max={selectionSpanMax}
                min={1}
                step={1}
                type="number"
                value={selectionSpan}
                onChange={(event) => updateMeshEdit({ enabled: true, selectionSpan: Math.round(clamp(toNumber(event.target.value, selectionSpan), 1, selectionSpanMax)) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesh-selection-falloff">Falloff</Label>
              <Input
                id="mesh-selection-falloff"
                inputMode="decimal"
                max={8}
                min={0}
                step={0.05}
                type="number"
                value={settings.selectionFalloff}
                onChange={(event) => updateMeshEdit({ enabled: true, selectionFalloff: clamp(toNumber(event.target.value, settings.selectionFalloff), 0, 8) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Nudge</Label>
              <Button className="h-7 px-2 text-xs" size="sm" type="button" variant="ghost" onClick={() => updateMeshEdit({ selectionOffset: [0, 0, 0] })}>
                Reset
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["X", "Y", "Z"] as const).map((axis, index) => (
                <Input
                  key={axis}
                  aria-label={`Selection nudge ${axis}`}
                  inputMode="decimal"
                  max={8}
                  min={-8}
                  step={0.05}
                  type="number"
                  value={Number(settings.selectionOffset[index].toFixed(2))}
                  onChange={(event) => updateMeshEdit({ enabled: true, selectionOffset: updateVec3(settings.selectionOffset, index, clamp(toNumber(event.target.value, settings.selectionOffset[index]), -8, 8)) })}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Selection sets</Label>
          <Button className="h-7 px-2 text-xs" disabled={settings.selectionMode === "object"} size="sm" type="button" variant="outline" onClick={saveSelectionSet}>
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
        {selectionSets.length > 0 ? (
          <div className="space-y-1">
            {selectionSets.map((selectionSet) => (
              <div key={selectionSet.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-1">
                <Input aria-label="Selection set name" className="h-8" value={selectionSet.name} onChange={(event) => renameSelectionSet(selectionSet.id, event.target.value)} />
                <Button className="h-8 px-2 text-xs" size="sm" type="button" variant="outline" onClick={() => applySelectionSet(selectionSet)}>
                  Apply
                </Button>
                <Button aria-label={`Delete ${selectionSet.name}`} className="size-8" size="icon" type="button" variant="ghost" onClick={() => deleteSelectionSet(selectionSet.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No saved selections</div>
        )}
      </div>

      {settings.selectionMode !== "object" && settings.operation === "bridge" ? (
        <div className="space-y-3 rounded-md border border-border p-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="mesh-bridge-target">Target</Label>
              <Input
                id="mesh-bridge-target"
                inputMode="numeric"
                max={4096}
                min={0}
                step={1}
                type="number"
                value={settings.bridgeTargetIndex}
                onChange={(event) => updateMeshEdit({ bridgeTargetIndex: Math.round(clamp(toNumber(event.target.value, settings.bridgeTargetIndex), 0, 4096)), enabled: true, operation: "bridge" })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesh-bridge-radius">Radius</Label>
              <Input
                id="mesh-bridge-radius"
                inputMode="decimal"
                max={2}
                min={0.01}
                step={0.01}
                type="number"
                value={settings.bridgeRadius}
                onChange={(event) => updateMeshEdit({ bridgeRadius: clamp(toNumber(event.target.value, settings.bridgeRadius), 0.01, 2), enabled: true, operation: "bridge" })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesh-bridge-segments">Sides</Label>
              <Input
                id="mesh-bridge-segments"
                inputMode="numeric"
                max={32}
                min={3}
                step={1}
                type="number"
                value={settings.bridgeSegments}
                onChange={(event) => updateMeshEdit({ bridgeSegments: Math.round(clamp(toNumber(event.target.value, settings.bridgeSegments), 3, 32)), enabled: true, operation: "bridge" })}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1">
        {operations.map((operation) => (
          <Button
            key={operation.value}
            className={cn("h-8 justify-start px-2 text-xs", operation.value === "none" ? "col-span-2" : null)}
            size="sm"
            type="button"
            variant={settings.operation === operation.value ? "default" : "outline"}
            onClick={() => updateMeshEdit({ enabled: operation.value !== "none", operation: operation.value })}
          >
            {operation.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Modifier presets</Label>
          <Button className="h-7 px-2 text-xs" size="sm" type="button" variant="outline" onClick={saveModifierPreset}>
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
        {modifierPresets.length > 0 ? (
          <div className="space-y-1">
            {modifierPresets.map((preset) => (
              <div key={preset.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-1">
                <Input aria-label="Modifier preset name" className="h-8" value={preset.name} onChange={(event) => renameModifierPreset(preset.id, event.target.value)} />
                <Button className="h-8 px-2 text-xs" size="sm" type="button" variant="outline" onClick={() => applyModifierPreset(preset)}>
                  Apply
                </Button>
                <Button aria-label={`Delete ${preset.name}`} className="size-8" size="icon" type="button" variant="ghost" onClick={() => deleteModifierPreset(preset.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No modifier presets</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Extrude</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{Number(settings.extrude.toFixed(2))}</span>
        </div>
        <Slider max={2} min={-2} step={0.01} value={[settings.extrude]} onValueChange={(value) => updateMeshEdit({ enabled: true, extrude: firstSliderValue(value), operation: "extrude" })} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Inset</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{Math.round(settings.inset * 100)}%</span>
        </div>
        <Slider max={0.95} min={0} step={0.01} value={[settings.inset]} onValueChange={(value) => updateMeshEdit({ enabled: true, inset: firstSliderValue(value), operation: "inset" })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="mesh-bevel">Bevel</Label>
          <Input
            id="mesh-bevel"
            inputMode="decimal"
            max={2}
            min={0}
            step={0.01}
            type="number"
            value={settings.bevel}
            onChange={(event) => updateMeshEdit({ bevel: clamp(toNumber(event.target.value, settings.bevel), 0, 2), enabled: true, operation: "bevel" })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mesh-bevel-segments">Segments</Label>
          <Input
            id="mesh-bevel-segments"
            inputMode="numeric"
            max={12}
            min={1}
            step={1}
            type="number"
            value={settings.bevelSegments}
            onChange={(event) => updateMeshEdit({ bevelSegments: Math.round(clamp(toNumber(event.target.value, settings.bevelSegments), 1, 12)), enabled: true, operation: "bevel" })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="mesh-loop-cuts">Loop cuts</Label>
        <Input
          id="mesh-loop-cuts"
          inputMode="numeric"
          max={12}
          min={0}
          step={1}
          type="number"
          value={settings.loopCuts}
          onChange={(event) => updateMeshEdit({ enabled: true, loopCuts: Math.round(clamp(toNumber(event.target.value, settings.loopCuts), 0, 12)), operation: "loopCut" })}
        />
      </div>

      {settings.operation === "loopCut" ? (
        <div className="space-y-3 rounded-md border border-border p-2">
          <div className="space-y-2">
            <Label>Cut axis</Label>
            <div className="grid grid-cols-3 gap-1">
              {cutAxes.map((axis) => (
                <Button
                  key={axis.value}
                  className="h-8 px-2 text-xs"
                  size="sm"
                  type="button"
                  variant={settings.cutAxis === axis.value ? "default" : "outline"}
                  onClick={() => updateMeshEdit({ cutAxis: axis.value, enabled: true, operation: "loopCut" })}
                >
                  {axis.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="mesh-cut-position">Position</Label>
              <Input
                id="mesh-cut-position"
                inputMode="decimal"
                max={12}
                min={-12}
                step={0.05}
                type="number"
                value={settings.cutPosition}
                onChange={(event) => updateMeshEdit({ cutPosition: clamp(toNumber(event.target.value, settings.cutPosition), -12, 12), enabled: true, operation: "loopCut" })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesh-cut-width">Width</Label>
              <Input
                id="mesh-cut-width"
                inputMode="decimal"
                max={4}
                min={0.01}
                step={0.01}
                type="number"
                value={settings.cutWidth}
                onChange={(event) => updateMeshEdit({ cutWidth: clamp(toNumber(event.target.value, settings.cutWidth), 0.01, 4), enabled: true, operation: "loopCut" })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesh-cut-depth">Depth</Label>
              <Input
                id="mesh-cut-depth"
                inputMode="decimal"
                max={2}
                min={-2}
                step={0.01}
                type="number"
                value={settings.cutDepth}
                onChange={(event) => updateMeshEdit({ cutDepth: clamp(toNumber(event.target.value, settings.cutDepth), -2, 2), enabled: true, operation: "loopCut" })}
              />
            </div>
          </div>
        </div>
      ) : null}

      <Label className="flex items-center gap-2 text-sm">
        <Checkbox checked={settings.showTopology} onCheckedChange={(checked) => updateMeshEdit({ showTopology: checked === true })} />
        Show topology
      </Label>

      <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
        <div>
          <span className="block font-mono text-foreground">{topology.vertices}</span>
          Vertices
        </div>
        <div>
          <span className="block font-mono text-foreground">{topology.faces}</span>
          Faces
        </div>
      </div>
    </div>
  );
}
