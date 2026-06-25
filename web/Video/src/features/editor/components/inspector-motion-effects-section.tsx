"use client";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Field } from "@/features/editor/components/inspector-fields";
import { InspectorTransformSection } from "@/features/editor/components/inspector-transform-section";
import { KeyframePanel } from "@/features/editor/components/keyframe-panel";
import { LayerStylePresetsPanel } from "@/features/editor/components/layer-style-presets-panel";
import { MotionPresetPanel } from "@/features/editor/components/motion-preset-panel";
import { ObjectMaskPanel } from "@/features/editor/components/object-mask-panel";
import { TrackingAttachmentPanel } from "@/features/editor/components/tracking-attachment-panel";
import { TransitionPanel } from "@/features/editor/components/transition-panel";
import { VisualEffectsPanel } from "@/features/editor/components/visual-effects-panel";
import type { LayerStyle, LayerTransform, MediaAsset, TimelineLayer } from "@/lib/editor/types";

type InspectorMotionEffectsSectionProps = {
  layer: TimelineLayer;
  layers: TimelineLayer[];
  asset?: MediaAsset;
  currentTime: number;
  editableSelectionCount: number;
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
  onPatchTransform: (patch: Partial<LayerTransform>) => void;
  onPatchStyle: (patch: Partial<LayerStyle>) => void;
  onCenterSelectedLayers: () => number;
  onFitSelectedLayersToCanvas: (mode: "cover" | "contain") => number;
  onAddBlurredBackgroundForSelectedMediaLayers: () => number;
};

export function InspectorMotionEffectsSection({
  layer,
  layers,
  asset,
  currentTime,
  editableSelectionCount,
  onUpdateLayer,
  onPatchTransform,
  onPatchStyle,
  onCenterSelectedLayers,
  onFitSelectedLayersToCanvas,
  onAddBlurredBackgroundForSelectedMediaLayers,
}: InspectorMotionEffectsSectionProps) {
  return (
    <>
      <Separator />
      <InspectorTransformSection
        layer={layer}
        editableSelectionCount={editableSelectionCount}
        mediaAsset={asset}
        onPatchTransform={onPatchTransform}
        onPatchStyle={onPatchStyle}
        onCenterSelectedLayers={onCenterSelectedLayers}
        onFitSelectedLayersToCanvas={onFitSelectedLayersToCanvas}
        onAddBlurredBackgroundForSelectedMediaLayers={onAddBlurredBackgroundForSelectedMediaLayers}
      />
      <KeyframePanel layer={layer} currentTime={currentTime} onChange={(keyframes) => onUpdateLayer(layer.id, { keyframes })} />
      <TrackingAttachmentPanel layer={layer} layers={layers} onChange={(tracking) => onUpdateLayer(layer.id, { tracking })} />
      <MotionPresetPanel motion={layer.motion} onChange={(motion) => onUpdateLayer(layer.id, { motion })} />
      <TransitionPanel transition={layer.transition} duration={layer.duration} onChange={(transition) => onUpdateLayer(layer.id, { transition })} />
      <Field label="Opacity">
        <Slider value={[layer.style.opacity]} min={0} max={1} step={0.01} onValueChange={([opacity]) => onPatchStyle({ opacity: opacity ?? 1 })} />
      </Field>
      <VisualEffectsPanel style={layer.style} onChange={onPatchStyle} supportsChromaKey={layer.kind === "image" || layer.kind === "video"} />
      {layer.kind === "image" || layer.kind === "video" ? (
        <ObjectMaskPanel masks={layer.style.objectMasks} onChange={(objectMasks) => onPatchStyle({ objectMasks })} />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fill">
          <Input type="color" value={toColor(layer.style.fill)} onChange={(event) => onPatchStyle({ fill: event.target.value })} />
        </Field>
        <Field label="Background">
          <Input type="color" value={toColor(layer.style.background)} onChange={(event) => onPatchStyle({ background: event.target.value })} />
        </Field>
      </div>
      <LayerStylePresetsPanel layer={layer} />
    </>
  );
}

function toColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}
