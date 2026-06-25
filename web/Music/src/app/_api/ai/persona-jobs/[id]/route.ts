import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiJobs, generatedAssets } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PersonaSummary = {
  available: boolean;
  energy: string;
  name: string;
  rightsConfirmed: boolean;
  sourceSongId: string;
  sourceTitle: string;
  stylePrompt: string;
  vibe: string;
  vocalCharacter: string;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [job] = await getDb()
      .select()
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "persona") {
      return jsonError("Persona job not found.", 404);
    }

    const assets = await getDb()
      .select()
      .from(generatedAssets)
      .where(eq(generatedAssets.jobId, id));
    const source = parsePersonaJobInput(job.input);
    const persona = getPersonaSummary(job.output, assets, source);

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
      persona,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function getPersonaSummary(
  output: unknown,
  assets: Array<typeof generatedAssets.$inferSelect>,
  source: { sourceSongId: string; sourceTitle: string },
): PersonaSummary {
  const assetPersona = parseAssetPersona(
    assets.find((item) => item.type === "metadata")?.textContent,
  );
  const outputPersona = parseOutputPersona(output);
  const persona = assetPersona || outputPersona;

  return {
    available: Boolean(persona),
    energy: persona?.energy ?? "",
    name: persona?.name ?? "",
    rightsConfirmed: Boolean(persona),
    sourceSongId: persona?.sourceSongId ?? source.sourceSongId,
    sourceTitle: persona?.sourceTitle ?? source.sourceTitle,
    stylePrompt: persona?.stylePrompt ?? "",
    vibe: persona?.vibe ?? "",
    vocalCharacter: persona?.vocalCharacter ?? "",
  };
}

function parsePersonaJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
}

function parseAssetPersona(textContent: string | null | undefined) {
  if (!textContent) {
    return undefined;
  }

  try {
    const value = JSON.parse(textContent) as {
      assetKind?: unknown;
      persona?: unknown;
      sourceSongId?: unknown;
      sourceTitle?: unknown;
    };

    if (value.assetKind !== "persona-generation") {
      return undefined;
    }

    return normalizePersona(value.persona, {
      sourceSongId:
        typeof value.sourceSongId === "string" ? value.sourceSongId : "",
      sourceTitle:
        typeof value.sourceTitle === "string" ? value.sourceTitle : "",
    });
  } catch {
    return undefined;
  }
}

function parseOutputPersona(output: unknown) {
  if (!output || typeof output !== "object") {
    return undefined;
  }

  const value = output as { persona?: unknown };
  return normalizePersona(value.persona, {});
}

function normalizePersona(
  input: unknown,
  source: { sourceSongId?: string; sourceTitle?: string },
) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as {
    energy?: unknown;
    name?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
    stylePrompt?: unknown;
    vibe?: unknown;
    vocalCharacter?: unknown;
  };

  if (typeof value.name !== "string" || !value.name.trim()) {
    return undefined;
  }

  return {
    energy: typeof value.energy === "string" ? value.energy : "",
    name: value.name,
    sourceSongId:
      typeof value.sourceSongId === "string"
        ? value.sourceSongId
        : source.sourceSongId || "",
    sourceTitle:
      typeof value.sourceTitle === "string"
        ? value.sourceTitle
        : source.sourceTitle || "",
    stylePrompt:
      typeof value.stylePrompt === "string" ? value.stylePrompt : "",
    vibe: typeof value.vibe === "string" ? value.vibe : "",
    vocalCharacter:
      typeof value.vocalCharacter === "string" ? value.vocalCharacter : "",
  };
}
