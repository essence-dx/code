import type { AiRuntimeConfig } from "./config";

export type ProviderCapabilityState = "ready" | "disabled";

export type ProviderCapabilityGroup =
  | "writing"
  | "media"
  | "music"
  | "voice"
  | "studio";

export type ProviderCapability = {
  disabledReason: string;
  env: string[];
  group: ProviderCapabilityGroup;
  id: string;
  label: string;
  requirement: string;
  state: ProviderCapabilityState;
  summary: string;
};

export type ProviderCapabilitySummary = {
  disabled: number;
  ready: number;
  score: number;
  total: number;
};

type BaseStatus = {
  audio: boolean;
  image: boolean;
  text: boolean;
  transcription: boolean;
};

type ProviderFlag = {
  configured: boolean;
  env: string[];
  label: string;
};

export function getProviderCapabilities(
  config: AiRuntimeConfig,
  status: BaseStatus,
) {
  const providerFlags = {
    audio: {
      configured: Boolean(config.audioProviderUrl),
      env: ["AI_AUDIO_PROVIDER_URL"],
      label: "music generation provider",
    },
    creativeControls: {
      configured: Boolean(
        config.creativeControlsSupported &&
          (config.audioProviderUrl || config.sampleProviderUrl),
      ),
      env: [
        "AI_CREATIVE_CONTROLS_SUPPORTED",
        "AI_AUDIO_PROVIDER_URL",
        "AI_SAMPLE_PROVIDER_URL",
      ],
      label: "creative-control capable music provider",
    },
    midi: {
      configured: Boolean(config.midiProviderUrl),
      env: ["AI_MIDI_PROVIDER_URL", "AI_MIDI_PROVIDER_WEBHOOK_SECRET"],
      label: "audio-to-MIDI provider",
    },
    persona: {
      configured: Boolean(
        config.personaProviderUrl && config.personaProviderWebhookSecret,
      ),
      env: ["AI_PERSONA_PROVIDER_URL", "AI_PERSONA_PROVIDER_WEBHOOK_SECRET"],
      label: "persona provider",
    },
    training: {
      configured: Boolean(
        config.modelTrainingProviderUrl &&
          config.modelTrainingProviderWebhookSecret,
      ),
      env: [
        "AI_MODEL_TRAINING_PROVIDER_URL",
        "AI_MODEL_TRAINING_PROVIDER_WEBHOOK_SECRET",
      ],
      label: "custom model training provider",
    },
    remaster: {
      configured: Boolean(config.remasterProviderUrl),
      env: ["AI_REMASTER_PROVIDER_URL"],
      label: "remaster provider",
    },
    removeFx: {
      configured: Boolean(
        config.removeFxProviderUrl && config.removeFxProviderWebhookSecret,
      ),
      env: ["AI_REMOVE_FX_PROVIDER_URL", "AI_REMOVE_FX_PROVIDER_WEBHOOK_SECRET"],
      label: "remove FX provider",
    },
    samples: {
      configured: Boolean(
        config.sampleProviderUrl && config.sampleProviderWebhookSecret,
      ),
      env: ["AI_SAMPLE_PROVIDER_URL", "AI_SAMPLE_PROVIDER_WEBHOOK_SECRET"],
      label: "short sample provider",
    },
    stems: {
      configured: Boolean(config.stemProviderUrl),
      env: ["AI_STEM_PROVIDER_URL"],
      label: "stem provider",
    },
    stemVariation: {
      configured: Boolean(
        config.stemVariationProviderUrl &&
          config.stemVariationProviderWebhookSecret,
      ),
      env: [
        "AI_STEM_VARIATION_PROVIDER_URL",
        "AI_STEM_VARIATION_PROVIDER_WEBHOOK_SECRET",
      ],
      label: "stem variation provider",
    },
    voice: {
      configured: Boolean(config.voiceProviderUrl),
      env: ["AI_VOICE_PROVIDER_URL", "AI_VOICE_PROVIDER_WEBHOOK_SECRET"],
      label: "voice provider",
    },
    warpMarkers: {
      configured: Boolean(
        config.warpMarkerProviderUrl && config.warpMarkerProviderWebhookSecret,
      ),
      env: [
        "AI_WARP_MARKER_PROVIDER_URL",
        "AI_WARP_MARKER_PROVIDER_WEBHOOK_SECRET",
      ],
      label: "warp marker provider",
    },
  } satisfies Record<string, ProviderFlag>;

  const capabilities: ProviderCapability[] = [
    capability({
      configured: status.text,
      disabledReason: "Set a text model and provider key.",
      env: [
        "GROQ_API_KEY",
        "AI_TEXT_MODEL",
        "AI_OPENAI_COMPAT_BASE_URL",
        "AI_OPENAI_COMPAT_API_KEY",
        "AI_GATEWAY_API_KEY",
      ],
      group: "writing",
      id: "composer-chat",
      label: "Composer chat and lyric writing",
      requirement: "Text model",
      summary: "Chat, lyrics, style expansion, hook captions, and release copy.",
    }),
    capability({
      configured: status.text,
      disabledReason: "Set a structured-output capable text model.",
      env: [
        "GROQ_API_KEY",
        "AI_STRUCTURED_TEXT_MODEL",
        "AI_OPENAI_COMPAT_BASE_URL",
        "AI_OPENAI_COMPAT_API_KEY",
        "AI_GATEWAY_API_KEY",
      ],
      group: "writing",
      id: "structured-song-tools",
      label: "Structured song tools",
      requirement: "Structured text model",
      summary: "Song briefs, metadata suggestions, and playlist ideas.",
    }),
    capability({
      configured: status.image,
      disabledReason: "Set an image model and image-capable provider key.",
      env: ["AI_IMAGE_MODEL", "OPENAI_API_KEY", "AI_GATEWAY_API_KEY"],
      group: "media",
      id: "cover-images",
      label: "Cover image generation",
      requirement: "Image model",
      summary: "Generated cover-art assets from prompt context.",
    }),
    capability({
      configured: status.transcription,
      disabledReason: "Set a transcription provider key.",
      env: ["OPENAI_API_KEY", "AI_TRANSCRIPTION_MODEL"],
      group: "media",
      id: "transcription",
      label: "Audio transcription",
      requirement: "Transcription model",
      summary: "Turn uploaded or recorded audio into editable text.",
    }),
    musicCapability("song-generation", "Prompt-to-song generation", providerFlags.audio),
    musicCapability("custom-song-generation", "Custom lyrics-to-song generation", providerFlags.audio),
    musicCapability("generation-variants", "Generation variants", providerFlags.audio),
    musicCapability("extend-song", "Extend or continue a song", providerFlags.audio),
    musicCapability("cover-remix", "Cover or remix a song", providerFlags.audio),
    musicCapability("replace-section", "Replace or add a generated section", providerFlags.audio),
    musicCapability("instrumental-backing", "Generate instrumental backing", providerFlags.audio),
    capability({
      configured: providerFlags.creativeControls.configured,
      disabledReason: providerDisabledReason(providerFlags.creativeControls),
      env: providerFlags.creativeControls.env,
      group: "music",
      id: "creative-controls",
      label: "Creative generation controls",
      requirement: providerFlags.creativeControls.label,
      summary:
        "Weirdness, structure, and reference influence controls for capable generation providers.",
    }),
    capability({
      configured: providerFlags.samples.configured,
      disabledReason: providerDisabledReason(providerFlags.samples),
      env: providerFlags.samples.env,
      group: "music",
      id: "sample-generation",
      label: "Suno Sounds-style samples",
      requirement: providerFlags.samples.label,
      summary: "Generate short reusable audio samples from prompt and style context.",
    }),
    capability({
      configured: providerFlags.training.configured,
      disabledReason: providerDisabledReason(providerFlags.training),
      env: providerFlags.training.env,
      group: "music",
      id: "custom-model-training",
      label: "Custom model training",
      requirement: providerFlags.training.label,
      summary: "Train reusable model cards from rights-confirmed original catalog audio.",
    }),
    capability({
      configured: providerFlags.remaster.configured,
      disabledReason: providerDisabledReason(providerFlags.remaster),
      env: providerFlags.remaster.env,
      group: "studio",
      id: "remaster",
      label: "Remaster",
      requirement: providerFlags.remaster.label,
      summary: "Create a cleaner master from uploaded or generated audio.",
    }),
    capability({
      configured: providerFlags.removeFx.configured,
      disabledReason: providerDisabledReason(providerFlags.removeFx),
      env: providerFlags.removeFx.env,
      group: "studio",
      id: "remove-fx",
      label: "Remove FX and processing cleanup",
      requirement: providerFlags.removeFx.label,
      summary: "Reduce reverb, delay, noise, or heavy processing from audio.",
    }),
    capability({
      configured: providerFlags.stems.configured,
      disabledReason: providerDisabledReason(providerFlags.stems),
      env: providerFlags.stems.env,
      group: "studio",
      id: "stem-extraction",
      label: "Stem extraction and stem variations",
      requirement: providerFlags.stems.label,
      summary: "Split songs into vocal/instrument stems and request variations.",
    }),
    capability({
      configured: providerFlags.stemVariation.configured,
      disabledReason: providerDisabledReason(providerFlags.stemVariation),
      env: providerFlags.stemVariation.env,
      group: "studio",
      id: "stem-variation",
      label: "Generated stem variations",
      requirement: providerFlags.stemVariation.label,
      summary: "Create alternate takes from real stem outputs or selected regions.",
    }),
    capability({
      configured: providerFlags.voice.configured,
      disabledReason: providerDisabledReason(providerFlags.voice),
      env: providerFlags.voice.env,
      group: "voice",
      id: "voice-generation",
      label: "Verified voice generation",
      requirement: providerFlags.voice.label,
      summary: "Generate vocals from a rights-confirmed voice profile.",
    }),
    capability({
      configured: providerFlags.persona.configured,
      disabledReason: providerDisabledReason(providerFlags.persona),
      env: providerFlags.persona.env,
      group: "voice",
      id: "persona-generation",
      label: "Persona generation",
      requirement: providerFlags.persona.label,
      summary: "Capture vocal, energy, and style traits from original tracks.",
    }),
    capability({
      configured: providerFlags.midi.configured,
      disabledReason: providerDisabledReason(providerFlags.midi),
      env: providerFlags.midi.env,
      group: "studio",
      id: "audio-to-midi",
      label: "Audio-to-MIDI",
      requirement: providerFlags.midi.label,
      summary: "Extract MIDI from uploaded, generated, or stemmed audio.",
    }),
    capability({
      configured: providerFlags.warpMarkers.configured,
      disabledReason: providerDisabledReason(providerFlags.warpMarkers),
      env: providerFlags.warpMarkers.env,
      group: "studio",
      id: "warp-markers",
      label: "Warp markers and transient map",
      requirement: providerFlags.warpMarkers.label,
      summary: "Detect beats, transients, and timing markers for Studio edits.",
    }),
  ];

  return {
    capabilities,
    summary: summarizeProviderCapabilities(capabilities),
  };
}

export function summarizeProviderCapabilities(
  capabilities: ProviderCapability[],
): ProviderCapabilitySummary {
  const ready = capabilities.filter((capability) => capability.state === "ready")
    .length;
  const total = capabilities.length;

  return {
    disabled: total - ready,
    ready,
    score: total ? Math.round((ready / total) * 100) : 0,
    total,
  };
}

function musicCapability(id: string, label: string, provider: ProviderFlag) {
  return capability({
    configured: provider.configured,
    disabledReason: providerDisabledReason(provider),
    env: provider.env,
    group: "music",
    id,
    label,
    requirement: provider.label,
    summary: "Requires a real music model behind the audio job adapter.",
  });
}

function providerDisabledReason(provider: ProviderFlag) {
  return `Connect a ${provider.label}.`;
}

function capability({
  configured,
  disabledReason,
  env,
  group,
  id,
  label,
  requirement,
  summary,
}: Omit<ProviderCapability, "state"> & { configured: boolean }) {
  return {
    disabledReason,
    env,
    group,
    id,
    label,
    requirement,
    state: configured ? "ready" : "disabled",
    summary,
  } satisfies ProviderCapability;
}
