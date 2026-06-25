import {
  createLayerMotionKeyframe,
  getLayerMotionDuration,
  getLayerMotionEasing,
  getLayerMotionKeyframes,
  getLayerMotionPreset,
  getLayerMotionStart,
} from "@/features/editor/layer-motion";
import type {
  DesignElement,
  LayerMotionEasing,
  LayerMotionPreset,
  LayerMotionPresetPackId,
} from "@/features/editor/types";

export type LayerMotionReadinessStatus = "ready" | "attention" | "blocked";

export type LayerMotionPresetPack = {
  id: LayerMotionPresetPackId;
  label: string;
  description: string;
  preset: LayerMotionPreset;
  durationSeconds: number;
  easing: LayerMotionEasing;
  keyframeStyle: "preset-only" | "slide-story" | "focus-pulse" | "ken-burns";
};

export type LayerMotionReadinessCheck = {
  id:
    | "animated-layers"
    | "preset-packs"
    | "custom-keyframes"
    | "timeline-groups"
    | "export-readiness";
  label: string;
  status: LayerMotionReadinessStatus;
  detail: string;
  action: string;
};

export type LayerMotionReadinessReport = {
  status: LayerMotionReadinessStatus;
  score: number;
  checks: LayerMotionReadinessCheck[];
  counts: {
    animatedLayers: number;
    presetPackedLayers: number;
    customKeyframedLayers: number;
    groupedLayers: number;
    timelineGroups: number;
    invalidLayers: number;
    totalKeyframes: number;
    longestMotionSeconds: number;
  };
};

export const layerMotionPresetPacks: readonly LayerMotionPresetPack[] = [
  {
    id: "soft-entrance",
    label: "Soft entrance",
    description: "Fade and rise into place for body text and cards.",
    preset: "rise",
    durationSeconds: 0.8,
    easing: "ease-out",
    keyframeStyle: "preset-only",
  },
  {
    id: "hero-pop",
    label: "Hero pop",
    description: "Quick scale pop for hero objects and callouts.",
    preset: "pop",
    durationSeconds: 0.65,
    easing: "ease-out",
    keyframeStyle: "preset-only",
  },
  {
    id: "slide-story",
    label: "Slide story",
    description: "Three-keyframe left-to-right storyboard motion.",
    preset: "none",
    durationSeconds: 1.2,
    easing: "ease-in-out",
    keyframeStyle: "slide-story",
  },
  {
    id: "focus-pulse",
    label: "Focus pulse",
    description: "Subtle center pulse for badges and key visuals.",
    preset: "none",
    durationSeconds: 0.9,
    easing: "ease-in-out",
    keyframeStyle: "focus-pulse",
  },
  {
    id: "ken-burns",
    label: "Ken Burns",
    description: "Slow pan-and-zoom movement for image-heavy scenes.",
    preset: "none",
    durationSeconds: 3,
    easing: "ease-in-out",
    keyframeStyle: "ken-burns",
  },
];

export function getLayerMotionPresetPack(id: string) {
  return (
    layerMotionPresetPacks.find((pack) => pack.id === id) ??
    layerMotionPresetPacks[0]
  );
}

export function createLayerMotionPresetPackUpdates(
  element: DesignElement,
  packId: string,
): Partial<DesignElement> {
  const pack = getLayerMotionPresetPack(packId);
  const startSeconds = getLayerMotionStart(element);

  return {
    motionPresetPackId: pack.id,
    motionPreset: pack.preset,
    motionDurationSeconds: pack.durationSeconds,
    motionEasing: pack.easing,
    motionKeyframes: createPresetPackKeyframes({
      element,
      pack,
      startSeconds,
    }),
  } as Partial<DesignElement>;
}

export function createLayerMotionGroupId(element: DesignElement) {
  const readableId = element.id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `motion-${readableId || "layer"}`;
}

export function createLayerMotionGroupUpdates(input: {
  elements: DesignElement[];
  groupId?: string;
  startSeconds?: number;
  staggerSeconds?: number;
}) {
  const groupId =
    input.groupId ??
    createLayerMotionGroupId(input.elements[0] ?? createFallbackElement());
  const startSeconds = Math.max(0, input.startSeconds ?? 0);
  const staggerSeconds = Math.max(0, input.staggerSeconds ?? 0.12);

  return input.elements.map((element, index) => ({
    elementId: element.id,
    updates: {
      motionGroupId: groupId,
      motionStartSeconds: roundSeconds(startSeconds + index * staggerSeconds),
    } as Partial<DesignElement>,
  }));
}

