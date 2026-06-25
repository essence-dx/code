import { ZodError } from "zod";
import { AiPromptSafetyError } from "@/lib/ai/safety";
import { runAiTranscription, InvalidTranscriptionFileError } from "@/lib/ai/transcription";
import { AiRateLimitError } from "@/lib/ai/usage";
import { getServerSession } from "@/lib/auth/server";
import { apiJson, corsPreflight } from "@/lib/http/cors";

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
      return apiJson(request, { ok: false, reason: "You must be signed in to generate captions." }, { status: 401 }, methods);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiJson(request, { ok: false, reason: "Upload an audio or video file to generate captions." }, { status: 400 }, methods);
    }

    const result = await runAiTranscription(
      file,
      {
        projectId: stringField(formData, "projectId"),
        language: stringField(formData, "language"),
        prompt: stringField(formData, "prompt"),
      },
      { userId },
    );

    if (!result.ok) {
      return apiJson(request, result, { status: 503 }, methods);
    }

    return apiJson(request, result, undefined, methods);
  } catch (error) {
    if (error instanceof InvalidTranscriptionFileError) {
      return apiJson(request, { ok: false, reason: error.message }, { status: 400 }, methods);
    }
    if (error instanceof ZodError) {
      return apiJson(request, { ok: false, reason: "Caption generation request is invalid." }, { status: 400 }, methods);
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

    console.error("AI transcription API error", error);
    return apiJson(request, { ok: false, reason: "Automatic captions could not finish. Try a shorter media file." }, { status: 500 }, methods);
  }
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
