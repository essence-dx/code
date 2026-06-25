import type { TimelineLayer } from "@/lib/editor/types";
import type { StockAsset } from "@/lib/stock/stock-assets";

export type StockAudioRole = "music" | "sound-effect";

export interface StockAudioLibraryPreset {
  id: string;
  label: string;
  description: string;
  query: string;
  role: StockAudioRole;
}

export const stockAudioCollectionName = "Music & SFX";

export const stockAudioLibraryPresets: StockAudioLibraryPreset[] = [
  {
    id: "ambient-music",
    label: "Ambient bed",
    description: "Soft background music for narration.",
    query: "ambient instrumental music",
    role: "music",
  },
  {
    id: "upbeat-music",
    label: "Upbeat music",
    description: "Higher-energy tracks for intros and reels.",
    query: "upbeat instrumental music",
    role: "music",
  },
  {
    id: "whoosh-sfx",
    label: "Whoosh",
    description: "Fast transition sound effects.",
    query: "whoosh sound effect",
    role: "sound-effect",
  },
  {
    id: "click-sfx",
    label: "Clicks",
    description: "UI clicks, taps, and small accents.",
    query: "click sound effect",
    role: "sound-effect",
  },
  {
    id: "applause-sfx",
    label: "Applause",
    description: "Audience reactions for edits and reveals.",
    query: "applause sound effect",
    role: "sound-effect",
  },
];

export function stockAudioRoleFromAsset(asset: Pick<StockAsset, "name" | "title">, preferredRole?: StockAudioRole): StockAudioRole {
  if (preferredRole) return preferredRole;

  const searchable = `${asset.name} ${asset.title}`.toLowerCase();
  if (/(music|song|instrumental|loop|theme|ambient|piano|guitar|beat)/.test(searchable)) return "music";
  return "sound-effect";
}

export function stockAudioLayerPatch(role: StockAudioRole): Pick<TimelineLayer, "volume" | "fadeIn" | "fadeOut" | "muted"> {
  if (role === "music") {
    return { volume: 0.32, fadeIn: 0.35, fadeOut: 0.45, muted: false };
  }

  return { volume: 0.85, fadeIn: 0.02, fadeOut: 0.08, muted: false };
}

export function stockAudioLayerName(asset: Pick<StockAsset, "name">, role: StockAudioRole) {
  return role === "music" ? `${asset.name} music bed` : `${asset.name} SFX`;
}

export function stockAttributionNote(asset: Pick<StockAsset, "providerLabel" | "licenseLabel" | "attribution" | "pageUrl">) {
  const parts = [`Imported from ${asset.providerLabel}`];
  if (asset.licenseLabel) parts.push(asset.licenseLabel);
  if (asset.attribution) parts.push(asset.attribution);
  parts.push(asset.pageUrl);
  return parts.join(" | ").slice(0, 500);
}
