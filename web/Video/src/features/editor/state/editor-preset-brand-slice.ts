"use client";

import { normalizeLayerAudioMix } from "@/lib/audio/mix";
import { brandColorWithAlpha, brandColorsForTemplate, normalizeBrandKitSettings } from "@/lib/editor/brand-kit";
import { createId } from "@/lib/editor/factory";
import type { AudioMixPreset, BrandFontAsset, BrandKitSettings, BrandTypographyPreset, EditorProject, LayerStylePreset, TimelineLayer } from "@/lib/editor/types";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorPresetBrandSlice = Pick<
  EditorState,
  | "saveSelectedLayerStylePreset"
  | "applyLayerStylePreset"
  | "removeLayerStylePreset"
  | "saveSelectedAudioMixPreset"
  | "applyAudioMixPreset"
  | "removeAudioMixPreset"
  | "saveBrandTypographyPreset"
  | "applyBrandTypographyPreset"
  | "removeBrandTypographyPreset"
  | "updateBrandKitSettings"
  | "addBrandLogoAsset"
  | "removeBrandLogoAsset"
  | "addBrandFontAsset"
  | "removeBrandFontAsset"
  | "applyBrandKitToSelected"
  | "addBrandColor"
  | "applyBrandColorToSelected"
>;

type EditorPresetBrandDeps = {
  audioMixPresets: (project: EditorProject) => AudioMixPreset[];
  brandTypographyPresets: (project: EditorProject) => BrandTypographyPreset[];
  cleanAudioMixPresetName: (name: string) => string;
  cleanBrandTypographyName: (name: string) => string;
  cleanFontFamily: (fontFamily: string) => string;
  cleanLayerStylePresetName: (name: string) => string;
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  getSelectedLayerIds: (state: Pick<EditorState, "selectedLayerId" | "selectedLayerIds">) => string[];
  isTextLikeLayer: (layer: TimelineLayer) => boolean;
  layerStylePresets: (project: EditorProject) => LayerStylePreset[];
  normalizeHexColor: (value: string) => string | null;
  typographyRoleStyle: (preset: BrandTypographyPreset, role: "heading" | "body" | "caption") => {
    fontFamily: string;
    fontWeight: number;
    fontSize: number;
  };
};

