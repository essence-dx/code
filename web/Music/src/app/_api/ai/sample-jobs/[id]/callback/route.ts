import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  defaultCreativeControls,
  sampleJobCallbackSchema,
  type CreativeControls,
} from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SampleCallback = ReturnType<typeof sampleJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.sampleProviderWebhookSecret) {
      return jsonError("Sample callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.sampleProviderWebhookSecret &&
      headerSecret !== config.sampleProviderWebhookSecret
    ) {
      return jsonError("Invalid sample callback secret.", 401);
    }

    const { id } = await context.params;
    const input = sampleJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "sample") {
      return jsonError("Sample job not found.", 404);
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
      await recordSampleResult(id, input, parseSampleJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordSampleResult(
  jobId: string,
  input: SampleCallback,
  jobInput: {
    creativeControls: CreativeControls;
    durationMs: number;
    prompt: string;
    sourceContext?: unknown;
    style: string;
    title: string;
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
    title: input.title || jobInput.title,
    textContent: JSON.stringify({
      assetKind: "sample",
      creativeControls: jobInput.creativeControls,
      durationMs: jobInput.durationMs,
      metadata: input.metadata,
      prompt: jobInput.prompt,
      sourceContext: jobInput.sourceContext,
      style: jobInput.style,
    }),
  });
}

function parseSampleJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      durationMs: 8000,
      creativeControls: defaultCreativeControls,
      prompt: "",
      sourceContext: undefined,
      style: "",
      title: "Generated sample",
    };
  }

  const value = input as {
    durationMs?: unknown;
    creativeControls?: unknown;
    prompt?: unknown;
    sourceContext?: unknown;
    style?: unknown;
    title?: unknown;
  };

  return {
    durationMs:
      typeof value.durationMs === "number" && Number.isFinite(value.durationMs)
        ? value.durationMs
        : 8000,
    creativeControls: parseCreativeControls(value.creativeControls),
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    sourceContext: value.sourceContext,
    style: typeof value.style === "string" ? value.style : "",
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : "Generated sample",
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
