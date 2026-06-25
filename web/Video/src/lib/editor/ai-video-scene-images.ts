import type { AiVideoProjectInput } from "@/lib/editor/ai-video-project";
import type { AiVideoSceneMediaSlot } from "@/lib/editor/ai-video-media-placement";

export interface AiVideoSceneImageSlot extends AiVideoSceneMediaSlot {
  prompt: string;
}

export function createAiVideoSceneImageSlots(input: Pick<AiVideoProjectInput, "aspectRatio" | "scenes">): AiVideoSceneImageSlot[] {
  const slots: AiVideoSceneImageSlot[] = [];
  let cursor = 0;

  input.scenes.slice(0, 12).forEach((scene, index) => {
    const duration = clampDuration(scene.duration);
    slots.push({
      sceneIndex: index,
      sceneTitle: scene.title.trim() || `Scene ${index + 1}`,
      query: scene.visualPrompt.trim() || scene.headline.trim(),
      prompt: createAiVideoSceneImagePrompt(input, index),
      start: cursor,
      duration,
      track: index * 3,
      layerName: `Scene ${index + 1} AI image`,
    });
    cursor += duration;
  });

  return slots;
}

export function createAiVideoSceneImagePrompt(input: Pick<AiVideoProjectInput, "aspectRatio" | "scenes">, sceneIndex: number) {
  const scene = input.scenes[sceneIndex];
  if (!scene) return "Create an editor-ready background image for a short social video scene.";

  return [
    "Create one original editor-ready background still for this generated video scene.",
    `Aspect ratio: ${input.aspectRatio}.`,
    `Scene: ${scene.title}.`,
    `Headline: ${scene.headline}.`,
    `Caption context: ${scene.caption}.`,
    `Visual direction: ${scene.visualPrompt}.`,
    scene.brollQuery ? `Reference search intent: ${scene.brollQuery}.` : "",
    `Use the palette ${scene.backgroundColor} and ${scene.accentColor} without adding text, logos, watermarks, UI chrome, or copyrighted characters.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function clampDuration(value: number) {
  return Math.min(45, Math.max(1, Number.isFinite(value) ? value : 4));
}
