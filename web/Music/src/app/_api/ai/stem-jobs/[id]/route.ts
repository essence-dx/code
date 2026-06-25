import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiJobs, generatedAssets } from "@/db/schema";
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

    if (!job || job.kind !== "stem") {
      return jsonError("Stem extraction job not found.", 404);
    }

    const assets = await getDb()
      .select()
      .from(generatedAssets)
      .where(eq(generatedAssets.jobId, id));
    const stems = assets
      .filter((asset) => asset.type === "stem")
      .map((asset) => {
        const metadata = parseStemMetadata(asset.textContent);

        return {
          id: asset.id,
          audioUrl: `/api/ai/stem-jobs/${id}/stems/${asset.id}`,
          mediaType: asset.mediaType,
          sourceTitle: metadata.sourceTitle,
          stemType: metadata.stemType,
          title: asset.title,
        };
      });
    const source = parseStemJobInput(job.input);

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
        createdAt:
          job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
        updatedAt:
          job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
      },
      stems,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function parseStemJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return { sourceSongId: "", sourceTitle: "Untitled track" };
  }

  const value = input as { sourceSongId?: unknown; sourceTitle?: unknown };
  return {
    sourceSongId: typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
}

function parseStemMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      sourceTitle?: unknown;
      stemType?: unknown;
    };

    return {
      sourceTitle:
        typeof parsed.sourceTitle === "string" ? parsed.sourceTitle : "Untitled track",
      stemType: typeof parsed.stemType === "string" ? parsed.stemType : "other",
    };
  } catch {
    return { sourceTitle: "Untitled track", stemType: "other" };
  }
}
