"use client";

import { createId } from "@/lib/editor/factory";
import { createSelfHostedMediaAttribution } from "@/lib/editor/media-attribution";
import type { MediaAsset, MediaType } from "@/lib/editor/types";

export type SelfHostedMediaImportInput = {
  url: string;
  mediaType: MediaType;
  name?: string;
};

type RemoteHeaders = {
  mimeType?: string;
  size?: number;
};

const mediaTypeMimeFallbacks: Record<MediaType, string> = {
  audio: "audio/mpeg",
  image: "image/jpeg",
  video: "video/mp4",
};

export async function createSelfHostedMediaAsset(input: SelfHostedMediaImportInput): Promise<MediaAsset> {
  const url = normalizeSelfHostedMediaUrl(input.url);
  const [metadataResult, headerResult] = await Promise.allSettled([
    readSelfHostedMediaMetadata(url, input.mediaType),
    readRemoteHeaders(url),
  ]);

  if (metadataResult.status === "rejected") {
    throw new SelfHostedMediaError("Media URL could not be loaded. Use a direct CORS-enabled file URL.");
  }

  const headers = headerResult.status === "fulfilled" ? headerResult.value : {};
  const now = new Date().toISOString();
  const name = cleanSelfHostedMediaName(input.name, url, input.mediaType);

  return {
    id: createId("asset"),
    name,
    type: input.mediaType,
    mimeType: headers.mimeType ?? mimeTypeFromUrl(url, input.mediaType),
    size: headers.size ?? 0,
    duration: metadataResult.value.duration,
    width: metadataResult.value.width,
    height: metadataResult.value.height,
    storageKey: url,
    source: "self-hosted-url",
    objectUrl: url,
    attribution: createSelfHostedMediaAttribution({ url, title: name, capturedAt: now }),
    createdAt: now,
  };
}

export async function loadSelfHostedMediaBlob(asset: MediaAsset) {
  if (!isSelfHostedMediaAsset(asset)) return null;

  try {
    const response = await fetch(normalizeSelfHostedMediaUrl(asset.storageKey), {
      credentials: "omit",
      mode: "cors",
    });
    if (!response.ok) return null;
    return response.blob();
  } catch {
    return null;
  }
}

export async function checkSelfHostedMediaAvailable(asset: MediaAsset) {
  if (!isSelfHostedMediaAsset(asset)) return false;

  try {
    const response = await fetch(normalizeSelfHostedMediaUrl(asset.storageKey), {
      credentials: "omit",
      method: "HEAD",
      mode: "cors",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function restoreSelfHostedMediaAssets(assets: MediaAsset[]) {
  return assets.map((asset) =>
    isSelfHostedMediaAsset(asset)
      ? {
          ...asset,
          objectUrl: normalizeSelfHostedMediaUrl(asset.storageKey),
        }
      : asset,
  );
}

export function isSelfHostedMediaAsset(asset: MediaAsset) {
  return asset.source === "self-hosted-url";
}

export function isSelfHostedMediaObjectUrl(asset: MediaAsset, objectUrl: string) {
  return asset.source === "self-hosted-url" && objectUrl === asset.storageKey;
}

export function selfHostedMediaImportFailureMessage(error: unknown) {
  return error instanceof SelfHostedMediaError ? error.message : "Media URL could not be imported.";
}

export class SelfHostedMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelfHostedMediaError";
  }
}

export function normalizeSelfHostedMediaUrl(value: string) {
  const raw = value.trim();
  if (!raw || raw.length > 2000) {
    throw new SelfHostedMediaError("Enter a direct media URL.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SelfHostedMediaError("Enter a valid media URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SelfHostedMediaError("Use an HTTP or HTTPS media URL.");
  }

  if (url.username || url.password) {
    throw new SelfHostedMediaError("Use a URL without embedded credentials.");
  }

  return url.toString();
}

async function readRemoteHeaders(url: string): Promise<RemoteHeaders> {
  try {
    const response = await fetch(url, {
      credentials: "omit",
      method: "HEAD",
      mode: "cors",
    });
    if (!response.ok) return {};

    const size = Number(response.headers.get("content-length"));
    return {
      mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || undefined,
      size: Number.isFinite(size) && size >= 0 ? size : undefined,
    };
  } catch {
    return {};
  }
}

function readSelfHostedMediaMetadata(url: string, mediaType: MediaType) {
  if (mediaType === "image") {
    return readSelfHostedImageMetadata(url);
  }

  return readSelfHostedTimedMetadata(url, mediaType);
}

function readSelfHostedImageMetadata(url: string) {
  return withSelfHostedTimeout(
    new Promise<{ duration: number; width?: number; height?: number }>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve({ duration: 5, width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new SelfHostedMediaError("Image URL could not be loaded."));
      image.src = url;
    }),
  );
}

function readSelfHostedTimedMetadata(url: string, mediaType: "audio" | "video") {
  return withSelfHostedTimeout(
    new Promise<{ duration: number; width?: number; height?: number }>((resolve, reject) => {
      const element = document.createElement(mediaType);
      element.crossOrigin = "anonymous";
      element.preload = "metadata";
      element.onloadedmetadata = () =>
        resolve({
          duration: Number.isFinite(element.duration) ? element.duration : 0,
          width: mediaType === "video" ? (element as HTMLVideoElement).videoWidth : undefined,
          height: mediaType === "video" ? (element as HTMLVideoElement).videoHeight : undefined,
        });
      element.onerror = () => reject(new SelfHostedMediaError("Media URL could not be loaded."));
      element.src = url;
      element.load();
    }),
  );
}

function withSelfHostedTimeout<T>(promise: Promise<T>, milliseconds = 15000) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new SelfHostedMediaError("Media URL timed out.")), milliseconds);
    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function cleanSelfHostedMediaName(name: string | undefined, url: string, mediaType: MediaType) {
  const cleanName = cleanNameValue(name);
  if (cleanName) return cleanName;

  const fileName = cleanNameValue(fileNameFromUrl(url));
  if (fileName) return fileName;

  return `Self-hosted ${mediaType}`;
}

function cleanNameValue(value: string | undefined) {
  const clean = value?.trim().replace(/\s+/g, " ").slice(0, 120);
  return clean || null;
}

function fileNameFromUrl(value: string) {
  try {
    const url = new URL(value);
    const segment = url.pathname.split("/").filter(Boolean).at(-1);
    return segment ? decodeURIComponent(segment) : undefined;
  } catch {
    return undefined;
  }
}

function mimeTypeFromUrl(url: string, mediaType: MediaType) {
  const pathname = new URL(url).pathname.toLowerCase();
  const extension = pathname.split(".").at(-1);
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  if (extension === "mp4") return "video/mp4";
  if (extension === "gif") return "image/gif";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "wav") return "audio/wav";
  if (extension === "m4a") return "audio/mp4";
  if (extension === "mp3") return "audio/mpeg";
  return mediaTypeMimeFallbacks[mediaType];
}
