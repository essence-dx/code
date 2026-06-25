import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { audioToMidiJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MidiCallback = ReturnType<typeof audioToMidiJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.midiProviderWebhookSecret) {
      return jsonError("Audio-to-MIDI callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.midiProviderWebhookSecret &&
      headerSecret !== config.midiProviderWebhookSecret
    ) {
      return jsonError("Invalid audio-to-MIDI callback secret.", 401);
    }

    const { id } = await context.params;
    const input = audioToMidiJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "midi") {
      return jsonError("Audio-to-MIDI job not found.", 404);
    }

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        hasInlineMidi: Boolean(input.midiDataBase64),
        mediaType: input.mediaType,
        metadata: input.metadata,
        midiUrl: input.midiUrl,
        providerJobId: input.providerJobId,
        title: input.title,
      },
      error: input.error,
    });

    if (input.status === "succeeded") {
      await recordMidiResult(id, input, parseMidiJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordMidiResult(
  jobId: string,
  input: MidiCallback,
  jobInput: {
    region?: { endMs: number; startMs: number };
    sourceKind: string;
    sourceSongId: string;
    sourceTitle: string;
  },
) {
  const mediaType = input.mediaType || "audio/midi";
  const generationId = input.midiDataBase64 ? nanoid() : "";
  const storageKey = input.midiDataBase64
    ? `generation:${generationId}`
    : input.midiUrl;

  if (!storageKey) {
    return;
  }

  if (input.midiDataBase64) {
    await getDb().insert(aiGenerations).values({
      id: generationId,
      jobId,
      contentType: mediaType,
      content: `data:${mediaType};base64,${input.midiDataBase64}`,
    });
  }

  await getDb().insert(generatedAssets).values({
    id: nanoid(),
    jobId,
    type: "midi",
    storageKey,
    mediaType,
    title: input.title || `${jobInput.sourceTitle} MIDI`,
    textContent: JSON.stringify({
      assetKind: "audio-to-midi",
      metadata: input.metadata,
      region: jobInput.region,
      sourceKind: jobInput.sourceKind,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
    }),
  });
}

function parseMidiJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      region: undefined,
      sourceKind: "track",
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    region?: unknown;
    sourceKind?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    region: parseRegion(value.region),
    sourceKind:
      typeof value.sourceKind === "string" ? value.sourceKind : "track",
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
}

function parseRegion(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as { endMs?: unknown; startMs?: unknown };
  const startMs =
    typeof value.startMs === "number" && Number.isFinite(value.startMs)
      ? value.startMs
      : 0;
  const endMs =
    typeof value.endMs === "number" && Number.isFinite(value.endMs)
      ? value.endMs
      : 0;

  return { startMs, endMs };
}
