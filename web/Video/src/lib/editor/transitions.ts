import type { LayerTransition, LayerTransitionPreset, TimelineLayer } from "@/lib/editor/types";

const transitionPresets: LayerTransitionPreset[] = ["none", "fade", "slide", "crossfade", "push", "zoom", "pop", "wipe-left", "wipe-up"];

interface TransitionClip {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface TransitionProgress {
  opacity: number;
  offsetXRatio: number;
  offsetYRatio: number;
  scale: number;
  clip: TransitionClip;
}

const identityClip: TransitionClip = { top: 0, right: 0, bottom: 0, left: 0 };

export function normalizeLayerTransition(transition: LayerTransition | undefined, layerDuration = Number.POSITIVE_INFINITY): LayerTransition {
  const maxDuration = Number.isFinite(layerDuration) ? Math.max(0, layerDuration / 2) : 3;

  return {
    in: normalizeTransitionPreset(transition?.in),
    out: normalizeTransitionPreset(transition?.out),
    duration: Math.min(3, maxDuration, Math.max(0, finiteNumber(transition?.duration, 0.5))),
  };
}

export function layerTransitionFrame(layer: Pick<TimelineLayer, "start" | "duration" | "transition">, currentTime: number) {
  const transition = normalizeLayerTransition(layer.transition, layer.duration);
  const duration = Math.min(transition.duration, layer.duration / 2);

  if (duration <= 0 || (transition.in === "none" && transition.out === "none")) {
    return { opacity: 1, offsetXRatio: 0, offsetYRatio: 0, scale: 1, clip: identityClip };
  }

  const localTime = Math.min(layer.duration, Math.max(0, currentTime - layer.start));
  const incoming = localTime < duration ? transitionProgress(transition.in, localTime / duration, "in") : null;
  const outgoing = layer.duration - localTime < duration ? transitionProgress(transition.out, (layer.duration - localTime) / duration, "out") : null;

  return {
    opacity: (incoming?.opacity ?? 1) * (outgoing?.opacity ?? 1),
    offsetXRatio: (incoming?.offsetXRatio ?? 0) + (outgoing?.offsetXRatio ?? 0),
    offsetYRatio: (incoming?.offsetYRatio ?? 0) + (outgoing?.offsetYRatio ?? 0),
    scale: (incoming?.scale ?? 1) * (outgoing?.scale ?? 1),
    clip: mergeTransitionClips(incoming?.clip, outgoing?.clip),
  };
}

export function transitionClipPath(clip: TransitionClip) {
  if (!hasTransitionClip(clip)) return undefined;

  return `inset(${percent(clip.top)} ${percent(clip.right)} ${percent(clip.bottom)} ${percent(clip.left)})`;
}

export function applyTransitionClip(context: CanvasRenderingContext2D, clip: TransitionClip, x: number, y: number, width: number, height: number) {
  if (!hasTransitionClip(clip)) return;

  const left = x + width * clip.left;
  const top = y + height * clip.top;
  const clippedWidth = Math.max(0, width * (1 - clip.left - clip.right));
  const clippedHeight = Math.max(0, height * (1 - clip.top - clip.bottom));

  context.beginPath();
  context.rect(left, top, clippedWidth, clippedHeight);
  context.clip();
}

function transitionProgress(preset: LayerTransitionPreset, progress: number, direction: "in" | "out"): TransitionProgress {
  const clamped = Math.min(1, Math.max(0, progress));

  if (preset === "fade" || preset === "crossfade") {
    return createTransitionProgress({ opacity: clamped });
  }

  if (preset === "slide") {
    const travel = 0.18 * (1 - clamped);
    return createTransitionProgress({ offsetXRatio: direction === "in" ? -travel : travel });
  }

  if (preset === "push") {
    const travel = 1 - clamped;
    return createTransitionProgress({ offsetXRatio: direction === "in" ? -travel : travel });
  }

  if (preset === "zoom") {
    return createTransitionProgress({ opacity: clamped, scale: 0.84 + 0.16 * clamped });
  }

  if (preset === "pop") {
    return createTransitionProgress({ opacity: clamped, scale: 0.72 + 0.28 * easeOutBack(clamped) });
  }

  if (preset === "wipe-left") {
    return createTransitionProgress({
      clip: direction === "in" ? { ...identityClip, right: 1 - clamped } : { ...identityClip, left: 1 - clamped },
    });
  }

  if (preset === "wipe-up") {
    return createTransitionProgress({
      clip: direction === "in" ? { ...identityClip, bottom: 1 - clamped } : { ...identityClip, top: 1 - clamped },
    });
  }

  return createTransitionProgress();
}

function normalizeTransitionPreset(value: LayerTransitionPreset | undefined) {
  return value && transitionPresets.includes(value) ? value : "none";
}

function finiteNumber(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function createTransitionProgress(overrides: Partial<TransitionProgress> = {}): TransitionProgress {
  return {
    opacity: overrides.opacity ?? 1,
    offsetXRatio: overrides.offsetXRatio ?? 0,
    offsetYRatio: overrides.offsetYRatio ?? 0,
    scale: overrides.scale ?? 1,
    clip: overrides.clip ?? identityClip,
  };
}

function mergeTransitionClips(first: TransitionClip | undefined, second: TransitionClip | undefined): TransitionClip {
  if (!first) return second ?? identityClip;
  if (!second) return first;

  return {
    top: Math.max(first.top, second.top),
    right: Math.max(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
    left: Math.max(first.left, second.left),
  };
}

function hasTransitionClip(clip: TransitionClip) {
  return clip.top > 0 || clip.right > 0 || clip.bottom > 0 || clip.left > 0;
}

function percent(value: number) {
  return `${(Math.min(1, Math.max(0, value)) * 100).toFixed(2)}%`;
}

function easeOutBack(progress: number) {
  const overshoot = 1.7;
  const shifted = progress - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}
