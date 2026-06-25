import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
import {
  defaultCreativeControls,
  type CreativeControls,
} from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [job] = await getDb()
      .select()
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "sample") {
      return jsonError("Sample job not found.", 404);
    }

    const generations = await getDb()
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.jobId, id));
    const assets = await getDb()
      .select()
      .from(generatedAssets)
      .where(eq(generatedAssets.jobId, id));
    const source = parseSampleJobInput(job.input);
    const audio = getAudioSummary(id, job.output, generations, assets);

    return NextResponse.json({
      job: {
        durationMs: source.durationMs,
        error: job.error,
        id: job.id,
        kind: job.kind,
        model: job.model,
        prompt: source.prompt,
        creativeControls: source.creativeControls,
        provider: job.provider,
        sourceContext: source.sourceContext,
        status: job.status,
        style: source.style,
        title: source.title,
        createdAt:
          job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
        updatedAt:
          job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
      },
      audio,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function getAudioSummary(
  jobId: string,
  output: unknown,
  generations: Array<typeof aiGenerations.$inferSelect>,
  assets: Array<typeof generatedAssets.$inferSelect>,
) {
  const generation = generations.find((item) =>
    item.contentType.startsWith("audio/"),
  );
  const asset = assets.find((item) => item.type === "audio");
  const outputAudio = parseAudioOutput(output);
  const available = Boolean(
    generation?.content || outputAudio.audioUrl || asset?.storageKey,
  );

  return {
    available,
    audioUrl: available ? `/api/ai/sample-jobs/${jobId}/audio` : "",
    mediaType:
      generation?.contentType || asset?.mediaType || outputAudio.mediaType || "",
    title: asset?.title || outputAudio.title || "Generated sample",
  };
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
    sourceContext: parseSourceContext(value.sourceContext),
    style: typeof value.style === "string" ? value.style : "",
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : "Generated sample",
  };
}

function parseSourceContext(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as {
    originalWork?: unknown;
    rightsConfirmed?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
    summary?: unknown;
    tags?: unknown;
  };

  return {
    originalWork: Boolean(value.originalWork),
    rightsConfirmed: Boolean(value.rightsConfirmed),
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle: typeof value.sourceTitle === "string" ? value.sourceTitle : "",
    summary: typeof value.summary === "string" ? value.summary : "",
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
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

function parseAudioOutput(output: unknown) {
  if (!output || typeof output !== "object") {
    return { audioUrl: "", mediaType: "", title: "" };
  }

  const value = output as {
    assetUrl?: unknown;
    audio_url?: unknown;
    audioUrl?: unknown;
    mediaType?: unknown;
    mimeType?: unknown;
    title?: unknown;
    url?: unknown;
  };
  const audioUrl = [value.audioUrl, value.audio_url, value.assetUrl, value.url].find(
    (item) => typeof item === "string",
  );
  const mediaType = [value.mediaType, value.mimeType].find(
    (item) => typeof item === "string",
  );

  return {
    audioUrl: typeof audioUrl === "string" ? audioUrl : "",
    mediaType: typeof mediaType === "string" ? mediaType : "",
    title: typeof value.title === "string" ? value.title : "",
  };
}
