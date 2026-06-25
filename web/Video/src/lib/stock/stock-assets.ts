export const stockMediaTypes = ["all", "image", "video", "audio"] as const;

export type StockMediaType = (typeof stockMediaTypes)[number];
export type StockAssetKind = Exclude<StockMediaType, "all">;

export interface StockAsset {
  id: string;
  provider: "wikimedia-commons";
  providerLabel: string;
  title: string;
  name: string;
  kind: StockAssetKind;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  sourceUrl: string;
  pageUrl: string;
  licenseLabel?: string;
  licenseUrl?: string;
  attribution?: string;
}

export function isStockMediaType(value: string | null): value is StockMediaType {
  return stockMediaTypes.includes(value as StockMediaType);
}

export function stockAssetKindFromMime(mimeType: string): StockAssetKind | null {
  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("audio/")) return "audio";
  return null;
}

export function isSupportedStockMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  return (
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/webp" ||
    normalized === "image/gif" ||
    normalized === "video/mp4" ||
    normalized === "video/webm" ||
    normalized === "audio/mpeg" ||
    normalized === "audio/mp3" ||
    normalized === "audio/mp4" ||
    normalized === "audio/wav" ||
    normalized === "audio/x-wav" ||
    normalized === "audio/ogg" ||
    normalized === "audio/flac"
  );
}

export function stockFileNameFromTitle(title: string, mimeType: string) {
  const rawName = title.replace(/^File:/i, "").trim() || `stock.${extensionForMimeType(mimeType)}`;
  const safeName = rawName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 140)
    .trim();

  if (/\.[a-z0-9]{2,5}$/i.test(safeName)) return safeName;
  return `${safeName || "stock"}.${extensionForMimeType(mimeType)}`;
}

function extensionForMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "video/mp4") return "mp4";
  if (normalized === "video/webm") return "webm";
  if (normalized === "audio/mpeg" || normalized === "audio/mp3") return "mp3";
  if (normalized === "audio/mp4") return "m4a";
  if (normalized === "audio/wav" || normalized === "audio/x-wav") return "wav";
  if (normalized === "audio/ogg") return "ogg";
  if (normalized === "audio/flac") return "flac";
  return "bin";
}
