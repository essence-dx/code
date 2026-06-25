import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { stemVariationJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StemVariationCallback = ReturnType<
  typeof stemVariationJobCallbackSchema.parse
>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.stemVariationProviderWebhookSecret) {
      return jsonError("Stem variation callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.stemVariationProviderWebhookSecret &&
      headerSecret !== config.stemVariationProviderWebhookSecret
    ) {
      return jsonError("Invalid stem variation callback secret.", 401);
    }

    const { id } = await context.params;
    const input = stemVariationJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "stem-variation") {
      return jsonError("Stem variation job not found.", 404);
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
      await recordStemVariationResult(
        id,
        input,
        parseStemVariationJobInput(job.input),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordStemVariationResult(
  jobId: string,
  input: StemVariationCallback,
  jobInput: {
    directionPrompt: string;
    sourceSongTitle: string;
    sourceStemId: string;
    sourceStemTitle: string;
    stemType: string;
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
    type: "stem",
    storageKey,
    mediaType,
    title: input.title || `${jobInput.sourceStemTitle} variation`,
    textContent: JSON.stringify({
      assetKind: "stem-variation",
      directionPrompt: jobInput.directionPrompt,
      metadata: input.metadata,
      sourceSongTitle: jobInput.sourceSongTitle,
      sourceStemId: jobInput.sourceStemId,
      sourceStemTitle: jobInput.sourceStemTitle,
      stemType: jobInput.stemType,
    }),
  });
}

function parseStemVariationJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      directionPrompt: "",
      sourceSongTitle: "",
      sourceStemId: "",
      sourceStemTitle: "Untitled stem",
      stemType: "other",
    };
  }

  const value = input as {
    directionPrompt?: unknown;
    sourceSongTitle?: unknown;
    sourceStemId?: unknown;
    sourceStemTitle?: unknown;
    stemType?: unknown;
  };

  return {
    directionPrompt:
      typeof value.directionPrompt === "string" ? value.directionPrompt : "",
    sourceSongTitle:
      typeof value.sourceSongTitle === "string" ? value.sourceSongTitle : "",
    sourceStemId:
      typeof value.sourceStemId === "string" ? value.sourceStemId : "",
    sourceStemTitle:
      typeof value.sourceStemTitle === "string" && value.sourceStemTitle.trim()
        ? value.sourceStemTitle
        : "Untitled stem",
    stemType: typeof value.stemType === "string" ? value.stemType : "other",
  };
}
