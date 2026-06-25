import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { stemJobCallbackSchema, type StemType } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StemCallback = ReturnType<typeof stemJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.stemProviderWebhookSecret) {
      return jsonError("Stem extraction callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.stemProviderWebhookSecret &&
      headerSecret !== config.stemProviderWebhookSecret
    ) {
      return jsonError("Invalid stem extraction callback secret.", 401);
    }

    const { id } = await context.params;
    const input = stemJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "stem") {
      return jsonError("Stem extraction job not found.", 404);
    }

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        providerJobId: input.providerJobId,
        metadata: input.metadata,
        stems: input.stems.map((stem) => ({
          stemType: stem.stemType,
          hasInlineAudio: Boolean(stem.audioDataBase64),
          hasRemoteAudio: Boolean(stem.audioUrl),
          mediaType: stem.mediaType,
          title: stem.title,
        })),
      },
      error: input.error,
    });

    if (input.status === "succeeded") {
      await recordStemResults(id, input, parseStemJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordStemResults(
  jobId: string,
  input: StemCallback,
  jobInput: { sourceTitle: string },
) {
  for (const stem of input.stems) {
    const mediaType = stem.mediaType || "audio/mpeg";
    const generationId = stem.audioDataBase64 ? nanoid() : "";
    const title = stem.title || `${jobInput.sourceTitle} ${stemLabel(stem.stemType)}`;
    const storageKey = stem.audioDataBase64
      ? `generation:${generationId}`
      : stem.audioUrl;

    if (!storageKey) {
      continue;
    }

    if (stem.audioDataBase64) {
      await getDb().insert(aiGenerations).values({
        id: generationId,
        jobId,
        contentType: mediaType,
        content: `data:${mediaType};base64,${stem.audioDataBase64}`,
      });
    }

    await getDb().insert(generatedAssets).values({
      id: nanoid(),
      jobId,
      type: "stem",
      storageKey,
      mediaType,
      title,
      textContent: JSON.stringify({
        stemType: stem.stemType,
        metadata: stem.metadata,
        sourceTitle: jobInput.sourceTitle,
      }),
    });
  }
}

function parseStemJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return { sourceTitle: "Untitled track" };
  }

  const value = input as { sourceTitle?: unknown };
  return {
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
}

function stemLabel(stemType: StemType) {
  return stemType === "other"
    ? "stem"
    : stemType.charAt(0).toUpperCase() + stemType.slice(1);
}
