import { ZodError } from "zod";
import {
  InvalidVideoEnhancementRequestError,
  runAiVideoEnhancement,
  videoEnhancementServiceStatus,
} from "@/lib/ai/video-enhancement";
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
  return apiJson(request, videoEnhancementServiceStatus(), undefined, methods);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return apiJson(request, { ok: false, reason: "You must be signed in to use video enhancement." }, { status: 401 }, methods);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiJson(request, { ok: false, reason: "Upload a video file for enhancement." }, { status: 400 }, methods);
    }

    const result = await runAiVideoEnhancement(
      file,
      {
        projectId: stringField(formData, "projectId"),
        sourceAssetName: stringField(formData, "sourceAssetName") ?? file.name,
        mode: stringField(formData, "mode"),
        strength: stringField(formData, "strength"),
        guidance: stringField(formData, "guidance"),
      },
      { userId },
    );

    if (!result.ok) {
      return apiJson(request, result, { status: 503 }, methods);
    }

    return apiJson(request, result, undefined, methods);
  } catch (error) {
    if (error instanceof InvalidVideoEnhancementRequestError) {
      return apiJson(request, { ok: false, reason: error.message }, { status: 400 }, methods);
    }
    if (error instanceof ZodError) {
      return apiJson(request, { ok: false, reason: "Video enhancement response is invalid." }, { status: 502 }, methods);
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

    console.error("AI video enhancement API error", error);
    return apiJson(request, { ok: false, reason: "Video enhancement could not finish." }, { status: 500 }, methods);
  }
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
