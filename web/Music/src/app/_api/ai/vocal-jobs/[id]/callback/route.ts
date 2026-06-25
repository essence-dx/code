import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { generatedVocalsJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VocalCallback = ReturnType<typeof generatedVocalsJobCallbackSchema.parse>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.voiceProviderWebhookSecret) {
      return jsonError("Generated-vocals callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.voiceProviderWebhookSecret &&
      headerSecret !== config.voiceProviderWebhookSecret
    ) {
      return jsonError("Invalid generated-vocals callback secret.", 401);
    }

    const { id } = await context.params;
    const input = generatedVocalsJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "vocals") {
      return jsonError("Generated-vocals job not found.", 404);
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
      await recordVocalResult(id, input, parseVocalJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordVocalResult(
  jobId: string,
  input: VocalCallback,
  jobInput: {
    lyrics: string;
    region?: { endMs: number; startMs: number };
    sourceSongId: string;
    sourceTitle: string;
    voiceProfile: { id: string; name: string; summary: string };
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
    title: input.title || `${jobInput.sourceTitle} vocals`,
    textContent: JSON.stringify({
      assetKind: "generated-vocals",
      lyrics: jobInput.lyrics,
      metadata: input.metadata,
      region: jobInput.region,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
      voiceProfile: jobInput.voiceProfile,
    }),
  });
}

function parseVocalJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      lyrics: "",
      region: undefined,
      sourceSongId: "",
      sourceTitle: "Untitled track",
      voiceProfile: { id: "", name: "Voice profile", summary: "" },
    };
  }

  const value = input as {
    lyrics?: unknown;
    region?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
    voiceProfile?: unknown;
  };

  return {
    lyrics: typeof value.lyrics === "string" ? value.lyrics : "",
    region: parseRegion(value.region),
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
    voiceProfile: parseVoiceProfile(value.voiceProfile),
  };
}

function parseVoiceProfile(input: unknown) {
  if (!input || typeof input !== "object") {
    return { id: "", name: "Voice profile", summary: "" };
  }

  const value = input as { id?: unknown; name?: unknown; summary?: unknown };

  return {
    id: typeof value.id === "string" ? value.id : "",
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name
        : "Voice profile",
    summary: typeof value.summary === "string" ? value.summary : "",
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
