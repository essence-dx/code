import { createId } from "@/lib/editor/factory";
import type { EditorProject, LayerStyle, MediaAsset, TimelineLayer } from "@/lib/editor/types";

export type MediaLayoutMode = "collage" | "split-screen" | "slideshow" | "montage";

export interface MediaLayoutInput {
  project: Pick<EditorProject, "width" | "height">;
  assets: MediaAsset[];
  mode: MediaLayoutMode;
  clipSeconds: number;
  track: number;
}

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createMediaLayoutLayers(input: MediaLayoutInput) {
  const assets = input.assets.filter((asset) => asset.type === "image" || asset.type === "video");
  if (assets.length === 0) return [];

  const now = new Date().toISOString();
  const clipSeconds = clamp(input.clipSeconds, 1, 30);

  if (input.mode === "slideshow") {
    return assets.map((asset, index) =>
      createMediaLayer({
        asset,
        box: fullCanvas(input.project),
        name: `${asset.name} slide ${index + 1}`,
        start: index * clipSeconds,
        duration: clipSeconds,
        track: input.track,
        now,
      }),
    );
  }

  if (input.mode === "montage") {
    return assets.map((asset, index) =>
      createMediaLayer({
        asset,
        box: montageBoxes(input.project)[index % montageBoxes(input.project).length],
        name: `${asset.name} montage ${index + 1}`,
        start: index * clipSeconds * 0.35,
        duration: clipSeconds,
        track: input.track + index,
        now,
      }),
    );
  }

  const boxes = input.mode === "split-screen" ? splitScreenBoxes(input.project, assets.length) : collageBoxes(input.project, assets.length);

  return assets.map((asset, index) =>
    createMediaLayer({
      asset,
      box: boxes[index],
      name: `${asset.name} ${input.mode}`,
      start: 0,
      duration: clipSeconds,
      track: input.track + index,
      now,
    }),
  );
}

function createMediaLayer({
  asset,
  box,
  name,
  start,
  duration,
  track,
  now,
}: {
  asset: MediaAsset;
  box: LayoutBox;
  name: string;
  start: number;
  duration: number;
  track: number;
  now: string;
}): TimelineLayer {
  return {
    id: createId("layer"),
    kind: asset.type,
    name,
    track,
    start,
    duration,
    trimStart: 0,
    playbackRate: 1,
    assetId: asset.id,
    locked: false,
    muted: false,
    hidden: false,
    transform: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rotation: 0,
      scale: 1,
    },
    style: baseStyle(),
    createdAt: now,
    updatedAt: now,
  };
}

function collageBoxes(project: Pick<EditorProject, "width" | "height">, count: number) {
  const columns = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  const gap = Math.round(Math.min(project.width, project.height) * 0.018);
  const cellWidth = (project.width - gap * (columns - 1)) / columns;
  const cellHeight = (project.height - gap * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return boxFromPixels(project, column * (cellWidth + gap), row * (cellHeight + gap), cellWidth, cellHeight);
  });
}

function splitScreenBoxes(project: Pick<EditorProject, "width" | "height">, count: number) {
  if (count <= 1) return [fullCanvas(project)];

  if (count === 2) {
    return [
      boxFromPixels(project, 0, 0, project.width / 2, project.height),
      boxFromPixels(project, project.width / 2, 0, project.width / 2, project.height),
    ];
  }

  return collageBoxes(project, Math.min(count, 4));
}

function montageBoxes(project: Pick<EditorProject, "width" | "height">) {
  const width = project.width * 0.56;
  const height = project.height * 0.56;

  return [
    boxFromPixels(project, project.width * 0.06, project.height * 0.08, width, height),
    boxFromPixels(project, project.width * 0.38, project.height * 0.16, width, height),
    boxFromPixels(project, project.width * 0.2, project.height * 0.38, width, height),
    boxFromPixels(project, project.width * 0.48, project.height * 0.42, width * 0.76, height * 0.76),
  ];
}

function fullCanvas(project: Pick<EditorProject, "width" | "height">) {
  return {
    x: 0.5,
    y: 0.5,
    width: project.width,
    height: project.height,
  };
}

function boxFromPixels(project: Pick<EditorProject, "width" | "height">, left: number, top: number, width: number, height: number) {
  return {
    x: (left + width / 2) / project.width,
    y: (top + height / 2) / project.height,
    width,
    height,
  };
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

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
