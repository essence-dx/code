import type { EditorProject, LayerTransform, MediaAsset, TimelineLayer } from "@/lib/editor/types";

export type RecordingMode = "screen" | "camera" | "screen-camera" | "voiceover";
export type RecordingTimelinePreset = "save-only" | "full-frame" | "picture-in-picture" | "split-left" | "split-right";

export type RecordingLayerOptions = Partial<Pick<TimelineLayer, "start" | "duration" | "track" | "name" | "notes" | "transform">>;

export const recordingTimelinePresets: Array<{ id: RecordingTimelinePreset; label: string }> = [
  { id: "save-only", label: "Media" },
  { id: "full-frame", label: "Full" },
  { id: "picture-in-picture", label: "PIP" },
  { id: "split-left", label: "Left" },
  { id: "split-right", label: "Right" },
];

export function recordingLayerOptions(input: {
  asset: MediaAsset;
  mode: RecordingMode;
  preset: RecordingTimelinePreset;
  project: Pick<EditorProject, "width" | "height">;
  start: number;
  track: number;
  notes?: string;
}): RecordingLayerOptions | null {
  const notes = input.notes?.trim();
  const mode = input.mode;

  if (mode === "voiceover") {
    return {
      start: input.start,
      track: input.track,
      name: "Voiceover",
      notes,
    };
  }

  if (input.preset === "save-only") return null;

  return {
    start: input.start,
    track: input.track,
    name: recordingLayerName(mode, input.preset),
    notes,
    transform: recordingTransform({
      asset: input.asset,
      mode,
      preset: input.preset,
      project: input.project,
    }),
  };
}

function recordingLayerName(mode: Exclude<RecordingMode, "voiceover">, preset: RecordingTimelinePreset) {
  const source = mode === "screen-camera" ? "Studio recording" : mode === "screen" ? "Screen recording" : "Camera recording";
  if (preset === "picture-in-picture") return `${source} PIP`;
  if (preset === "split-left") return `${source} left split`;
  if (preset === "split-right") return `${source} right split`;
  return source;
}

function recordingTransform(input: {
  asset: MediaAsset;
  mode: Exclude<RecordingMode, "voiceover">;
  preset: RecordingTimelinePreset;
  project: Pick<EditorProject, "width" | "height">;
}): LayerTransform {
  if (input.preset === "picture-in-picture") {
    const box = fitMediaBox(input.asset, input.mode, input.project.width * 0.3, input.project.height * 0.32);
    return baseTransform({ x: 0.82, y: 0.78, width: box.width, height: box.height, framing: "fill" });
  }

  if (input.preset === "split-left" || input.preset === "split-right") {
    return baseTransform({
      x: input.preset === "split-left" ? 0.25 : 0.75,
      y: 0.5,
      width: input.project.width * 0.5,
      height: input.project.height,
      framing: "fill",
    });
  }

  return baseTransform({
    x: 0.5,
    y: 0.5,
    width: input.project.width,
    height: input.project.height,
    framing: "fill",
  });
}

function fitMediaBox(asset: MediaAsset, mode: Exclude<RecordingMode, "voiceover">, maxWidth: number, maxHeight: number) {
  const ratio = asset.width && asset.height ? asset.width / asset.height : mode === "camera" ? 4 / 3 : 16 / 9;
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function baseTransform(input: Pick<LayerTransform, "x" | "y" | "width" | "height" | "framing">): LayerTransform {
  return {
    x: input.x,
    y: input.y,
    width: Math.max(1, Math.round(input.width)),
    height: Math.max(1, Math.round(input.height)),
    rotation: 0,
    scale: 1,
    flipX: false,
    flipY: false,
    framing: input.framing,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}
