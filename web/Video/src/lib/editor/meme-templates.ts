import type { MemeStyle } from "@/lib/editor/meme";
import type { ExportPreset } from "@/lib/editor/presets";

export interface MemeTemplatePreset {
  id: string;
  label: string;
  description: string;
  style: MemeStyle;
  topText: string;
  bottomText: string;
  duration: number;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  exportPresetId: ExportPreset["id"];
  bestFor: string;
}

export const memeTemplatePresets: MemeTemplatePreset[] = [
  {
    id: "vertical-reaction",
    label: "Vertical reaction",
    description: "Shorts/Reels punchline layout with large top and bottom copy.",
    style: "classic",
    topText: "POV: THE EXPORT FINALLY WORKS",
    bottomText: "AND IT IS WATERMARK-FREE",
    duration: 6,
    aspectRatio: "9:16",
    exportPresetId: "mp4-vertical-1080",
    bestFor: "Shorts, Reels, TikTok",
  },
  {
    id: "square-feed-joke",
    label: "Square feed joke",
    description: "Compact boxed captions for feed posts and carousel starters.",
    style: "boxed",
    topText: "ME EXPLAINING THE BUG",
    bottomText: "THE BUG EXPLAINING ME",
    duration: 5,
    aspectRatio: "1:1",
    exportPresetId: "gif-social-square",
    bestFor: "Instagram feed GIFs",
  },
  {
    id: "creator-commentary",
    label: "Creator commentary",
    description: "Lower-third meme format for reaction clips, explainers, and stitched videos.",
    style: "lower-third",
    topText: "WHAT PEOPLE THINK HAPPENED",
    bottomText: "WHAT ACTUALLY HAPPENED",
    duration: 7,
    aspectRatio: "16:9",
    exportPresetId: "mp4-1080p",
    bestFor: "YouTube clips",
  },
  {
    id: "portrait-hot-take",
    label: "Portrait hot take",
    description: "Tall social post with readable caption space and a stronger title area.",
    style: "boxed",
    topText: "HOT TAKE",
    bottomText: "FREE TOOLS SHOULD STILL FEEL PRO",
    duration: 6,
    aspectRatio: "4:5",
    exportPresetId: "png-current-frame",
    bestFor: "Portrait posts and thumbnails",
  },
];

export function findMemeTemplatePreset(id: string) {
  return memeTemplatePresets.find((preset) => preset.id === id) ?? memeTemplatePresets[0];
}
