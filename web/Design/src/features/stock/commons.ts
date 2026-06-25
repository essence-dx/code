import { maxAssetBytes } from "@/features/assets/asset-constraints";
import { productUserAgent } from "@/lib/product";

const commonsApiUrl = "https://commons.wikimedia.org/w/api.php";
const commonsImageHosts = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

type CommonsImageInfo = {
  url?: string;
  thumburl?: string;
  mime?: string;
  size?: number;
  width?: number;
  height?: number;
  extmetadata?: Record<string, { value?: string }>;
};

type CommonsSearchPage = {
  title?: string;
  imageinfo?: CommonsImageInfo[];
};

type CommonsSearchResponse = {
  query?: {
    pages?: Record<string, CommonsSearchPage>;
  };
};

export type StockImageResult = {
  id: string;
  name: string;
  thumbnailUrl: string;
  sourceUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  authorName: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  provider: "Wikimedia Commons";
};

export async function searchCommonsImages(query: string) {
  const searchQuery = query.trim().slice(0, 80);

  if (!searchQuery) {
    return [];
  }

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: `${searchQuery} filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "480",
  });

  const response = await fetch(`${commonsApiUrl}?${params.toString()}`, {
    headers: {
      "User-Agent": `${productUserAgent} free stock search`,
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error("Could not search Wikimedia Commons");
  }

  const body = (await response.json()) as CommonsSearchResponse;
  const pages = Object.entries(body.query?.pages ?? {});

  return pages
    .map(([id, page]): StockImageResult | null => {
      const info = page.imageinfo?.[0];

      if (!info?.url || !info.mime?.startsWith("image/")) {
        return null;
      }

      return {
        id,
        name: cleanText(
          info.extmetadata?.ObjectName?.value ||
            page.title?.replace(/^File:/, "") ||
            "Wikimedia image",
        ),
        thumbnailUrl: info.thumburl || info.url,
        sourceUrl: info.url,
        mimeType: info.mime,
        sizeBytes: info.size ?? 0,
        width: info.width ?? null,
        height: info.height ?? null,
        authorName: cleanText(info.extmetadata?.Artist?.value || "") || null,
        licenseName:
          cleanText(info.extmetadata?.LicenseShortName?.value || "") || null,
        licenseUrl: cleanUrl(info.extmetadata?.LicenseUrl?.value || ""),
        provider: "Wikimedia Commons",
      };
    })
    .filter((result): result is StockImageResult => Boolean(result))
    .filter(
      (result) => result.sizeBytes > 0 && result.sizeBytes <= maxAssetBytes,
    );
}

export async function fetchCommonsImageAsAsset(input: StockImageResult) {
  const sourceUrl = new URL(input.sourceUrl);

  if (!commonsImageHosts.has(sourceUrl.hostname)) {
    throw new Error("Unsupported stock image host");
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": `${productUserAgent} stock import`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not import stock image");
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "";

  if (!mimeType.startsWith("image/")) {
    throw new Error("Stock result is not an image");
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.byteLength > maxAssetBytes) {
    throw new Error("Stock image is too large for the free asset store");
  }

  return {
    name: input.name,
    mimeType,
    dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    sizeBytes: bytes.byteLength,
    width: input.width,
    height: input.height,
    sourceProvider: input.provider,
    sourceUrl: input.sourceUrl,
    authorName: input.authorName,
    licenseName: input.licenseName,
    licenseUrl: input.licenseUrl,
  };
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function cleanUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}
