import type { BrandFontAsset, EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { layerSourceDuration, normalizeLayerSpeed, normalizePlaybackRate } from "@/lib/editor/speed";
import { normalizeLayerTrackingAttachment } from "@/lib/editor/tracking";
import type { RenderPlan } from "@/lib/render/export-planner";
import { planUsesTransparentBackground } from "@/lib/render/export-planner";

export interface NativeRenderGraph {
  version: 1;
  canvas: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    background: string;
    transparentBackground: boolean;
  };
  layers: NativeRenderGraphLayer[];
  media: NativeRenderGraphMedia[];
  fonts: NativeRenderGraphFont[];
}

export interface NativeRenderGraphLayer {
  id: string;
  kind: TimelineLayer["kind"];
  name: string;
  track: number;
  timing: {
    start: number;
    duration: number;
    trimStart: number;
    sourceDuration: number;
    playbackRate: number;
    speed: {
      reversed: boolean;
      preservePitch: boolean;
      ramp: {
        enabled: boolean;
        mode: "linear";
        startRate: number;
        endRate: number;
      };
    };
  };
  muted: boolean;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  assetId?: string;
  text?: string;
  cueCount?: number;
  transform: Pick<TimelineLayer["transform"], "x" | "y" | "width" | "height" | "rotation" | "scale" | "flipX" | "flipY" | "framing" | "crop">;
  style: Pick<
    TimelineLayer["style"],
    | "fill"
    | "stroke"
    | "background"
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "radius"
    | "opacity"
    | "blur"
    | "brightness"
    | "contrast"
    | "saturation"
    | "exposure"
    | "temperature"
    | "tint"
    | "vignette"
    | "lookPreset"
    | "borderWidth"
    | "shadowBlur"
    | "shadowColor"
  >;
  effects: {
    motionPreset?: string;
    keyframeCount: number;
    trackingTargetLayerId?: string;
    trackingTargetMaskId?: string;
    transitionIn?: string;
    transitionOut?: string;
    chromaKeyEnabled: boolean;
    backgroundReplacementEnabled: boolean;
    objectMaskCount: number;
  };
}

export interface NativeRenderGraphMedia {
  id: string;
  name: string;
  type: MediaAsset["type"];
  mimeType: string;
  source: MediaAsset["source"];
  storageKey: string;
  duration: number;
  width?: number;
  height?: number;
}

export interface NativeRenderGraphFont {
  id: string;
  name: string;
  family: string;
  source: BrandFontAsset["source"];
  storageKey: string;
  mimeType: string;
}

export function createNativeRenderGraph(project: EditorProject, assets: MediaAsset[], plan: RenderPlan): NativeRenderGraph {
  const layerAssets = new Map(assets.map((asset) => [asset.id, asset]));
  const transparentBackground = planUsesTransparentBackground(plan);
  const layers = project.layers
    .filter((layer) => !layer.hidden && (plan.conversionOptions?.captionMode === "burn-in" || layer.kind !== "subtitle"))
    .sort((a, b) => a.track - b.track || a.start - b.start)
    .map((layer) => toNativeRenderGraphLayer(layer));
  const mediaIds = new Set(layers.map((layer) => layer.assetId).filter((assetId): assetId is string => Boolean(assetId)));

  return {
    version: 1,
    canvas: {
      width: plan.conversionOptions?.width || plan.presetOptions?.width || project.width,
      height: plan.conversionOptions?.height || plan.presetOptions?.height || project.height,
      fps: plan.conversionOptions?.fps || plan.presetOptions?.fps || project.fps || 30,
      duration: Math.max(0.1, plan.duration || project.duration || 0.1),
      background: transparentBackground ? "transparent" : project.background,
      transparentBackground,
    },
    layers,
    media: [...mediaIds].flatMap((assetId) => {
      const asset = layerAssets.get(assetId);
      return asset ? [toNativeRenderGraphMedia(asset)] : [];
    }),
    fonts: project.brandKit?.fontAssets?.map(toNativeRenderGraphFont) ?? [],
  };
}

function toNativeRenderGraphLayer(layer: TimelineLayer): NativeRenderGraphLayer {
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
  const tracking = normalizeLayerTrackingAttachment(layer.tracking);

  return {
    id: layer.id,
    kind: layer.kind,
    name: layer.name,
    track: layer.track,
    timing: {
      start: clampTime(layer.start),
      duration: clampTime(layer.duration),
      trimStart: clampTime(layer.trimStart),
      sourceDuration: clampTime(layerSourceDuration(layer)),
      playbackRate: normalizePlaybackRate(layer.playbackRate),
      speed,
    },
    muted: layer.muted,
    volume: layer.volume ?? 1,
    fadeIn: layer.fadeIn ?? 0,
    fadeOut: layer.fadeOut ?? 0,
    assetId: layer.assetId,
    text: layer.text,
    cueCount: layer.cues?.length,
    transform: {
      x: layer.transform.x,
      y: layer.transform.y,
      width: layer.transform.width,
      height: layer.transform.height,
      rotation: layer.transform.rotation,
      scale: layer.transform.scale,
      flipX: layer.transform.flipX,
      flipY: layer.transform.flipY,
      framing: layer.transform.framing,
      crop: layer.transform.crop,
    },
    style: {
      fill: layer.style.fill,
      stroke: layer.style.stroke,
      background: layer.style.background,
      fontFamily: layer.style.fontFamily,
      fontSize: layer.style.fontSize,
      fontWeight: layer.style.fontWeight,
      radius: layer.style.radius,
      opacity: layer.style.opacity,
      blur: layer.style.blur,
      brightness: layer.style.brightness,
      contrast: layer.style.contrast,
      saturation: layer.style.saturation,
      exposure: layer.style.exposure,
      temperature: layer.style.temperature,
      tint: layer.style.tint,
      vignette: layer.style.vignette,
      lookPreset: layer.style.lookPreset,
      borderWidth: layer.style.borderWidth,
      shadowBlur: layer.style.shadowBlur,
      shadowColor: layer.style.shadowColor,
    },
    effects: {
      motionPreset: layer.motion?.preset,
      keyframeCount: layer.keyframes?.length ?? 0,
      trackingTargetLayerId: tracking?.targetLayerId,
      trackingTargetMaskId: tracking?.targetMaskId,
      transitionIn: layer.transition?.in,
      transitionOut: layer.transition?.out,
      chromaKeyEnabled: layer.style.chromaKey?.enabled ?? false,
      backgroundReplacementEnabled: layer.style.backgroundReplacement?.enabled ?? false,
      objectMaskCount: layer.style.objectMasks?.filter((mask) => mask.enabled).length ?? 0,
    },
  };
}

function toNativeRenderGraphMedia(asset: MediaAsset): NativeRenderGraphMedia {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    mimeType: asset.mimeType,
    source: asset.source,
    storageKey: asset.storageKey,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
  };
}

function toNativeRenderGraphFont(asset: BrandFontAsset): NativeRenderGraphFont {
  return {
    id: asset.id,
    name: asset.name,
    family: asset.family,
    source: asset.source,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
  };
}

function clampTime(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
