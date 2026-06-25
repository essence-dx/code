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

    if (!job || job.kind !== "remaster") {
      return jsonError("Remaster job not found.", 404);
    }

    const generations = await getDb()
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.jobId, id));
    const assets = await getDb()
      .select()
      .from(generatedAssets)
      .where(eq(generatedAssets.jobId, id));
    const source = parseRemasterJobInput(job.input);
    const audio = getAudioSummary(id, job.output, generations, assets);

    return NextResponse.json({
      job: {
        error: job.error,
        id: job.id,
        kind: job.kind,
        model: job.model,
        provider: job.provider,
        sourceSongId: source.sourceSongId,
        sourceTitle: source.sourceTitle,
        status: job.status,
        target: source.target,
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
    audioUrl: available ? `/api/ai/remaster-jobs/${jobId}/audio` : "",
    mediaType:
      generation?.contentType || asset?.mediaType || outputAudio.mediaType || "",
    title: asset?.title || outputAudio.title || "Remastered audio",
  };
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
