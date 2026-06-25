import type { AspectPreset, ExportFormat } from "@/lib/editor/types";

export const aspectPresets: AspectPreset[] = [
  { id: "16:9", label: "Landscape", width: 1920, height: 1080 },
  { id: "9:16", label: "Vertical", width: 1080, height: 1920 },
  { id: "1:1", label: "Square", width: 1080, height: 1080 },
  { id: "4:5", label: "Portrait", width: 1080, height: 1350 },
  { id: "21:9", label: "Wide", width: 2560, height: 1080 },
  { id: "4:1", label: "Banner", width: 1600, height: 400 },
];

export interface ExportPreset {
  id: string;
  label: string;
  description: string;
  format: ExportFormat;
  category: "video" | "social" | "compressed" | "audio" | "backup";
  width?: number;
  height?: number;
  fps?: number;
  videoBitrate?: string;
  crf?: number;
}

export const exportPresets: ExportPreset[] = [
  {
    id: "mp4-1080p",
    label: "MP4 1080p",
    description: "General high-quality H.264 export.",
    category: "video",
    format: "mp4",
    width: 1920,
    height: 1080,
    fps: 30,
    crf: 22,
  },
  {
    id: "mp4-720p-compressed",
    label: "MP4 720p Small",
    description: "Smaller file for sharing and drafts.",
    category: "compressed",
    format: "mp4",
    width: 1280,
    height: 720,
    fps: 30,
    crf: 30,
  },
  {
    id: "mp4-vertical-1080",
    label: "MP4 Vertical",
    description: "1080x1920 preset for Reels, Shorts, and TikTok.",
    category: "social",
    format: "mp4",
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 23,
  },
  {
    id: "webm-1080p",
    label: "WebM 1080p",
    description: "Browser-friendly VP9 video export.",
    category: "video",
    format: "webm",
    width: 1920,
    height: 1080,
    fps: 30,
    videoBitrate: "2200k",
  },
  {
    id: "webm-720p-compressed",
    label: "WebM 720p Small",
    description: "Compressed VP9 preset for lightweight embeds.",
    category: "compressed",
    format: "webm",
    width: 1280,
    height: 720,
    fps: 24,
    videoBitrate: "900k",
  },
  {
    id: "mov-1080p",
    label: "MOV 1080p",
    description: "QuickTime-compatible export for handoff workflows.",
    category: "video",
    format: "mov",
    width: 1920,
    height: 1080,
    fps: 30,
    crf: 22,
  },
  {
    id: "avi-720p",
    label: "AVI 720p",
    description: "Legacy AVI export for older playback systems.",
    category: "video",
    format: "avi",
    width: 1280,
    height: 720,
    fps: 30,
    crf: 26,
  },
  {
    id: "mpeg-720p",
    label: "MPEG 720p",
    description: "MPEG export for broad offline compatibility.",
    category: "video",
    format: "mpeg",
    width: 1280,
    height: 720,
    fps: 30,
    videoBitrate: "2500k",
  },
  {
    id: "gif-social-square",
    label: "GIF Square",
    description: "Square social GIF with reduced frame rate.",
    category: "social",
    format: "gif",
    width: 720,
    height: 720,
    fps: 12,
  },
  {
    id: "gif-sticker",
    label: "GIF Sticker",
    description: "Compact animated GIF for reactions and stickers.",
    category: "compressed",
    format: "gif",
    width: 480,
    height: 480,
    fps: 10,
  },
  {
    id: "gif-transparent-sticker",
    label: "GIF Transparent",
    description: "Transparent animated GIF for stickers and reactions.",
    category: "compressed",
    format: "gif",
    width: 480,
    height: 480,
    fps: 10,
  },
  {
    id: "png-current-frame",
    label: "PNG Current Frame",
    description: "Still image export from the current playhead frame.",
    category: "social",
    format: "png",
  },
  {
    id: "png-transparent-frame",
    label: "PNG Transparent",
    description: "Still image with a transparent canvas background.",
    category: "social",
    format: "png",
  },
  {
    id: "jpg-current-frame",
    label: "JPG Current Frame",
    description: "Small still image export from the playhead frame.",
    category: "social",
    format: "jpg",
  },
  {
    id: "webp-current-frame",
    label: "WebP Current Frame",
    description: "Modern web image export from the playhead frame.",
    category: "social",
    format: "webp",
  },
  {
    id: "wav-audio",
    label: "WAV Audio",
    description: "Audio-only WAV export for a single audio or video source.",
    category: "audio",
    format: "wav",
  },
  {
    id: "mp3-audio",
    label: "MP3 Audio",
    description: "Compressed audio export for sharing and review.",
    category: "audio",
    format: "mp3",
  },
  {
    id: "m4a-audio",
    label: "M4A Audio",
    description: "AAC audio export for modern devices.",
    category: "audio",
    format: "m4a",
  },
  {
    id: "project-bundle",
    label: "Project Bundle",
    description: "Portable JSON backup with project metadata.",
    category: "backup",
    format: "json",
  },
];

export const layerColors = {
  video: "border-border bg-primary text-primary-foreground",
  image: "border-border bg-secondary text-secondary-foreground",
  audio: "border-border bg-muted text-foreground",
  text: "border-border bg-card text-card-foreground",
  subtitle: "border-border bg-accent text-accent-foreground",
  shape: "border-border bg-muted text-foreground",
  sticker: "border-border bg-secondary text-secondary-foreground",
  progress: "border-border bg-card text-card-foreground",
  timer: "border-border bg-accent text-accent-foreground",
};

export function getAspectPreset(id: string) {
  return aspectPresets.find((preset) => preset.id === id) ?? aspectPresets[0];
}
