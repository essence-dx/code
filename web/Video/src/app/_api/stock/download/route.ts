import { corsPreflight, withCors } from "@/lib/http/cors";
import { getWikimediaStockAsset } from "@/lib/stock/wikimedia";

export const runtime = "nodejs";

const methods = ["GET", "OPTIONS"];
const maxStockDownloadBytes = 25 * 1024 * 1024;

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request) {
  try {
    const title = new URL(request.url).searchParams.get("title") ?? "";
    const asset = await getWikimediaStockAsset(title);
    if (!asset) {
      return stockJson(request, { ok: false, reason: "Stock media could not be found." }, 404);
    }

    if (asset.size > maxStockDownloadBytes) {
      return stockJson(request, { ok: false, reason: "Choose stock media under 25 MB for browser import." }, 413);
    }

    const upstream = await fetch(asset.sourceUrl, { headers: { "user-agent": "Essence Studio stock import" } });
    if (!upstream.ok || !upstream.body) {
      return stockJson(request, { ok: false, reason: "Stock media could not be downloaded." }, 502);
    }

    const upstreamSize = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(upstreamSize) && upstreamSize > maxStockDownloadBytes) {
      return stockJson(request, { ok: false, reason: "Choose stock media under 25 MB for browser import." }, 413);
    }

    return withCors(
      request,
      new Response(upstream.body, {
        headers: {
          "cache-control": "private, max-age=300",
          "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
          "content-type": asset.mimeType,
        },
      }),
      methods,
    );
  } catch (error) {
    console.error("Stock download API error", error);
    return stockJson(request, { ok: false, reason: "Stock media import could not finish." }, 500);
  }
}

function stockJson(request: Request, body: unknown, status: number) {
  return withCors(request, Response.json(body, { status }), methods);
}
