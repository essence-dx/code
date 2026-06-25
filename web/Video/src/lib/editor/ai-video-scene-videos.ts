import type { AiVideoProjectInput } from "@/lib/editor/ai-video-project";
import type { AiVideoSceneMediaSlot } from "@/lib/editor/ai-video-media-placement";

export interface AiVideoSceneVideoSlot extends AiVideoSceneMediaSlot {
  prompt: string;
  aspectRatio: AiVideoProjectInput["aspectRatio"];
  backgroundColor?: string;
  accentColor?: string;
}

export function createAiVideoSceneVideoSlots(input: Pick<AiVideoProjectInput, "aspectRatio" | "title" | "scenes">): AiVideoSceneVideoSlot[] {
  const slots: AiVideoSceneVideoSlot[] = [];
  let cursor = 0;

  input.scenes.slice(0, 12).forEach((scene, index) => {
    const duration = clampDuration(scene.duration);
    const sceneTitle = scene.title.trim() || `Scene ${index + 1}`;
    slots.push({
      sceneIndex: index,
      sceneTitle,
      query: scene.brollQuery?.trim() || scene.visualPrompt.trim() || scene.headline.trim(),
      start: cursor,
      duration,
      track: index * 3,
      layerName: `Scene ${index + 1} generated video`,
      prompt: createAiVideoSceneVideoPrompt(input, index),
      aspectRatio: input.aspectRatio,
      backgroundColor: normalizeColor(scene.backgroundColor),
      accentColor: normalizeColor(scene.accentColor),
    });
    cursor += duration;
  });

  return slots;
}

export function createAiVideoSceneVideoPrompt(input: Pick<AiVideoProjectInput, "aspectRatio" | "title" | "scenes">, sceneIndex: number) {
  const scene = input.scenes[sceneIndex];
  if (!scene) return "Create one short editor-ready video scene clip without text, logos, watermarks, or UI chrome.";

  return [
    "Create one short editor-ready video scene clip for a local video editor.",
    `Project: ${input.title}.`,
    `Scene: ${scene.title}.`,
    `Aspect ratio: ${input.aspectRatio}.`,
    `Duration: ${clampDuration(scene.duration)} seconds.`,
    `Headline intent: ${scene.headline}.`,
    `Caption context: ${scene.caption}.`,
    `Visual direction: ${scene.visualPrompt}.`,
    scene.brollQuery ? `B-roll intent: ${scene.brollQuery}.` : "",
    `Use the palette ${scene.backgroundColor} and ${scene.accentColor} as loose art direction.`,
    "Do not include text, subtitles, logos, watermarks, UI chrome, copyrighted characters, private people, or brand marks.",
    "Leave clean motion and negative space for editor-added captions and overlays.",
  ]
    .filter(Boolean)
    .join(" ");
}

function clampDuration(value: number) {
  return Math.min(45, Math.max(1, Number.isFinite(value) ? value : 4));
}

function normalizeColor(value: string | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}
