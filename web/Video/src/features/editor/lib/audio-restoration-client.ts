import { audioCleanupModes, type AudioCleanupMode } from "@/lib/audio/cleanup-contract";
import { clientApiUrl } from "@/lib/runtime/client-api";

export type AudioRestorationStatus = {
  ok: true;
  configured: boolean;
  label: string;
  modes: AudioCleanupMode[];
  maxSourceBytes: number;
};

export type GeneratedAudioRestorationOutput = {
  filename: string;
  mediaType: string;
  base64: string;
  mode: AudioCleanupMode;
  intensity: number;
  sourceAssetName: string;
  model: string;
  summary: string;
  warnings?: string[];
};

export async function fetchAudioRestorationStatus(): Promise<AudioRestorationStatus | null> {
  try {
    const response = await fetch(clientApiUrl("/api/ai/audio-restoration"), { credentials: "include" });
    const data = await safeJson(response);
    if (response.ok && isAudioRestorationStatus(data)) return data;
  } catch {
    return null;
  }

  return null;
}

export async function restoreAudioWithConnectedService(input: {
  sourceBlob: Blob;
  sourceAssetName: string;
  sourceMediaType?: string;
  projectId: string;
  mode: AudioCleanupMode;
  intensity: number;
}) {
  const formData = new FormData();
  formData.set(
    "file",
    new File([input.sourceBlob], input.sourceAssetName, {
      type: input.sourceMediaType || input.sourceBlob.type || "audio/wav",
    }),
  );
  formData.set("projectId", input.projectId);
  formData.set("sourceAssetName", input.sourceAssetName);
  formData.set("mode", input.mode);
  formData.set("intensity", String(input.intensity));

  const response = await fetch(clientApiUrl("/api/ai/audio-restoration"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await safeJson(response);

  if (!response.ok || !isAudioRestorationSuccess(data)) {
    return {
      ok: false as const,
      reason: isAiFailure(data) ? data.reason : "Advanced audio restoration could not finish.",
    };
  }

  return {
    ok: true as const,
    output: data.output,
  };
}

export function fileFromAudioRestorationOutput(output: GeneratedAudioRestorationOutput) {
  const bytes = decodeBase64AudioPayload(output.base64, "Restored audio");
  const blob = new Blob([bytes], { type: output.mediaType });
  return new File([blob], output.filename, { type: output.mediaType });
}

function isAudioRestorationStatus(value: unknown): value is AudioRestorationStatus {
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
  return modes.every((mode) => typeof mode === "string" && audioCleanupModes.includes(mode as AudioCleanupMode));
}

function isAudioRestorationSuccess(value: unknown): value is { ok: true; output: GeneratedAudioRestorationOutput } {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== true || !("output" in value)) return false;
  const output = value.output;
  return (
    typeof output === "object" &&
    output !== null &&
    "filename" in output &&
    typeof output.filename === "string" &&
    "mediaType" in output &&
    typeof output.mediaType === "string" &&
    output.mediaType.startsWith("audio/") &&
    "base64" in output &&
    typeof output.base64 === "string" &&
    "mode" in output &&
    typeof output.mode === "string" &&
    audioCleanupModes.includes(output.mode as AudioCleanupMode) &&
    "intensity" in output &&
    typeof output.intensity === "number" &&
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

function decodeBase64AudioPayload(value: string, label: string) {
  const sanitized = value.trim();
  if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw new Error(`${label} is invalid.`);
  }

  const binary = atob(sanitized);
  if (binary.length > 20 * 1024 * 1024) {
    throw new Error(`${label} is too large to import.`);
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
