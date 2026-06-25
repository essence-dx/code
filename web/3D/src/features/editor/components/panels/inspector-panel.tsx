"use client";

import { useState, type ChangeEvent } from "react";
import { Camera, Copy, Frame, ImageIcon, Lock, PackageOpen, PenTool, Plus, Sparkles, Trash2, Unlock, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { NumberStepper } from "../number-stepper";
import { canHaveBooleanStack } from "../../scene/boolean-operations";
import { canHaveCloner } from "../../scene/cloner-settings";
import { canHaveMeshEditing } from "../../scene/mesh-editing";
import { resolveTransformConstraints } from "../../scene/object-constraints";
import { resolvePivot } from "../../scene/object-pivot";
import { resolveParticleSettings } from "../../scene/particle-settings";
import { canHavePhysics } from "../../scene/physics-settings";
import { isParametricPrimitiveKind, isTwoDimensionalShapeKind, resolveGeometry, type ParametricPrimitiveKind } from "../../scene/primitive-geometry";
import { resolveSceneSettings } from "../../scene/default-document";
import { canHaveSculpting } from "../../scene/sculpting";
import { useEditorStore } from "../../store/editor-store";
import type { GeometrySettings, ParticleSettings, PrimitiveKind, TransformConstraints, Vec3 } from "../../types";
import { createFigmaPreviewFromUrl } from "../../utils/figma-preview";
import { readFileAsDataUrl } from "../../utils/file-readers";
import { AnimationTimelinePanel } from "./animation-timeline-panel";
import { BooleanOperationsPanel } from "./boolean-operations-panel";
import { ClonerPanel } from "./cloner-panel";
import { FollowBehaviorPanel } from "./follow-behavior-panel";
import { InputControlsPanel } from "./input-controls-panel";
import { LookAtBehaviorPanel } from "./look-at-behavior-panel";
import { MaterialLayersPanel } from "./material-layers-panel";
import { MeshEditingPanel } from "./mesh-editing-panel";
import { ModelPanel } from "./model-panel";
import { ObjectInteractionsPanel } from "./object-interactions-panel";
import { PhysicsPanel } from "./physics-panel";
import { SceneStatesPanel } from "./scene-states-panel";
import { SceneVariablesPanel } from "./scene-variables-panel";
import { SculptingPanel } from "./sculpting-panel";
import { TwoDLayerPanel } from "./two-d-layer-panel";

type TransformGroupId = "position" | "rotation" | "scale";

const transformGroups: Array<{ id: TransformGroupId; label: string; step: number }> = [
  { id: "position", label: "Position", step: 0.1 },
  { id: "rotation", label: "Rotation", step: 0.05 },
  { id: "scale", label: "Scale", step: 0.1 },
];

const axes = ["X", "Y", "Z"] as const;
const maxTextureBytes = 4 * 1024 * 1024;
const constraintGroups: Array<{ label: string; keys: [keyof TransformConstraints, keyof TransformConstraints, keyof TransformConstraints] }> = [
  { label: "Move", keys: ["lockPositionX", "lockPositionY", "lockPositionZ"] },
  { label: "Rotate", keys: ["lockRotationX", "lockRotationY", "lockRotationZ"] },
  { label: "Scale", keys: ["lockScaleX", "lockScaleY", "lockScaleZ"] },
];

type GeometryControl = {
  id: keyof GeometrySettings;
  integer?: boolean;
  label: string;
  max: number;
  min: number;
  step: number;
};

type ParticleControl = {
  id: keyof ParticleSettings;
  integer?: boolean;
  label: string;
  max: number;
  min: number;
  step: number;
};

const geometryControls: Record<ParametricPrimitiveKind, GeometryControl[]> = {
  box: [
    { id: "width", label: "Width", min: 0.05, max: 24, step: 0.05 },
    { id: "height", label: "Height", min: 0.05, max: 24, step: 0.05 },
    { id: "depth", label: "Depth", min: 0.05, max: 24, step: 0.05 },
  ],
  sphere: [
    { id: "radius", label: "Radius", min: 0.05, max: 12, step: 0.05 },
    { id: "radialSegments", integer: true, label: "Segments", min: 8, max: 96, step: 1 },
    { id: "heightSegments", integer: true, label: "Rings", min: 4, max: 64, step: 1 },
  ],
  cylinder: [
    { id: "radiusTop", label: "Top radius", min: 0.05, max: 12, step: 0.05 },
    { id: "radiusBottom", label: "Bottom radius", min: 0.05, max: 12, step: 0.05 },
    { id: "height", label: "Height", min: 0.05, max: 24, step: 0.05 },
    { id: "radialSegments", integer: true, label: "Segments", min: 3, max: 96, step: 1 },
  ],
  cone: [
    { id: "radius", label: "Radius", min: 0.05, max: 12, step: 0.05 },
    { id: "height", label: "Height", min: 0.05, max: 24, step: 0.05 },
    { id: "radialSegments", integer: true, label: "Segments", min: 3, max: 96, step: 1 },
  ],
  torus: [
    { id: "radius", label: "Radius", min: 0.05, max: 12, step: 0.05 },
    { id: "tubeRadius", label: "Tube", min: 0.01, max: 6, step: 0.01 },
    { id: "radialSegments", integer: true, label: "Tube segments", min: 3, max: 96, step: 1 },
    { id: "tubularSegments", integer: true, label: "Ring segments", min: 8, max: 192, step: 1 },
  ],
  plane: [
    { id: "width", label: "Width", min: 0.05, max: 48, step: 0.05 },
    { id: "depth", label: "Depth", min: 0.05, max: 48, step: 0.05 },
    { id: "height", label: "Thickness", min: 0.01, max: 2, step: 0.01 },
  ],
  rectangle: [
    { id: "width", label: "Width", min: 0.05, max: 48, step: 0.05 },
    { id: "height", label: "Height", min: 0.05, max: 48, step: 0.05 },
    { id: "extrudeDepth", label: "Extrude", min: 0, max: 12, step: 0.05 },
  ],
  ellipse: [
    { id: "width", label: "Width", min: 0.05, max: 48, step: 0.05 },
    { id: "height", label: "Height", min: 0.05, max: 48, step: 0.05 },
    { id: "radialSegments", integer: true, label: "Segments", min: 12, max: 128, step: 1 },
    { id: "extrudeDepth", label: "Extrude", min: 0, max: 12, step: 0.05 },
  ],
  triangle: [
    { id: "width", label: "Width", min: 0.05, max: 48, step: 0.05 },
    { id: "height", label: "Height", min: 0.05, max: 48, step: 0.05 },
    { id: "extrudeDepth", label: "Extrude", min: 0, max: 12, step: 0.05 },
  ],
  star: [
    { id: "radius", label: "Outer radius", min: 0.05, max: 24, step: 0.05 },
    { id: "tubeRadius", label: "Inner radius", min: 0.01, max: 24, step: 0.01 },
    { id: "radialSegments", integer: true, label: "Points", min: 3, max: 32, step: 1 },
    { id: "extrudeDepth", label: "Extrude", min: 0, max: 12, step: 0.05 },
  ],
};

const particleControls: ParticleControl[] = [
  { id: "count", integer: true, label: "Count", min: 1, max: 2000, step: 1 },
  { id: "spread", label: "Spread", min: 0.1, max: 24, step: 0.1 },
  { id: "speed", label: "Speed", min: 0, max: 8, step: 0.05 },
  { id: "size", label: "Size", min: 0.01, max: 1, step: 0.01 },
];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isLightKind(kind: PrimitiveKind) {
  return kind === "pointLight" || kind === "directionalLight" || kind === "spotLight";
}

function isCameraKind(kind: PrimitiveKind) {
  return kind === "camera";
}

function isModelKind(kind: PrimitiveKind) {
  return kind === "model";
}

function isImageKind(kind: PrimitiveKind) {
  return kind === "image";
}

function isVideoKind(kind: PrimitiveKind) {
  return kind === "video";
}

function isAudioKind(kind: PrimitiveKind) {
  return kind === "audio";
}

function isSvgKind(kind: PrimitiveKind) {
  return kind === "svg";
}

function isFigmaKind(kind: PrimitiveKind) {
  return kind === "figma";
}

function isPathKind(kind: PrimitiveKind) {
  return kind === "path";
}

function isParticleKind(kind: PrimitiveKind) {
  return kind === "particles";
}

function canEditPivot(kind: PrimitiveKind) {
  return !isCameraKind(kind) && !isLightKind(kind);
}

export function InspectorPanel() {
  const [textureMessage, setTextureMessage] = useState<string | null>(null);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectedObject = useEditorStore((state) => state.document.objects.find((object) => object.id === selectedObjectId));
  const objects = useEditorStore((state) => state.document.objects);
  const sceneSettingsSource = useEditorStore((state) => state.document.sceneSettings);
  const sceneSettings = resolveSceneSettings(sceneSettingsSource);
  const activeCameraId = useEditorStore((state) => state.document.activeCameraId);
  const updateObject = useEditorStore((state) => state.updateObject);
  const updateSceneSettings = useEditorStore((state) => state.updateSceneSettings);
  const updateVector = useEditorStore((state) => state.updateVector);
  const updatePivot = useEditorStore((state) => state.updatePivot);
  const updateConstraints = useEditorStore((state) => state.updateConstraints);
  const updateGeometry = useEditorStore((state) => state.updateGeometry);
  const updateMaterial = useEditorStore((state) => state.updateMaterial);
  const updateText = useEditorStore((state) => state.updateText);
  const updateLight = useEditorStore((state) => state.updateLight);
  const updateCamera = useEditorStore((state) => state.updateCamera);
  const setActiveCamera = useEditorStore((state) => state.setActiveCamera);
  const setCameraPreviewEnabled = useEditorStore((state) => state.setCameraPreviewEnabled);
  const groupSelectedObject = useEditorStore((state) => state.groupSelectedObject);
  const ungroupObject = useEditorStore((state) => state.ungroupObject);
  const duplicateObject = useEditorStore((state) => state.duplicateObject);
  const deleteObject = useEditorStore((state) => state.deleteObject);
  const createComponentFromSelection = useEditorStore((state) => state.createComponentFromSelection);

  if (!selectedObject) {
    return (
      <ScrollArea className="h-full">
        <section className="space-y-5 p-4">
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scene</div>
            <div className="grid grid-cols-[1fr_44px] items-center gap-3">
              <Label htmlFor="scene-background">Background</Label>
              <Input
                id="scene-background"
                className="h-9 p-1"
                type="color"
                value={sceneSettings.backgroundColor}
                onChange={(event) => updateSceneSettings({ backgroundColor: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-[1fr_44px] items-center gap-3">
              <Label htmlFor="scene-ambient">Ambient</Label>
              <Input
                id="scene-ambient"
                className="h-9 p-1"
                type="color"
                value={sceneSettings.ambientColor}
                onChange={(event) => updateSceneSettings({ ambientColor: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ambient intensity</Label>
              <Slider
                max={5}
                min={0}
                step={0.01}
                value={[sceneSettings.ambientIntensity]}
                onValueChange={(value) => updateSceneSettings({ ambientIntensity: firstSliderValue(value) })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={sceneSettings.fogEnabled} onCheckedChange={(checked) => updateSceneSettings({ fogEnabled: checked === true })} />
              Fog
            </Label>
            {sceneSettings.fogEnabled ? (
              <>
                <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                  <Label htmlFor="scene-fog-color">Fog color</Label>
                  <Input
                    id="scene-fog-color"
                    className="h-9 p-1"
                    type="color"
                    value={sceneSettings.fogColor}
                    onChange={(event) => updateSceneSettings({ fogColor: event.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="scene-fog-near">Near</Label>
                    <Input
                      id="scene-fog-near"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      type="number"
                      value={sceneSettings.fogNear}
                      onChange={(event) => {
                        const fogNear = toNumber(event.target.value, sceneSettings.fogNear);
                        updateSceneSettings({ fogNear, fogFar: Math.max(sceneSettings.fogFar, fogNear + 0.1) });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="scene-fog-far">Far</Label>
                    <Input
                      id="scene-fog-far"
                      inputMode="decimal"
                      min={0.1}
                      step={0.5}
                      type="number"
                      value={sceneSettings.fogFar}
                      onChange={(event) => updateSceneSettings({ fogFar: Math.max(toNumber(event.target.value, sceneSettings.fogFar), sceneSettings.fogNear + 0.1) })}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={sceneSettings.postProcessingEnabled} onCheckedChange={(checked) => updateSceneSettings({ postProcessingEnabled: checked === true })} />
              Post-processing
            </Label>
            {sceneSettings.postProcessingEnabled ? (
              <div className="space-y-4">
                <div className="space-y-3 rounded-md border border-border p-3">
                  <Label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sceneSettings.bloomEnabled} onCheckedChange={(checked) => updateSceneSettings({ bloomEnabled: checked === true })} />
                    Bloom
                  </Label>
                  {sceneSettings.bloomEnabled ? (
                    <>
                      <div className="space-y-2">
                        <Label>Intensity</Label>
                        <Slider
                          max={5}
                          min={0}
                          step={0.01}
                          value={[sceneSettings.bloomIntensity]}
                          onValueChange={(value) => updateSceneSettings({ bloomIntensity: firstSliderValue(value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Threshold</Label>
                        <Slider
                          max={1}
                          min={0}
                          step={0.01}
                          value={[sceneSettings.bloomThreshold]}
                          onValueChange={(value) => updateSceneSettings({ bloomThreshold: firstSliderValue(value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Radius</Label>
                        <Slider
                          max={2}
                          min={0}
                          step={0.01}
                          value={[sceneSettings.bloomRadius]}
                          onValueChange={(value) => updateSceneSettings({ bloomRadius: firstSliderValue(value) })}
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-md border border-border p-3">
                  <Label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sceneSettings.depthOfFieldEnabled} onCheckedChange={(checked) => updateSceneSettings({ depthOfFieldEnabled: checked === true })} />
                    Depth of field
                  </Label>
                  {sceneSettings.depthOfFieldEnabled ? (
                    <>
                      <div className="space-y-2">
                        <Label>Focus distance</Label>
                        <Slider
                          max={500}
                          min={0.1}
                          step={0.1}
                          value={[sceneSettings.depthOfFieldFocus]}
                          onValueChange={(value) => updateSceneSettings({ depthOfFieldFocus: firstSliderValue(value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aperture</Label>
                        <Slider
                          max={0.2}
                          min={0}
                          step={0.001}
                          value={[sceneSettings.depthOfFieldAperture]}
                          onValueChange={(value) => updateSceneSettings({ depthOfFieldAperture: firstSliderValue(value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max blur</Label>
                        <Slider
                          max={0.08}
                          min={0}
                          step={0.001}
                          value={[sceneSettings.depthOfFieldMaxBlur]}
                          onValueChange={(value) => updateSceneSettings({ depthOfFieldMaxBlur: firstSliderValue(value) })}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <Separator />

          <SceneStatesPanel />

          <Separator />

          <SceneVariablesPanel />

          <Separator />

          <InputControlsPanel />
        </section>
      </ScrollArea>
    );
  }

  async function handleTextureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (
      !selectedObject ||
      selectedObject.kind === "group" ||
      isCameraKind(selectedObject.kind) ||
      isLightKind(selectedObject.kind) ||
      isModelKind(selectedObject.kind) ||
      isImageKind(selectedObject.kind) ||
      isVideoKind(selectedObject.kind) ||
      isAudioKind(selectedObject.kind) ||
      isSvgKind(selectedObject.kind) ||
      isFigmaKind(selectedObject.kind) ||
      isPathKind(selectedObject.kind) ||
      isParticleKind(selectedObject.kind)
    ) {
      setTextureMessage("Select a material object before uploading a texture.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setTextureMessage("Choose an image file.");
      return;
    }

    if (file.size > maxTextureBytes) {
      setTextureMessage("Texture must be 4 MB or smaller.");
      return;
    }

    try {
      const textureDataUrl = await readFileAsDataUrl(file, "Texture");
      updateMaterial(selectedObject.id, { textureDataUrl });
      setTextureMessage(`${file.name} attached.`);
    } catch (error) {
      setTextureMessage(error instanceof Error ? error.message : "Texture upload failed.");
    }
  }

  const isTwoDLayer = Boolean(selectedObject.twoD);
  const geometryKind = !isTwoDLayer && isParametricPrimitiveKind(selectedObject.kind) ? selectedObject.kind : null;
  const selectedGeometry = geometryKind ? resolveGeometry(selectedObject) : null;
  const canUseShapeBlend = Boolean(geometryKind && isTwoDimensionalShapeKind(selectedObject.kind));
  const shapeBlendTargets = canUseShapeBlend ? objects.filter((object) => object.id !== selectedObject.id && isTwoDimensionalShapeKind(object.kind)) : [];
  const selectedShapeBlendTarget = shapeBlendTargets.find((object) => object.id === selectedObject.shapeBlend?.targetObjectId);
  const selectedParticles = isParticleKind(selectedObject.kind) ? resolveParticleSettings(selectedObject) : null;
  const selectedConstraints = resolveTransformConstraints(selectedObject.constraints);
  const selectedObjectIdForUpdates = selectedObject.id;

  function updateParticleSettings(settings: Partial<ParticleSettings>) {
    updateObject(selectedObjectIdForUpdates, (object) => ({
      ...object,
      particles: {
        ...resolveParticleSettings(object),
        ...settings,
      },
    }));
  }

  return (
    <ScrollArea className="h-full">
      <section className="space-y-5 p-4">
        <div className="space-y-2">
          <Label htmlFor="object-name">Name</Label>
          <Input
            id="object-name"
            value={selectedObject.name}
            onChange={(event) => updateObject(selectedObject.id, (object) => ({ ...object, name: event.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="flex-1 gap-2"
            size="sm"
            variant="secondary"
            onClick={() => updateObject(selectedObject.id, (object) => ({ ...object, locked: !object.locked }))}
          >
            {selectedObject.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            {selectedObject.locked ? "Unlock" : "Lock"}
          </Button>
          <Button className="flex-1 gap-2" size="sm" variant="secondary" onClick={() => duplicateObject(selectedObject.id)}>
            <Copy className="size-4" />
            Duplicate
          </Button>
          <Button className="size-9" size="icon" variant="destructive" onClick={() => deleteObject(selectedObject.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
        <Button className="w-full gap-2" size="sm" variant="secondary" onClick={createComponentFromSelection}>
          <PackageOpen className="size-4" />
          Save component
        </Button>

        <Separator />

        {transformGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</div>
            <div className="grid grid-cols-3 gap-2">
              {axes.map((axis, index) => (
                <div key={`${group.id}-${axis}`} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{axis}</Label>
                  <NumberStepper
                    ariaLabel={`${group.label} ${axis}`}
                    step={group.step}
                    value={Number(selectedObject.transform[group.id][index].toFixed(2))}
                    onChange={(value) => updateVector(selectedObject.id, group.id, index, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <AnimationTimelinePanel object={selectedObject} />

        <ObjectInteractionsPanel object={selectedObject} />

        <Separator />

        <LookAtBehaviorPanel object={selectedObject} objects={objects} updateObject={updateObject} />

        <Separator />

        <FollowBehaviorPanel object={selectedObject} objects={objects} updateObject={updateObject} />

        <Separator />

        {!isTwoDLayer && canHaveCloner(selectedObject.kind) ? (
          <>
            <ClonerPanel object={selectedObject} updateObject={updateObject} />
            <Separator />
          </>
        ) : null}

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Axis locks</div>
          <div className="space-y-2">
            {constraintGroups.map((group) => (
              <div key={group.label} className="grid grid-cols-[64px_1fr] items-center gap-2">
                <span className="text-xs text-muted-foreground">{group.label}</span>
                <div className="grid grid-cols-3 gap-2">
                  {group.keys.map((key, index) => (
                    <Label key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox
                        checked={selectedConstraints[key]}
                        onCheckedChange={(checked) =>
                          updateConstraints(selectedObject.id, {
                            [key]: checked === true,
                          } as Partial<TransformConstraints>)
                        }
                      />
                      {axes[index]}
                    </Label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {!isTwoDLayer && canHavePhysics(selectedObject.kind) ? (
          <>
            <PhysicsPanel object={selectedObject} updateObject={updateObject} />
            <Separator />
          </>
        ) : null}

        {canEditPivot(selectedObject.kind) ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pivot</div>
                <Button size="sm" variant="ghost" onClick={() => updateObject(selectedObject.id, (object) => ({ ...object, pivot: [0, 0, 0] }))}>
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {axes.map((axis, index) => (
                  <div key={`pivot-${axis}`} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{axis}</Label>
                    <NumberStepper
                      ariaLabel={`Pivot ${axis}`}
                      step={0.1}
                      value={Number(resolvePivot(selectedObject)[index].toFixed(2))}
                      onChange={(value) => updatePivot(selectedObject.id, index, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            {canUseShapeBlend ? (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shape blend</div>
                  {selectedShapeBlendTarget ? (
                    <Button size="sm" variant="ghost" onClick={() => updateObject(selectedObject.id, (object) => ({ ...object, shapeBlend: undefined }))}>
                      Clear
                    </Button>
                  ) : null}
                </div>
                {shapeBlendTargets.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {shapeBlendTargets.map((target) => (
                      <Button
                        key={target.id}
                        className="min-w-0 justify-start"
                        size="sm"
                        variant={target.id === selectedObject.shapeBlend?.targetObjectId ? "default" : "outline"}
                        onClick={() =>
                          updateObject(selectedObject.id, (object) => ({
                            ...object,
                            shapeBlend: {
                              amount: object.shapeBlend?.targetObjectId === target.id ? (object.shapeBlend.amount ?? 0.5) : 0.5,
                              targetObjectId: target.id,
                            },
                          }))
                        }
                      >
                        <span className="truncate">{target.name}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Add another 2D shape before blending this object.</div>
                )}
                {selectedShapeBlendTarget ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Amount</Label>
                      <span className="font-mono text-[11px] text-muted-foreground">{Math.round((selectedObject.shapeBlend?.amount ?? 0) * 100)}%</span>
                    </div>
                    <Slider
                      max={1}
                      min={0}
                      step={0.01}
                      value={[selectedObject.shapeBlend?.amount ?? 0]}
                      onValueChange={(value) =>
                        updateObject(selectedObject.id, (object) => ({
                          ...object,
                          shapeBlend: {
                            amount: firstSliderValue(value),
                            targetObjectId: selectedShapeBlendTarget.id,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <Separator />
          </>
        ) : null}

        {isTwoDLayer ? (
          <>
            <TwoDLayerPanel object={selectedObject} updateObject={updateObject} />
            <Separator />
          </>
        ) : null}

        {geometryKind && selectedGeometry ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Geometry</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateObject(selectedObject.id, (object) => ({ ...object, geometry: resolveGeometry({ kind: geometryKind, geometry: undefined }) }))}
                >
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {geometryControls[geometryKind].map((control) => (
                  <div key={control.id} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{control.label}</Label>
                    <NumberStepper
                      ariaLabel={control.label}
                      max={control.max}
                      min={control.min}
                      precision={control.integer ? 0 : 2}
                      step={control.step}
                      value={Number(selectedGeometry[control.id].toFixed(control.integer ? 0 : 2))}
                      onChange={(value) =>
                        updateGeometry(selectedObject.id, {
                          [control.id]: control.integer ? Math.round(value) : value,
                        } as Partial<GeometrySettings>)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        ) : null}

        {!isTwoDLayer && canHaveBooleanStack(selectedObject) ? (
          <>
            <BooleanOperationsPanel object={selectedObject} objects={objects} updateObject={updateObject} />
            <Separator />
          </>
        ) : null}

        {!isTwoDLayer && canHaveMeshEditing(selectedObject.kind) ? (
          <>
            <MeshEditingPanel object={selectedObject} updateObject={updateObject} />
            <Separator />
          </>
        ) : null}

        {!isTwoDLayer && canHaveSculpting(selectedObject.kind) ? (
          <>
            <SculptingPanel object={selectedObject} updateObject={updateObject} />
            <Separator />
          </>
        ) : null}

        {selectedObject.kind === "text" ? (
          <>
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Text</div>
              <div className="space-y-2">
                <Label htmlFor="text-content">Content</Label>
                <Textarea
                  id="text-content"
                  value={selectedObject.text?.content ?? ""}
                  onChange={(event) => updateText(selectedObject.id, { content: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="font-size">Size</Label>
                  <NumberStepper
                    ariaLabel="Font size"
                    id="font-size"
                    min={0.1}
                      step={0.05}
                    value={selectedObject.text?.fontSize ?? 0.72}
                    onChange={(value) => updateText(selectedObject.id, { fontSize: value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="text-width">Width</Label>
                  <NumberStepper
                    ariaLabel="Text width"
                    id="text-width"
                    min={0.5}
                    step={0.25}
                    value={selectedObject.text?.maxWidth ?? 6}
                    onChange={(value) => updateText(selectedObject.id, { maxWidth: value })}
                  />
                </div>
              </div>
            </div>
            <Separator />
          </>
        ) : isPathKind(selectedObject.kind) ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">3D Path</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateObject(selectedObject.id, (object) => {
                      const points = object.path?.points ?? [
                        [-1, 0, 0],
                        [1, 0, 0],
                      ];
                      const lastPoint = points.at(-1) ?? [0, 0, 0];

                      return {
                        ...object,
                        path: object.path
                          ? {
                              ...object.path,
                              points: [...points, [lastPoint[0] + 0.5, lastPoint[1], lastPoint[2]] as Vec3].slice(0, 24),
                            }
                          : object.path,
                      };
                    })
                  }
                >
                  <Plus className="size-4" />
                  Point
                </Button>
              </div>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedObject.path?.closed ?? false}
                  onCheckedChange={(checked) => updateObject(selectedObject.id, (object) => ({ ...object, path: object.path ? { ...object.path, closed: checked === true } : object.path }))}
                />
                Closed path
              </Label>
              <div className="space-y-2">
                <Label>Curve mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Smooth", value: "smooth" },
                    { label: "Linear", value: "linear" },
                    { label: "Bezier", value: "bezier" },
                  ].map((mode) => (
                    <Button
                      key={mode.value}
                      size="sm"
                      variant={(selectedObject.path?.curveKind ?? "smooth") === mode.value ? "default" : "outline"}
                      onClick={() =>
                        updateObject(selectedObject.id, (object) => ({
                          ...object,
                          path: object.path ? { ...object.path, curveKind: mode.value as "smooth" | "linear" | "bezier" } : object.path,
                        }))
                      }
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tube radius</Label>
                <Slider
                  max={0.5}
                  min={0.005}
                  step={0.005}
                  value={[selectedObject.path?.tubeRadius ?? 0.035]}
                  onValueChange={(value) => updateObject(selectedObject.id, (object) => ({ ...object, path: object.path ? { ...object.path, tubeRadius: firstSliderValue(value) } : object.path }))}
                />
              </div>
              <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                <Label htmlFor="path-color">Color</Label>
                <Input id="path-color" className="h-9 p-1" type="color" value={selectedObject.material.color} onChange={(event) => updateMaterial(selectedObject.id, { color: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Opacity</Label>
                <Slider max={1} min={0.05} step={0.01} value={[selectedObject.material.opacity]} onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Points</div>
                {(selectedObject.path?.points ?? []).map((point, pointIndex) => (
                  <div key={pointIndex} className="space-y-1 rounded-md border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Point {pointIndex + 1}</span>
                      <Button
                        className="size-7"
                        disabled={(selectedObject.path?.points.length ?? 0) <= 2}
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          updateObject(selectedObject.id, (object) => ({
                            ...object,
                            path: object.path ? { ...object.path, points: object.path.points.filter((_, index) => index !== pointIndex) } : object.path,
                          }))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {axes.map((axis, axisIndex) => (
                        <div key={`${pointIndex}-${axis}`} className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{axis}</Label>
                          <NumberStepper
                            ariaLabel={`Point ${pointIndex + 1} ${axis}`}
                            step={0.05}
                            value={Number(point[axisIndex].toFixed(2))}
                            onChange={(nextValue) =>
                              updateObject(selectedObject.id, (object) => ({
                                ...object,
                                path: object.path
                                  ? {
                                      ...object.path,
                                      points: object.path.points.map((entry, index) =>
                                        index === pointIndex ? (entry.map((value, valueIndex) => (valueIndex === axisIndex ? nextValue : value)) as Vec3) : entry,
                                      ),
                                    }
                                  : object.path,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        ) : null}

        {selectedObject.kind === "group" ? (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Group</div>
            <p className="text-sm text-muted-foreground">Move, duplicate, lock, or delete this group and its nested objects from one selection.</p>
            <Button className="w-full" size="sm" variant="secondary" onClick={() => ungroupObject(selectedObject.id)}>
              Ungroup
            </Button>
          </div>
        ) : isModelKind(selectedObject.kind) ? (
          <ModelPanel object={selectedObject} updateObject={updateObject} />
        ) : isImageKind(selectedObject.kind) ? (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Image</div>
            <div className="rounded-md border border-border p-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedObject.image?.fileName ?? "Imported image"}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{selectedObject.image?.sourceDataUrl ? "Image asset is stored with this scene." : "Image source is missing."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="image-width">Width</Label>
                <NumberStepper
                  ariaLabel="Image width"
                  id="image-width"
                  min={0.05}
                  step={0.05}
                  value={selectedObject.image?.width ?? 2}
                  onChange={(value) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      image: object.image ? { ...object.image, width: value } : object.image,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="image-height">Height</Label>
                <NumberStepper
                  ariaLabel="Image height"
                  id="image-height"
                  min={0.05}
                  step={0.05}
                  value={selectedObject.image?.height ?? 2}
                  onChange={(value) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      image: object.image ? { ...object.image, height: value } : object.image,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider max={1} min={0.05} step={0.01} value={[selectedObject.material.opacity]} onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })} />
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={selectedObject.material.wireframe} onCheckedChange={(checked) => updateMaterial(selectedObject.id, { wireframe: checked === true })} />
              Wireframe
            </Label>
          </div>
        ) : isVideoKind(selectedObject.kind) ? (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Video</div>
            <div className="rounded-md border border-border p-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <PackageOpen className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedObject.video?.fileName ?? "Imported video"}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{selectedObject.video?.sourceDataUrl ? "Video asset is stored with this scene." : "Video source is missing."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="video-width">Width</Label>
                <NumberStepper
                  ariaLabel="Video width"
                  id="video-width"
                  min={0.05}
                  step={0.05}
                  value={selectedObject.video?.width ?? 2}
                  onChange={(value) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      video: object.video ? { ...object.video, width: value } : object.video,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="video-height">Height</Label>
                <NumberStepper
                  ariaLabel="Video height"
                  id="video-height"
                  min={0.05}
                  step={0.05}
                  value={selectedObject.video?.height ?? 2}
                  onChange={(value) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      video: object.video ? { ...object.video, height: value } : object.video,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider max={1} min={0.05} step={0.01} value={[selectedObject.material.opacity]} onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })} />
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedObject.video?.loop ?? true}
                onCheckedChange={(checked) => updateObject(selectedObject.id, (object) => ({ ...object, video: object.video ? { ...object.video, loop: checked === true } : object.video }))}
              />
              Loop
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedObject.video?.muted ?? true}
                onCheckedChange={(checked) => updateObject(selectedObject.id, (object) => ({ ...object, video: object.video ? { ...object.video, muted: checked === true } : object.video }))}
              />
              Muted
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={selectedObject.material.wireframe} onCheckedChange={(checked) => updateMaterial(selectedObject.id, { wireframe: checked === true })} />
              Wireframe
            </Label>
          </div>
        ) : isFigmaKind(selectedObject.kind) ? (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Figma Preview</div>
            <div className="rounded-md border border-border p-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Frame className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedObject.figma?.name ?? "Figma Preview"}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{selectedObject.figma?.fileKey ? `File key ${selectedObject.figma.fileKey}` : "Paste a Figma file, design, prototype, or FigJam URL."}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="figma-url">URL</Label>
              <Input
                id="figma-url"
                value={selectedObject.figma?.url ?? ""}
                onChange={(event) => {
                  const nextUrl = event.target.value;

                  updateObject(selectedObject.id, (object) => {
                    if (!object.figma) {
                      return object;
                    }

                    try {
                      const nextPreview = createFigmaPreviewFromUrl(nextUrl);

                      return {
                        ...object,
                        name: nextPreview.name || object.name,
                        figma: {
                          ...nextPreview,
                          height: object.figma.height,
                          width: object.figma.width,
                        },
                      };
                    } catch {
                      return {
                        ...object,
                        figma: {
                          ...object.figma,
                          url: nextUrl,
                        },
                      };
                    }
                  });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="figma-width">Width</Label>
                <Input
                  id="figma-width"
                  inputMode="decimal"
                  min={0.5}
                  step={0.05}
                  type="number"
                  value={selectedObject.figma?.width ?? 3.2}
                  onChange={(event) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      figma: object.figma ? { ...object.figma, width: Math.max(0.5, toNumber(event.target.value, object.figma.width)) } : object.figma,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="figma-height">Height</Label>
                <Input
                  id="figma-height"
                  inputMode="decimal"
                  min={0.5}
                  step={0.05}
                  type="number"
                  value={selectedObject.figma?.height ?? 2.1}
                  onChange={(event) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      figma: object.figma ? { ...object.figma, height: Math.max(0.5, toNumber(event.target.value, object.figma.height)) } : object.figma,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Surface opacity</Label>
              <Slider max={1} min={0.05} step={0.01} value={[selectedObject.material.opacity]} onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })} />
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={selectedObject.material.wireframe} onCheckedChange={(checked) => updateMaterial(selectedObject.id, { wireframe: checked === true })} />
              Wireframe
            </Label>
          </div>
        ) : isAudioKind(selectedObject.kind) ? (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audio</div>
            <div className="rounded-md border border-border p-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Volume2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedObject.audio?.fileName ?? "Imported audio"}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{selectedObject.audio?.sourceDataUrl ? "Audio asset is stored with this scene." : "Audio source is missing."}</p>
            </div>
            <div className="space-y-2">
              <Label>Volume</Label>
              <Slider
                max={1}
                min={0}
                step={0.01}
                value={[selectedObject.audio?.volume ?? 0.8]}
                onValueChange={(value) =>
                  updateObject(selectedObject.id, (object) => ({
                    ...object,
                    audio: object.audio ? { ...object.audio, volume: firstSliderValue(value) } : object.audio,
                  }))
                }
              />
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedObject.audio?.autoplay ?? false}
                onCheckedChange={(checked) => updateObject(selectedObject.id, (object) => ({ ...object, audio: object.audio ? { ...object.audio, autoplay: checked === true } : object.audio }))}
              />
              Autoplay
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedObject.audio?.loop ?? false}
                onCheckedChange={(checked) => updateObject(selectedObject.id, (object) => ({ ...object, audio: object.audio ? { ...object.audio, loop: checked === true } : object.audio }))}
              />
              Loop
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedObject.audio?.muted ?? false}
                onCheckedChange={(checked) => updateObject(selectedObject.id, (object) => ({ ...object, audio: object.audio ? { ...object.audio, muted: checked === true } : object.audio }))}
              />
              Muted
            </Label>
          </div>
        ) : isSvgKind(selectedObject.kind) ? (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SVG</div>
            <div className="rounded-md border border-border p-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <PenTool className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedObject.svg?.fileName ?? "Imported SVG"}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{selectedObject.svg?.sourceDataUrl ? "SVG vector paths are stored with this scene." : "SVG source is missing."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="svg-width">Width</Label>
                <NumberStepper
                  ariaLabel="SVG width"
                  id="svg-width"
                  min={0.05}
                  step={0.05}
                  value={selectedObject.svg?.width ?? 2}
                  onChange={(value) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      svg: object.svg ? { ...object.svg, width: value } : object.svg,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="svg-height">Height</Label>
                <NumberStepper
                  ariaLabel="SVG height"
                  id="svg-height"
                  min={0.05}
                  step={0.05}
                  value={selectedObject.svg?.height ?? 2}
                  onChange={(value) =>
                    updateObject(selectedObject.id, (object) => ({
                      ...object,
                      svg: object.svg ? { ...object.svg, height: value } : object.svg,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_44px] items-center gap-3">
              <Label htmlFor="svg-color">Fill color</Label>
              <Input id="svg-color" className="h-9 p-1" type="color" value={selectedObject.material.color} onChange={(event) => updateMaterial(selectedObject.id, { color: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider max={1} min={0.05} step={0.01} value={[selectedObject.material.opacity]} onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })} />
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={selectedObject.material.wireframe} onCheckedChange={(checked) => updateMaterial(selectedObject.id, { wireframe: checked === true })} />
              Wireframe
            </Label>
          </div>
        ) : selectedParticles ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-4" />
              Particles
            </div>
            <div className="grid grid-cols-2 gap-2">
              {particleControls.map((control) => (
                <div key={control.id} className="space-y-1">
                  <Label htmlFor={`particle-${control.id}`}>{control.label}</Label>
                  <NumberStepper
                    ariaLabel={control.label}
                    id={`particle-${control.id}`}
                    max={control.max}
                    min={control.min}
                    precision={control.integer ? 0 : 2}
                    step={control.step}
                    value={Number(selectedParticles[control.id].toFixed(control.integer ? 0 : 2))}
                    onChange={(value) =>
                      updateParticleSettings({
                        [control.id]: control.integer ? Math.round(value) : value,
                      } as Partial<ParticleSettings>)
                    }
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_44px] items-center gap-3">
              <Label htmlFor="particle-color">Color</Label>
              <Input id="particle-color" className="h-9 p-1" type="color" value={selectedObject.material.color} onChange={(event) => updateMaterial(selectedObject.id, { color: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider max={1} min={0.05} step={0.01} value={[selectedObject.material.opacity]} onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })} />
            </div>
          </div>
        ) : isCameraKind(selectedObject.kind) ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Camera</div>
                {activeCameraId === selectedObject.id ? <span className="text-xs text-primary">Active</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="gap-2" size="sm" variant="secondary" onClick={() => setActiveCamera(selectedObject.id)}>
                  <Camera className="size-4" />
                  Set active
                </Button>
                <Button
                  className="gap-2"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setActiveCamera(selectedObject.id);
                    setCameraPreviewEnabled(true);
                  }}
                >
                  Preview
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Field of view</Label>
                <Slider
                  max={120}
                  min={10}
                  step={1}
                  value={[selectedObject.camera?.fov ?? 48]}
                  onValueChange={(value) => updateCamera(selectedObject.id, { fov: firstSliderValue(value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="camera-near">Near</Label>
                  <NumberStepper
                    ariaLabel="Camera near"
                    id="camera-near"
                    min={0.01}
                    precision={2}
                    step={0.01}
                    value={selectedObject.camera?.near ?? 0.1}
                    onChange={(value) => updateCamera(selectedObject.id, { near: value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="camera-far">Far</Label>
                  <NumberStepper
                    ariaLabel="Camera far"
                    id="camera-far"
                    min={10}
                    precision={0}
                    step={10}
                    value={selectedObject.camera?.far ?? 1000}
                    onChange={(value) => updateCamera(selectedObject.id, { far: value })}
                  />
                </div>
              </div>
            </div>
          </>
        ) : isLightKind(selectedObject.kind) ? (
          <>
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Light</div>
              <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                <Label htmlFor="light-color">Color</Label>
                <Input
                  id="light-color"
                  className="h-9 p-1"
                  type="color"
                  value={selectedObject.light?.color ?? "#ffffff"}
                  onChange={(event) => updateLight(selectedObject.id, { color: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Intensity</Label>
                <Slider
                  max={20}
                  min={0}
                  step={0.1}
                  value={[selectedObject.light?.intensity ?? 2.4]}
                  onValueChange={(value) => updateLight(selectedObject.id, { intensity: firstSliderValue(value) })}
                />
              </div>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedObject.light?.castShadow ?? true} onCheckedChange={(checked) => updateLight(selectedObject.id, { castShadow: checked === true })} />
                Cast shadow
              </Label>
              {(selectedObject.light?.castShadow ?? true) ? (
                <>
                  <div className="space-y-2">
                    <Label>Shadow softness</Label>
                    <Slider
                      max={12}
                      min={0}
                      step={0.1}
                      value={[selectedObject.light?.shadowRadius ?? 2.2]}
                      onValueChange={(value) => updateLight(selectedObject.id, { shadowRadius: firstSliderValue(value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Shadow bias</Label>
                    <Slider
                      max={0.01}
                      min={-0.01}
                      step={0.0001}
                      value={[selectedObject.light?.shadowBias ?? -0.0004]}
                      onValueChange={(value) => updateLight(selectedObject.id, { shadowBias: firstSliderValue(value) })}
                    />
                  </div>
                </>
              ) : null}
              {selectedObject.kind !== "directionalLight" ? (
                <div className="space-y-2">
                  <Label>Distance</Label>
                  <Slider
                    max={100}
                    min={0}
                    step={0.5}
                    value={[selectedObject.light?.distance ?? 12]}
                    onValueChange={(value) => updateLight(selectedObject.id, { distance: firstSliderValue(value) })}
                  />
                </div>
              ) : null}
              {selectedObject.kind === "spotLight" ? (
                <>
                  <div className="space-y-2">
                    <Label>Angle</Label>
                    <Slider
                      max={1.57}
                      min={0.05}
                      step={0.01}
                      value={[selectedObject.light?.angle ?? 0.65]}
                      onValueChange={(value) => updateLight(selectedObject.id, { angle: firstSliderValue(value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Soft edge</Label>
                    <Slider
                      max={1}
                      min={0}
                      step={0.01}
                      value={[selectedObject.light?.penumbra ?? 0.35]}
                      onValueChange={(value) => updateLight(selectedObject.id, { penumbra: firstSliderValue(value) })}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Material</div>
          <div className="grid grid-cols-[1fr_44px] items-center gap-3">
            <Label htmlFor="material-color">Color</Label>
            <Input
              id="material-color"
              className="h-9 p-1"
              type="color"
              value={selectedObject.material.color}
              onChange={(event) => updateMaterial(selectedObject.id, { color: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material-texture">Texture image</Label>
            <Input id="material-texture" accept="image/*" type="file" onChange={handleTextureUpload} />
            {selectedObject.material.textureDataUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border p-2">
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="size-8 shrink-0 rounded border border-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${selectedObject.material.textureDataUrl})` }}
                  />
                  <span className="truncate">
                    <ImageIcon className="mr-1 inline size-3.5" />
                    Image texture attached
                  </span>
                </div>
                <Button
                  aria-label="Remove texture"
                  className="size-8 shrink-0"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    updateMaterial(selectedObject.id, { textureDataUrl: null });
                    setTextureMessage(null);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}
            {textureMessage ? <p className="text-xs text-muted-foreground">{textureMessage}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Opacity</Label>
            <Slider
              max={1}
              min={0.05}
              step={0.01}
              value={[selectedObject.material.opacity]}
              onValueChange={(value) => updateMaterial(selectedObject.id, { opacity: firstSliderValue(value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Roughness</Label>
            <Slider
              max={1}
              min={0}
              step={0.01}
              value={[selectedObject.material.roughness]}
              onValueChange={(value) => updateMaterial(selectedObject.id, { roughness: firstSliderValue(value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Metalness</Label>
            <Slider
              max={1}
              min={0}
              step={0.01}
              value={[selectedObject.material.metalness]}
              onValueChange={(value) => updateMaterial(selectedObject.id, { metalness: firstSliderValue(value) })}
            />
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <Checkbox checked={selectedObject.material.wireframe} onCheckedChange={(checked) => updateMaterial(selectedObject.id, { wireframe: checked === true })} />
            Wireframe
          </Label>
          <MaterialLayersPanel object={selectedObject} updateMaterial={updateMaterial} />
        </div>
        )}
        {selectedObject.kind !== "group" ? (
          <Button className="w-full" size="sm" variant="secondary" onClick={groupSelectedObject}>
            Group selected object
          </Button>
        ) : null}
      </section>
    </ScrollArea>
  );
}
