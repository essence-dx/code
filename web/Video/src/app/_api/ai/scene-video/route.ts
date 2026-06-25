import { ZodError } from "zod";
import {
  InvalidSceneVideoGenerationRequestError,
  runAiSceneVideoGeneration,
  sceneVideoGenerationServiceStatus,
} from "@/lib/ai/scene-video-generation";
import { AiPromptSafetyError } from "@/lib/ai/safety";
import { AiRateLimitError } from "@/lib/ai/usage";
import { getServerSession } from "@/lib/auth/server";
import { apiJson, corsPreflight } from "@/lib/http/cors";

export const runtime = "nodejs";

const methods = ["GET", "POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export function GET(request: Request) {
  return apiJson(request, sceneVideoGenerationServiceStatus(), undefined, methods);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return apiJson(request, { ok: false, reason: "You must be signed in to generate scene videos." }, { status: 401 }, methods);
    }

    const result = await runAiSceneVideoGeneration(await request.json(), { userId });

    if (!result.ok) {
      return apiJson(request, result, { status: 503 }, methods);
    }

    return apiJson(request, result, undefined, methods);
  } catch (error) {
    if (error instanceof InvalidSceneVideoGenerationRequestError) {
      return apiJson(request, { ok: false, reason: error.message }, { status: 400 }, methods);
    }
    if (error instanceof ZodError) {
      return apiJson(request, { ok: false, reason: "Scene video service response is invalid." }, { status: 502 }, methods);
    }
    if (error instanceof AiPromptSafetyError) {
      return apiJson(request, { ok: false, reason: error.message, safetyStatus: error.review.status }, { status: 400 }, methods);
    }
    if (error instanceof AiRateLimitError) {
      return apiJson(
        request,
        {
          ok: false,
          reason: "AI usage limit reached. Try again later.",
          limits: error.limits,
          usage: error.usage,
        },
        { status: 429 },
        methods,
      );
    }

    console.error("AI scene video API error", error);
    return apiJson(request, { ok: false, reason: "Scene video generation could not finish." }, { status: 500 }, methods);
  }
}
