import type { LayerTrackingAttachment, LayerTransform, TimelineLayer } from "@/lib/editor/types";
import { animatedLayerTransform } from "@/lib/editor/motion";
import { normalizeLayerObjectMasks } from "@/lib/editor/object-masks";

export interface TrackingRegion {
  id: string;
  label: string;
  targetLayerId: string;
  targetMaskId?: string;
}

interface ProjectSize {
  width: number;
  height: number;
}

export function layerCanAttachToTracking(layer: Pick<TimelineLayer, "kind">) {
  return layer.kind === "text" || layer.kind === "sticker";
}

export function normalizeLayerTrackingAttachment(
  attachment: LayerTrackingAttachment | undefined,
): LayerTrackingAttachment | undefined {
  if (!attachment?.enabled || !attachment.targetLayerId?.trim()) return undefined;

  return {
    enabled: true,
    targetLayerId: attachment.targetLayerId.trim(),
    targetMaskId: attachment.targetMaskId?.trim() || undefined,
    offsetX: clampNumber(attachment.offsetX, 0, -1, 1),
    offsetY: clampNumber(attachment.offsetY, 0, -1, 1),
    scaleWithTarget: attachment.scaleWithTarget === true,
  };
}

export function availableTrackingRegions(layers: TimelineLayer[], selectedLayerId?: string): TrackingRegion[] {
  return layers.flatMap((layer) => {
    if (layer.id === selectedLayerId || (layer.kind !== "image" && layer.kind !== "video")) return [];

    const masks = normalizeLayerObjectMasks(layer.style.objectMasks).filter((mask) => mask.enabled && mask.tracking === "center");
    const layerCenter: TrackingRegion = {
      id: regionId(layer.id),
      label: `${layer.name} center`,
      targetLayerId: layer.id,
    };

    return [
      layerCenter,
      ...masks.map((mask, index) => ({
        id: regionId(layer.id, mask.id),
        label: `${layer.name} mask ${index + 1}`,
        targetLayerId: layer.id,
        targetMaskId: mask.id,
      })),
    ];
  });
}

export function trackingRegionId(attachment: LayerTrackingAttachment | undefined) {
  const normalized = normalizeLayerTrackingAttachment(attachment);
  return normalized ? regionId(normalized.targetLayerId, normalized.targetMaskId) : "none";
}

export function trackedLayerTransform(
  layer: TimelineLayer,
  layers: TimelineLayer[],
  currentTime: number,
  projectSize: ProjectSize,
): LayerTransform {
  const transform = animatedLayerTransform(layer, currentTime);
  if (!layerCanAttachToTracking(layer)) return transform;

  const attachment = normalizeLayerTrackingAttachment(layer.tracking);
  if (!attachment) return transform;

  const targetLayer = layers.find((item) => item.id === attachment.targetLayerId);
  if (!targetLayer || targetLayer.id === layer.id || targetLayer.hidden) return transform;

  const targetTransform = animatedLayerTransform(targetLayer, currentTime);
  const anchor = trackingAnchor(targetLayer, targetTransform, attachment, projectSize);
  if (!anchor) return transform;

  return {
    ...transform,
    x: anchor.x + attachment.offsetX,
    y: anchor.y + attachment.offsetY,
    scale: attachment.scaleWithTarget ? transform.scale * Math.max(0.1, targetTransform.scale || 1) : transform.scale,
  };
}

function trackingAnchor(
  targetLayer: TimelineLayer,
  targetTransform: LayerTransform,
  attachment: LayerTrackingAttachment,
  projectSize: ProjectSize,
) {
  if (!attachment.targetMaskId) {
    return { x: targetTransform.x, y: targetTransform.y };
  }

  const mask = normalizeLayerObjectMasks(targetLayer.style.objectMasks).find(
    (item) => item.id === attachment.targetMaskId && item.enabled && item.tracking === "center",
  );
  if (!mask) return null;

  const offsetX = ((mask.x + mask.width / 2 - 0.5) * targetTransform.width * targetTransform.scale) / projectSize.width;
  const offsetY = ((mask.y + mask.height / 2 - 0.5) * targetTransform.height * targetTransform.scale) / projectSize.height;
  const rotation = (targetTransform.rotation * Math.PI) / 180;
  const rotatedX = offsetX * Math.cos(rotation) - offsetY * Math.sin(rotation);
  const rotatedY = offsetX * Math.sin(rotation) + offsetY * Math.cos(rotation);

  return {
    x: targetTransform.x + rotatedX,
    y: targetTransform.y + rotatedY,
  };
}

function regionId(targetLayerId: string, targetMaskId?: string) {
  return targetMaskId ? `${targetLayerId}:mask:${targetMaskId}` : `${targetLayerId}:center`;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, typeof value === "number" && Number.isFinite(value) ? value : fallback));
}
