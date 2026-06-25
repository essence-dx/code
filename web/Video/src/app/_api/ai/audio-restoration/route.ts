import { ZodError } from "zod";
import {
  audioRestorationServiceStatus,
  InvalidAudioRestorationRequestError,
  runAiAudioRestoration,
} from "@/lib/ai/audio-restoration";
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
  return apiJson(request, audioRestorationServiceStatus(), undefined, methods);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return apiJson(request, { ok: false, reason: "You must be signed in to use advanced audio restoration." }, { status: 401 }, methods);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiJson(request, { ok: false, reason: "Upload an audio file for advanced restoration." }, { status: 400 }, methods);
    }

    const result = await runAiAudioRestoration(
      file,
      {
        projectId: stringField(formData, "projectId"),
        sourceAssetName: stringField(formData, "sourceAssetName") ?? file.name,
        mode: stringField(formData, "mode"),
        intensity: stringField(formData, "intensity"),
      },
      { userId },
    );

    if (!result.ok) {
      return apiJson(request, result, { status: 503 }, methods);
    }

    return apiJson(request, result, undefined, methods);
  } catch (error) {
    if (error instanceof InvalidAudioRestorationRequestError) {
      return apiJson(request, { ok: false, reason: error.message }, { status: 400 }, methods);
    }
    if (error instanceof ZodError) {
      return apiJson(request, { ok: false, reason: "Audio restoration response is invalid." }, { status: 502 }, methods);
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

    console.error("AI audio restoration API error", error);
    return apiJson(request, { ok: false, reason: "Advanced audio restoration could not finish." }, { status: 500 }, methods);
  }
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
