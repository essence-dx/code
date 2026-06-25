import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MidiSource = {
  fileName: string;
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

    if (!job || job.kind !== "midi") {
      return jsonError("Audio-to-MIDI job not found.", 404);
    }

    const source = await findMidiSource(id, job.output);

    if (!source) {
      return jsonError("MIDI output is not available for this job.", 404);
    }

    if (source.value.startsWith("data:")) {
      return dataUrlResponse(source);
    }

    if (!isSafeRemoteUrl(source.value)) {
      return jsonError("MIDI URL is not supported.", 422);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const providerResponse = await fetch(source.value, {
        signal: controller.signal,
      });

      if (!providerResponse.ok || !providerResponse.body) {
        return jsonError("MIDI provider result could not be fetched.", 502);
      }

      return new Response(providerResponse.body, {
        headers: midiHeaders(
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

async function findMidiSource(
  jobId: string,
  output: unknown,
): Promise<MidiSource | undefined> {
  const [generation] = await getDb()
    .select()
    .from(aiGenerations)
    .where(eq(aiGenerations.jobId, jobId))
    .limit(1);

  if (generation?.contentType.includes("midi")) {
    return {
      fileName: "extracted-midi",
      mediaType: generation.contentType,
      value: generation.content,
    };
  }

  const parsedOutput = parseMidiOutput(output);

  if (parsedOutput.value) {
    return parsedOutput;
  }

  const [asset] = await getDb()
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.jobId, jobId))
    .limit(1);

  if (asset?.type === "midi" && asset.storageKey) {
    if (asset.storageKey.startsWith("generation:")) {
      const [assetGeneration] = await getDb()
        .select()
        .from(aiGenerations)
        .where(eq(aiGenerations.id, asset.storageKey.replace(/^generation:/, "")))
        .limit(1);

      if (assetGeneration) {
        return {
          fileName: asset.title,
          mediaType: assetGeneration.contentType,
          value: assetGeneration.content,
        };
      }
    }

    return {
      fileName: asset.title,
      mediaType: asset.mediaType,
      value: asset.storageKey,
    };
  }

  return undefined;
}

function dataUrlResponse(source: MidiSource) {
  const match = source.value.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    return jsonError("Inline MIDI data is malformed.", 422);
  }

  const mediaType = match[1] || source.mediaType;
  const body = Buffer.from(match[2] || "", "base64");

  return new Response(body, {
    headers: {
      ...midiHeaders(mediaType, source.fileName),
      "Content-Length": String(body.byteLength),
    },
  });
}

function midiHeaders(mediaType: string, fileName: string) {
  return {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${safeFileName(fileName)}"`,
    "Content-Type": mediaType || "audio/midi",
  };
}

function parseMidiOutput(output: unknown): MidiSource {
  if (!output || typeof output !== "object") {
    return { fileName: "", mediaType: "", value: "" };
  }

  const value = output as {
    assetUrl?: unknown;
    mediaType?: unknown;
    midi_url?: unknown;
    midiUrl?: unknown;
    mimeType?: unknown;
    title?: unknown;
    url?: unknown;
  };
  const midiUrl = [value.midiUrl, value.midi_url, value.assetUrl, value.url].find(
    (item) => typeof item === "string",
  );
  const mediaType = [value.mediaType, value.mimeType].find(
    (item) => typeof item === "string",
  );

  return {
    fileName: typeof value.title === "string" ? value.title : "extracted-midi",
    mediaType: typeof mediaType === "string" ? mediaType : "audio/midi",
    value: typeof midiUrl === "string" ? midiUrl : "",
  };
}

function safeFileName(value: string) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "extracted-midi"}.mid`;
}

function isSafeRemoteUrl(value: string) {
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