export function createEditorPresetBrandSlice(
  set: EditorStoreSet,
  get: EditorStoreGet,
  deps: EditorPresetBrandDeps,
): EditorPresetBrandSlice {
  return {
    saveSelectedLayerStylePreset: (name) => {
      const state = get();
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId);
      if (!layer) return { saved: false };

      const now = new Date().toISOString();
      const presetName = deps.cleanLayerStylePresetName(name || `${layer.name} style`);
      const preset: LayerStylePreset = {
        id: createId("style"),
        name: presetName,
        style: { ...layer.style },
        createdAt: now,
        updatedAt: now,
      };

      deps.commit((project) => ({
        ...project,
        layerStylePresets: [preset, ...deps.layerStylePresets(project)].slice(0, 100),
        updatedAt: now,
      }));

      return { saved: true, presetName };
    },
    applyLayerStylePreset: (presetId) => {
      const state = get();
      const preset = deps.layerStylePresets(state.project).find((item) => item.id === presetId);
      if (!preset) return 0;

      const selectedIds = deps.getSelectedLayerIds(state);
      if (!selectedIds.length) return 0;

      const targetIds = new Set(selectedIds);
      const now = new Date().toISOString();
      let changedCount = 0;
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!targetIds.has(layer.id) || layer.locked) return layer;
          changedCount += 1;
          return {
            ...layer,
            style: { ...preset.style },
            updatedAt: now,
          };
        }),
        updatedAt: changedCount > 0 ? now : project.updatedAt,
      }));

      return changedCount;
    },
    removeLayerStylePreset: (presetId) => {
      const state = get();
      if (!deps.layerStylePresets(state.project).some((preset) => preset.id === presetId)) return;

      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        layerStylePresets: deps.layerStylePresets(project).filter((preset) => preset.id !== presetId),
        updatedAt: now,
      }));
    },
    saveSelectedAudioMixPreset: (name) => {
      const state = get();
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId && (item.kind === "audio" || item.kind === "video"));
      if (!layer) return { saved: false };

      const now = new Date().toISOString();
      const mix = normalizeLayerAudioMix(layer);
      const presetName = deps.cleanAudioMixPresetName(name || `${layer.name} mix`);
      const preset: AudioMixPreset = {
        id: createId("audio_mix"),
        name: presetName,
        volume: mix.volume,
        fadeIn: mix.fadeIn,
        fadeOut: mix.fadeOut,
        muted: layer.muted,
        createdAt: now,
        updatedAt: now,
      };

      deps.commit((project) => ({
        ...project,
        audioMixPresets: [preset, ...deps.audioMixPresets(project)].slice(0, 100),
        updatedAt: now,
      }));

      return { saved: true, presetName };
    },
    applyAudioMixPreset: (presetId) => {
      const state = get();
      const preset = deps.audioMixPresets(state.project).find((item) => item.id === presetId);
      if (!preset) return 0;

      const selectedIds = deps.getSelectedLayerIds(state);
      if (!selectedIds.length) return 0;

      const targetIds = new Set(selectedIds);
      const now = new Date().toISOString();
      let changedCount = 0;
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!targetIds.has(layer.id) || layer.locked || (layer.kind !== "audio" && layer.kind !== "video")) return layer;
          changedCount += 1;
          return {
            ...layer,
            volume: preset.volume,
            fadeIn: preset.fadeIn,
            fadeOut: preset.fadeOut,
            muted: preset.muted,
            updatedAt: now,
          };
        }),
        updatedAt: changedCount > 0 ? now : project.updatedAt,
      }));

      return changedCount;
    },
    removeAudioMixPreset: (presetId) => {
      const state = get();
      if (!deps.audioMixPresets(state.project).some((preset) => preset.id === presetId)) return;

      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        audioMixPresets: deps.audioMixPresets(project).filter((preset) => preset.id !== presetId),
        updatedAt: now,
      }));
    },
    saveBrandTypographyPreset: (input) => {
      const name = deps.cleanBrandTypographyName(input.name);
      if (!name) return null;

      const now = new Date().toISOString();
      const preset: BrandTypographyPreset = {
        id: createId("typography"),
        name,
        headingFontFamily: deps.cleanFontFamily(input.headingFontFamily),
        bodyFontFamily: deps.cleanFontFamily(input.bodyFontFamily),
        captionFontFamily: deps.cleanFontFamily(input.captionFontFamily),
        headingWeight: 800,
        bodyWeight: 500,
        captionWeight: 700,
        createdAt: now,
        updatedAt: now,
      };

      deps.commit((project) => ({
        ...project,
        brandTypographyPresets: [preset, ...deps.brandTypographyPresets(project)].slice(0, 100),
        updatedAt: now,
      }));

      return preset;
    },
    applyBrandTypographyPreset: (presetId, role) => {
      const state = get();
      const preset = deps.brandTypographyPresets(state.project).find((item) => item.id === presetId);
      if (!preset) return 0;

      const selectedIds = new Set(deps.getSelectedLayerIds(state));
      if (!selectedIds.size) return 0;

      const patch = deps.typographyRoleStyle(preset, role);
      const now = new Date().toISOString();
      let changedCount = 0;
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!selectedIds.has(layer.id) || layer.locked || !deps.isTextLikeLayer(layer)) return layer;
          changedCount += 1;
          return {
            ...layer,
            style: { ...layer.style, ...patch },
            updatedAt: now,
          };
        }),
        updatedAt: changedCount > 0 ? now : project.updatedAt,
      }));

      return changedCount;
    },
    removeBrandTypographyPreset: (presetId) => {
      const state = get();
      if (!deps.brandTypographyPresets(state.project).some((preset) => preset.id === presetId)) return;

      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        brandTypographyPresets: deps.brandTypographyPresets(project).filter((preset) => preset.id !== presetId),
        brandKit:
          project.brandKit?.defaultTypographyPresetId === presetId
            ? { ...normalizeBrandKitSettings(project.brandKit), defaultTypographyPresetId: undefined }
            : project.brandKit,
        updatedAt: now,
      }));
    },
    updateBrandKitSettings: (patch) => {
      const state = get();
      const nextSettings = normalizeBrandKitSettings({ ...state.project.brandKit, ...patch }, {
        mediaAssets: state.mediaAssets,
        typographyPresets: deps.brandTypographyPresets(state.project),
      });
      const now = new Date().toISOString();

      deps.commit((project) => ({
        ...project,
        brandKit: nextSettings,
        updatedAt: now,
      }));
    },
    addBrandLogoAsset: (assetId) => {
      const state = get();
      const asset = state.mediaAssets.find((item) => item.id === assetId && item.type === "image");
      if (!asset) return false;

      const now = new Date().toISOString();
      deps.commit((project) => {
        const current = normalizeBrandKitSettings(project.brandKit, {
          mediaAssets: state.mediaAssets,
          typographyPresets: deps.brandTypographyPresets(project),
        });
        const logoAssetIds = [asset.id, ...current.logoAssetIds.filter((item) => item !== asset.id)].slice(0, 24);

        return {
          ...project,
          brandKit: {
            ...current,
            logoAssetIds,
            defaultLogoAssetId: current.defaultLogoAssetId ?? asset.id,
          },
          updatedAt: now,
        };
      });
      return true;
    },
    removeBrandLogoAsset: (assetId) => {
      const state = get();
      const now = new Date().toISOString();
      deps.commit((project) => {
        const current = normalizeBrandKitSettings(project.brandKit, {
          mediaAssets: state.mediaAssets,
          typographyPresets: deps.brandTypographyPresets(project),
        });
        const logoAssetIds = current.logoAssetIds.filter((item) => item !== assetId);

        return {
          ...project,
          brandKit: {
            ...current,
            logoAssetIds,
            defaultLogoAssetId: current.defaultLogoAssetId === assetId ? logoAssetIds[0] : current.defaultLogoAssetId,
          },
          updatedAt: now,
        };
      });
    },
    addBrandFontAsset: (asset) => {
      const cleanAsset = cleanBrandFontAsset(asset);
      if (!cleanAsset) return false;

      const state = get();
      const now = new Date().toISOString();
      deps.commit((project) => {
        const current = normalizeBrandKitSettings(project.brandKit, {
          mediaAssets: state.mediaAssets,
          typographyPresets: deps.brandTypographyPresets(project),
        });
        const fontAssets = [cleanAsset, ...current.fontAssets.filter((item) => item.id !== cleanAsset.id)].slice(0, 24);

        return {
          ...project,
          brandKit: {
            ...current,
            fontAssets,
            defaultFontAssetId: current.defaultFontAssetId ?? cleanAsset.id,
          },
          updatedAt: now,
        };
      });
      return true;
    },
    removeBrandFontAsset: (assetId) => {
      const state = get();
      const now = new Date().toISOString();
      deps.commit((project) => {
        const current = normalizeBrandKitSettings(project.brandKit, {
          mediaAssets: state.mediaAssets,
          typographyPresets: deps.brandTypographyPresets(project),
        });
        const fontAssets = current.fontAssets.filter((asset) => asset.id !== assetId);

        return {
          ...project,
          brandKit: {
            ...current,
            fontAssets,
            defaultFontAssetId: current.defaultFontAssetId === assetId ? fontAssets[0]?.id : current.defaultFontAssetId,
          },
          updatedAt: now,
        };
      });
    },
    applyBrandKitToSelected: () => {
      const state = get();
      const selectedIds = new Set(deps.getSelectedLayerIds(state));
      if (!selectedIds.size) return 0;

      const settings = normalizeBrandKitSettings(state.project.brandKit, {
        mediaAssets: state.mediaAssets,
        typographyPresets: deps.brandTypographyPresets(state.project),
      });
      const colors = brandColorsForTemplate(state.brandColors, settings);
      const primaryColor = settings.defaultPrimaryColor ?? colors[0];
      const secondaryColor = settings.defaultSecondaryColor ?? colors[1] ?? colors[0];
      const typographyPreset = settings.defaultTypographyPresetId
        ? deps.brandTypographyPresets(state.project).find((preset) => preset.id === settings.defaultTypographyPresetId)
        : undefined;
      const now = new Date().toISOString();
      let changedCount = 0;

      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!selectedIds.has(layer.id) || layer.locked) return layer;
          const stylePatch = brandKitStylePatch(layer, settings, primaryColor, secondaryColor, typographyPreset, deps);
          if (Object.keys(stylePatch).length === 0) return layer;

          changedCount += 1;
          return {
            ...layer,
            style: { ...layer.style, ...stylePatch },
            updatedAt: now,
          };
        }),
        updatedAt: changedCount > 0 ? now : project.updatedAt,
      }));

      return changedCount;
    },
    addBrandColor: (color) => {
      const normalized = deps.normalizeHexColor(color);
      if (!normalized) return;

      set((state) => ({
        brandColors: [normalized, ...state.brandColors.filter((item) => item !== normalized)].slice(0, 12),
      }));
    },
    applyBrandColorToSelected: (color) => {
      const normalized = deps.normalizeHexColor(color);
      if (!normalized) return;

      const selectedIds = deps.getSelectedLayerIds(get());
      if (selectedIds.length === 0) return;

      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!selectedIds.includes(layer.id)) return layer;
          const stylePatch = layer.kind === "shape" ? { fill: normalized, background: normalized } : { fill: normalized };

          return {
            ...layer,
            style: { ...layer.style, ...stylePatch },
            updatedAt: new Date().toISOString(),
          };
        }),
        updatedAt: new Date().toISOString(),
      }));
    },
  };
}

