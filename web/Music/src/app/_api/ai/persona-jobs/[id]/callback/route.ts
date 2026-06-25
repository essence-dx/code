import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiJobs, generatedAssets } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { personaGenerationJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PersonaCallback = ReturnType<
  typeof personaGenerationJobCallbackSchema.parse
>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.personaProviderWebhookSecret) {
      return jsonError("Persona callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.personaProviderWebhookSecret &&
      headerSecret !== config.personaProviderWebhookSecret
    ) {
      return jsonError("Invalid persona callback secret.", 401);
    }

    const { id } = await context.params;
    const input = personaGenerationJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, input: aiJobs.input, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "persona") {
      return jsonError("Persona job not found.", 404);
    }

    if (input.status === "succeeded" && !input.persona) {
      return jsonError("Succeeded persona callbacks must include persona metadata.", 422);
    }

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        metadata: input.metadata,
        persona: input.persona,
        providerJobId: input.providerJobId,
      },
      error: input.error,
    });

    if (input.status === "succeeded" && input.persona) {
      await recordPersonaResult(id, input, parsePersonaJobInput(job.input));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function recordPersonaResult(
  jobId: string,
  input: PersonaCallback,
  jobInput: {
    analysisPrompt: string;
    sourceSongId: string;
    sourceTitle: string;
  },
) {
  if (!input.persona) {
    return;
  }

  const persona = {
    ...input.persona,
    rightsConfirmed: true,
    sourceSongId: jobInput.sourceSongId,
    sourceTitle: jobInput.sourceTitle,
  };

  await getDb().insert(generatedAssets).values({
    id: nanoid(),
    jobId,
    type: "metadata",
    mediaType: "application/json",
    title: persona.name || `${jobInput.sourceTitle} persona`,
    textContent: JSON.stringify({
      analysisPrompt: jobInput.analysisPrompt,
      assetKind: "persona-generation",
      metadata: input.metadata,
      persona,
      sourceSongId: jobInput.sourceSongId,
      sourceTitle: jobInput.sourceTitle,
    }),
  });
}

function parsePersonaJobInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      analysisPrompt: "",
      sourceSongId: "",
      sourceTitle: "Untitled track",
    };
  }

  const value = input as {
    analysisPrompt?: unknown;
    sourceSongId?: unknown;
    sourceTitle?: unknown;
  };

  return {
    analysisPrompt:
      typeof value.analysisPrompt === "string" ? value.analysisPrompt : "",
    sourceSongId:
      typeof value.sourceSongId === "string" ? value.sourceSongId : "",
    sourceTitle:
      typeof value.sourceTitle === "string" && value.sourceTitle.trim()
        ? value.sourceTitle
        : "Untitled track",
  };
}
