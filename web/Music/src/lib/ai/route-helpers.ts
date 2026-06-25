import { jsonError } from "@/lib/api";
import type { AiJobKind } from "@/db/schema";
import { getAiRuntimeConfig, getAiStatus, type AiCapability } from "./config";
import { tryRecordAiJob } from "./jobs";
import { createProviderContractSnapshot } from "./provider-contracts";

export function providerName() {
  const config = getAiRuntimeConfig();

  if (config.openAiCompatBaseUrl) {
    return "openai-compatible";
  }

  if (config.hasGroqKey && config.backend === "groq") {
    return "groq";
  }

  if (config.hasGatewayAuth) {
    return "vercel-ai-gateway";
  }

  if (config.hasOpenAiKey) {
    return "openai";
  }

  if (config.hasGroqKey) {
    return "groq";
  }

  return "unconfigured";
}

export async function disabledCapabilityResponse(
  kind: AiJobKind,
  capability: AiCapability,
  message: string,
  request?: unknown,
) {
  await tryRecordAiJob({
    kind,
    status: "disabled",
    provider: "unconfigured",
    request,
    error: message,
  });

  return jsonError(message, 503, {
    capability,
    status: getAiStatus(),
  });
}

export function withProviderContract<T extends object>(request: T) {
  const status = getAiStatus();

  return {
    ...request,
    providerContract: createProviderContractSnapshot(status),
  };
}
