import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { modelTrainingJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ModelTrainingCallback = ReturnType<
  typeof modelTrainingJobCallbackSchema.parse
>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.modelTrainingProviderWebhookSecret) {
      return jsonError("Training callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.modelTrainingProviderWebhookSecret &&
      headerSecret !== config.modelTrainingProviderWebhookSecret
    ) {
      return jsonError("Invalid training callback secret.", 401);
    }

    const { id } = await context.params;
    const input = modelTrainingJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "model-training") {
      return jsonError("Custom model training job not found.", 404);
    }

    if (input.status === "succeeded" && !input.modelCard) {
      return jsonError("Succeeded training callbacks must include a model card.", 422);
    }

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        metadata: input.metadata,
        modelCard: input.modelCard,
        providerJobId: input.providerJobId,
      },
      error: input.error,
    });

    if (input.status === "succeeded" && input.modelCard) {
      await recordModelCardResult(id, input, parseTrainingJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordModelCardResult(
  jobId: string,
  input: ModelTrainingCallback,
  jobInput: {
    modelIntent: string;
    modelName: string;
    sourceCount: number;
    sourceTitles: string[];
  },
) {
  if (!input.modelCard) {
    return;
  }

  const modelCard = {
    constraints: input.modelCard.constraints,
    description: input.modelCard.description,
    modelIntent: input.modelCard.modelIntent || jobInput.modelIntent,
    name: input.modelCard.name || jobInput.modelName,
    providerModelId: input.modelCard.providerModelId,
    recommendedUse: input.modelCard.recommendedUse,
    rightsConfirmed: true,
    sourceCount: jobInput.sourceCount,
    sourceTitles: jobInput.sourceTitles,
    styleSummary: input.modelCard.styleSummary,
  };

  await getDb().insert(generatedAssets).values({
    id: nanoid(),
    jobId,
    type: "metadata",
    mediaType: "application/json",
    title: modelCard.name || jobInput.modelName,
    textContent: JSON.stringify({
      assetKind: "custom-model-training",
      metadata: input.metadata,
      modelCard,
      sourceCount: jobInput.sourceCount,
      sourceTitles: jobInput.sourceTitles,
    }),
  });
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
