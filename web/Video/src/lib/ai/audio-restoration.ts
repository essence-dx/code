import { z } from "zod";
import { aiGenerationAssetMetadata, logAiGenerationRecord, summarizeAiGenerationOutput } from "@/lib/ai/generation-records";
import { assertAiSafety, reviewAiTextSafety } from "@/lib/ai/safety";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";
import { audioCleanupIntensity, audioCleanupModes, normalizeAudioCleanupIntensity, normalizeAudioCleanupMode, type AudioCleanupMode } from "@/lib/audio/cleanup-contract";

const maxAudioRestorationBytes = 25 * 1024 * 1024;

const audioRestorationRequestSchema = z.object({
  projectId: z.string().trim().max(160).optional(),
  sourceAssetName: z.string().trim().min(1).max(180),
  mode: z.enum(audioCleanupModes).optional(),
  intensity: z.coerce.number().finite().min(audioCleanupIntensity.min).max(audioCleanupIntensity.max).optional(),
});

const audioRestorationJsonResponseSchema = z.object({
  filename: z.string().trim().min(1).max(180).optional(),
  mediaType: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(1).max(80).optional(),
  base64: z.string().trim().min(1).optional(),
  audioBase64: z.string().trim().min(1).optional(),
  summary: z.string().trim().max(600).optional(),
  warnings: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
});

export type AudioRestorationRequest = z.infer<typeof audioRestorationRequestSchema>;

export interface AudioRestorationOutput {
  filename: string;
  mediaType: string;
  base64: string;
  mode: AudioCleanupMode;
  intensity: number;
  sourceAssetName: string;
  model: string;
  summary: string;
  warnings: string[];
}

export function hasAudioRestorationServiceConfig() {
  return Boolean(process.env.AUDIO_RESTORATION_ENDPOINT?.trim());
}

export function audioRestorationServiceStatus() {
  const configured = hasAudioRestorationServiceConfig();

  return {
    ok: true as const,
    configured,
    label: configured ? "Connected service ready" : "Connected service not configured",
    modes: audioCleanupModes,
    maxSourceBytes: maxAudioRestorationBytes,
    requiredEnv: configured ? [] : ["AUDIO_RESTORATION_ENDPOINT"],
    optionalEnv: ["AUDIO_RESTORATION_API_KEY", "AUDIO_RESTORATION_MODEL"],
  };
}

export async function runAiAudioRestoration(file: File, rawInput: unknown, context: { userId: string }) {
  if (!hasAudioRestorationServiceConfig()) {
    return {
      ok: false as const,
      reason: "Advanced audio restoration needs a connected restoration service.",
    };
  }

  const input = normalizeAudioRestorationRequest(rawInput);
  validateAudioRestorationFile(file);

  const mode = normalizeAudioCleanupMode(input.mode);
  const intensity = normalizeAudioCleanupIntensity(input.intensity);
  const model = process.env.AUDIO_RESTORATION_MODEL?.trim() || "owner/audio-restoration";
  const modelLabel = model.includes("/") ? model : `owner/${model}`;
  const promptText = `Restore audio (${mode}): ${input.sourceAssetName}`;
  const safetyReview = reviewAiTextSafety({ action: "audio-cleanup", text: promptText });

  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: "audio-cleanup",
      provider: "safety",
      model: "preflight",
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: promptText.length,
      error: safetyReview.reason,
    });
  }
  assertAiSafety(safetyReview);
  await assertAiUsageAllowed(context.userId, "audio-cleanup", modelLabel);

  try {
    const output = await callAudioRestorationService(file, {
      projectId: input.projectId,
      sourceAssetName: input.sourceAssetName,
      mode,
      intensity,
      model: modelLabel,
    });
    const outputChars = output.base64.length;
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "audio-cleanup",
      model: modelLabel,
      status: "complete",
      promptChars: promptText.length,
      outputChars,
    });
    const asset = aiGenerationAssetMetadata("audio-cleanup", output);
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "audio-cleanup",
      provider: "external",
      model: modelLabel,
      status: "complete",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: promptText.length,
      outputChars,
      outputSummary: summarizeAiGenerationOutput("audio-cleanup", output),
      outputAssetKind: asset.kind,
      outputAssetName: asset.name,
    });

    return {
      ok: true as const,
      provider: "external" as const,
      model: modelLabel,
      output,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio restoration failed.";
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "audio-cleanup",
      model: modelLabel,
      status: "failed",
      promptChars: promptText.length,
      error: message,
    });
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "audio-cleanup",
      provider: "external",
      model: modelLabel,
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: promptText.length,
      error: message,
    });
    throw error;
  }
}

export function normalizeAudioRestorationRequest(rawInput: unknown): AudioRestorationRequest {
  try {
    return audioRestorationRequestSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new InvalidAudioRestorationRequestError("Audio restoration request is invalid.");
    }
    throw error;
  }
}

