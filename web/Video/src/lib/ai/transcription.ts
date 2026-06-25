import { groq, type GroqTranscriptionModelOptions } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";
import type { CaptionChunk } from "@/features/editor/components/ai-result-types";
import { aiGenerationAssetMetadata, logAiGenerationRecord, summarizeAiGenerationOutput } from "@/lib/ai/generation-records";
import { hasGroqConfig } from "@/lib/ai/editor-ai";
import { assertAiSafety, reviewAiTextSafety } from "@/lib/ai/safety";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";

const maxAudioUploadBytes = 25 * 1024 * 1024;

export async function runAiTranscription(
  file: File,
  input: { projectId?: string; language?: string; prompt?: string },
  context: { userId: string },
) {
  if (!hasGroqConfig()) {
    return {
      ok: false as const,
      reason: "Automatic captions need a configured speech-to-text provider.",
    };
  }

  validateTranscriptionFile(file);

  const modelId = process.env.GROQ_TRANSCRIPTION_MODEL ?? "whisper-large-v3-turbo";
  const modelLabel = `groq/${modelId}`;
  const promptText = [file.name, input.prompt].filter(Boolean).join("\n");
  const safetyReview = reviewAiTextSafety({ action: "captions", text: promptText });
  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: "captions",
      provider: "safety",
      model: "preflight",
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: file.name.length + (input.prompt?.length ?? 0),
      error: safetyReview.reason,
    });
  }
  assertAiSafety(safetyReview);
  await assertAiUsageAllowed(context.userId, "captions", modelLabel);

  try {
    const audio = new Uint8Array(await file.arrayBuffer());
    const result = await transcribe({
      model: groq.transcription(modelId),
      audio,
      providerOptions: {
        groq: {
          responseFormat: "verbose_json",
          timestampGranularities: ["segment"],
          language: normalizeLanguage(input.language),
          prompt: normalizePrompt(input.prompt),
        } satisfies GroqTranscriptionModelOptions,
      },
    });
    const captions = captionsFromTranscriptionSegments(result.segments, result.text, result.durationInSeconds);

    const output = {
      captions,
      transcript: result.text,
      language: result.language,
      durationInSeconds: result.durationInSeconds,
    };

    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "captions",
      model: modelLabel,
      status: "complete",
      promptChars: file.name.length + (input.prompt?.length ?? 0),
      outputChars: result.text.length,
    });
    const asset = aiGenerationAssetMetadata("captions", output);
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "captions",
      provider: "groq",
      model: modelLabel,
      status: "complete",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: file.name.length + (input.prompt?.length ?? 0),
      outputChars: result.text.length,
      outputSummary: summarizeAiGenerationOutput("captions", output),
      outputAssetKind: asset.kind,
      outputAssetName: asset.name,
    });

    return {
      ok: true as const,
      provider: "groq" as const,
      model: modelLabel,
      output,
    };
  } catch (error) {
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "captions",
      model: modelLabel,
      status: "failed",
      promptChars: file.name.length + (input.prompt?.length ?? 0),
      error: error instanceof Error ? error.message : "Transcription failed.",
    });
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "captions",
      provider: "groq",
      model: modelLabel,
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: file.name.length + (input.prompt?.length ?? 0),
      error: error instanceof Error ? error.message : "Transcription failed.",
    });
    throw error;
  }
}

export function captionsFromTranscriptionSegments(
  segments: Array<{ text: string; startSecond: number; endSecond: number }> | undefined,
  transcript: string,
  durationInSeconds: number | undefined,
): CaptionChunk[] {
  const segmentCaptions = (segments ?? [])
    .map((segment) => ({
      start: finiteSecond(segment.startSecond, 0),
      end: finiteSecond(segment.endSecond, finiteSecond(segment.startSecond, 0) + 2),
      text: cleanCaptionText(segment.text),
      emphasis: "normal" as const,
    }))
    .filter((caption) => caption.text && caption.end > caption.start);

  if (segmentCaptions.length) return segmentCaptions;

  const text = cleanCaptionText(transcript);
  if (!text) return [];

  return [
    {
      start: 0,
      end: Math.max(2, finiteSecond(durationInSeconds, 4)),
      text,
      emphasis: "normal",
    },
  ];
}

function validateTranscriptionFile(file: File) {
  if (file.size <= 0) {
    throw new InvalidTranscriptionFileError("Choose a non-empty audio or video file.");
  }
  if (file.size > maxAudioUploadBytes) {
    throw new InvalidTranscriptionFileError("Automatic captions support media up to 25 MB for this browser upload path.");
  }
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    throw new InvalidTranscriptionFileError("Automatic captions need an audio or video file.");
  }
}

function cleanCaptionText(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 2000);
}

function finiteSecond(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeLanguage(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-z]{2,3}$/.test(normalized) ? normalized : undefined;
}

function normalizePrompt(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 400) : undefined;
}

export class InvalidTranscriptionFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTranscriptionFileError";
  }
}
