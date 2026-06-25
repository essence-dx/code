import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { removeFxJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RemoveFxCallback = ReturnType<typeof removeFxJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.removeFxProviderWebhookSecret) {
      return jsonError("Remove FX callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.removeFxProviderWebhookSecret &&
      headerSecret !== config.removeFxProviderWebhookSecret
    ) {
      return jsonError("Invalid remove FX callback secret.", 401);
    }

    const { id } = await context.params;
    const input = removeFxJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "remove-fx") {
      return jsonError("Remove FX job not found.", 404);
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
      await recordRemoveFxResult(id, input, parseRemoveFxJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordRemoveFxResult(
  jobId: string,
  input: RemoveFxCallback,
  jobInput: {
    cleanupTargets: string[];
    intensity: string;
    region?: { endMs: number; startMs: number };
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
    title: input.title || `${jobInput.sourceTitle} cleaned`,
    textContent: JSON.stringify({
      assetKind: "remove-fx",
      cleanupTargets: jobInput.cleanupTargets,
      intensity: jobInput.intensity,
      metadata: input.metadata,
      region: jobInput.region,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
    }),
  });
}

function parseRemoveFxJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      cleanupTargets: ["mixed-fx"],
      intensity: "balanced",
      region: undefined,
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    cleanupTargets?: unknown;
    intensity?: unknown;
    region?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    cleanupTargets: Array.isArray(value.cleanupTargets)
      ? value.cleanupTargets.filter((item): item is string => typeof item === "string")
      : ["mixed-fx"],
    intensity:
      typeof value.intensity === "string" ? value.intensity : "balanced",
    region: parseRegion(value.region),
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
