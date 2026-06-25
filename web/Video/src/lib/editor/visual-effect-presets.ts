import type { LayerStyle } from "@/lib/editor/types";

export interface VisualEffectPreset {
  id: string;
  label: string;
  description: string;
  patch: Partial<LayerStyle>;
}

export const visualEffectPresets: VisualEffectPreset[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Soft contrast with a subtle frame.",
    patch: {
      lookPreset: "cinematic",
      exposure: -0.08,
      temperature: 0.12,
      tint: -0.05,
      vignette: 0.32,
      brightness: 0.94,
      contrast: 1.18,
      saturation: 0.9,
      borderWidth: 0,
      shadowBlur: 20,
      shadowColor: "#000000",
    },
  },
  {
    id: "clean-product",
    label: "Product",
    description: "Bright, crisp, and neutral.",
    patch: {
      lookPreset: "clean-product",
      exposure: 0.08,
      temperature: 0,
      tint: 0,
      vignette: 0.06,
      brightness: 1.08,
      contrast: 1.06,
      saturation: 1,
      borderWidth: 1,
      stroke: "#ffffff",
      shadowBlur: 10,
      shadowColor: "#000000",
    },
  },
  {
    id: "high-contrast",
    label: "Contrast",
    description: "Punchier colors for social clips.",
    patch: {
      lookPreset: "high-contrast",
      exposure: 0.02,
      temperature: 0.04,
      tint: 0,
      vignette: 0.16,
      brightness: 1,
      contrast: 1.35,
      saturation: 1.25,
      borderWidth: 0,
      shadowBlur: 0,
    },
  },
  {
    id: "soft-shadow",
    label: "Shadow",
    description: "Depth without changing color.",
    patch: {
      lookPreset: "soft-shadow",
      exposure: 0,
      temperature: 0,
      tint: 0,
      vignette: 0.12,
      brightness: 1,
      contrast: 1,
      saturation: 1,
      borderWidth: 0,
      shadowBlur: 28,
      shadowColor: "#000000",
    },
  },
  {
    id: "warm-film",
    label: "Warm film",
    description: "Golden warmth with restrained contrast.",
    patch: {
      lookPreset: "warm-film",
      exposure: -0.04,
      temperature: 0.45,
      tint: -0.08,
      vignette: 0.22,
      brightness: 1.02,
      contrast: 1.12,
      saturation: 1.12,
      borderWidth: 0,
      shadowBlur: 14,
      shadowColor: "#000000",
    },
  },
  {
    id: "cool-clean",
    label: "Cool clean",
    description: "Cooler whites for tutorials and demos.",
    patch: {
      lookPreset: "cool-clean",
      exposure: 0.05,
      temperature: -0.28,
      tint: 0.06,
      vignette: 0.04,
      brightness: 1.04,
      contrast: 1.08,
      saturation: 0.96,
      borderWidth: 0,
      shadowBlur: 8,
      shadowColor: "#000000",
    },
  },
];
