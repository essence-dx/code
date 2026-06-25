import type { JSONObject, SharedV3Warning, SpeechModelV3, SpeechModelV3CallOptions } from "@ai-sdk/provider";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { z } from "zod";
import { chunkSpeechText, concatenateWavAudio, maxSpeechRequestChars } from "@/lib/ai/speech-audio";
import { InvalidSpeechRequestError } from "@/lib/ai/speech-errors";
import { aiGenerationAssetMetadata, logAiGenerationRecord, summarizeAiGenerationOutput } from "@/lib/ai/generation-records";
import { assertAiSafety, reviewAiTextSafety } from "@/lib/ai/safety";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";

export { chunkSpeechText, concatenateWavAudio, maxSpeechRequestChars } from "@/lib/ai/speech-audio";
export { InvalidSpeechRequestError } from "@/lib/ai/speech-errors";

const groqSpeechEndpoint = "https://api.groq.com/openai/v1/audio/speech";
const defaultEnglishModel = "canopylabs/orpheus-v1-english";
const defaultArabicModel = "canopylabs/orpheus-arabic-saudi";
const defaultEnglishVoice = "hannah";
const defaultArabicVoice = "noura";

const aiSpeechRequestSchema = z.object({
  text: z.string().trim().min(1).max(maxSpeechRequestChars),
  projectId: z.string().trim().max(160).optional(),
  voice: z.string().trim().min(1).max(80).optional(),
  language: z.enum(["auto", "en", "ar"]).optional(),
  outputFormat: z.literal("wav").optional(),
});

export type AiSpeechRequest = z.infer<typeof aiSpeechRequestSchema>;

export function hasGroqSpeechConfig() {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function runAiSpeech(rawInput: unknown, context: { userId: string }) {
  if (!hasGroqSpeechConfig()) {
    return {
      ok: false as const,
      reason: "Voiceover generation needs a configured Groq speech provider.",
    };
  }

  const input = normalizeAiSpeechRequest(rawInput);
  const language = resolveSpeechLanguage(input);
  const modelId = process.env.GROQ_SPEECH_MODEL ?? (language === "ar" ? defaultArabicModel : defaultEnglishModel);
  const voice = input.voice ?? process.env.GROQ_SPEECH_VOICE ?? defaultVoiceForModel(modelId);
  const outputFormat = input.outputFormat ?? "wav";
  const modelLabel = `groq/${modelId}`;
  const safetyReview = reviewAiTextSafety({ action: "voiceover", text: input.text });
  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: "voiceover",
      provider: "safety",
      model: "preflight",
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText: input.text,
      promptChars: input.text.length,
      error: safetyReview.reason,
    });
  }
  assertAiSafety(safetyReview);

  await assertAiUsageAllowed(context.userId, "voiceover", modelLabel);

  try {
    const chunks = chunkSpeechText(input.text);
    const results = [];
    for (const chunk of chunks) {
      results.push(await generateGroqSpeechChunk({ modelId, text: chunk, voice, outputFormat, language }));
    }

    const audio = concatenateWavAudio(
      results.map((result) => ({
        base64: result.audio.base64,
        format: result.audio.format,
        mediaType: result.audio.mediaType,
      })),
    );
    const warnings = results.flatMap((result) => result.warnings.map(formatWarning));
    if (chunks.length > 1) {
      warnings.unshift(`Split long voiceover script into ${chunks.length} provider-safe speech chunks.`);
    }

    const output = {
      filename: `ai-voiceover-${Date.now()}.${audio.format}`,
      mediaType: audio.mediaType,
      base64: audio.base64,
      format: audio.format,
      text: input.text,
      voice,
      language,
      model: modelLabel,
      chunkCount: chunks.length,
      warnings,
    };

    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "voiceover",
      model: modelLabel,
      status: "complete",
      promptChars: input.text.length,
      outputChars: output.base64.length,
    });
    const asset = aiGenerationAssetMetadata("voiceover", output);
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "voiceover",
      provider: "groq",
      model: modelLabel,
      status: "complete",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText: input.text,
      promptChars: input.text.length,
      outputChars: output.base64.length,
      outputSummary: summarizeAiGenerationOutput("voiceover", output),
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
      action: "voiceover",
      model: modelLabel,
      status: "failed",
      promptChars: input.text.length,
      error: error instanceof Error ? error.message : "Voiceover generation failed.",
    });
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "voiceover",
      provider: "groq",
      model: modelLabel,
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText: input.text,
      promptChars: input.text.length,
      error: error instanceof Error ? error.message : "Voiceover generation failed.",
    });
    throw error;
  }
}

