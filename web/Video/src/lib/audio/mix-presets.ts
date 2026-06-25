import type { TimelineLayer } from "@/lib/editor/types";

export type AudioMixPresetId = "voiceover" | "music-bed" | "mute-under-video";

export interface BuiltInAudioMixPreset {
  id: AudioMixPresetId;
  label: string;
  description: string;
  patch: Pick<TimelineLayer, "volume" | "fadeIn" | "fadeOut" | "muted">;
}

export const audioMixPresets: BuiltInAudioMixPreset[] = [
  {
    id: "voiceover",
    label: "Voiceover",
    description: "Clear speech level with quick soft edges.",
    patch: { volume: 1, fadeIn: 0.08, fadeOut: 0.08, muted: false },
  },
  {
    id: "music-bed",
    label: "Music bed",
    description: "Lower bed level for narration or captions.",
    patch: { volume: 0.32, fadeIn: 0.35, fadeOut: 0.45, muted: false },
  },
  {
    id: "mute-under-video",
    label: "Mute bed",
    description: "Silence this layer while keeping timing intact.",
    patch: { volume: 0, fadeIn: 0, fadeOut: 0, muted: true },
  },
];
