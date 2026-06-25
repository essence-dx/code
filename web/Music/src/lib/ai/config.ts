import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import {
  gateway,
  type ImageModel,
  type LanguageModel,
  type TranscriptionModel,
} from "ai";
import { getProviderCapabilities } from "./capabilities";

export type AiCapability =
  | "text"
  | "image"
  | "transcription"
  | "audio"
  | "creative-controls"
  | "stem"
  | "remaster"
  | "sample-generation"
  | "midi"
  | "persona"
  | "remove-fx"
  | "stem-variation"
  | "training"
  | "voice"
  | "warp-markers";

export type AiRuntimeConfig = {
  backend: string;
  textModel: string;
  structuredTextModel: string;
  imageModel: string;
  transcriptionModel: string;
  openAiCompatBaseUrl: string;
  hasOpenAiCompatKey: boolean;
  hasGatewayAuth: boolean;
  hasOpenAiKey: boolean;
  hasGroqKey: boolean;
  creativeControlsSupported: boolean;
  audioProviderUrl: string;
  audioProviderHealthUrl: string;
  audioProviderWebhookSecret: string;
  midiProviderWebhookSecret: string;
  midiProviderUrl: string;
  modelTrainingProviderUrl: string;
  modelTrainingProviderWebhookSecret: string;
  personaProviderWebhookSecret: string;
  personaProviderUrl: string;
  removeFxProviderUrl: string;
  removeFxProviderWebhookSecret: string;
  remasterProviderUrl: string;
  remasterProviderWebhookSecret: string;
  sampleProviderUrl: string;
  sampleProviderWebhookSecret: string;
  stemVariationProviderUrl: string;
  stemVariationProviderWebhookSecret: string;
  stemProviderWebhookSecret: string;
  stemProviderUrl: string;
  voiceProviderWebhookSecret: string;
  voiceProviderUrl: string;
  warpMarkerProviderUrl: string;
  warpMarkerProviderWebhookSecret: string;
};

const defaultGroqTextModel = "llama-3.1-8b-instant";
const defaultGroqStructuredTextModel = "openai/gpt-oss-20b";

function envValue(name: string) {
  return (process.env[name] || "").replace(/^\uFEFF/, "").trim();
}

function hasEnvValue(name: string) {
  return Boolean(envValue(name));
}

