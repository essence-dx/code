import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import {
  audioJobCallbackSchema,
  defaultCreativeControls,
  type CreativeControls,
} from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { tryUpdateAiJob } from "@/lib/ai/jobs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.audioProviderWebhookSecret) {
      return jsonError("Audio provider callback secret is not configured.", 503);
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
      return jsonError("Invalid audio provider callback secret.", 401);
    }

    const { id } = await context.params;
    const input = audioJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "audio") {
      return jsonError("Audio job not found.", 404);
    }

    const output = {
      providerJobId: input.providerJobId,
      audioUrl: input.audioUrl,
      hasInlineAudio: Boolean(input.audioDataBase64),
      mediaType: input.mediaType,
      metadata: input.metadata,
    };

    await tryUpdateAiJob(id, {
      status: input.status,
      output,
      error: input.error,
    });

    if (input.status === "succeeded") {
      await recordAudioResult(id, input, parseAudioJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordAudioResult(
  jobId: string,
  input: ReturnType<typeof audioJobCallbackSchema.parse>,
  jobInput: {
    creativeControls: CreativeControls;
    prompt: string;
    style: string;
    title: string;
    variantCount: number;
    variantGroupId: string;
    variantIndex: number;
  },
) {
  const mediaType = input.mediaType || "audio/mpeg";
  const content = input.audioDataBase64
    ? `data:${mediaType};base64,${input.audioDataBase64}`
    : input.audioUrl;

  if (!content) {
    return;
  }

  await getDb().insert(aiGenerations).values({
    id: nanoid(),
    jobId,
    contentType: mediaType,
    content,
  });
  await getDb().insert(generatedAssets).values({
    id: nanoid(),
    jobId,
    type: "audio",
    storageKey: input.audioUrl ?? `inline:${jobId}`,
    mediaType,
    title: input.title || "Generated audio",
    textContent: JSON.stringify({
      assetKind: "audio-generation",
      creativeControls: jobInput.creativeControls,
      metadata: input.metadata,
      prompt: jobInput.prompt,
      style: jobInput.style,
      title: jobInput.title,
      variantCount: jobInput.variantCount,
      variantGroupId: jobInput.variantGroupId,
      variantIndex: jobInput.variantIndex,
    }),
  });
}

function parseAudioJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      creativeControls: defaultCreativeControls,
      prompt: "",
      style: "",
      title: "Generated audio",
      variantCount: 1,
      variantGroupId: "",
      variantIndex: 1,
    };
  }

  const value = input as {
    creativeControls?: unknown;
    prompt?: unknown;
    style?: unknown;
    title?: unknown;
    variantCount?: unknown;
    variantGroupId?: unknown;
    variantIndex?: unknown;
  };

  return {
    creativeControls: parseCreativeControls(value.creativeControls),
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    style: typeof value.style === "string" ? value.style : "",
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : "Generated audio",
    variantCount: parseVariantNumber(value.variantCount, 1),
    variantGroupId:
      typeof value.variantGroupId === "string" ? value.variantGroupId : "",
    variantIndex: parseVariantNumber(value.variantIndex, 1),
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

function parseVariantNumber(input: unknown, fallback: number) {
  return typeof input === "number" && Number.isFinite(input)
    ? Math.max(1, Math.min(4, Math.round(input)))
    : fallback;
}
