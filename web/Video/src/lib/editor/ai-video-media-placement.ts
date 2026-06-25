import type { AiVideoProjectInput } from "@/lib/editor/ai-video-project";
import { createLayerFromAsset } from "@/lib/editor/factory";
import type { EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";

export interface AiVideoSceneMediaSlot {
  sceneIndex: number;
  sceneTitle: string;
  query: string;
  start: number;
  duration: number;
  track: number;
  layerName: string;
}

export function createAiVideoSceneMediaSlots(input: Pick<AiVideoProjectInput, "scenes">): AiVideoSceneMediaSlot[] {
  const slots: AiVideoSceneMediaSlot[] = [];
  let cursor = 0;

  input.scenes.slice(0, 12).forEach((scene, index) => {
    const duration = clampDuration(scene.duration);
    const query = scene.brollQuery?.trim();
    if (query) {
      slots.push({
        sceneIndex: index,
        sceneTitle: scene.title.trim() || `Scene ${index + 1}`,
        query,
        start: cursor,
        duration,
        track: index * 3,
        layerName: `Scene ${index + 1} B-roll`,
      });
    }
    cursor += duration;
  });

  return slots;
}

export function addAiVideoSceneMediaLayer(project: EditorProject, asset: MediaAsset, slot: AiVideoSceneMediaSlot): TimelineLayer {
  const layer = createLayerFromAsset(asset, slot.track);
  layer.name = slot.layerName;
  layer.start = slot.start;
  layer.duration = Math.max(1, Math.min(slot.duration, asset.duration || slot.duration));
  layer.trimStart = 0;
  layer.transform = {
    ...layer.transform,
    x: 0.5,
    y: 0.5,
    width: project.width,
    height: project.height,
    rotation: 0,
    scale: 1,
    framing: "fill",
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
  layer.motion = { preset: "slow-zoom", intensity: 0.45 };
  layer.transition = { in: "fade", out: "fade", duration: 0.35 };
  layer.style = {
    ...layer.style,
    opacity: 0.82,
    brightness: 0.88,
    contrast: 1.08,
    saturation: 1.06,
  };
  layer.notes = `Generated project scene media. Scene: ${slot.sceneTitle}. Search: ${slot.query}.`;
  layer.updatedAt = new Date().toISOString();
  project.layers.push(layer);
  project.updatedAt = layer.updatedAt;
  return layer;
}

function clampDuration(value: number) {
  return Math.min(45, Math.max(1, Number.isFinite(value) ? value : 4));
}
