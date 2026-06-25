import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { generatedInstrumentalJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type InstrumentalCallback = ReturnType<
  typeof generatedInstrumentalJobCallbackSchema.parse
>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.audioProviderWebhookSecret) {
      return jsonError("Instrumental callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.audioProviderWebhookSecret &&
      headerSecret !== config.audioProviderWebhookSecret
    ) {
      return jsonError("Invalid instrumental callback secret.", 401);
    }

    const { id } = await context.params;
    const input = generatedInstrumentalJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "instrumental") {
      return jsonError("Instrumental job not found.", 404);
    }

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        audioUrl: input.audioUrl,
        hasInlineAudio: Boolean(input.audioDataBase64),
        mediaType: input.mediaType,
        metadata: input.metadata,
        providerJobId: input.providerJobId,
        title: input.title,
      },
      error: input.error,
    });

    if (input.status === "succeeded") {
      await recordInstrumentalResult(
        id,
        input,
        parseInstrumentalJobInput(job.input),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordInstrumentalResult(
  jobId: string,
  input: InstrumentalCallback,
  jobInput: {
    directionPrompt: string;
    lyrics: string;
    region?: { endMs: number; startMs: number };
    sourceKind: string;
    sourceSongId: string;
    sourceTitle: string;
  },
) {
  const mediaType = input.mediaType || "audio/mpeg";
  const generationId = input.audioDataBase64 ? nanoid() : "";
  const storageKey = input.audioDataBase64
    ? `generation:${generationId}`
    : input.audioUrl;

  if (!storageKey) {
    return;
  }

  if (input.audioDataBase64) {
    await getDb().insert(aiGenerations).values({
      id: generationId,
      jobId,
      contentType: mediaType,
      content: `data:${mediaType};base64,${input.audioDataBase64}`,
    });
  }

  await getDb().insert(generatedAssets).values({
    id: nanoid(),
    jobId,
    type: "audio",
    storageKey,
    mediaType,
    title: input.title || `${jobInput.sourceTitle} instrumental`,
    textContent: JSON.stringify({
      assetKind: "generated-instrumental",
      directionPrompt: jobInput.directionPrompt,
      lyrics: jobInput.lyrics,
      metadata: input.metadata,
      region: jobInput.region,
      sourceKind: jobInput.sourceKind,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
    }),
  });
}

function parseInstrumentalJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      directionPrompt: "",
      lyrics: "",
      region: undefined,
      sourceKind: "track",
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    directionPrompt?: unknown;
    lyrics?: unknown;
    region?: unknown;
    sourceKind?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    directionPrompt:
      typeof value.directionPrompt === "string" ? value.directionPrompt : "",
    lyrics: typeof value.lyrics === "string" ? value.lyrics : "",
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