export function createLayerMotionReadinessReport(
  elements: readonly DesignElement[],
): LayerMotionReadinessReport {
  const animatedLayers = elements.filter(hasLayerMotion);
  const packedLayers = animatedLayers.filter((element) =>
    Boolean(element.motionPresetPackId),
  );
  const customKeyframedLayers = animatedLayers.filter(
    (element) => getLayerMotionKeyframes(element).length >= 2,
  );
  const groupedLayers = animatedLayers.filter((element) =>
    Boolean(element.motionGroupId),
  );
  const timelineGroups = new Set(
    groupedLayers.map((element) => element.motionGroupId),
  );
  const invalidLayers = animatedLayers.filter(hasInvalidMotion);
  const totalKeyframes = animatedLayers.reduce(
    (total, element) => total + getLayerMotionKeyframes(element).length,
    0,
  );
  const longestMotionSeconds = animatedLayers.reduce(
    (max, element) =>
      Math.max(max, getLayerMotionStart(element) + getLayerMotionDuration(element)),
    0,
  );
  const checks = [
    createAnimatedLayersCheck(animatedLayers.length),
    createPresetPacksCheck({
      animatedCount: animatedLayers.length,
      packedCount: packedLayers.length,
    }),
    createCustomKeyframesCheck({
      animatedCount: animatedLayers.length,
      customCount: customKeyframedLayers.length,
    }),
    createTimelineGroupsCheck({
      animatedCount: animatedLayers.length,
      groupedCount: groupedLayers.length,
      groupCount: timelineGroups.size,
    }),
    createExportReadinessCheck(invalidLayers.length),
  ];
  const score = Math.round(
    checks.reduce((total, check) => total + statusScore(check.status), 0) /
      checks.length,
  );

  return {
    status: scoreToStatus(score),
    score,
    checks,
    counts: {
      animatedLayers: animatedLayers.length,
      presetPackedLayers: packedLayers.length,
      customKeyframedLayers: customKeyframedLayers.length,
      groupedLayers: groupedLayers.length,
      timelineGroups: timelineGroups.size,
      invalidLayers: invalidLayers.length,
      totalKeyframes,
      longestMotionSeconds: roundSeconds(longestMotionSeconds),
    },
  };
}

function createPresetPackKeyframes(input: {
  element: DesignElement;
  pack: LayerMotionPresetPack;
  startSeconds: number;
}) {
  const base = createLayerMotionKeyframe(input.element, input.startSeconds);
  const end = {
    ...base,
    timeSeconds: roundSeconds(input.startSeconds + input.pack.durationSeconds),
  };

  if (input.pack.keyframeStyle === "preset-only") return [];

  if (input.pack.keyframeStyle === "slide-story") {
    return [
      {
        ...base,
        x: roundPixels(input.element.x - 48),
        opacity: 0,
      },
      {
        ...base,
        timeSeconds: roundSeconds(input.startSeconds + input.pack.durationSeconds * 0.55),
        x: roundPixels(input.element.x + 8),
        opacity: Math.min(1, input.element.opacity),
      },
      end,
    ];
  }

  if (input.pack.keyframeStyle === "focus-pulse") {
    const expanded = scaleKeyframeAroundCenter(input.element, 1.06);

    return [
      base,
      {
        ...expanded,
        timeSeconds: roundSeconds(input.startSeconds + input.pack.durationSeconds * 0.5),
      },
      end,
    ];
  }

  return [
    {
      ...base,
      width: roundPixels(input.element.width * 1.08),
      height: roundPixels(input.element.height * 1.08),
      opacity: Math.max(0.35, input.element.opacity * 0.8),
    },
    {
      ...end,
      x: roundPixels(input.element.x - 24),
      y: roundPixels(input.element.y - 12),
      width: roundPixels(input.element.width * 1.14),
      height: roundPixels(input.element.height * 1.14),
      opacity: input.element.opacity,
    },
  ];
}

function scaleKeyframeAroundCenter(element: DesignElement, scale: number) {
  const nextWidth = element.width * scale;
  const nextHeight = element.height * scale;

  return {
    timeSeconds: 0,
    x: roundPixels(element.x - (nextWidth - element.width) / 2),
    y: roundPixels(element.y - (nextHeight - element.height) / 2),
    width: roundPixels(nextWidth),
    height: roundPixels(nextHeight),
    rotation: roundPixels(element.rotation),
    opacity: Math.min(1, element.opacity),
  };
}

