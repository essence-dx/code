"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  alignCrop,
  cropAspectPresets,
  cropFocusPresets,
  cropForAspectPreset,
  layerMaskShapePresets,
  maskShapeRadius,
  type CropAspectPresetId,
  type CropFocusPresetId,
  type LayerMaskShapePresetId,
} from "@/lib/editor/crop-presets";
import { normalizeLayerCrop } from "@/lib/editor/framing";
import type { LayerFramingMode, LayerStyle, LayerTransform, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { Field, NumberField } from "@/features/editor/components/inspector-fields";

const framingModes: Array<{ value: LayerFramingMode; label: string }> = [
  { value: "fit", label: "Fit" },
  { value: "fill", label: "Fill" },
  { value: "stretch", label: "Stretch" },
];

type InspectorTransformSectionProps = {
  layer: TimelineLayer;
  editableSelectionCount: number;
  mediaAsset: MediaAsset | undefined;
  onPatchTransform: (patch: Partial<LayerTransform>) => void;
  onPatchStyle: (patch: Partial<LayerStyle>) => void;
  onCenterSelectedLayers: () => number;
  onFitSelectedLayersToCanvas: (mode: "cover" | "contain") => number;
  onAddBlurredBackgroundForSelectedMediaLayers: () => number;
};

export function InspectorTransformSection({
  layer,
  editableSelectionCount,
  mediaAsset,
  onPatchTransform,
  onPatchStyle,
  onCenterSelectedLayers,
  onFitSelectedLayersToCanvas,
  onAddBlurredBackgroundForSelectedMediaLayers,
}: InspectorTransformSectionProps) {
  const isMediaLayer = layer.kind === "image" || layer.kind === "video";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Width" value={layer.transform.width} min={1} onChange={(width) => onPatchTransform({ width })} />
        <NumberField label="Height" value={layer.transform.height} min={1} onChange={(height) => onPatchTransform({ height })} />
        <NumberField label="X" value={layer.transform.x} step={0.01} onChange={(x) => onPatchTransform({ x })} />
        <NumberField label="Y" value={layer.transform.y} step={0.01} onChange={(y) => onPatchTransform({ y })} />
      </div>
      <Field label="Rotation">
        <Slider
          value={[layer.transform.rotation]}
          min={-180}
          max={180}
          step={1}
          onValueChange={([rotation]) => onPatchTransform({ rotation: rotation ?? 0 })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={layer.transform.flipX ? "secondary" : "outline"} onClick={() => onPatchTransform({ flipX: !layer.transform.flipX })}>
          Flip horizontal
        </Button>
        <Button variant={layer.transform.flipY ? "secondary" : "outline"} onClick={() => onPatchTransform({ flipY: !layer.transform.flipY })}>
          Flip vertical
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={onCenterSelectedLayers} disabled={!editableSelectionCount}>
          Center
        </Button>
        <Button variant="outline" onClick={() => onFitSelectedLayersToCanvas("cover")} disabled={!editableSelectionCount}>
          Cover
        </Button>
        <Button variant="outline" onClick={() => onFitSelectedLayersToCanvas("contain")} disabled={!editableSelectionCount}>
          Contain
        </Button>
      </div>
      {isMediaLayer ? <FramingModeControls value={layer.transform.framing} onChange={(framing) => onPatchTransform({ framing })} /> : null}
      {isMediaLayer ? <CropControls layer={layer} mediaAsset={mediaAsset} onChange={(crop) => onPatchTransform({ crop })} /> : null}
      {isMediaLayer ? <MaskShapeControls layer={layer} onChange={(radius) => onPatchStyle({ radius })} /> : null}
      {isMediaLayer ? (
        <Button variant="outline" onClick={onAddBlurredBackgroundForSelectedMediaLayers} disabled={!editableSelectionCount}>
          Add blurred background
        </Button>
      ) : null}
    </>
  );
}

function FramingModeControls({ value = "fill", onChange }: { value?: LayerFramingMode; onChange: (value: LayerFramingMode) => void }) {
  return (
    <Field label="Framing">
      <div className="grid grid-cols-3 gap-2">
        {framingModes.map((mode) => (
          <Button key={mode.value} variant={value === mode.value ? "secondary" : "outline"} onClick={() => onChange(mode.value)}>
            {mode.label}
          </Button>
        ))}
      </div>
    </Field>
  );
}

function CropControls({
  layer,
  mediaAsset,
  onChange,
}: {
  layer: TimelineLayer;
  mediaAsset: MediaAsset | undefined;
  onChange: (crop: LayerTransform["crop"]) => void;
}) {
  const crop = normalizeLayerCrop(layer.transform.crop);
  const setCrop = (patch: Partial<NonNullable<LayerTransform["crop"]>>) => onChange(normalizeLayerCrop({ ...crop, ...patch }));
  const sourceDimensions = {
    width: mediaAsset?.width ?? layer.transform.width,
    height: mediaAsset?.height ?? layer.transform.height,
  };
  const applyAspectPreset = (presetId: CropAspectPresetId) => onChange(cropForAspectPreset(presetId, sourceDimensions));
  const applyFocusPreset = (presetId: CropFocusPresetId) => onChange(alignCrop(crop, presetId));

  return (
    <Field label="Crop">
      <div className="mb-2 grid grid-cols-3 gap-2">
        {cropAspectPresets.map((preset) => (
          <Button key={preset.id} variant="outline" onClick={() => applyAspectPreset(preset.id)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="mb-2 grid grid-cols-5 gap-2">
        {cropFocusPresets.map((preset) => (
          <Button key={preset.id} variant="outline" onClick={() => applyFocusPreset(preset.id)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <NumberField label="Left %" value={Math.round(crop.x * 100)} min={0} max={99} step={1} onChange={(x) => setCrop({ x: x / 100 })} />
        <NumberField label="Top %" value={Math.round(crop.y * 100)} min={0} max={99} step={1} onChange={(y) => setCrop({ y: y / 100 })} />
        <NumberField
          label="Width %"
          value={Math.round(crop.width * 100)}
          min={1}
          max={100}
          step={1}
          onChange={(width) => setCrop({ width: width / 100 })}
        />
        <NumberField
          label="Height %"
          value={Math.round(crop.height * 100)}
          min={1}
          max={100}
          step={1}
          onChange={(height) => setCrop({ height: height / 100 })}
        />
      </div>
      <Button className="mt-2 w-full" variant="outline" onClick={() => onChange({ x: 0, y: 0, width: 1, height: 1 })}>
        Reset crop
      </Button>
    </Field>
  );
}

function MaskShapeControls({ layer, onChange }: { layer: TimelineLayer; onChange: (radius: number) => void }) {
  const currentRadius = layer.style.radius;
  const applyShape = (presetId: LayerMaskShapePresetId) => onChange(maskShapeRadius(presetId, layer.transform));

  return (
    <Field label="Mask shape">
      <div className="grid grid-cols-4 gap-2">
        {layerMaskShapePresets.map((preset) => (
          <Button
            key={preset.id}
            variant={Math.round(currentRadius) === Math.round(maskShapeRadius(preset.id, layer.transform)) ? "secondary" : "outline"}
            onClick={() => applyShape(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </Field>
  );
}
