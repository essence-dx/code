import type { LayerPatch } from "@/features/editor/document-utils";
import type {
  AssetLibraryManagementRow,
  AssetLibraryMediaAsset,
} from "@/features/editor/asset-library-management";

export type AssetLibraryMetadataValues = {
  libraryId?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
};

export function getAssetLibraryMetadataPatches({
  asset,
  row,
  values,
}: {
  asset?: AssetLibraryMediaAsset;
  row: AssetLibraryManagementRow;
  values: AssetLibraryMetadataValues;
}): LayerPatch[] {
  const libraryId =
    clean(values.libraryId) || asset?.libraryIds[0] || asset?.sourceHash;
  const sourceName = clean(values.sourceName) || asset?.sourceName;
  const sourceUrl = clean(values.sourceUrl) || asset?.sourceUrl;
  const license = clean(values.license) || asset?.license;

  return row.layerIds.map((layerId) => ({
    layerId,
    patch: {
      assetMetadata: {
        libraryId,
        sourceName,
        sourceUrl,
        license,
        hash: asset?.sourceHash,
        importedAt: new Date().toISOString(),
      },
    },
  }));
}

export function getAssetLibraryReplacementPatches({
  asset,
  row,
  replacementSource,
  values,
}: {
  asset?: AssetLibraryMediaAsset;
  row: AssetLibraryManagementRow;
  replacementSource: string;
  values: AssetLibraryMetadataValues;
}): LayerPatch[] {
  const imageSrc = replacementSource.trim();

  if (!imageSrc) {
    return [];
  }

  const sourceName =
    clean(values.sourceName) ||
    asset?.sourceName ||
    row.label.replace(/^(Image|Asset)\s+/i, "").trim() ||
    "Image asset";

  return row.layerIds.map((layerId) => ({
    layerId,
    patch: {
      imageSrc,
      imageAlt: sourceName,
      assetMetadata: {
        libraryId:
          clean(values.libraryId) || asset?.libraryIds[0] || asset?.sourceHash,
        sourceName,
        sourceUrl: clean(values.sourceUrl) || asset?.sourceUrl,
        license: clean(values.license) || asset?.license,
        hash: asset?.sourceHash,
        importedAt: new Date().toISOString(),
        replacementOf: asset?.sourceHash,
      },
    },
  }));
}

export function getAssetLibraryFontReplacementPatches({
  fontFamily,
  row,
}: {
  fontFamily: string;
  row: AssetLibraryManagementRow;
}): LayerPatch[] {
  const nextFont = fontFamily.trim();

  if (!nextFont) {
    return [];
  }

  return row.layerIds.map((layerId) => ({
    layerId,
    patch: {
      fontFamily: nextFont,
    },
  }));
}

function clean(value?: string) {
  const text = value?.trim();
  return text ? text : undefined;
}
