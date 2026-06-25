import { ZodError } from "zod";
import { recordAiAudioCleanup } from "@/lib/ai/audio-cleanup-record";
import { AiPromptSafetyError } from "@/lib/ai/safety";
import { AiRateLimitError } from "@/lib/ai/usage";
import { getServerSession } from "@/lib/auth/server";
import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "@/lib/http/request-json";

export const runtime = "nodejs";

const methods = ["POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return apiJson(request, { ok: false, reason: "You must be signed in to save AI cleanup history." }, { status: 401 }, methods);
    }

    const payload = await readJsonRequest(request);
    const result = await recordAiAudioCleanup(payload, { userId });
    return apiJson(request, result, undefined, methods);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiJson(request, { ok: false, reason: "Audio cleanup history is invalid." }, { status: 400 }, methods);
    }
    if (error instanceof InvalidJsonRequestError) {
      return apiJson(request, { ok: false, reason: "Request body must be valid JSON." }, { status: 400 }, methods);
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

    console.error("AI audio cleanup history API error", error);
    return apiJson(request, { ok: false, reason: "Audio cleanup history could not be saved." }, { status: 500 }, methods);
  }
}
