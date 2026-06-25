import { clientApiUrl } from "@/lib/runtime/client-api";

export type SceneVideoGenerationStatus = {
  ok: true;
  configured: boolean;
  label: string;
  maxOutputBytes: number;
};

export type GeneratedSceneVideoOutput = {
  filename: string;
  mediaType: string;
  base64: string;
  projectTitle: string;
  sceneTitle: string;
  duration: number;
  prompt: string;
  model: string;
  summary: string;
  warnings?: string[];
};

export async function fetchSceneVideoGenerationStatus(): Promise<SceneVideoGenerationStatus | null> {
  try {
    const response = await fetch(clientApiUrl("/api/ai/scene-video"), { credentials: "include" });
    const data = await safeJson(response);
    if (response.ok && isSceneVideoGenerationStatus(data)) return data;
  } catch {
    return null;
  }

  return null;
}

export async function generateSceneVideoWithConnectedService(input: {
  projectId: string;
  projectTitle: string;
  sceneTitle: string;
  prompt: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  duration: number;
  backgroundColor?: string;
  accentColor?: string;
}) {
  const response = await fetch(clientApiUrl("/api/ai/scene-video"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await safeJson(response);

  if (!response.ok || !isSceneVideoGenerationSuccess(data)) {
    return {
      ok: false as const,
      reason: isAiFailure(data) ? data.reason : "Scene video generation could not finish.",
    };
  }

  return {
    ok: true as const,
    output: data.output,
  };
}

export function fileFromSceneVideoOutput(output: GeneratedSceneVideoOutput) {
  const bytes = decodeBase64VideoPayload(output.base64);
  const blob = new Blob([bytes], { type: output.mediaType });
  return new File([blob], output.filename, { type: output.mediaType });
}

function isSceneVideoGenerationStatus(value: unknown): value is SceneVideoGenerationStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "configured" in value &&
    typeof value.configured === "boolean" &&
    "label" in value &&
    typeof value.label === "string" &&
    "maxOutputBytes" in value &&
    typeof value.maxOutputBytes === "number"
  );
}

function isSceneVideoGenerationSuccess(value: unknown): value is { ok: true; output: GeneratedSceneVideoOutput } {
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
    "projectTitle" in output &&
    typeof output.projectTitle === "string" &&
    "sceneTitle" in output &&
    typeof output.sceneTitle === "string" &&
    "duration" in output &&
    typeof output.duration === "number" &&
    "prompt" in output &&
    typeof output.prompt === "string" &&
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
    throw new Error("Generated scene video is invalid.");
  }

  const binary = atob(sanitized);
  if (binary.length > 80 * 1024 * 1024) {
    throw new Error("Generated scene video is too large to import.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
