import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  defaultCreativeControls,
  extendSongJobCallbackSchema,
  type CreativeControls,
} from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExtendCallback = ReturnType<typeof extendSongJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.audioProviderWebhookSecret) {
      return jsonError("Song extension callback secret is not configured.", 503);
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
      return jsonError("Invalid song extension callback secret.", 401);
    }

    const { id } = await context.params;
    const input = extendSongJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "extend") {
      return jsonError("Song extension job not found.", 404);
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
      await recordExtensionResult(id, input, parseExtendJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordExtensionResult(
  jobId: string,
  input: ExtendCallback,
  jobInput: {
    continuationPrompt: string;
    creativeControls: CreativeControls;
    extendFromMs: number;
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
    title: input.title || `${jobInput.sourceTitle} extension`,
    textContent: JSON.stringify({
      assetKind: "extend-song",
      continuationPrompt: jobInput.continuationPrompt,
      creativeControls: jobInput.creativeControls,
      extendFromMs: jobInput.extendFromMs,
      metadata: input.metadata,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
    }),
  });
}

function parseExtendJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      continuationPrompt: "",
      creativeControls: defaultCreativeControls,
      extendFromMs: 0,
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    continuationPrompt?: unknown;
    creativeControls?: unknown;
    extendFromMs?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    continuationPrompt:
      typeof value.continuationPrompt === "string"
        ? value.continuationPrompt
        : "",
    creativeControls: parseCreativeControls(value.creativeControls),
    extendFromMs:
      typeof value.extendFromMs === "number" && Number.isFinite(value.extendFromMs)
        ? value.extendFromMs
        : 0,
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
}

function parseCreativeControls(input: unknown): CreativeControls {
  if (!input || typeof input !== "object") {
    return defaultCreativeControls;
  }

  const value = input as Partial<CreativeControls>;
  return {
    referenceInfluence: parseControl(
      value.referenceInfluence,
      defaultCreativeControls.referenceInfluence,
    ),
    structure: parseControl(value.structure, defaultCreativeControls.structure),
    weirdness: parseControl(value.weirdness, defaultCreativeControls.weirdness),
  };
}

function parseControl(input: unknown, fallback: number) {
  return typeof input === "number" && Number.isFinite(input)
    ? Math.max(0, Math.min(100, Math.round(input)))
    : fallback;
}
