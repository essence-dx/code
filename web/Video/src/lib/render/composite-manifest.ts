import type { EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import type { RenderPlan } from "@/lib/render/export-planner";
import { planUsesTransparentBackground } from "@/lib/render/export-planner";

export interface CompositeRenderLayer {
  layer: TimelineLayer;
  asset?: MediaAsset;
  role: "visual" | "audio";
}

export interface CompositeRenderManifest {
  width: number;
  height: number;
  fps: number;
  duration: number;
  layers: CompositeRenderLayer[];
  visualLayers: CompositeRenderLayer[];
  audioLayers: CompositeRenderLayer[];
  missingMediaLayers: TimelineLayer[];
  transparentBackground: boolean;
}

export function createCompositeRenderManifest(
  plan: RenderPlan,
  project: EditorProject,
  assets: MediaAsset[],
): CompositeRenderManifest {
  const layers = project.layers
    .filter((layer) => !layer.hidden && (plan.conversionOptions?.captionMode === "burn-in" || layer.kind !== "subtitle"))
    .sort((a, b) => a.track - b.track || a.start - b.start)
    .map((layer) => {
      const asset = layer.assetId ? assets.find((item) => item.id === layer.assetId) : undefined;
      return {
        layer,
        asset,
        role: layer.kind === "audio" ? "audio" : "visual",
      } satisfies CompositeRenderLayer;
    });
  const missingMediaLayers = layers
    .filter((item) => isMediaLayer(item.layer) && !item.asset)
    .map((item) => item.layer);

  return {
    width: plan.conversionOptions?.width || plan.presetOptions?.width || project.width,
    height: plan.conversionOptions?.height || plan.presetOptions?.height || project.height,
    fps: plan.conversionOptions?.fps || plan.presetOptions?.fps || project.fps || 30,
    duration: Math.max(0, plan.duration),
    layers,
    visualLayers: layers.filter((item) => item.role === "visual"),
    audioLayers: layers.filter((item) => item.role === "audio"),
    missingMediaLayers,
    transparentBackground: planUsesTransparentBackground(plan),
  };
}

function isMediaLayer(layer: TimelineLayer) {
  return layer.kind === "audio" || layer.kind === "image" || layer.kind === "video";
}
