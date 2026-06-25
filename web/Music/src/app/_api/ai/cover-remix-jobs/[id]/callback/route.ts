import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  coverRemixJobCallbackSchema,
  defaultCreativeControls,
  type CreativeControls,
} from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CoverRemixCallback = ReturnType<typeof coverRemixJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.audioProviderWebhookSecret) {
      return jsonError("Cover/remix callback secret is not configured.", 503);
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
      return jsonError("Invalid cover/remix callback secret.", 401);
    }

    const { id } = await context.params;
    const input = coverRemixJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "cover-remix") {
      return jsonError("Cover/remix job not found.", 404);
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
      await recordCoverRemixResult(id, input, parseCoverRemixJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordCoverRemixResult(
  jobId: string,
  input: CoverRemixCallback,
  jobInput: {
    creativeControls: CreativeControls;
    mode: string;
    sourceSongId: string;
    sourceTitle: string;
    targetStyle: string;
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
    title: input.title || `${jobInput.sourceTitle} ${jobInput.mode}`,
    textContent: JSON.stringify({
      assetKind: "cover-remix",
      creativeControls: jobInput.creativeControls,
      metadata: input.metadata,
      mode: jobInput.mode,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
      targetStyle: jobInput.targetStyle,
    }),
  });
}

function parseCoverRemixJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      mode: "remix",
      creativeControls: defaultCreativeControls,
      sourceSongId: "",
      sourceTitle: "Untitled track",
      targetStyle: "",
    };
  }

  const value = input as {
    mode?: unknown;
    creativeControls?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
    targetStyle?: unknown;
  };

  return {
    mode: typeof value.mode === "string" ? value.mode : "remix",
    creativeControls: parseCreativeControls(value.creativeControls),
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
    targetStyle: typeof value.targetStyle === "string" ? value.targetStyle : "",
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
