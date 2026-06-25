import {
  PROJECT_FORMAT_VERSION,
  type EditorProject,
  type LayerStyle,
  type MediaAsset,
  type SubtitleCue,
  type TimelineLayer,
} from "@/lib/editor/types";
import { createDefaultBrandKitSettings } from "@/lib/editor/brand-kit";
import { getAspectPreset } from "@/lib/editor/presets";
import { defaultLayerSpeed } from "@/lib/editor/speed";

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createProject(title = "Untitled project", aspectRatio = "16:9"): EditorProject {
  const preset = getAspectPreset(aspectRatio);
  const now = new Date().toISOString();

  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    id: createId("project"),
    title,
    aspectRatio: preset.id,
    width: preset.width,
    height: preset.height,
    duration: 30,
    fps: 30,
    background: "#0a0a0a",
    snapInterval: 0.25,
    rippleMode: false,
    layers: [],
    markers: [],
    mediaCollections: [],
    layerStylePresets: [],
    audioMixPresets: [],
    brandTypographyPresets: [],
    brandKit: createDefaultBrandKitSettings(),
    updatedAt: now,
  };
}

export function createLayerFromAsset(asset: MediaAsset, track = 0): TimelineLayer {
  const now = new Date().toISOString();
  const duration = Math.max(asset.duration || 5, asset.type === "image" ? 5 : 1);

  return {
    id: createId("layer"),
    kind: asset.type,
    name: asset.name,
    track,
    start: 0,
    duration,
    trimStart: 0,
    playbackRate: 1,
    speed: defaultLayerSpeed(),
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    assetId: asset.id,
    locked: false,
    muted: false,
    hidden: false,
    transform: defaultTransform(asset.width, asset.height),
    motion: defaultMotion(),
    transition: defaultTransition(),
    style: defaultStyle(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createTextLayer(kind: "text" | "subtitle" = "text", track = 1): TimelineLayer {
  const now = new Date().toISOString();

  return {
    id: createId("layer"),
    kind,
    name: kind === "subtitle" ? "Caption track" : "Text layer",
    track,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    speed: defaultLayerSpeed(),
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    text: kind === "subtitle" ? undefined : "Add your text",
    cues:
      kind === "subtitle"
        ? [
            {
              id: createId("cue"),
              start: 0,
              end: 2.5,
              text: "First caption",
              emphasis: "normal",
            },
          ]
        : undefined,
    locked: false,
    muted: false,
    hidden: false,
    transform: defaultTransform(680, 160),
    motion: defaultMotion(),
    transition: defaultTransition(),
    style: defaultStyle({ fontSize: kind === "subtitle" ? 42 : 56, background: "#00000088" }),
    createdAt: now,
    updatedAt: now,
  };
}

export function createShapeLayer(track = 1): TimelineLayer {
  const now = new Date().toISOString();

  return {
    id: createId("layer"),
    kind: "shape",
    name: "Shape",
    track,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    speed: defaultLayerSpeed(),
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    locked: false,
    muted: false,
    hidden: false,
    transform: defaultTransform(420, 240),
    motion: defaultMotion(),
    transition: defaultTransition(),
    style: defaultStyle({ fill: "#22c55e", background: "#22c55e", radius: 16 }),
    createdAt: now,
    updatedAt: now,
  };
}

export function createProgressLayer(track = 1): TimelineLayer {
  const now = new Date().toISOString();

  return {
    id: createId("layer"),
    kind: "progress",
    name: "Progress bar",
    track,
    start: 0,
    duration: 30,
    trimStart: 0,
    playbackRate: 1,
    speed: defaultLayerSpeed(),
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    locked: false,
    muted: false,
    hidden: false,
    transform: defaultTransform(760, 24),
    motion: defaultMotion(),
    transition: defaultTransition(),
    style: defaultStyle({ fill: "#ffffff", background: "#171717", radius: 999, shadowBlur: 16, shadowColor: "#ffffff" }),
    createdAt: now,
    updatedAt: now,
  };
}

export function createTimerLayer(track = 1): TimelineLayer {
  const now = new Date().toISOString();

  return {
    id: createId("layer"),
    kind: "timer",
    name: "Timer",
    track,
    start: 0,
    duration: 30,
    trimStart: 0,
    playbackRate: 1,
    speed: defaultLayerSpeed(),
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    text: "remaining",
    locked: false,
    muted: false,
    hidden: false,
    transform: defaultTransform(240, 88),
    motion: defaultMotion(),
    transition: defaultTransition(),
    style: defaultStyle({ fill: "#ffffff", background: "#00000088", fontSize: 48, radius: 12, shadowBlur: 18, shadowColor: "#000000" }),
    createdAt: now,
    updatedAt: now,
  };
}

export function cuesFromAi(captions: Array<{ start: number; end: number; text: string; emphasis?: SubtitleCue["emphasis"] }>) {
  return captions.map((caption) => ({
    id: createId("cue"),
    start: caption.start,
    end: caption.end,
    text: caption.text,
    emphasis: caption.emphasis ?? "normal",
  }));
}

export function formatTime(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.floor((safe % 1) * 100);
  return `${minutes}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(2, "0")}`;
}

function defaultTransform(width = 720, height = 405) {
  return {
    x: 0.5,
    y: 0.5,
    width,
    height,
    rotation: 0,
    scale: 1,
    flipX: false,
    flipY: false,
    framing: "fill" as const,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}

function defaultMotion() {
  return {
    preset: "none" as const,
    intensity: 1,
  };
}

function defaultTransition() {
  return {
    in: "none" as const,
    out: "none" as const,
    duration: 0.5,
  };
}

function defaultStyle(overrides: Partial<LayerStyle> = {}): LayerStyle {
  return {
    fill: "#ffffff",
    stroke: "transparent",
    background: "transparent",
    fontFamily: "Geist",
    fontSize: 42,
    fontWeight: 700,
    radius: 8,
    opacity: 1,
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    borderWidth: 0,
    shadowBlur: 0,
    shadowColor: "#000000",
    ...overrides,
  };
}
