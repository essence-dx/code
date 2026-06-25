import { NextResponse } from "next/server";
import { experimental_transcribe as transcribe } from "ai";
import { getAiStatus, resolveTranscriptionModel } from "@/lib/ai/config";
import {
  disabledCapabilityResponse,
  providerName,
} from "@/lib/ai/route-helpers";
import { tryRecordAiJob, tryRecordGeneration } from "@/lib/ai/jobs";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const status = getAiStatus();

    if (!status.transcription) {
      return disabledCapabilityResponse(
        "transcription",
        "transcription",
        "Transcription needs OPENAI_API_KEY and AI_TRANSCRIPTION_MODEL.",
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return disabledCapabilityResponse(
        "transcription",
        "transcription",
        "Upload an audio file in the audio form field.",
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "transcription",
      status: "running",
      provider: providerName(),
      model: "transcription",
      request: { name: audio.name, size: audio.size, type: audio.type },
    });

    const result = await transcribe({
      model: resolveTranscriptionModel(),
      audio: new Uint8Array(await audio.arrayBuffer()),
    });

    if (jobId) {
      await tryRecordGeneration({
        jobId,
        contentType: "text/transcript",
        content: result.text,
      });
    }

    return NextResponse.json({
      text: result.text,
      segments: result.segments,
      language: result.language,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
