import {
  isSupportedStockMimeType,
  stockAssetKindFromMime,
  stockFileNameFromTitle,
  type StockAsset,
  type StockMediaType,
} from "@/lib/stock/stock-assets";

const wikimediaApiUrl = "https://commons.wikimedia.org/w/api.php";
const providerLabel = "Wikimedia Commons";
const maxSearchLimit = 24;

export async function searchWikimediaStockAssets(input: { query: string; mediaType: StockMediaType; limit?: number }) {
  const query = cleanSearchQuery(input.query);
  if (!query) return [];

  const url = wikimediaQueryUrl({
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(maxSearchLimit, Math.max(1, input.limit ?? 12))),
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "480",
  });

  const response = await fetch(url, { headers: { "user-agent": "Essence Studio stock search" } });
  if (!response.ok) {
    throw new Error("Stock search provider did not respond.");
  }

  const payload = await response.json();
  return imageInfoPages(payload)
    .map(pageToStockAsset)
    .filter((asset): asset is StockAsset => Boolean(asset))
    .filter((asset) => input.mediaType === "all" || asset.kind === input.mediaType);
}

export async function getWikimediaStockAsset(title: string) {
  const normalizedTitle = cleanFileTitle(title);
  if (!normalizedTitle) return null;

  const url = wikimediaQueryUrl({
    titles: normalizedTitle,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "480",
  });
  const response = await fetch(url, { headers: { "user-agent": "Essence Studio stock download" } });
  if (!response.ok) {
    throw new Error("Stock media provider did not respond.");
  }

  const payload = await response.json();
  return imageInfoPages(payload).map(pageToStockAsset).find(Boolean) ?? null;
}

function wikimediaQueryUrl(params: Record<string, string>) {
  const url = new URL(wikimediaApiUrl);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function pageToStockAsset(page: WikimediaPage): StockAsset | null {
  const info = page.imageinfo?.[0];
  const mimeType = cleanText(info?.mime).toLowerCase();
  const kind = stockAssetKindFromMime(mimeType);
  const sourceUrl = cleanText(info?.url);
  const pageUrl = cleanText(info?.descriptionurl);
  const size = Number(info?.size);

  if (!kind || !sourceUrl || !pageUrl || !Number.isFinite(size) || size <= 0 || !isSupportedStockMimeType(mimeType)) {
    return null;
  }
  if (!isSafeWikimediaUploadUrl(sourceUrl)) {
    return null;
  }

  const title = cleanFileTitle(page.title) ?? page.title;
  const metadata = info?.extmetadata;

  return {
    id: `wikimedia:${title}`,
    provider: "wikimedia-commons",
    providerLabel,
    title,
    name: stockFileNameFromTitle(title, mimeType),
    kind,
    mimeType,
    size,
    thumbnailUrl: cleanText(info?.thumburl) || undefined,
    sourceUrl,
    pageUrl,
    licenseLabel: cleanText(metadata?.LicenseShortName?.value) || undefined,
    licenseUrl: cleanText(metadata?.LicenseUrl?.value) || undefined,
    attribution: cleanText(metadata?.Artist?.value) || cleanText(metadata?.Credit?.value) || undefined,
  };
}

function imageInfoPages(payload: unknown): WikimediaPage[] {
  if (!isRecord(payload) || !isRecord(payload.query) || !Array.isArray(payload.query.pages)) return [];
  return payload.query.pages.filter(isWikimediaPage);
}

function isWikimediaPage(value: unknown): value is WikimediaPage {
  return isRecord(value) && typeof value.title === "string" && Array.isArray(value.imageinfo);
}

function cleanSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function cleanFileTitle(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 240);
  if (!normalized || !normalized.startsWith("File:")) return null;
  return normalized;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeWikimediaUploadUrl(value: string) {
  try {
    return new URL(value).hostname === "upload.wikimedia.org";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

interface WikimediaPage {
  title: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    size?: number;
    extmetadata?: Record<string, { value?: string }>;
  }>;
}