function cleanBrandFontAsset(asset: BrandFontAsset): BrandFontAsset | null {
  const id = asset.id.trim();
  const name = asset.name.trim().replace(/\s+/g, " ").slice(0, 120);
  const family = asset.family.trim().replace(/\s+/g, "_").slice(0, 120);
  const storageKey = asset.storageKey.trim();
  if (!id || !name || !family || !storageKey || !["browser-indexeddb", "tauri-fs"].includes(asset.source)) return null;

  return {
    ...asset,
    id,
    name,
    family,
    storageKey,
    mimeType: asset.mimeType.trim().slice(0, 120) || "font/ttf",
    size: Math.max(0, Math.floor(asset.size)),
  };
}

function brandKitStylePatch(
  layer: TimelineLayer,
  settings: BrandKitSettings,
  primaryColor: string | undefined,
  secondaryColor: string | undefined,
  typographyPreset: BrandTypographyPreset | undefined,
  deps: Pick<EditorPresetBrandDeps, "isTextLikeLayer" | "typographyRoleStyle">,
) {
  const patch: Partial<TimelineLayer["style"]> = {};

  if (settings.enforceColors && primaryColor) {
    if (layer.kind === "shape") {
      patch.fill = primaryColor;
      patch.background = primaryColor;
      patch.stroke = secondaryColor ?? layer.style.stroke;
    } else if (layer.kind === "progress") {
      patch.fill = primaryColor;
      patch.background = secondaryColor ?? layer.style.background;
    } else if (deps.isTextLikeLayer(layer)) {
      patch.fill = primaryColor;
      patch.background = brandColorWithAlpha(secondaryColor, "cc") ?? layer.style.background;
    }
  }

  if (settings.enforceTypography && typographyPreset && deps.isTextLikeLayer(layer)) {
    const role = layer.kind === "subtitle" || layer.kind === "timer" ? "caption" : layer.kind === "sticker" ? "body" : "heading";
    Object.assign(patch, deps.typographyRoleStyle(typographyPreset, role));
  }

  return patch;
}
