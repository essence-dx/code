"use client";

import Dexie, { type EntityTable } from "dexie";
import type { MediaAsset, MediaType } from "@/lib/editor/types";
import { createId } from "@/lib/editor/factory";
import { extractWaveformPeaks } from "@/lib/audio/waveform";
import { inferMediaTypeFromFile, UnsupportedMediaTypeError } from "@/lib/media/media-type";
import { isSelfHostedMediaAsset } from "@/lib/media/self-hosted-media";

interface StoredMediaAsset extends MediaAsset {
  blob: Blob;
}

const db = new Dexie("essence-kapwing-media") as Dexie & {
  media: EntityTable<StoredMediaAsset, "id">;
};

db.version(1).stores({
  media: "id, type, name, createdAt",
});

export async function saveBrowserMedia(file: File): Promise<MediaAsset> {
  const mediaType = inferMediaType(file);
  const metadata = await readMediaMetadata(file, mediaType);
  const waveformPeaks = mediaType === "audio" ? await extractWaveformPeaks(file) : undefined;
  const id = createId("asset");
  const now = new Date().toISOString();
  const asset: StoredMediaAsset = {
    id,
    name: file.name,
    type: mediaType,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    waveformPeaks,
    storageKey: id,
    source: "browser-indexeddb",
    objectUrl: URL.createObjectURL(file),
    createdAt: now,
    blob: file,
  };

  await db.media.put(asset);
  const { blob, ...publicAsset } = asset;
  void blob;
  return publicAsset;
}

export async function reconnectBrowserMedia(asset: MediaAsset, file: File): Promise<MediaAsset> {
  const mediaType = inferMediaType(file);
  if (mediaType !== asset.type) {
    throw new Error("Selected file does not match the missing media type.");
  }

  const metadata = await readMediaMetadata(file, mediaType);
  const waveformPeaks = mediaType === "audio" ? await extractWaveformPeaks(file) : undefined;
  const storageKey = asset.id;
  const nextAsset: StoredMediaAsset = {
    ...asset,
    name: file.name || asset.name,
    mimeType: file.type || asset.mimeType || "application/octet-stream",
    size: file.size,
    duration: metadata.duration || asset.duration,
    width: metadata.width,
    height: metadata.height,
    waveformPeaks,
    storageKey,
    source: "browser-indexeddb",
    objectUrl: URL.createObjectURL(file),
    blob: file,
  };

  await db.media.put(nextAsset);
  const { blob, ...publicAsset } = nextAsset;
  void blob;
  return publicAsset;
}

export async function loadBrowserMediaBlob(storageKey: string) {
  const stored = await db.media.get(storageKey);
  return stored?.blob ?? null;
}

export async function restoreBrowserMediaAssets(assets: MediaAsset[]) {
  const restored: MediaAsset[] = [];

  for (const asset of assets) {
    if (isSelfHostedMediaAsset(asset)) {
      restored.push({ ...asset, objectUrl: asset.storageKey });
      continue;
    }

    const blob = await loadBrowserMediaBlob(asset.storageKey);
    restored.push({
      ...asset,
      objectUrl: blob ? URL.createObjectURL(blob) : asset.objectUrl,
    });
  }

  return restored;
}

export function inferMediaType(file: File): MediaType {
  try {
    return inferMediaTypeFromFile(file);
  } catch (error) {
    if (error instanceof UnsupportedMediaTypeError) {
      throw new UnsupportedBrowserMediaError();
    }

    throw error;
  }
}

export class UnsupportedBrowserMediaError extends Error {
  constructor() {
    super("Choose a supported video, audio, image, or GIF file.");
    this.name = "UnsupportedBrowserMediaError";
  }
}

export async function readMediaMetadata(file: File, mediaType: MediaType) {
  if (mediaType === "image") {
    return readImageMetadata(file);
  }

  return readTimedMediaMetadata(file, mediaType);
}

async function readImageMetadata(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image metadata could not be read."));
      element.src = url;
    });

    return { duration: 5, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readTimedMediaMetadata(file: File, mediaType: "video" | "audio") {
  const url = URL.createObjectURL(file);

  try {
    const element = document.createElement(mediaType);
    const metadata = await new Promise<{ duration: number; width?: number; height?: number }>((resolve, reject) => {
      element.preload = "metadata";
      element.onloadedmetadata = () =>
        resolve({
          duration: Number.isFinite(element.duration) ? element.duration : 0,
          width: mediaType === "video" ? (element as HTMLVideoElement).videoWidth : undefined,
          height: mediaType === "video" ? (element as HTMLVideoElement).videoHeight : undefined,
        });
      element.onerror = () => reject(new Error("Media metadata could not be read."));
      element.src = url;
    });

    return metadata;
  } finally {
    URL.revokeObjectURL(url);
  }
}
