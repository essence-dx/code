import { formatAssetMediaBytes } from "@/features/editor/asset-media-governance";
import type { AssetLibrarySourceType } from "@/features/editor/asset-library-management-types";

const videoExtensions = new Set(["avi", "m4v", "mov", "mp4", "webm"]);

export function getAssetLibrarySourceHash(source?: string) {
  const text = source?.trim();

  if (!text) {
    return "missing";
  }

  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `asset_${(hash >>> 0).toString(36)}`;
}

export function formatAssetLibraryBytes(bytes: number) {
  return formatAssetMediaBytes(bytes);
}

export function getAssetLibrarySourceType(
  source?: string,
): AssetLibrarySourceType {
  const text = source?.trim().toLowerCase();

  if (!text) {
    return "missing";
  }

  if (text.startsWith("data:")) {
    return "data-uri";
  }

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return "remote-url";
  }

  return "local-path";
}

export function getAssetLibrarySourcePreview(source?: string) {
  const text = source?.trim();

  if (!text) {
    return "No source";
  }

  if (text.startsWith("data:")) {
    return text.slice(0, 48);
  }

  return text.length > 72 ? `${text.slice(0, 68)}...` : text;
}

export function getAssetLibrarySourceBytes(source?: string) {
  return source ? new TextEncoder().encode(source).byteLength : 0;
}

export function getAssetLibraryFormat(source: string) {
  const dataMatch = source.match(/^data:(image|video)\/([^;,]+)/i);

  if (dataMatch?.[2]) {
    return dataMatch[2].toLowerCase().replace("jpeg", "jpg");
  }

  const path = source.split("?")[0]?.split("#")[0] ?? "";
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1];

  return extension?.toLowerCase().replace("jpeg", "jpg");
}

export function isAssetLibraryVideoLikeSource(source?: string) {
  const text = source?.trim().toLowerCase();

  if (!text) {
    return false;
  }

  if (text.startsWith("data:video/")) {
    return true;
  }

  const format = getAssetLibraryFormat(text);

  return Boolean(format && videoExtensions.has(format));
}
