import type { BrandFontAsset, BrandKitSettings, BrandTypographyPreset, MediaAsset } from "@/lib/editor/types";

export function createDefaultBrandKitSettings(): BrandKitSettings {
  return {
    logoAssetIds: [],
    fontAssets: [],
    enforceColors: false,
    enforceTypography: false,
    enforceLogo: false,
  };
}

export function normalizeBrandKitSettings(
  settings: Partial<BrandKitSettings> | undefined,
  options: {
    mediaAssets?: MediaAsset[];
    typographyPresets?: BrandTypographyPreset[];
  } = {},
): BrandKitSettings {
  const allowedLogoIds = options.mediaAssets ? new Set(options.mediaAssets.filter((asset) => asset.type === "image").map((asset) => asset.id)) : null;
  const typographyIds = options.typographyPresets ? new Set(options.typographyPresets.map((preset) => preset.id)) : null;
  const logoAssetIds = uniqueStrings(settings?.logoAssetIds ?? [])
    .filter((assetId) => !allowedLogoIds || allowedLogoIds.has(assetId))
    .slice(0, 24);
  const fontAssets = uniqueFontAssets(settings?.fontAssets ?? []).slice(0, 24);
  const requestedLogoId = settings?.defaultLogoAssetId;
  const defaultLogoAssetId = requestedLogoId && logoAssetIds.includes(requestedLogoId) ? requestedLogoId : logoAssetIds[0];
  const requestedFontId = settings?.defaultFontAssetId;
  const defaultFontAssetId = requestedFontId && fontAssets.some((asset) => asset.id === requestedFontId) ? requestedFontId : fontAssets[0]?.id;
  const requestedTypographyId = settings?.defaultTypographyPresetId;
  const defaultTypographyPresetId =
    requestedTypographyId && (!typographyIds || typographyIds.has(requestedTypographyId)) ? requestedTypographyId : undefined;

  return {
    logoAssetIds,
    fontAssets,
    defaultLogoAssetId,
    defaultFontAssetId,
    defaultPrimaryColor: normalizeBrandColor(settings?.defaultPrimaryColor),
    defaultSecondaryColor: normalizeBrandColor(settings?.defaultSecondaryColor),
    defaultTypographyPresetId,
    enforceColors: Boolean(settings?.enforceColors),
    enforceTypography: Boolean(settings?.enforceTypography),
    enforceLogo: Boolean(settings?.enforceLogo),
  };
}

export function brandColorsForTemplate(brandColors: string[], settings: Partial<BrandKitSettings> | undefined) {
  const kit = normalizeBrandKitSettings(settings);
  return uniqueStrings([kit.defaultPrimaryColor, kit.defaultSecondaryColor, ...brandColors].flatMap((color) => (color ? [color] : [])))
    .map((color) => normalizeBrandColor(color))
    .filter((color): color is string => Boolean(color))
    .slice(0, 12);
}

export function brandColorWithAlpha(color: string | undefined, alpha = "cc") {
  const normalized = normalizeBrandColor(color);
  return normalized ? `${normalized}${alpha}` : undefined;
}

export function normalizeBrandColor(color: string | undefined) {
  const trimmed = color?.trim() ?? "";
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function uniqueFontAssets(fontAssets: BrandFontAsset[]) {
  const seen = new Set<string>();
  return fontAssets.filter((asset) => {
    const id = asset.id.trim();
    const family = asset.family.trim();
    if (!id || !family || seen.has(id)) return false;
    seen.add(id);
    return Boolean(asset.name.trim() && asset.storageKey.trim() && ["browser-indexeddb", "tauri-fs"].includes(asset.source));
  });
}