async function callAudioRestorationService(
  file: File,
  input: { projectId?: string; sourceAssetName: string; mode: AudioCleanupMode; intensity: number; model: string },
): Promise<AudioRestorationOutput> {
  const endpoint = process.env.AUDIO_RESTORATION_ENDPOINT?.trim();
  if (!endpoint) throw new Error("AUDIO_RESTORATION_ENDPOINT is required for advanced audio restoration.");

  const formData = new FormData();
  formData.set("file", file, file.name || input.sourceAssetName);
  formData.set("sourceAssetName", input.sourceAssetName);
  formData.set("mode", input.mode);
  formData.set("intensity", String(input.intensity));
  formData.set("outputFormat", "wav");
  if (input.projectId) formData.set("projectId", input.projectId);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: audioRestorationHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await audioRestorationErrorMessage(response));
  }

  return parseAudioRestorationResponse(response, input);
}

function validateAudioRestorationFile(file: File) {
  if (file.size <= 0) {
    throw new InvalidAudioRestorationRequestError("Choose a non-empty audio file for restoration.");
  }
  if (file.size > maxAudioRestorationBytes) {
    throw new InvalidAudioRestorationRequestError("Audio restoration currently supports files up to 25 MB.");
  }
  if (file.type && !file.type.startsWith("audio/") && file.type !== "application/octet-stream") {
    throw new InvalidAudioRestorationRequestError("Choose an audio file for restoration.");
  }
}

async function parseAudioRestorationResponse(
  response: Response,
  input: { sourceAssetName: string; mode: AudioCleanupMode; intensity: number; model: string },
): Promise<AudioRestorationOutput> {
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "audio/wav";
  if (mediaType === "application/json") {
    const body = audioRestorationJsonResponseSchema.parse(await response.json());
    const base64 = body.base64 ?? body.audioBase64;
    if (!base64) throw new Error("Audio restoration service returned JSON without audio data.");
    validateAudioBase64(base64);

    return {
      filename: safeAudioFilename(body.filename, input.sourceAssetName, input.mode, body.mediaType ?? body.mimeType),
      mediaType: normalizeAudioMediaType(body.mediaType ?? body.mimeType),
      base64,
      mode: input.mode,
      intensity: input.intensity,
      sourceAssetName: input.sourceAssetName,
      model: input.model,
      summary: body.summary || defaultAudioRestorationSummary(input.mode),
      warnings: body.warnings ?? [],
    };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 0) throw new Error("Audio restoration service returned an empty audio file.");
  if (bytes.length > maxAudioRestorationBytes) throw new Error("Audio restoration service returned an audio file over 25 MB.");

  return {
    filename: safeAudioFilename(undefined, input.sourceAssetName, input.mode, mediaType),
    mediaType: normalizeAudioMediaType(mediaType),
    base64: bytes.toString("base64"),
    mode: input.mode,
    intensity: input.intensity,
    sourceAssetName: input.sourceAssetName,
    model: input.model,
    summary: defaultAudioRestorationSummary(input.mode),
    warnings: [],
  };
}

function audioRestorationHeaders() {
  const apiKey = process.env.AUDIO_RESTORATION_API_KEY?.trim();
  return apiKey ? { authorization: `Bearer ${apiKey}` } : undefined;
}

function normalizeAudioMediaType(value: string | undefined) {
  const mediaType = value?.trim().toLowerCase();
  return mediaType?.startsWith("audio/") ? mediaType : "audio/wav";
}

function safeAudioFilename(value: string | undefined, sourceAssetName: string, mode: AudioCleanupMode, mediaType: string | undefined) {
  const extension = extensionForAudioMediaType(mediaType);
  const base =
    value
      ?.trim()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) ||
    sourceAssetName
      .trim()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 76) ||
    "restored-audio";

  return `${base}-${mode}-restored.${extension}`;
}

function validateAudioBase64(value: string) {
  const sanitized = value.trim();
  if (!/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw new Error("Audio restoration service returned invalid audio data.");
  }
  if (Math.floor((sanitized.length * 3) / 4) > maxAudioRestorationBytes) {
    throw new Error("Audio restoration service returned an audio file over 25 MB.");
  }
}

function extensionForAudioMediaType(value: string | undefined) {
  const mediaType = normalizeAudioMediaType(value);
  if (mediaType.includes("mpeg")) return "mp3";
  if (mediaType.includes("mp4")) return "m4a";
  if (mediaType.includes("ogg")) return "ogg";
  if (mediaType.includes("webm")) return "webm";
  return "wav";
}

function defaultAudioRestorationSummary(mode: AudioCleanupMode) {
  if (mode === "voice-isolation") return "Advanced restoration returned a voice-isolated audio file from the connected service.";
  if (mode === "room-echo") return "Advanced restoration returned a de-echoed audio file from the connected service.";
  if (mode === "speech-enhancement") return "Advanced restoration returned speech-enhanced audio from the connected service.";
  return "Advanced restoration returned a cleaned audio file from the connected service.";
}

async function audioRestorationErrorMessage(response: Response) {
  const fallback = `Audio restoration service failed with status ${response.status}.`;
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      const message = body?.reason ?? body?.error?.message ?? body?.message;
      return typeof message === "string" && message.trim() ? message : fallback;
    }
    const text = await response.text();
    return text.trim().slice(0, 400) || fallback;
  } catch {
    return fallback;
  }
}

export class InvalidAudioRestorationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAudioRestorationRequestError";
  }
}