function createAnimatedLayersCheck(animatedCount: number): LayerMotionReadinessCheck {
  return {
    id: "animated-layers",
    label: "Animated layers",
    status: animatedCount ? "ready" : "blocked",
    detail: animatedCount
      ? `${animatedCount} layers have motion applied.`
      : "No layers on this page have motion yet.",
    action: animatedCount
      ? "Keep motion purposeful and sparse."
      : "Apply a reusable motion pack to a selected layer.",
  };
}

function createPresetPacksCheck(input: {
  animatedCount: number;
  packedCount: number;
}): LayerMotionReadinessCheck {
  return {
    id: "preset-packs",
    label: "Reusable presets",
    status: input.packedCount
      ? "ready"
      : input.animatedCount
        ? "attention"
        : "blocked",
    detail: `${input.packedCount} of ${input.animatedCount} animated layers use reusable packs.`,
    action: input.packedCount
      ? "Reuse the same packs for consistent scenes."
      : "Apply packs so motion can be repeated across formats.",
  };
}

function createCustomKeyframesCheck(input: {
  animatedCount: number;
  customCount: number;
}): LayerMotionReadinessCheck {
  return {
    id: "custom-keyframes",
    label: "Custom keyframes",
    status: input.customCount
      ? "ready"
      : input.animatedCount
        ? "attention"
        : "blocked",
    detail: `${input.customCount} animated layers have editable keyframe paths.`,
    action: input.customCount
      ? "Review keyframe spacing before video export."
      : "Add keyframes for anything that needs position, size, or opacity control.",
  };
}

function createTimelineGroupsCheck(input: {
  animatedCount: number;
  groupedCount: number;
  groupCount: number;
}): LayerMotionReadinessCheck {
  const needsGrouping = input.animatedCount > 1;

  return {
    id: "timeline-groups",
    label: "Timeline groups",
    status: !needsGrouping || input.groupCount ? "ready" : "attention",
    detail: input.groupCount
      ? `${input.groupedCount} layers are organized into ${input.groupCount} motion groups.`
      : needsGrouping
        ? "Multiple animated layers are not grouped yet."
        : "Single-layer motion does not need grouping.",
    action: input.groupCount
      ? "Use staggered starts to create readable motion sequences."
      : "Assign a motion group before building multi-layer scenes.",
  };
}

function createExportReadinessCheck(
  invalidCount: number,
): LayerMotionReadinessCheck {
  return {
    id: "export-readiness",
    label: "Export readiness",
    status: invalidCount ? "blocked" : "ready",
    detail: invalidCount
      ? `${invalidCount} animated layers have invalid timing or keyframes.`
      : "Motion timing can be composited for GIF and MP4 exports.",
    action: invalidCount
      ? "Fix duplicate keyframes, invalid durations, or non-finite values."
      : "Run the normal export flow when the design is ready.",
  };
}

function hasLayerMotion(element: DesignElement) {
  return (
    getLayerMotionPreset(element) !== "none" ||
    getLayerMotionKeyframes(element).length > 0
  );
}

function hasInvalidMotion(element: DesignElement) {
  if (getLayerMotionDuration(element) <= 0) return true;

  const rawKeyframes = element.motionKeyframes ?? [];
  const times = new Set<number>();

  for (const keyframe of rawKeyframes) {
    if (
      !Number.isFinite(keyframe.timeSeconds) ||
      !Number.isFinite(keyframe.x) ||
      !Number.isFinite(keyframe.y) ||
      !Number.isFinite(keyframe.width) ||
      !Number.isFinite(keyframe.height) ||
      !Number.isFinite(keyframe.rotation) ||
      !Number.isFinite(keyframe.opacity) ||
      keyframe.width <= 0 ||
      keyframe.height <= 0
    ) {
      return true;
    }

    if (times.has(keyframe.timeSeconds)) return true;
    times.add(keyframe.timeSeconds);
  }

  return rawKeyframes.length === 1;
}

function createFallbackElement(): DesignElement {
  return {
    id: "layer",
    type: "shape",
    shape: "rectangle",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    opacity: 1,
    fill: "#000000",
    stroke: "#000000",
    strokeWidth: 0,
    radius: 0,
  };
}

function statusScore(status: LayerMotionReadinessStatus) {
  if (status === "ready") return 100;
  if (status === "attention") return 70;

  return 30;
}

function scoreToStatus(score: number): LayerMotionReadinessStatus {
  if (score >= 85) return "ready";
  if (score >= 55) return "attention";

  return "blocked";
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundPixels(value: number) {
  return Math.round(value * 100) / 100;
}
