import { z } from "zod";
import { aiGenerationAssetMetadata, logAiGenerationRecord, summarizeAiGenerationOutput } from "@/lib/ai/generation-records";
import { assertAiSafety, reviewAiTextSafety } from "@/lib/ai/safety";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";

const maxSceneVideoBytes = 80 * 1024 * 1024;

const sceneVideoGenerationRequestSchema = z.object({
  projectId: z.string().trim().max(160).optional(),
  projectTitle: z.string().trim().min(1).max(180),
  sceneTitle: z.string().trim().min(1).max(180),
  prompt: z.string().trim().min(1).max(3000),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]),
  duration: z.coerce.number().finite().min(1).max(45),
  backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

const sceneVideoJsonResponseSchema = z.object({
  filename: z.string().trim().min(1).max(180).optional(),
  mediaType: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(1).max(80).optional(),
  base64: z.string().trim().min(1).optional(),
  videoBase64: z.string().trim().min(1).optional(),
  summary: z.string().trim().max(600).optional(),
  warnings: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
});

export type SceneVideoGenerationRequest = z.infer<typeof sceneVideoGenerationRequestSchema>;

export interface SceneVideoGenerationOutput {
  filename: string;
  mediaType: string;
  base64: string;
  projectTitle: string;
  sceneTitle: string;
  duration: number;
  prompt: string;
  model: string;
  summary: string;
  warnings: string[];
}

export function hasSceneVideoGenerationServiceConfig() {
  return Boolean(process.env.VIDEO_SCENE_GENERATION_ENDPOINT?.trim());
}

export function sceneVideoGenerationServiceStatus() {
  const configured = hasSceneVideoGenerationServiceConfig();

  return {
    ok: true as const,
    configured,
    label: configured ? "Connected scene video service ready" : "Connected scene video service not configured",
    maxOutputBytes: maxSceneVideoBytes,
    requiredEnv: configured ? [] : ["VIDEO_SCENE_GENERATION_ENDPOINT"],
    optionalEnv: ["VIDEO_SCENE_GENERATION_API_KEY", "VIDEO_SCENE_GENERATION_MODEL"],
  };
}

export async function runAiSceneVideoGeneration(rawInput: unknown, context: { userId: string }) {
  if (!hasSceneVideoGenerationServiceConfig()) {
    return {
      ok: false as const,
      reason: "Scene video generation needs a connected scene video service.",
    };
  }

  const input = normalizeSceneVideoGenerationRequest(rawInput);
  const model = process.env.VIDEO_SCENE_GENERATION_MODEL?.trim() || "owner/scene-video";
  const modelLabel = model.includes("/") ? model : `owner/${model}`;
  const promptText = sceneVideoPromptText(input);
  const safetyReview = reviewAiTextSafety({ action: "scene-video", text: promptText });

  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: "scene-video",
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
  await assertAiUsageAllowed(context.userId, "scene-video", modelLabel);

  try {
    const output = await callSceneVideoGenerationService(input, modelLabel);
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "scene-video",
      model: modelLabel,
      status: "complete",
      promptChars: promptText.length,
      outputChars: output.base64.length,
    });
    const asset = aiGenerationAssetMetadata("scene-video", output);
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "scene-video",
      provider: "external",
      model: modelLabel,
      status: "complete",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: promptText.length,
      outputChars: output.base64.length,
      outputSummary: summarizeAiGenerationOutput("scene-video", output),
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
    const message = error instanceof Error ? error.message : "Scene video generation failed.";
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: "scene-video",
      model: modelLabel,
      status: "failed",
      promptChars: promptText.length,
      error: message,
    });
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      usageEventId,
      action: "scene-video",
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

export function normalizeSceneVideoGenerationRequest(rawInput: unknown): SceneVideoGenerationRequest {
  try {
    return sceneVideoGenerationRequestSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new InvalidSceneVideoGenerationRequestError("Scene video generation request is invalid.");
    }
    throw error;
  }
}

async function callSceneVideoGenerationService(
  input: SceneVideoGenerationRequest,
  model: string,
): Promise<SceneVideoGenerationOutput> {
  const endpoint = process.env.VIDEO_SCENE_GENERATION_ENDPOINT?.trim();
  if (!endpoint) throw new Error("VIDEO_SCENE_GENERATION_ENDPOINT is required for scene video generation.");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: sceneVideoGenerationHeaders(),
    body: JSON.stringify({
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      sceneTitle: input.sceneTitle,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      duration: input.duration,
      outputFormat: "mp4",
      backgroundColor: input.backgroundColor,
      accentColor: input.accentColor,
    }),
  });

  if (!response.ok) {
    throw new Error(await sceneVideoGenerationErrorMessage(response));
  }

  return parseSceneVideoGenerationResponse(response, input, model);
}