export function normalizeAiSpeechRequest(rawInput: unknown): AiSpeechRequest {
  try {
    return aiSpeechRequestSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new InvalidSpeechRequestError(`Voiceover text must be between 1 and ${maxSpeechRequestChars} characters.`);
    }
    throw error;
  }
}

async function generateGroqSpeechChunk({
  modelId,
  text,
  voice,
  outputFormat,
  language,
}: {
  modelId: string;
  text: string;
  voice: string;
  outputFormat: "wav";
  language: "en" | "ar";
}) {
  return generateSpeech({
    model: createGroqSpeechModel(modelId),
    text,
    voice,
    outputFormat,
    language,
    providerOptions: {
      groq: {
        endpoint: "audio.speech",
      },
    },
  });
}

export function createGroqSpeechModel(modelId: string): SpeechModelV3 {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for Groq speech generation.");
  }

  return {
    specificationVersion: "v3",
    provider: "groq",
    modelId,
    async doGenerate(options) {
      return generateGroqSpeech({ apiKey, modelId, options });
    },
  };
}

async function generateGroqSpeech({
  apiKey,
  modelId,
  options,
}: {
  apiKey: string;
  modelId: string;
  options: SpeechModelV3CallOptions;
}) {
  const responseFormat = normalizeGroqResponseFormat(options.outputFormat);
  const headers = requestHeaders(apiKey, options.headers);
  const body = {
    model: modelId,
    input: options.text,
    voice: options.voice ?? defaultVoiceForModel(modelId),
    response_format: responseFormat,
  };

  const response = await fetch(groqSpeechEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.abortSignal,
  });

  if (!response.ok) {
    throw new Error(await groqSpeechErrorMessage(response));
  }

  return {
    audio: new Uint8Array(await response.arrayBuffer()),
    warnings: speechWarnings(options, responseFormat),
    request: {
      body: redactSpeechRequest(body),
    },
    response: {
      timestamp: new Date(),
      modelId,
      headers: Object.fromEntries(response.headers.entries()),
    },
    providerMetadata: {
      groq: {
        endpoint: "audio.speech",
        responseFormat,
      } satisfies JSONObject,
    },
  };
}

function requestHeaders(apiKey: string, headers?: Record<string, string | undefined>) {
  const merged: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value) merged[key] = value;
  }

  return merged;
}

function normalizeGroqResponseFormat(value: string | undefined): "wav" {
  if (!value || value === "wav") return "wav";
  throw new InvalidSpeechRequestError("Groq Orpheus voiceover currently supports WAV output only.");
}

function speechWarnings(options: SpeechModelV3CallOptions, responseFormat: "wav"): SharedV3Warning[] {
  const warnings: SharedV3Warning[] = [];

  if (options.speed !== undefined) {
    warnings.push({
      type: "unsupported",
      feature: "speed",
      details: "Groq Orpheus speech does not expose speed control through the speech endpoint.",
    });
  }

  if (options.outputFormat && options.outputFormat !== responseFormat) {
    warnings.push({
      type: "unsupported",
      feature: "outputFormat",
      details: "Groq Orpheus currently returns WAV audio.",
    });
  }

  return warnings;
}

function redactSpeechRequest(body: { model: string; input: string; voice: string; response_format: string }) {
  return {
    model: body.model,
    inputChars: body.input.length,
    voice: body.voice,
    response_format: body.response_format,
  };
}

async function groqSpeechErrorMessage(response: Response) {
  const fallback = `Groq speech generation failed with status ${response.status}.`;

  try {
    const body = await response.json();
    const message = body?.error?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  } catch {
    return fallback;
  }
}

function resolveSpeechLanguage(input: AiSpeechRequest) {
  if (input.language === "ar" || input.language === "en") return input.language;
  return /[\u0600-\u06ff]/.test(input.text) ? "ar" : "en";
}

function defaultVoiceForModel(modelId: string) {
  return modelId.includes("arabic") ? defaultArabicVoice : defaultEnglishVoice;
}

function formatWarning(warning: { type: string; feature?: string; details?: string; message?: string }) {
  return warning.message ?? [warning.type, warning.feature, warning.details].filter(Boolean).join(": ");
}
