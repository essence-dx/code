import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiJobs, generatedAssets } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ModelCardSummary = {
  available: boolean;
  constraints: string;
  description: string;
  modelIntent: string;
  name: string;
  providerModelId: string;
  recommendedUse: string;
  rightsConfirmed: boolean;
  sourceCount: number;
  sourceTitles: string[];
  styleSummary: string;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [job] = await getDb()
      .select()
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "model-training") {
      return jsonError("Custom model training job not found.", 404);
    }

    const assets = await getDb()
      .select()
      .from(generatedAssets)
      .where(eq(generatedAssets.jobId, id));
    const source = parseTrainingJobInput(job.input);
    const modelCard = getModelCardSummary(job.output, assets, source);

    return NextResponse.json({
      job: {
        error: job.error,
        id: job.id,
        kind: job.kind,
        model: job.model,
        modelName: source.modelName,
        provider: job.provider,
        sourceCount: source.sourceCount,
        sourceTitles: source.sourceTitles,
        status: job.status,
        createdAt:
          job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
        updatedAt:
          job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
      },
      modelCard,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function getModelCardSummary(
  output: unknown,
  assets: Array<typeof generatedAssets.$inferSelect>,
  source: {
    modelIntent: string;
    modelName: string;
    sourceCount: number;
    sourceTitles: string[];
  },
): ModelCardSummary {
  const assetCard = parseAssetModelCard(
    assets.find((item) => item.type === "metadata")?.textContent,
  );
  const outputCard = parseOutputModelCard(output);
  const card = assetCard || outputCard;

  return {
    available: Boolean(card),
    constraints: card?.constraints ?? "",
    description: card?.description ?? "",
    modelIntent: card?.modelIntent ?? source.modelIntent,
    name: card?.name ?? source.modelName,
    providerModelId: card?.providerModelId ?? "",
    recommendedUse: card?.recommendedUse ?? "",
    rightsConfirmed: Boolean(card),
    sourceCount: card?.sourceCount ?? source.sourceCount,
    sourceTitles: card?.sourceTitles ?? source.sourceTitles,
    styleSummary: card?.styleSummary ?? "",
  };
}

function parseTrainingJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      modelIntent: "",
      modelName: "Untitled model",
      sourceCount: 0,
      sourceTitles: [],
    };
  }

  const value = input as {
    modelIntent?: unknown;
    modelName?: unknown;
    sourceCount?: unknown;
    sourceTitles?: unknown;
  };

  return {
    modelIntent:
      typeof value.modelIntent === "string" ? value.modelIntent : "",
    modelName:
      typeof value.modelName === "string" && value.modelName.trim()
        ? value.modelName
        : "Untitled model",
    sourceCount:
      typeof value.sourceCount === "number" && Number.isFinite(value.sourceCount)
        ? value.sourceCount
        : 0,
    sourceTitles: Array.isArray(value.sourceTitles)
      ? value.sourceTitles.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function parseAssetModelCard(textContent: string | null | undefined) {
  if (!textContent) {
    return undefined;
  }

  try {
    const value = JSON.parse(textContent) as {
      assetKind?: unknown;
      modelCard?: unknown;
      sourceCount?: unknown;
      sourceTitles?: unknown;
    };

    if (value.assetKind !== "custom-model-training") {
      return undefined;
    }

    return normalizeModelCard(value.modelCard, {
      sourceCount:
        typeof value.sourceCount === "number" ? value.sourceCount : 0,
      sourceTitles: Array.isArray(value.sourceTitles)
        ? value.sourceTitles.filter((item): item is string => typeof item === "string")
        : [],
    });
  } catch {
    return undefined;
  }
}

function parseOutputModelCard(output: unknown) {
  if (!output || typeof output !== "object") {
    return undefined;
  }

  const value = output as { modelCard?: unknown };
  return normalizeModelCard(value.modelCard, {});
}

function normalizeModelCard(
  input: unknown,
  source: { sourceCount?: number; sourceTitles?: string[] },
) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as Partial<ModelCardSummary>;

  if (typeof value.name !== "string" || !value.name.trim()) {
    return undefined;
  }

  return {
    constraints: typeof value.constraints === "string" ? value.constraints : "",
    description: typeof value.description === "string" ? value.description : "",
    modelIntent: typeof value.modelIntent === "string" ? value.modelIntent : "",
    name: value.name,
    providerModelId:
      typeof value.providerModelId === "string" ? value.providerModelId : "",
    recommendedUse:
      typeof value.recommendedUse === "string" ? value.recommendedUse : "",
    sourceCount:
      typeof value.sourceCount === "number" ? value.sourceCount : source.sourceCount || 0,
    sourceTitles: Array.isArray(value.sourceTitles)
      ? value.sourceTitles.filter((item): item is string => typeof item === "string")
      : source.sourceTitles || [],
    styleSummary:
      typeof value.styleSummary === "string" ? value.styleSummary : "",
  };
}
