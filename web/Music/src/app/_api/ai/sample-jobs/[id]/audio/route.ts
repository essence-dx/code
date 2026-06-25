import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AudioSource = {
  mediaType: string;
  value: string;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [job] = await getDb()
      .select()
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "sample") {
      return jsonError("Sample job not found.", 404);
    }

    const source = await findAudioSource(id, job.output);

    if (!source) {
      return jsonError("Sample audio is not available for this job.", 404);
    }

    if (source.value.startsWith("data:audio/")) {
      return dataUrlResponse(source);
    }

    if (!isSafeRemoteAudioUrl(source.value)) {
      return jsonError("Sample audio URL is not supported.", 422);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const providerResponse = await fetch(source.value, {
        signal: controller.signal,
      });

      if (!providerResponse.ok || !providerResponse.body) {
        return jsonError("Sample provider result could not be fetched.", 502);
      }

      return new Response(providerResponse.body, {
        headers: audioHeaders(
          providerResponse.headers.get("content-type") || source.mediaType,
        ),
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function findAudioSource(
  jobId: string,
  output: unknown,
): Promise<AudioSource | undefined> {
  const [generation] = await getDb()
    .select()
    .from(aiGenerations)
    .where(eq(aiGenerations.jobId, jobId))
    .limit(1);

  if (generation?.contentType.startsWith("audio/")) {
    return {
      mediaType: generation.contentType,
      value: generation.content,
    };
  }

  const parsedOutput = parseAudioOutput(output);

  if (parsedOutput.value) {
    return parsedOutput;
  }

  const [asset] = await getDb()
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.jobId, jobId))
    .limit(1);

  if (asset?.type === "audio" && asset.storageKey) {
    if (asset.storageKey.startsWith("generation:")) {
      const [assetGeneration] = await getDb()
        .select()
        .from(aiGenerations)
        .where(eq(aiGenerations.id, asset.storageKey.replace(/^generation:/, "")))
        .limit(1);

      if (assetGeneration) {
        return {
          mediaType: assetGeneration.contentType,
          value: assetGeneration.content,
        };
      }
    }

    return {
      mediaType: asset.mediaType,
      value: asset.storageKey,
    };
  }

  return undefined;
}

function dataUrlResponse(source: AudioSource) {
  const match = source.value.match(/^data:(audio\/[^;,]+);base64,(.+)$/);

  if (!match) {
    return jsonError("Inline sample audio is malformed.", 422);
  }

  const mediaType = match[1] || source.mediaType;
  const body = Buffer.from(match[2] || "", "base64");

  return new Response(body, {
    headers: {
      ...audioHeaders(mediaType),
      "Content-Length": String(body.byteLength),
    },
  });
}

function audioHeaders(mediaType: string) {
  return {
    "Cache-Control": "private, no-store",
    "Content-Disposition": 'inline; filename="essence-sample"',
    "Content-Type": mediaType || "audio/mpeg",
  };
}

function parseAudioOutput(output: unknown): AudioSource {
  if (!output || typeof output !== "object") {
    return { mediaType: "", value: "" };
  }

  const value = output as {
    assetUrl?: unknown;
    audio_url?: unknown;
    audioUrl?: unknown;
    mimeType?: unknown;
    mediaType?: unknown;
    url?: unknown;
  };
  const audioUrl = [value.audioUrl, value.audio_url, value.assetUrl, value.url].find(
    (item) => typeof item === "string",
  );
  const mediaType = [value.mediaType, value.mimeType].find(
    (item) => typeof item === "string",
  );

  return {
    mediaType: typeof mediaType === "string" ? mediaType : "audio/mpeg",
    value: typeof audioUrl === "string" ? audioUrl : "",
  };
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
