import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs, generatedAssets } from "@/db/schema";
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

    if (!job || job.kind !== "replace-section") {
      return jsonError("Section replacement job not found.", 404);
    }

    const generations = await getDb()
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.jobId, id));
    const assets = await getDb()
      .select()
      .from(generatedAssets)
      .where(eq(generatedAssets.jobId, id));
    const source = parseReplaceSectionJobInput(job.input);
    const audio = getAudioSummary(id, job.output, generations, assets);

    return NextResponse.json({
      job: {
        directionPrompt: source.directionPrompt,
        error: job.error,
        id: job.id,
        kind: job.kind,
        mode: source.mode,
        model: job.model,
        provider: job.provider,
        region: source.region,
        sourceSongId: source.sourceSongId,
        sourceTitle: source.sourceTitle,
        status: job.status,
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
    audioUrl: available ? `/api/ai/replace-section-jobs/${jobId}/audio` : "",
    mediaType:
      generation?.contentType || asset?.mediaType || outputAudio.mediaType || "",
    title: asset?.title || outputAudio.title || "Section edit audio",
  };
}

function parseReplaceSectionJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      directionPrompt: "",
      mode: "replace",
      region: { startMs: 0, endMs: 0 },
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    directionPrompt?: unknown;
    mode?: unknown;
    region?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    directionPrompt:
      typeof value.directionPrompt === "string" ? value.directionPrompt : "",
    mode:
      value.mode === "add" || value.mode === "replace" ? value.mode : "replace",
    region: parseRegion(value.region),
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
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

function parseAudioOutput(output: unknown) {
  if (!output || typeof output !== "object") {
    return { audioUrl: "", mediaType: "", title: "" };
  }

  const value = output as {
    assetUrl?: unknown;
    audio_url?: unknown;
    audioUrl?: unknown;
    mimeType?: unknown;
    mediaType?: unknown;
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
