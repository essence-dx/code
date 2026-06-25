import { createId } from "@/lib/editor/factory";
import type { EditorProject, LayerStyle, MediaAsset, TimelineLayer } from "@/lib/editor/types";

export type MemeStyle = "classic" | "boxed" | "lower-third";

export interface MemeLayoutInput {
  project: Pick<EditorProject, "width" | "height" | "duration">;
  asset?: MediaAsset;
  topText: string;
  bottomText: string;
  duration: number;
  style: MemeStyle;
  track: number;
}

export function createMemeLayers(input: MemeLayoutInput) {
  const now = new Date().toISOString();
  const duration = clamp(input.duration || input.asset?.duration || 6, 1, 120);
  const layers: TimelineLayer[] = [
    input.asset ? createBackgroundAssetLayer(input.asset, input.project, duration, input.track, now) : createSolidBackgroundLayer(input, duration, now),
  ];
  const textLayers = [
    createMemeTextLayer(input.topText, "Top caption", "top", input, duration, input.track + 1, now),
    createMemeTextLayer(input.bottomText, "Bottom caption", "bottom", input, duration, input.track + 2, now),
  ].filter((layer): layer is TimelineLayer => Boolean(layer));

  return [...layers, ...textLayers];
}

function createBackgroundAssetLayer(
  asset: MediaAsset,
  project: Pick<EditorProject, "width" | "height">,
  duration: number,
  track: number,
  now: string,
): TimelineLayer {
  return {
    id: createId("layer"),
    kind: asset.type,
    name: `${asset.name} meme background`,
    track,
    start: 0,
    duration,
    trimStart: 0,
    playbackRate: 1,
    assetId: asset.id,
    locked: false,
    muted: false,
    hidden: false,
    transform: canvasTransform(project),
    style: baseStyle(),
    createdAt: now,
    updatedAt: now,
  };
}

function createSolidBackgroundLayer(input: MemeLayoutInput, duration: number, now: string): TimelineLayer {
  return {
    id: createId("layer"),
    kind: "shape",
    name: "Meme background",
    track: input.track,
    start: 0,
    duration,
    trimStart: 0,
    playbackRate: 1,
    locked: false,
    muted: false,
    hidden: false,
    transform: canvasTransform(input.project),
    style: baseStyle({ fill: "#0a0a0a", background: "#0a0a0a", radius: 0 }),
    createdAt: now,
    updatedAt: now,
  };
}

function createMemeTextLayer(
  text: string,
  name: string,
  position: "top" | "bottom",
  input: MemeLayoutInput,
  duration: number,
  track: number,
  now: string,
): TimelineLayer | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const isLowerThird = input.style === "lower-third";
  const height = Math.max(120, Math.round(input.project.height * (isLowerThird ? 0.14 : 0.17)));
  const y =
    position === "top"
      ? isLowerThird
        ? 0.72
        : 0.15
      : isLowerThird
        ? 0.87
        : 0.85;

  return {
    id: createId("layer"),
    kind: "text",
    name,
    track,
    start: 0,
    duration,
    trimStart: 0,
    playbackRate: 1,
    text: normalized,
    locked: false,
    muted: false,
    hidden: false,
    transform: {
      x: 0.5,
      y,
      width: Math.round(input.project.width * 0.92),
      height,
      rotation: 0,
      scale: 1,
    },
    style: styleFor(input.style, input.project.height),
    createdAt: now,
    updatedAt: now,
  } satisfies TimelineLayer;
}

function canvasTransform(project: Pick<EditorProject, "width" | "height">) {
  return {
    x: 0.5,
    y: 0.5,
    width: project.width,
    height: project.height,
    rotation: 0,
    scale: 1,
  };
}

function styleFor(style: MemeStyle, projectHeight: number): LayerStyle {
  const fontSize = Math.round(clamp(projectHeight * 0.08, 38, 92));

  if (style === "boxed") {
    return baseStyle({
      fill: "#171717",
      background: "#fafafa",
      fontFamily: "Geist",
      fontSize,
      fontWeight: 900,
      radius: 6,
    });
  }

  if (style === "lower-third") {
    return baseStyle({
      fill: "#ffffff",
      background: "#0a0a0add",
      fontFamily: "Geist",
      fontSize: Math.round(fontSize * 0.82),
      fontWeight: 800,
      radius: 8,
    });
  }

  return baseStyle({
    fill: "#ffffff",
    background: "#00000088",
    fontFamily: "Impact, Geist",
    fontSize,
    fontWeight: 900,
    radius: 8,
  });
}

function baseStyle(overrides: Partial<LayerStyle> = {}): LayerStyle {
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
    ...overrides,
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
