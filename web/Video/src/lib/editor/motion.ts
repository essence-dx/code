import type { LayerMotion, LayerTransform, TimelineLayer } from "@/lib/editor/types";
import { keyframedLayerTransform } from "@/lib/editor/keyframes";

export function normalizeLayerMotion(motion: LayerMotion | undefined): LayerMotion {
  const preset = motion?.preset ?? "none";
  const allowedPreset = ["none", "slow-zoom", "pan-left", "pan-right", "settle"].includes(preset) ? preset : "none";

  return {
    preset: allowedPreset as LayerMotion["preset"],
    intensity: Math.min(3, Math.max(0.1, typeof motion?.intensity === "number" && Number.isFinite(motion.intensity) ? motion.intensity : 1)),
  };
}

export function animatedLayerTransform(
  layer: Pick<TimelineLayer, "start" | "duration" | "transform" | "motion" | "keyframes">,
  currentTime: number,
): LayerTransform {
  const motion = normalizeLayerMotion(layer.motion);
  const transform = keyframedLayerTransform(layer, currentTime);
  const progress = layer.duration > 0 ? Math.min(1, Math.max(0, (currentTime - layer.start) / layer.duration)) : 0;
  const travel = 0.045 * motion.intensity;

  if (motion.preset === "slow-zoom") {
    return { ...transform, scale: transform.scale * (1 + 0.08 * motion.intensity * progress) };
  }

  if (motion.preset === "pan-left") {
    return { ...transform, x: transform.x + travel * (1 - progress * 2) };
  }

  if (motion.preset === "pan-right") {
    return { ...transform, x: transform.x - travel * (1 - progress * 2) };
  }

  if (motion.preset === "settle") {
    return {
      ...transform,
      y: transform.y - 0.02 * motion.intensity * (1 - progress),
      scale: transform.scale * (1 + 0.04 * motion.intensity * (1 - progress)),
    };
  }

  return transform;
}

export function transformScaleForFlips(transform: Pick<LayerTransform, "scale" | "flipX" | "flipY">) {
  const scale = transform.scale || 1;
  return {
    scaleX: scale * (transform.flipX ? -1 : 1),
    scaleY: scale * (transform.flipY ? -1 : 1),
  };
}
