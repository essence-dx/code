import { z } from "zod";
import { aiGenerationAssetMetadata, logAiGenerationRecord, summarizeAiGenerationOutput } from "@/lib/ai/generation-records";
import { assertAiSafety, reviewAiTextSafety } from "@/lib/ai/safety";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";
import {
  normalizeVideoEnhancementStrength,
  videoEnhancementModes,
  videoEnhancementStrength,
  type VideoEnhancementMode,
} from "@/lib/ai/video-enhancement-contract";

const maxVideoEnhancementBytes = 80 * 1024 * 1024;

const videoEnhancementRequestSchema = z.object({
  projectId: z.string().trim().max(160).optional(),
  sourceAssetName: z.string().trim().min(1).max(180),
  mode: z.enum(videoEnhancementModes),
  strength: z.coerce.number().finite().min(videoEnhancementStrength.min).max(videoEnhancementStrength.max).optional(),
  guidance: z.string().trim().max(1000).optional(),
});

const videoEnhancementJsonResponseSchema = z.object({
  filename: z.string().trim().min(1).max(180).optional(),
  mediaType: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(1).max(80).optional(),
  base64: z.string().trim().min(1).optional(),
  videoBase64: z.string().trim().min(1).optional(),
  summary: z.string().trim().max(600).optional(),
  warnings: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
});

export type VideoEnhancementRequest = z.infer<typeof videoEnhancementRequestSchema>;

export interface VideoEnhancementOutput {
  filename: string;
  mediaType: string;
  base64: string;
  mode: VideoEnhancementMode;
  strength: number;
  sourceAssetName: string;
  model: string;
  summary: string;
  warnings: string[];
}

export function hasVideoEnhancementServiceConfig() {
  return Boolean(process.env.VIDEO_ENHANCEMENT_ENDPOINT?.trim());
}

export function videoEnhancementServiceStatus() {
  const configured = hasVideoEnhancementServiceConfig();

  return {
    ok: true as const,
    configured,
    label: configured ? "Connected video service ready" : "Connected video service not configured",
    modes: videoEnhancementModes,
    maxSourceBytes: maxVideoEnhancementBytes,
    requiredEnv: configured ? [] : ["VIDEO_ENHANCEMENT_ENDPOINT"],
    optionalEnv: ["VIDEO_ENHANCEMENT_API_KEY", "VIDEO_ENHANCEMENT_MODEL"],
  };
}

export async function runAiVideoEnhancement(file: File, rawInput: unknown, context: { userId: string }) {
  if (!hasVideoEnhancementServiceConfig()) {
    return {
      ok: false as const,
      reason: "Video enhancement needs a connected video enhancement service.",
    };
  }

  const input = normalizeVideoEnhancementRequest(rawInput);
  validateVideoEnhancementFile(file);

  const strength = normalizeVideoEnhancementStrength(input.strength);
  const model = process.env.VIDEO_ENHANCEMENT_MODEL?.trim() || "owner/video-enhancement";
  const modelLabel = model.includes("/") ? model : `owner/${model}`;
  const guidance = input.guidance?.trim();
  const promptText = [`Enhance video (${input.mode}): ${input.sourceAssetName}`, guidance].filter(Boolean).join("\n");
  const safetyReview = reviewAiTextSafety({ action: "video-enhancement", text: promptText });

  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: "video-enhancement",
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
  await assertAiUsageAllowed(context.userId, "video-enhancement", modelLabel);

  try {
    const output = await callVideoEnhancementService(file, {
      projectId: input.projectId,
      sourceAssetName: input.sourceAssetName,
      mode: input.mode,
      strength,
      model: modelLabel,
      guidance,
    });
    const outputChars = output.base64.length;
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "video-enhancement",
      model: modelLabel,
      status: "complete",
      promptChars: promptText.length,
      outputChars,
    });
    const asset = aiGenerationAssetMetadata("video-enhancement", output);
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "video-enhancement",
      provider: "external",
      model: modelLabel,
      status: "complete",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: promptText.length,
      outputChars,
      outputSummary: summarizeAiGenerationOutput("video-enhancement", output),
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
    const message = error instanceof Error ? error.message : "Video enhancement failed.";
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "video-enhancement",
      model: modelLabel,
      status: "failed",
      promptChars: promptText.length,
      error: message,
    });
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "video-enhancement",
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

export function normalizeVideoEnhancementRequest(rawInput: unknown): VideoEnhancementRequest {
  try {
    return videoEnhancementRequestSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new InvalidVideoEnhancementRequestError("Video enhancement request is invalid.");
    }
    throw error;
  }
}

