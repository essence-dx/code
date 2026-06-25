import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs } from "@/db/schema";
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

    if (!job || job.kind !== "warp-marker") {
      return jsonError("Warp marker job not found.", 404);
    }

    const [generation] = await getDb()
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.jobId, id))
      .limit(1);
    const source = parseWarpMarkerJobInput(job.input);
    const result = parseWarpMarkerResult(generation?.content || job.output);

    return NextResponse.json({
      job: {
        analysisMode: source.analysisMode,
        error: job.error,
        id: job.id,
        kind: job.kind,
        model: job.model,
        provider: job.provider,
        region: source.region,
        sourceKind: source.sourceKind,
        sourceSongId: source.sourceSongId,
        sourceTitle: source.sourceTitle,
        status: job.status,
        targetGrid: source.targetGrid,
        createdAt:
          job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
        updatedAt:
          job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
      },
      result,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function parseWarpMarkerJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      analysisMode: "mixed",
      region: undefined,
      sourceKind: "track",
      sourceSongId: "",
      sourceTitle: "Untitled track",
      targetGrid: "auto",
    };
  }

  const value = input as {
    analysisMode?: unknown;
    region?: unknown;
    sourceKind?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
    targetGrid?: unknown;
  };

  return {
    analysisMode:
      typeof value.analysisMode === "string" ? value.analysisMode : "mixed",
    region: parseRegion(value.region),
    sourceKind: typeof value.sourceKind === "string" ? value.sourceKind : "track",
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
    targetGrid: typeof value.targetGrid === "string" ? value.targetGrid : "auto",
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

function parseWarpMarkerResult(input: unknown) {
  const value = typeof input === "string" ? parseJson(input) : input;

  if (!value || typeof value !== "object") {
    return { bpm: undefined, markers: [], timeSignature: undefined };
  }

  const result = value as {
    bpm?: unknown;
    markers?: unknown;
    timeSignature?: unknown;
  };

  return {
    bpm: typeof result.bpm === "number" ? result.bpm : undefined,
    markers: parseMarkers(result.markers),
    timeSignature:
      typeof result.timeSignature === "string" ? result.timeSignature : undefined,
  };
}

function parseMarkers(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const value = item as {
        confidence?: unknown;
        kind?: unknown;
        label?: unknown;
        startMs?: unknown;
      };

      if (typeof value.startMs !== "number" || !Number.isFinite(value.startMs)) {
        return null;
      }

      return {
        confidence:
          typeof value.confidence === "number" ? value.confidence : undefined,
        kind: typeof value.kind === "string" ? value.kind : "transient",
        label: typeof value.label === "string" ? value.label : "",
        startMs: Math.max(0, Math.round(value.startMs)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .toSorted((a, b) => a.startMs - b.startMs);
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}
