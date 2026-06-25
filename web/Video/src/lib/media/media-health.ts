import type { EditorProject, LayerKind, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { isRecoverableMediaAsset } from "@/lib/media/media-recovery";

export interface MediaHealthLayerImpact {
  id: string;
  name: string;
  kind: LayerKind;
}

export interface MediaHealthAsset {
  asset: MediaAsset;
  linkedLayerCount: number;
  impactedLayers: MediaHealthLayerImpact[];
  isAvailable: boolean;
  isFavorite: boolean;
  isRecoverable: boolean;
  needsReconnect: boolean;
}

export interface MissingMediaReference {
  assetId: string;
  impactedLayers: MediaHealthLayerImpact[];
}

export interface MediaHealthReport {
  totalAssets: number;
  availableAssets: number;
  missingAssets: number;
  usedAssets: number;
  unusedAssets: number;
  favoriteAssets: number;
  recoverableAssets: number;
  reconnectRequiredAssets: number;
  missingLayerCount: number;
  missingReferenceCount: number;
  assets: MediaHealthAsset[];
  missingReferences: MissingMediaReference[];
}

const mediaLayerKinds = new Set<LayerKind>(["audio", "image", "video"]);

export function createMediaHealthReport(
  project: EditorProject,
  mediaAssets: MediaAsset[],
  favoriteAssetIds: readonly string[] = [],
): MediaHealthReport {
  const favoriteAssetIdSet = new Set(favoriteAssetIds);
  const layerImpactByAssetId = createLayerImpactMap(project.layers);
  const assetById = new Map(mediaAssets.map((asset) => [asset.id, asset]));

  const assets = mediaAssets.map((asset): MediaHealthAsset => {
    const impactedLayers = layerImpactByAssetId.get(asset.id) ?? [];
    const isRecoverable = isRecoverableMediaAsset(asset);
    const isAvailable = Boolean(asset.objectUrl);

    return {
      asset,
      linkedLayerCount: impactedLayers.length,
      impactedLayers,
      isAvailable,
      isFavorite: favoriteAssetIdSet.has(asset.id),
      isRecoverable,
      needsReconnect: !isAvailable && !isRecoverable,
    };
  });

  const missingReferences = [...layerImpactByAssetId.entries()]
    .filter(([assetId]) => !assetById.has(assetId))
    .map(([assetId, impactedLayers]) => ({
      assetId,
      impactedLayers,
    }));

  const missingLayerCount =
    assets.reduce((count, item) => count + (item.isAvailable ? 0 : item.linkedLayerCount), 0) +
    missingReferences.reduce((count, reference) => count + reference.impactedLayers.length, 0);

  return {
    totalAssets: mediaAssets.length,
    availableAssets: assets.filter((item) => item.isAvailable).length,
    missingAssets: assets.filter((item) => !item.isAvailable).length,
    usedAssets: assets.filter((item) => item.linkedLayerCount > 0).length,
    unusedAssets: assets.filter((item) => item.linkedLayerCount === 0).length,
    favoriteAssets: assets.filter((item) => item.isFavorite).length,
    recoverableAssets: assets.filter((item) => item.isRecoverable).length,
    reconnectRequiredAssets: assets.filter((item) => item.needsReconnect).length + missingReferences.length,
    missingLayerCount,
    missingReferenceCount: missingReferences.length,
    assets,
    missingReferences,
  };
}

export function summarizeMissingMediaImpact(report: MediaHealthReport, limit = 3) {
  const impactedLayerNames = [
    ...report.assets
      .filter((item) => !item.isAvailable)
      .flatMap((item) => item.impactedLayers.map((layer) => layer.name)),
    ...report.missingReferences.flatMap((reference) => reference.impactedLayers.map((layer) => layer.name)),
  ];

  if (impactedLayerNames.length === 0) return null;
  const visibleNames = impactedLayerNames.slice(0, limit).join(", ");
  const remainingCount = impactedLayerNames.length - limit;
  return remainingCount > 0 ? `${visibleNames}, and ${remainingCount} more` : visibleNames;
}

function createLayerImpactMap(layers: TimelineLayer[]) {
  const impactByAssetId = new Map<string, MediaHealthLayerImpact[]>();

  for (const layer of layers) {
    if (!layer.assetId || !mediaLayerKinds.has(layer.kind)) continue;

    const impact: MediaHealthLayerImpact = {
      id: layer.id,
      name: layer.name,
      kind: layer.kind,
    };
    impactByAssetId.set(layer.assetId, [...(impactByAssetId.get(layer.assetId) ?? []), impact]);
  }

  return impactByAssetId;
}
