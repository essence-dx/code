"use client";

import type { MediaAsset } from "@/lib/editor/types";
import { createId } from "@/lib/editor/factory";
import { extractWaveformPeaks } from "@/lib/audio/waveform";
import { inferMediaType, readMediaMetadata } from "@/lib/media/browser-media-store";
import { isDesktopRuntime } from "@/lib/runtime/client-api";
import {
  DESKTOP_MEDIA_FILTER,
  DESKTOP_MEDIA_DIRECTORY,
  UnsupportedDesktopMediaError,
  desktopMediaStorageKey,
  isSupportedDesktopMediaPath,
  isAppLocalDesktopMediaKey,
  mediaNameFromPath,
  mimeTypeFromPath,
} from "@/lib/media/desktop-media";

export function isTauriRuntime() {
  return isDesktopRuntime();
}

export interface TauriMediaImportResult {
  assets: MediaAsset[];
  failedCount: number;
}

export async function importTauriMedia(): Promise<TauriMediaImportResult> {
  if (!isTauriRuntime()) return { assets: [], failedCount: 0 };

  const [{ open }, fs] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const { readFile, writeFile, mkdir, exists, BaseDirectory } = fs;
  await ensureDesktopMediaDirectory({ mkdir, exists, BaseDirectory });

  const selected = await open({
    multiple: true,
    filters: [DESKTOP_MEDIA_FILTER],
  });

  const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const assets: MediaAsset[] = [];
  let failedCount = 0;

  for (const path of paths) {
    try {
      assets.push(await importTauriMediaPath(path, { readFile, writeFile, BaseDirectory }));
    } catch {
      failedCount += 1;
    }
  }

  return { assets, failedCount };
}

export async function restoreTauriMediaAssets(assets: MediaAsset[]) {
  if (!isTauriRuntime()) return assets;

  const fs = await import("@tauri-apps/plugin-fs");
  const restored: MediaAsset[] = [];

  for (const asset of assets) {
    if (asset.objectUrl || asset.source !== "tauri-fs") {
      restored.push(asset);
      continue;
    }

    try {
      const bytes = await readTauriAssetBytes(asset, fs);
      const blob = new Blob([bytes], { type: asset.mimeType || mimeTypeFromPath(asset.storageKey) });
      restored.push({
        ...asset,
        objectUrl: URL.createObjectURL(blob),
      });
    } catch {
      restored.push(asset);
    }
  }

  return restored;
}

export async function loadTauriMediaBlob(asset: MediaAsset) {
  if (!isTauriRuntime() || asset.source !== "tauri-fs") return null;

  const fs = await import("@tauri-apps/plugin-fs");
  const bytes = await readTauriAssetBytes(asset, fs);
  return new Blob([bytes], { type: asset.mimeType || mimeTypeFromPath(asset.storageKey) });
}

type TauriFs = typeof import("@tauri-apps/plugin-fs");
type TauriMediaFileIo = Pick<TauriFs, "readFile" | "writeFile" | "BaseDirectory">;

async function importTauriMediaPath(path: string, { readFile, writeFile, BaseDirectory }: TauriMediaFileIo): Promise<MediaAsset> {
  if (!isSupportedDesktopMediaPath(path)) {
    throw new UnsupportedDesktopMediaError(path);
  }

  const name = mediaNameFromPath(path);
  const bytes = await readFile(path);
  const id = createId("asset");
  const storageKey = desktopMediaStorageKey(id, name);
  const mimeType = mimeTypeFromPath(path);
  const file = new File([bytes], name, { type: mimeType });
  const mediaType = inferMediaType(file);
  const metadata = await readMediaMetadata(file, mediaType);
  const waveformPeaks = mediaType === "audio" ? await extractWaveformPeaks(file) : undefined;
  await writeFile(storageKey, bytes, { baseDir: BaseDirectory.AppLocalData });

  return {
    id,
    name,
    type: mediaType,
    mimeType,
    size: bytes.byteLength,
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    waveformPeaks,
    storageKey,
    source: "tauri-fs",
    objectUrl: URL.createObjectURL(file),
    createdAt: new Date().toISOString(),
  };
}

async function ensureDesktopMediaDirectory({
  mkdir,
  exists,
  BaseDirectory,
}: Pick<TauriFs, "mkdir" | "exists" | "BaseDirectory">) {
  const hasDirectory = await exists(DESKTOP_MEDIA_DIRECTORY, { baseDir: BaseDirectory.AppLocalData }).catch(() => false);
  if (!hasDirectory) {
    await mkdir(DESKTOP_MEDIA_DIRECTORY, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }
}

async function readTauriAssetBytes(asset: MediaAsset, { readFile, BaseDirectory }: Pick<TauriFs, "readFile" | "BaseDirectory">) {
  if (isAppLocalDesktopMediaKey(asset.storageKey)) {
    return readFile(asset.storageKey, { baseDir: BaseDirectory.AppLocalData });
  }

  return readFile(asset.storageKey);
}
