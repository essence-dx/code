"use client";

import type { MediaAsset } from "@/lib/editor/types";

export interface MediaRecoveryAdapter {
  source: MediaAsset["source"];
  restore: (asset: MediaAsset) => Promise<MediaAsset>;
}

export interface MediaRecoveryResult {
  recovered: MediaAsset[];
  unavailable: MediaAsset[];
  attemptedKeys: string[];
}

const recoverableMediaSources = new Set<MediaAsset["source"]>([
  "browser-indexeddb",
  "browser-opfs",
  "tauri-fs",
  "self-hosted-url",
]);

export function mediaRecoveryKey(projectId: string, asset: Pick<MediaAsset, "id" | "storageKey">) {
  return `${projectId}:${asset.id}:${asset.storageKey}`;
}

export function isRecoverableMediaAsset(asset: MediaAsset) {
  return !asset.objectUrl && recoverableMediaSources.has(asset.source);
}

export function selectMediaAssetsForRecovery(projectId: string, assets: MediaAsset[], attemptedKeys: ReadonlySet<string>) {
  return assets.filter((asset) => isRecoverableMediaAsset(asset) && !attemptedKeys.has(mediaRecoveryKey(projectId, asset)));
}

export async function recoverMediaAssets(
  projectId: string,
  assets: MediaAsset[],
  adapters: MediaRecoveryAdapter[],
  attemptedKeys: Set<string>,
): Promise<MediaRecoveryResult> {
  const adapterBySource = new Map(adapters.map((adapter) => [adapter.source, adapter]));
  const pendingAssets = selectMediaAssetsForRecovery(projectId, assets, attemptedKeys);
  const recovered: MediaAsset[] = [];
  const unavailable: MediaAsset[] = [];
  const nextAttemptedKeys: string[] = [];

  for (const asset of pendingAssets) {
    const attemptKey = mediaRecoveryKey(projectId, asset);
    attemptedKeys.add(attemptKey);
    nextAttemptedKeys.push(attemptKey);

    const adapter = adapterBySource.get(asset.source);
    if (!adapter) {
      unavailable.push(asset);
      continue;
    }

    try {
      const restored = await adapter.restore(asset);
      if (restored.objectUrl) {
        recovered.push(restored);
      } else {
        unavailable.push(restored);
      }
    } catch {
      unavailable.push(asset);
    }
  }

  return {
    recovered,
    unavailable,
    attemptedKeys: nextAttemptedKeys,
  };
}
