import type { MediaType } from "@/lib/editor/types";
import type { MediaLayoutMode } from "@/lib/editor/media-layouts";
import type { ExportPreset } from "@/lib/editor/presets";

export interface ImageToolPreset {
  id: string;
  label: string;
  description: string;
  mode: MediaLayoutMode;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
  exportPresetId: ExportPreset["id"];
  clipSeconds: number;
  assetLimit: number;
  mediaTypes: MediaType[];
  bestFor: string;
}

export const imageToolPresets: ImageToolPreset[] = [
  {
    id: "photo-collage-square",
    label: "Photo collage",
    description: "Square collage layout for multiple images.",
    mode: "collage",
    aspectRatio: "1:1",
    exportPresetId: "png-current-frame",
    clipSeconds: 5,
    assetLimit: 6,
    mediaTypes: ["image"],
    bestFor: "Photo posts and carousels",
  },
  {
    id: "photo-grid-portrait",
    label: "Photo grid",
    description: "Portrait grid with enough room for mobile feeds.",
    mode: "collage",
    aspectRatio: "4:5",
    exportPresetId: "png-current-frame",
    clipSeconds: 5,
    assetLimit: 6,
    mediaTypes: ["image"],
    bestFor: "Instagram and LinkedIn image posts",
  },
  {
    id: "youtube-thumbnail",
    label: "Thumbnail",
    description: "Landscape thumbnail canvas from one or more source images.",
    mode: "montage",
    aspectRatio: "16:9",
    exportPresetId: "png-current-frame",
    clipSeconds: 5,
    assetLimit: 4,
    mediaTypes: ["image"],
    bestFor: "YouTube thumbnails",
  },
  {
    id: "wide-banner",
    label: "Banner",
    description: "Wide banner maker for headers and channel artwork.",
    mode: "montage",
    aspectRatio: "21:9",
    exportPresetId: "png-current-frame",
    clipSeconds: 5,
    assetLimit: 4,
    mediaTypes: ["image"],
    bestFor: "Channel art and website banners",
  },
  {
    id: "vertical-wallpaper",
    label: "Wallpaper",
    description: "Vertical wallpaper canvas that fills the frame with selected art.",
    mode: "slideshow",
    aspectRatio: "9:16",
    exportPresetId: "png-current-frame",
    clipSeconds: 5,
    assetLimit: 1,
    mediaTypes: ["image"],
    bestFor: "Phone wallpapers and story backgrounds",
  },
  {
    id: "image-resizer",
    label: "Image resizer",
    description: "Resize a single image into the current social canvas.",
    mode: "slideshow",
    aspectRatio: "1:1",
    exportPresetId: "png-current-frame",
    clipSeconds: 5,
    assetLimit: 1,
    mediaTypes: ["image"],
    bestFor: "Fast square image exports",
  },
];

export function findImageToolPreset(id: string) {
  return imageToolPresets.find((preset) => preset.id === id) ?? imageToolPresets[0];
}
