import type { DesignElement } from "@/features/editor/types";

export type ElementDataUrlAsset = {
  fieldName: string;
  dataUrl: string;
  mimeType: string;
};

export function collectElementDataUrlAssets(element: DesignElement) {
  const assets: ElementDataUrlAsset[] = [];

  for (const asset of getElementAssetFields(element)) {
    if (!isCacheableDataUrl(asset.dataUrl)) continue;

    assets.push({
      fieldName: asset.fieldName,
      dataUrl: asset.dataUrl,
      mimeType: getDataUrlMimeType(asset.dataUrl),
    });
  }

  return assets;
}

export function isCacheableDataUrl(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && /^data:[^,]+;base64,/.test(value);
}

export function getDataUrlMimeType(dataUrl: string) {
  const match = /^data:([^;,]+);base64,/.exec(dataUrl);

  return match?.[1] ?? "application/octet-stream";
}

export function estimateDataUrlSizeBytes(dataUrl: string) {
  const payload = dataUrl.split(",")[1] ?? "";
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function createDataUrlAssetId(dataUrl: string) {
  return `asset-${hashString(dataUrl)}`;
}

export function getElementAssetFields(element: DesignElement) {
  switch (element.type) {
    case "image":
      return [
        { fieldName: "image", dataUrl: element.src },
        {
          fieldName: "cutout-source",
          dataUrl: element.backgroundCutoutOriginalSrc,
        },
        {
          fieldName: "retouch-source",
          dataUrl: element.objectRetouchOriginalSrc,
        },
      ];
    case "video":
    case "audio":
    case "pdf":
      return [{ fieldName: element.type, dataUrl: element.src }];
    default:
      return [];
  }
}

export function mimeExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "video/mp4":
      return "mp4";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export function slugifyAssetName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "asset"
  );
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
