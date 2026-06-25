import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  defaultCreativeControls,
  replaceSectionJobCallbackSchema,
  type CreativeControls,
} from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReplaceSectionCallback = ReturnType<
  typeof replaceSectionJobCallbackSchema.parse
>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.audioProviderWebhookSecret) {
      return jsonError("Section replacement callback secret is not configured.", 503);
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
      return jsonError("Invalid section replacement callback secret.", 401);
    }

    const { id } = await context.params;
    const input = replaceSectionJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "replace-section") {
      return jsonError("Section replacement job not found.", 404);
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
      await recordReplaceSectionResult(
        id,
        input,
        parseReplaceSectionJobInput(job.input),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordReplaceSectionResult(
  jobId: string,
  input: ReplaceSectionCallback,
  jobInput: {
    creativeControls: CreativeControls;
    directionPrompt: string;
    mode: string;
    region: { endMs: number; startMs: number };
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
    title: input.title || `${jobInput.sourceTitle} section edit`,
    textContent: JSON.stringify({
      assetKind: "replace-section",
      creativeControls: jobInput.creativeControls,
      directionPrompt: jobInput.directionPrompt,
      metadata: input.metadata,
      mode: jobInput.mode,
      region: jobInput.region,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
    }),
  });
}

function parseReplaceSectionJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      directionPrompt: "",
      creativeControls: defaultCreativeControls,
      mode: "replace",
      region: { startMs: 0, endMs: 0 },
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    directionPrompt?: unknown;
    creativeControls?: unknown;
    mode?: unknown;
    region?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };
  const region = parseRegion(value.region);

  return {
    creativeControls: parseCreativeControls(value.creativeControls),
    directionPrompt:
      typeof value.directionPrompt === "string" ? value.directionPrompt : "",
    mode:
      value.mode === "add" || value.mode === "replace" ? value.mode : "replace",
    region,
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

function parseRegion(input: unknown) {
  if (!input || typeof input !== "object") {
    return { startMs: 0, endMs: 0 };
  }

  const value = input as { endMs?: unknown; startMs?: unknown };

  return {
    startMs:
      typeof value.startMs === "number" && Number.isFinite(value.startMs)
        ? value.startMs
        : 0,
    endMs:
      typeof value.endMs === "number" && Number.isFinite(value.endMs)
        ? value.endMs
        : 0,
  };
}
