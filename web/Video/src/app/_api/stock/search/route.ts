import { apiJson, corsPreflight } from "@/lib/http/cors";
import { isStockMediaType } from "@/lib/stock/stock-assets";
import { searchWikimediaStockAssets } from "@/lib/stock/wikimedia";

export const runtime = "nodejs";

const methods = ["GET", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim();
    const mediaTypeParam = url.searchParams.get("type");
    const mediaType = isStockMediaType(mediaTypeParam) ? mediaTypeParam : "all";

    if (query.length < 2) {
      return apiJson(request, { ok: false, reason: "Search needs at least 2 characters." }, { status: 400 }, methods);
    }

    const results = await searchWikimediaStockAssets({ query, mediaType, limit: 12 });
    return apiJson(request, { ok: true, results }, undefined, methods);
  } catch (error) {
    console.error("Stock search API error", error);
    return apiJson(request, { ok: false, reason: "Stock media search could not finish." }, { status: 500 }, methods);
  }
}
