"use client";

import type { MediaAsset } from "@/lib/editor/types";
import { loadBrowserMediaBlob } from "@/lib/media/browser-media-store";
import { loadSelfHostedMediaBlob, normalizeSelfHostedMediaUrl } from "@/lib/media/self-hosted-media";
import { loadTauriMediaBlob } from "@/lib/media/tauri-media";

export interface SelfHostedMediaUploadInput {
  uploadUrl: string;
  publicUrl: string;
}

export async function uploadMediaAssetToSelfHostedStorage(asset: MediaAsset, input: SelfHostedMediaUploadInput): Promise<MediaAsset> {
  const uploadUrl = normalizeSelfHostedMediaUrl(input.uploadUrl);
  const publicUrl = normalizeSelfHostedMediaUrl(input.publicUrl);
  const blob = await loadMediaAssetBlobForUpload(asset);

  if (!blob) {
    throw new SelfHostedUploadError("Media is not available for upload.");
  }

  const response = await fetch(uploadUrl, {
    body: blob,
    credentials: "omit",
    headers: {
      "content-type": asset.mimeType || blob.type || "application/octet-stream",
    },
    method: "PUT",
    mode: "cors",
  });

  if (!response.ok) {
    throw new SelfHostedUploadError("Storage upload failed. Check the signed upload URL and CORS settings.");
  }

  return {
    ...asset,
    mimeType: asset.mimeType || blob.type || "application/octet-stream",
    size: blob.size || asset.size,
    storageKey: publicUrl,
    source: "self-hosted-url",
    objectUrl: publicUrl,
  };
}

export function selfHostedUploadFailureMessage(error: unknown) {
  return error instanceof SelfHostedUploadError ? error.message : "Media could not be uploaded to storage.";
}

export class SelfHostedUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelfHostedUploadError";
  }
}

async function loadMediaAssetBlobForUpload(asset: MediaAsset) {
  if (asset.source === "tauri-fs") {
    return loadTauriMediaBlob(asset);
  }

  if (asset.source === "self-hosted-url") {
    return loadSelfHostedMediaBlob(asset);
  }

  const storedBlob = await loadBrowserMediaBlob(asset.storageKey);
  if (storedBlob) return storedBlob;

  if (!asset.objectUrl) return null;

  try {
    const response = await fetch(asset.objectUrl);
    if (!response.ok) return null;
    return response.blob();
  } catch {
    return null;
  }
}
