import { ZodError } from "zod";
import { runEditorAi } from "@/lib/ai/editor-ai";
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
      return apiJson(request, { ok: false, reason: "You must be signed in to use AI editing." }, { status: 401 }, methods);
    }

    const payload = await readJsonRequest(request);
    const result = await runEditorAi(payload, { userId });

    if (!result.ok) {
      return apiJson(request, result, { status: 503 }, methods);
    }

    return apiJson(request, result, undefined, methods);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiJson(request, { ok: false, reason: "AI request is invalid." }, { status: 400 }, methods);
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

    console.error("Editor AI API error", error);
    return apiJson(
      request,
      { ok: false, reason: "Creative AI failed to finish the request. Try again with a shorter prompt." },
      { status: 500 },
      methods,
    );
  }
}
