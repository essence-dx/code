import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ assetId: string; id: string }>;
};

type StemSource = {
  fileName: string;
  mediaType: string;
  value: string;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { assetId, id } = await context.params;
    const [job] = await getDb()
      .select({ id: aiJobs.id, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "stem") {
      return jsonError("Stem extraction job not found.", 404);
    }

    const [asset] = await getDb()
      .select()
      .from(generatedAssets)
      .where(
        and(
          eq(generatedAssets.id, assetId),
          eq(generatedAssets.jobId, id),
          eq(generatedAssets.type, "stem"),
        ),
      )
      .limit(1);

    if (!asset?.storageKey) {
      return jsonError("Stem asset not found.", 404);
    }

    const source = await resolveStemSource({
      fileName: asset.title,
      mediaType: asset.mediaType,
      storageKey: asset.storageKey,
    });

    if (!source) {
      return jsonError("Stem audio is not available.", 404);
    }

    if (source.value.startsWith("data:audio/")) {
      return dataUrlResponse(source);
    }

    if (!isSafeRemoteAudioUrl(source.value)) {
      return jsonError("Stem audio URL is not supported.", 422);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const providerResponse = await fetch(source.value, {
        signal: controller.signal,
      });

      if (!providerResponse.ok || !providerResponse.body) {
        return jsonError("Stem provider result could not be fetched.", 502);
      }

      return new Response(providerResponse.body, {
        headers: audioHeaders(
          providerResponse.headers.get("content-type") || source.mediaType,
          source.fileName,
        ),
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function resolveStemSource(input: {
  fileName: string;
  mediaType: string;
  storageKey: string;
}): Promise<StemSource | undefined> {
  if (input.storageKey.startsWith("generation:")) {
    const generationId = input.storageKey.replace(/^generation:/, "");
    const [generation] = await getDb()
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.id, generationId))
      .limit(1);

    if (!generation) {
      return undefined;
    }

    return {
      fileName: input.fileName,
      mediaType: generation.contentType,
      value: generation.content,
    };
  }

  return {
    fileName: input.fileName,
    mediaType: input.mediaType,
    value: input.storageKey,
  };
}

function dataUrlResponse(source: StemSource) {
  const match = source.value.match(/^data:(audio\/[^;,]+);base64,(.+)$/);

  if (!match) {
    return jsonError("Inline stem audio is malformed.", 422);
  }

  const mediaType = match[1] || source.mediaType;
  const body = Buffer.from(match[2] || "", "base64");

  return new Response(body, {
    headers: {
      ...audioHeaders(mediaType, source.fileName),
      "Content-Length": String(body.byteLength),
    },
  });
}

function audioHeaders(mediaType: string, fileName: string) {
  return {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename="${safeFileName(fileName)}"`,
    "Content-Type": mediaType || "audio/mpeg",
  };
}

function safeFileName(value: string) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "stem"}.audio`;
}

function isSafeRemoteAudioUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  return !(
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}
