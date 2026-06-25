import {
  videoEnhancementModes,
  type VideoEnhancementMode,
} from "@/lib/ai/video-enhancement-contract";
import { clientApiUrl } from "@/lib/runtime/client-api";

export type VideoEnhancementStatus = {
  ok: true;
  configured: boolean;
  label: string;
  modes: VideoEnhancementMode[];
  maxSourceBytes: number;
};

export type GeneratedVideoEnhancementOutput = {
  filename: string;
  mediaType: string;
  base64: string;
  mode: VideoEnhancementMode;
  strength: number;
  sourceAssetName: string;
  model: string;
  summary: string;
  warnings?: string[];
};

export async function fetchVideoEnhancementStatus(): Promise<VideoEnhancementStatus | null> {
  try {
    const response = await fetch(clientApiUrl("/api/ai/video-enhancement"), { credentials: "include" });
    const data = await safeJson(response);
    if (response.ok && isVideoEnhancementStatus(data)) return data;
  } catch {
    return null;
  }

  return null;
}

export async function enhanceVideoWithConnectedService(input: {
  sourceBlob: Blob;
  sourceAssetName: string;
  sourceMediaType?: string;
  projectId: string;
  mode: VideoEnhancementMode;
  strength: number;
  guidance?: string;
}) {
  const formData = new FormData();
  formData.set(
    "file",
    new File([input.sourceBlob], input.sourceAssetName, {
      type: input.sourceMediaType || input.sourceBlob.type || "video/mp4",
    }),
  );
  formData.set("projectId", input.projectId);
  formData.set("sourceAssetName", input.sourceAssetName);
  formData.set("mode", input.mode);
  formData.set("strength", String(input.strength));
  if (input.guidance?.trim()) formData.set("guidance", input.guidance.trim());

  const response = await fetch(clientApiUrl("/api/ai/video-enhancement"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await safeJson(response);

  if (!response.ok || !isVideoEnhancementSuccess(data)) {
    return {
      ok: false as const,
      reason: isAiFailure(data) ? data.reason : "Video enhancement could not finish.",
    };
  }

  return {
    ok: true as const,
    output: data.output,
  };
}

export function fileFromVideoEnhancementOutput(output: GeneratedVideoEnhancementOutput) {
  const bytes = decodeBase64VideoPayload(output.base64);
  const blob = new Blob([bytes], { type: output.mediaType });
  return new File([blob], output.filename, { type: output.mediaType });
}

function isVideoEnhancementStatus(value: unknown): value is VideoEnhancementStatus {
  if (
    typeof value !== "object" ||
    value === null ||
    !("ok" in value) ||
    value.ok !== true ||
    !("configured" in value) ||
    typeof value.configured !== "boolean" ||
    !("label" in value) ||
    typeof value.label !== "string" ||
    !("maxSourceBytes" in value) ||
    typeof value.maxSourceBytes !== "number" ||
    !("modes" in value) ||
    !Array.isArray(value.modes)
  ) {
    return false;
  }

  const modes = value.modes as unknown[];
  return modes.every((mode) => typeof mode === "string" && videoEnhancementModes.includes(mode as VideoEnhancementMode));
}

function isVideoEnhancementSuccess(value: unknown): value is { ok: true; output: GeneratedVideoEnhancementOutput } {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== true || !("output" in value)) return false;
  const output = value.output;
  return (
    typeof output === "object" &&
    output !== null &&
    "filename" in output &&
    typeof output.filename === "string" &&
    "mediaType" in output &&
    typeof output.mediaType === "string" &&
    output.mediaType.startsWith("video/") &&
    "base64" in output &&
    typeof output.base64 === "string" &&
    "mode" in output &&
    typeof output.mode === "string" &&
    videoEnhancementModes.includes(output.mode as VideoEnhancementMode) &&
    "strength" in output &&
    typeof output.strength === "number" &&
    "model" in output &&
    typeof output.model === "string" &&
    "summary" in output &&
    typeof output.summary === "string"
  );
}

function isAiFailure(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function decodeBase64VideoPayload(value: string) {
  const sanitized = value.trim();
  if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw new Error("Enhanced video is invalid.");
  }

  const binary = atob(sanitized);
  if (binary.length > 80 * 1024 * 1024) {
    throw new Error("Enhanced video is too large to import.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
