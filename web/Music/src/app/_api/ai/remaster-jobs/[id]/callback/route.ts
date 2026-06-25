import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { remasterJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RemasterCallback = ReturnType<typeof remasterJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.remasterProviderWebhookSecret) {
      return jsonError("Remaster callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.remasterProviderWebhookSecret &&
      headerSecret !== config.remasterProviderWebhookSecret
    ) {
      return jsonError("Invalid remaster callback secret.", 401);
    }

    const { id } = await context.params;
    const input = remasterJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "remaster") {
      return jsonError("Remaster job not found.", 404);
    }

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        providerJobId: input.providerJobId,
        audioUrl: input.audioUrl,
        hasInlineAudio: Boolean(input.audioDataBase64),
        mediaType: input.mediaType,
        metadata: input.metadata,
        title: input.title,
      },
      error: input.error,
    });

    if (input.status === "succeeded") {
      await recordRemasterResult(id, input, parseRemasterJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordRemasterResult(
  jobId: string,
  input: RemasterCallback,
  jobInput: {
    sourceSongId: string;
    sourceTitle: string;
    target: string;
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
    title: input.title || `${jobInput.sourceTitle} remaster`,
    textContent: JSON.stringify({
      assetKind: "remaster",
      metadata: input.metadata,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
      target: jobInput.target,
    }),
  });
}

function parseRemasterJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      sourceSongId: "",
      sourceTitle: "Untitled track",
      target: "balanced-master",
    };
  }

  const value = input as {
    sourceSongId?: unknown;
    sourceTitle?: unknown;
    target?: unknown;
  };

  return {
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
    target: typeof value.target === "string" ? value.target : "balanced-master",
  };
}