function envFlag(name: string) {
  const value = envValue(name).toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function groqModel(modelId: string): LanguageModel {
  return createGroq({ apiKey: envValue("GROQ_API_KEY") })(modelId);
}

function openAiProvider() {
  return createOpenAI({ apiKey: envValue("OPENAI_API_KEY") });
}

export function getAiRuntimeConfig(): AiRuntimeConfig {
  const hasGroqKey = hasEnvValue("GROQ_API_KEY");
  const backend = envValue("AI_BACKEND") || (hasGroqKey ? "groq" : "free-first");
  const textModel =
    envValue("AI_TEXT_MODEL") || (hasGroqKey ? defaultGroqTextModel : "");

  return {
    backend,
    textModel,
    structuredTextModel:
      envValue("AI_STRUCTURED_TEXT_MODEL") ||
      (hasGroqKey ? defaultGroqStructuredTextModel : textModel),
    imageModel: envValue("AI_IMAGE_MODEL"),
    transcriptionModel: envValue("AI_TRANSCRIPTION_MODEL") || "whisper-1",
    openAiCompatBaseUrl: envValue("AI_OPENAI_COMPAT_BASE_URL"),
    hasOpenAiCompatKey: hasEnvValue("AI_OPENAI_COMPAT_API_KEY"),
    hasGatewayAuth: Boolean(
      envValue("AI_GATEWAY_API_KEY") || envValue("VERCEL_OIDC_TOKEN"),
    ),
    hasOpenAiKey: hasEnvValue("OPENAI_API_KEY"),
    hasGroqKey,
    creativeControlsSupported: envFlag("AI_CREATIVE_CONTROLS_SUPPORTED"),
    audioProviderUrl: envValue("AI_AUDIO_PROVIDER_URL"),
    audioProviderHealthUrl: envValue("AI_AUDIO_PROVIDER_HEALTH_URL"),
    audioProviderWebhookSecret: envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    midiProviderWebhookSecret:
      envValue("AI_MIDI_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    midiProviderUrl: envValue("AI_MIDI_PROVIDER_URL"),
    modelTrainingProviderUrl: envValue("AI_MODEL_TRAINING_PROVIDER_URL"),
    modelTrainingProviderWebhookSecret:
      envValue("AI_MODEL_TRAINING_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    personaProviderWebhookSecret:
      envValue("AI_PERSONA_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    personaProviderUrl: envValue("AI_PERSONA_PROVIDER_URL"),
    removeFxProviderUrl: envValue("AI_REMOVE_FX_PROVIDER_URL"),
    removeFxProviderWebhookSecret:
      envValue("AI_REMOVE_FX_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    remasterProviderUrl: envValue("AI_REMASTER_PROVIDER_URL"),
    remasterProviderWebhookSecret:
      envValue("AI_REMASTER_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    sampleProviderUrl:
      envValue("AI_SAMPLE_PROVIDER_URL") || envValue("AI_AUDIO_PROVIDER_URL"),
    sampleProviderWebhookSecret:
      envValue("AI_SAMPLE_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    stemVariationProviderUrl:
      envValue("AI_STEM_VARIATION_PROVIDER_URL") ||
      envValue("AI_STEM_PROVIDER_URL"),
    stemVariationProviderWebhookSecret:
      envValue("AI_STEM_VARIATION_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_STEM_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    stemProviderWebhookSecret:
      envValue("AI_STEM_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    stemProviderUrl: envValue("AI_STEM_PROVIDER_URL"),
    voiceProviderWebhookSecret:
      envValue("AI_VOICE_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
    voiceProviderUrl: envValue("AI_VOICE_PROVIDER_URL"),
    warpMarkerProviderUrl: envValue("AI_WARP_MARKER_PROVIDER_URL"),
    warpMarkerProviderWebhookSecret:
      envValue("AI_WARP_MARKER_PROVIDER_WEBHOOK_SECRET") ||
      envValue("AI_AUDIO_PROVIDER_WEBHOOK_SECRET"),
  };
}

export function getAiStatus() {
  const config = getAiRuntimeConfig();
  const text = Boolean(
    config.textModel &&
      ((config.openAiCompatBaseUrl && config.hasOpenAiCompatKey) ||
        config.hasGroqKey ||
        config.hasGatewayAuth ||
        config.hasOpenAiKey),
  );

  const baseStatus = {
    backend: config.backend,
    text,
    image: Boolean(config.imageModel && (config.hasGatewayAuth || config.hasOpenAiKey)),
    transcription: Boolean(config.hasOpenAiKey),
    audio: Boolean(config.audioProviderUrl),
    textModel: config.textModel,
    structuredTextModel: config.structuredTextModel,
    imageModel: config.imageModel,
  };
  const capabilityMatrix = getProviderCapabilities(config, baseStatus);

  return {
    ...baseStatus,
    capabilities: capabilityMatrix.capabilities,
    capabilitySummary: capabilityMatrix.summary,
  };
}

export function resolveTextModel(): LanguageModel {
  const config = getAiRuntimeConfig();

  if (!config.textModel) {
    throw new Error("AI_TEXT_MODEL is not configured.");
  }

  if (config.openAiCompatBaseUrl) {
    const compat = createOpenAI({
      baseURL: config.openAiCompatBaseUrl,
      apiKey: envValue("AI_OPENAI_COMPAT_API_KEY"),
      name: "openai-compatible",
    });

    return compat.chat(config.textModel);
  }

  if (config.hasGroqKey && config.backend === "groq") {
    return groqModel(config.textModel);
  }

  if (config.hasOpenAiKey && !config.textModel.includes("/")) {
    return openAiProvider().chat(config.textModel);
  }

  if (config.hasGroqKey) {
    return groqModel(config.textModel);
  }

  return gateway(config.textModel);
}

export function resolveStructuredTextModel(): LanguageModel {
  const config = getAiRuntimeConfig();

  if (!config.structuredTextModel) {
    return resolveTextModel();
  }

  if (config.hasGroqKey && config.backend === "groq") {
    return groqModel(config.structuredTextModel);
  }

  return resolveTextModel();
}

export function resolveImageModel(): ImageModel {
  const config = getAiRuntimeConfig();

  if (!config.imageModel) {
    throw new Error("AI_IMAGE_MODEL is not configured.");
  }

  if (config.hasOpenAiKey && !config.imageModel.includes("/")) {
    return openAiProvider().image(config.imageModel);
  }

  return gateway.image(config.imageModel);
}

export function resolveTranscriptionModel(): TranscriptionModel {
  const config = getAiRuntimeConfig();

  if (!config.hasOpenAiKey) {
    throw new Error("OPENAI_API_KEY is required for transcription.");
  }

  return openAiProvider().transcription(config.transcriptionModel);
}
