import type { ExportPreset } from "@/lib/editor/presets";
import type { EditorTemplatePreset } from "@/lib/editor/templates";
import type { SocialFormatPreset } from "@/lib/editor/social-format-presets";

export interface StarterWorkflowPreset {
  id: string;
  label: string;
  description: string;
  socialFormatId: SocialFormatPreset["id"];
  exportPresetId: ExportPreset["id"];
  templateIds: Array<EditorTemplatePreset["id"]>;
  bestFor: string;
}

export const starterWorkflowPresets: StarterWorkflowPreset[] = [
  {
    id: "gaming-highlight",
    label: "Gaming highlight",
    description: "Vertical hook, caption stack, and save prompt for highlight clips.",
    socialFormatId: "youtube-shorts",
    exportPresetId: "mp4-vertical-1080",
    templateIds: ["shorts-hook", "caption-stack"],
    bestFor: "Clips and reactions",
  },
  {
    id: "podcast-clip",
    label: "Podcast clip",
    description: "Speaker lower third plus captions for interview excerpts.",
    socialFormatId: "linkedin-feed",
    exportPresetId: "mp4-vertical-1080",
    templateIds: ["lower-third", "caption-stack"],
    bestFor: "Talk shows and interviews",
  },
  {
    id: "education-lesson",
    label: "Education lesson",
    description: "Landscape teaching layout with steps, captions, and readable safe margins.",
    socialFormatId: "youtube-video",
    exportPresetId: "mp4-1080p",
    templateIds: ["explainer-steps", "caption-stack"],
    bestFor: "Tutorials and courses",
  },
  {
    id: "marketing-launch",
    label: "Marketing launch",
    description: "Vertical product hook, offer chip, and social callout.",
    socialFormatId: "instagram-reels",
    exportPresetId: "mp4-vertical-1080",
    templateIds: ["product-spotlight", "shorts-hook"],
    bestFor: "Launches and ads",
  },
  {
    id: "product-demo",
    label: "Product demo",
    description: "Business-video canvas with product spotlight and presenter lower third.",
    socialFormatId: "linkedin-video",
    exportPresetId: "mp4-1080p",
    templateIds: ["product-spotlight", "lower-third"],
    bestFor: "Demos and walkthroughs",
  },
];

export function findStarterWorkflowPreset(id: string) {
  return starterWorkflowPresets.find((preset) => preset.id === id) ?? starterWorkflowPresets[0];
}