async function callVideoEnhancementService(
  file: File,
  input: {
    projectId?: string;
    sourceAssetName: string;
    mode: VideoEnhancementMode;
    strength: number;
    model: string;
    guidance?: string;
  },
): Promise<VideoEnhancementOutput> {
  const endpoint = process.env.VIDEO_ENHANCEMENT_ENDPOINT?.trim();
  if (!endpoint) throw new Error("VIDEO_ENHANCEMENT_ENDPOINT is required for video enhancement.");

  const formData = new FormData();
  formData.set("file", file, file.name || input.sourceAssetName);
  formData.set("sourceAssetName", input.sourceAssetName);
  formData.set("mode", input.mode);
  formData.set("strength", String(input.strength));
  formData.set("outputFormat", "mp4");
  if (input.projectId) formData.set("projectId", input.projectId);
  if (input.guidance) formData.set("guidance", input.guidance);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: videoEnhancementHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await videoEnhancementErrorMessage(response));
  }

  return parseVideoEnhancementResponse(response, input);
}

function validateVideoEnhancementFile(file: File) {
  if (file.size <= 0) {
    throw new InvalidVideoEnhancementRequestError("Choose a non-empty video file for enhancement.");
  }
  if (file.size > maxVideoEnhancementBytes) {
    throw new InvalidVideoEnhancementRequestError("Video enhancement currently supports files up to 80 MB.");
  }
  if (file.type && !file.type.startsWith("video/") && file.type !== "application/octet-stream") {
    throw new InvalidVideoEnhancementRequestError("Choose a video file for enhancement.");
  }
}

async function parseVideoEnhancementResponse(
  response: Response,
  input: { sourceAssetName: string; mode: VideoEnhancementMode; strength: number; model: string },
): Promise<VideoEnhancementOutput> {
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "video/mp4";
  if (mediaType === "application/json") {
    const body = videoEnhancementJsonResponseSchema.parse(await response.json());
    const base64 = body.base64 ?? body.videoBase64;
    if (!base64) throw new Error("Video enhancement service returned JSON without video data.");
    validateVideoBase64(base64);

    return {
      filename: safeVideoFilename(body.filename, input.sourceAssetName, input.mode, body.mediaType ?? body.mimeType),
      mediaType: normalizeVideoMediaType(body.mediaType ?? body.mimeType),
      base64,
      mode: input.mode,
      strength: input.strength,
      sourceAssetName: input.sourceAssetName,
      model: input.model,
      summary: body.summary || defaultVideoEnhancementSummary(input.mode),
      warnings: body.warnings ?? [],
    };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 0) throw new Error("Video enhancement service returned an empty video file.");
  if (bytes.length > maxVideoEnhancementBytes) throw new Error("Video enhancement service returned a video file over 80 MB.");

  return {
    filename: safeVideoFilename(undefined, input.sourceAssetName, input.mode, mediaType),
    mediaType: normalizeVideoMediaType(mediaType),
    base64: bytes.toString("base64"),
    mode: input.mode,
    strength: input.strength,
    sourceAssetName: input.sourceAssetName,
    model: input.model,
    summary: defaultVideoEnhancementSummary(input.mode),
    warnings: [],
  };
}

function videoEnhancementHeaders() {
  const apiKey = process.env.VIDEO_ENHANCEMENT_API_KEY?.trim();
  return apiKey ? { authorization: `Bearer ${apiKey}` } : undefined;
}

function normalizeVideoMediaType(value: string | undefined) {
  const mediaType = value?.trim().toLowerCase();
  return mediaType?.startsWith("video/") ? mediaType : "video/mp4";
}

function safeVideoFilename(value: string | undefined, sourceAssetName: string, mode: VideoEnhancementMode, mediaType: string | undefined) {
  const extension = extensionForVideoMediaType(mediaType);
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
    "enhanced-video";

  return `${base}-${mode}.${extension}`;
}

function validateVideoBase64(value: string) {
  const sanitized = value.trim();
  if (!/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw new Error("Video enhancement service returned invalid video data.");
  }
  if (Math.floor((sanitized.length * 3) / 4) > maxVideoEnhancementBytes) {
    throw new Error("Video enhancement service returned a video file over 80 MB.");
  }
}

function extensionForVideoMediaType(value: string | undefined) {
  const mediaType = normalizeVideoMediaType(value);
  if (mediaType.includes("webm")) return "webm";
  if (mediaType.includes("quicktime")) return "mov";
  return "mp4";
}

function defaultVideoEnhancementSummary(mode: VideoEnhancementMode) {
  if (mode === "eye-contact") return "Connected video enhancement returned an eye-contact corrected video file.";
  if (mode === "lip-sync") return "Connected video enhancement returned a lip-sync aligned video file.";
  return "Connected video enhancement returned a stabilized video file.";
}

async function videoEnhancementErrorMessage(response: Response) {
  const fallback = `Video enhancement service failed with status ${response.status}.`;
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

export class InvalidVideoEnhancementRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVideoEnhancementRequestError";
  }
}