async function parseSceneVideoGenerationResponse(
  response: Response,
  input: SceneVideoGenerationRequest,
  model: string,
): Promise<SceneVideoGenerationOutput> {
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "video/mp4";
  if (mediaType === "application/json") {
    const body = sceneVideoJsonResponseSchema.parse(await response.json());
    const base64 = body.base64 ?? body.videoBase64;
    if (!base64) throw new Error("Scene video service returned JSON without video data.");
    validateVideoBase64(base64);

    return {
      filename: safeSceneVideoFilename(body.filename, input.sceneTitle, body.mediaType ?? body.mimeType),
      mediaType: normalizeVideoMediaType(body.mediaType ?? body.mimeType),
      base64,
      projectTitle: input.projectTitle,
      sceneTitle: input.sceneTitle,
      duration: input.duration,
      prompt: input.prompt,
      model,
      summary: body.summary || `Generated scene video for ${input.sceneTitle}.`,
      warnings: body.warnings ?? [],
    };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 0) throw new Error("Scene video service returned an empty video file.");
  if (bytes.length > maxSceneVideoBytes) throw new Error("Scene video service returned a video file over 80 MB.");

  return {
    filename: safeSceneVideoFilename(undefined, input.sceneTitle, mediaType),
    mediaType: normalizeVideoMediaType(mediaType),
    base64: bytes.toString("base64"),
    projectTitle: input.projectTitle,
    sceneTitle: input.sceneTitle,
    duration: input.duration,
    prompt: input.prompt,
    model,
    summary: `Generated scene video for ${input.sceneTitle}.`,
    warnings: [],
  };
}

function sceneVideoGenerationHeaders() {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, video/mp4, video/webm",
  };
  const token = process.env.VIDEO_SCENE_GENERATION_API_KEY?.trim();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function sceneVideoPromptText(input: SceneVideoGenerationRequest) {
  return [
    `Project: ${input.projectTitle}`,
    `Scene: ${input.sceneTitle}`,
    `Aspect ratio: ${input.aspectRatio}`,
    `Duration: ${input.duration}s`,
    input.backgroundColor ? `Background color: ${input.backgroundColor}` : null,
    input.accentColor ? `Accent color: ${input.accentColor}` : null,
    input.prompt,
  ]
    .filter(Boolean)
    .join("\n");
}

function validateVideoBase64(value: string) {
  const sanitized = value.trim();
  if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw new Error("Scene video service returned invalid video data.");
  }
  const bytes = Buffer.from(sanitized, "base64");
  if (bytes.length <= 0) {
    throw new Error("Scene video service returned empty video data.");
  }
  if (bytes.length > maxSceneVideoBytes) {
    throw new Error("Scene video service returned a video file over 80 MB.");
  }
}

function normalizeVideoMediaType(value: string | undefined) {
  const normalized = value?.split(";")[0]?.trim().toLowerCase();
  if (normalized?.startsWith("video/")) return normalized;
  return "video/mp4";
}

function safeSceneVideoFilename(value: string | undefined, sceneTitle: string, mediaType: string | undefined) {
  const extension = extensionFromMediaType(mediaType);
  const cleaned = value?.replace(/[\\/:*?"<>|]+/g, "-").trim();
  if (cleaned && /\.[a-z0-9]+$/i.test(cleaned)) return cleaned.slice(0, 180);
  const slug = sceneTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `ai-scene-video-${slug || "scene"}-${Date.now()}.${extension}`;
}

function extensionFromMediaType(value: string | undefined) {
  const normalized = normalizeVideoMediaType(value);
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("quicktime")) return "mov";
  return "mp4";
}

async function sceneVideoGenerationErrorMessage(response: Response) {
  const fallback = `Scene video service failed with status ${response.status}.`;
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      if (body && typeof body === "object" && "reason" in body && typeof body.reason === "string") return body.reason;
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
    }
    const text = await response.text();
    return text.trim().slice(0, 500) || fallback;
  } catch {
    return fallback;
  }
}

export class InvalidSceneVideoGenerationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSceneVideoGenerationRequestError";
  }
}
