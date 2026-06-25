import type { AudioSettings, Material, MaterialLayer, SceneAudioAsset, SceneDocument, SceneMaterialAsset, SceneObject } from "../types";

export interface AssetCleanupReport {
  duplicateEmbeddedBytes: number;
  duplicateEmbeddedGroups: number;
  duplicateEmbeddedReferences: number;
  duplicateSavedAudioAssets: number;
  duplicateSavedMaterialAssets: number;
  totalEmbeddedReferences: number;
  unusedAudioAssets: number;
  unusedMaterialAssets: number;
}

export interface AssetCleanupResult {
  document: SceneDocument;
  removedAudioAssets: number;
  removedMaterialAssets: number;
}

function estimateDataUrlBytes(sourceDataUrl?: string | null) {
  if (!sourceDataUrl) {
    return 0;
  }

  const payload = sourceDataUrl.slice(sourceDataUrl.indexOf(",") + 1);

  if (sourceDataUrl.includes(";base64,")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;

    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }

  return payload.length;
}

function normalizedMaterial(material: Material) {
  return {
    ...material,
    layers: (material.layers ?? []).map((layer) => ({ ...layer })),
    textureDataUrl: material.textureDataUrl ?? null,
  };
}

function materialKey(material: Material) {
  return JSON.stringify(normalizedMaterial(material));
}

function audioKey(audio: AudioSettings) {
  return JSON.stringify(audio);
}

function collectMaterialSources(material: Material) {
  return [material.textureDataUrl, ...(material.layers ?? []).map((layer: MaterialLayer) => layer.sourceDataUrl)].filter((source): source is string => Boolean(source));
}

function collectObjectSources(object: SceneObject) {
  return [
    object.model?.sourceDataUrl,
    object.image?.sourceDataUrl,
    object.video?.sourceDataUrl,
    object.audio?.sourceDataUrl,
    object.svg?.sourceDataUrl,
    ...collectMaterialSources(object.material),
  ].filter((source): source is string => Boolean(source));
}

function collectEmbeddedSources(document: SceneDocument) {
  return [
    ...document.objects.flatMap(collectObjectSources),
    ...(document.materialAssets ?? []).flatMap((asset) => collectMaterialSources(asset.material)),
    ...(document.audioAssets ?? []).map((asset) => asset.audio.sourceDataUrl),
  ].filter((source): source is string => Boolean(source));
}

function countDuplicateKeys<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
}

function getUsedMaterialKeys(document: SceneDocument) {
  return new Set(document.objects.map((object) => materialKey(object.material)));
}

function getUsedAudioSources(document: SceneDocument) {
  return new Set(document.objects.map((object) => object.audio?.sourceDataUrl).filter((source): source is string => Boolean(source)));
}

function removeDuplicateMaterials(materialAssets: SceneMaterialAsset[]) {
  const seen = new Set<string>();

  return materialAssets.filter((asset) => {
    const key = materialKey(asset.material);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function removeDuplicateAudio(audioAssets: SceneAudioAsset[]) {
  const seen = new Set<string>();

  return audioAssets.filter((asset) => {
    const key = audioKey(asset.audio);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function analyzeAssetCleanup(document: SceneDocument): AssetCleanupReport {
  const embeddedSources = collectEmbeddedSources(document);
  const sourceCounts = new Map<string, number>();

  for (const source of embeddedSources) {
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  let duplicateEmbeddedBytes = 0;
  let duplicateEmbeddedGroups = 0;
  let duplicateEmbeddedReferences = 0;

  for (const [source, count] of sourceCounts) {
    if (count <= 1) {
      continue;
    }

    duplicateEmbeddedGroups += 1;
    duplicateEmbeddedReferences += count - 1;
    duplicateEmbeddedBytes += estimateDataUrlBytes(source) * (count - 1);
  }

  const materialAssets = document.materialAssets ?? [];
  const audioAssets = document.audioAssets ?? [];
  const usedMaterialKeys = getUsedMaterialKeys(document);
  const usedAudioSources = getUsedAudioSources(document);

  return {
    duplicateEmbeddedBytes,
    duplicateEmbeddedGroups,
    duplicateEmbeddedReferences,
    duplicateSavedAudioAssets: countDuplicateKeys(audioAssets, (asset) => audioKey(asset.audio)),
    duplicateSavedMaterialAssets: countDuplicateKeys(materialAssets, (asset) => materialKey(asset.material)),
    totalEmbeddedReferences: embeddedSources.length,
    unusedAudioAssets: audioAssets.filter((asset) => !usedAudioSources.has(asset.audio.sourceDataUrl)).length,
    unusedMaterialAssets: materialAssets.filter((asset) => !usedMaterialKeys.has(materialKey(asset.material))).length,
  };
}

export function removeDuplicateSavedAssets(document: SceneDocument): AssetCleanupResult {
  const materialAssets = document.materialAssets ?? [];
  const audioAssets = document.audioAssets ?? [];
  const nextMaterialAssets = removeDuplicateMaterials(materialAssets);
  const nextAudioAssets = removeDuplicateAudio(audioAssets);

  return {
    document: {
      ...document,
      audioAssets: nextAudioAssets,
      materialAssets: nextMaterialAssets,
    },
    removedAudioAssets: audioAssets.length - nextAudioAssets.length,
    removedMaterialAssets: materialAssets.length - nextMaterialAssets.length,
  };
}

export function removeUnusedSavedAssets(document: SceneDocument): AssetCleanupResult {
  const materialAssets = document.materialAssets ?? [];
  const audioAssets = document.audioAssets ?? [];
  const usedMaterialKeys = getUsedMaterialKeys(document);
  const usedAudioSources = getUsedAudioSources(document);
  const nextMaterialAssets = materialAssets.filter((asset) => usedMaterialKeys.has(materialKey(asset.material)));
  const nextAudioAssets = audioAssets.filter((asset) => usedAudioSources.has(asset.audio.sourceDataUrl));

  return {
    document: {
      ...document,
      audioAssets: nextAudioAssets,
      materialAssets: nextMaterialAssets,
    },
    removedAudioAssets: audioAssets.length - nextAudioAssets.length,
    removedMaterialAssets: materialAssets.length - nextMaterialAssets.length,
  };
}
