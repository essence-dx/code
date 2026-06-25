import type {
  AiProviderStatus,
  ProviderCapability,
} from "@/lib/ai/schemas";

export const generationContractCapabilityIds = [
  "song-generation",
  "custom-song-generation",
  "generation-variants",
  "sample-generation",
  "cover-remix",
  "extend-song",
  "replace-section",
  "instrumental-backing",
  "voice-generation",
  "creative-controls",
] as const;

export type GenerationContractCapabilityId =
  (typeof generationContractCapabilityIds)[number];

export type ProviderContractSnapshot = {
  capturedAt: string;
  features: Array<{
    disabledReason: string;
    id: GenerationContractCapabilityId;
    label: string;
    ready: boolean;
    requirement: string;
    summary: string;
  }>;
  score: number;
};

const providerContractDetails = {
  "song-generation": ["Prompt", "Style", "Lyrics", "Title"],
  "custom-song-generation": ["Lyrics", "Style", "Title", "Voice metadata"],
  "generation-variants": ["Take count", "Variant group", "Variant index"],
  "sample-generation": ["Prompt", "Style", "Duration", "Source context"],
  "cover-remix": ["Source audio", "Target style", "Lyrics", "Mode"],
  "extend-song": ["Source audio", "Continuation prompt", "Extend point", "Length"],
  "replace-section": ["Source region", "Direction", "Mode", "Lyrics"],
  "instrumental-backing": ["Source kind", "Direction", "Lyrics", "Region"],
  "voice-generation": ["Voice profile", "Lyrics", "Rights confirmation"],
  "creative-controls": ["Weirdness", "Structure", "Reference influence"],
} satisfies Record<GenerationContractCapabilityId, string[]>;

export function createProviderContractSnapshot(
  status: Pick<AiProviderStatus, "capabilities" | "capabilitySummary">,
): ProviderContractSnapshot {
  const features = getGenerationContractCapabilities(status.capabilities).map(
    (capability) => ({
      disabledReason: capability.disabledReason,
      id: capability.id,
      label: capability.label,
      ready: capability.state === "ready",
      requirement: capability.requirement,
      summary: capability.summary,
    }),
  );

  return {
    capturedAt: new Date().toISOString(),
    features,
    score: status.capabilitySummary.score,
  };
}

export function getGenerationContractCapabilities(
  capabilities: ProviderCapability[],
) {
  return generationContractCapabilityIds
    .map((id) => {
      const capability = capabilities.find((item) => item.id === id);
      return capability && isGenerationContractCapabilityId(capability.id)
        ? { ...capability, id: capability.id }
        : undefined;
    })
    .filter(
      (
        capability,
      ): capability is ProviderCapability & {
        id: GenerationContractCapabilityId;
      } => Boolean(capability),
    );
}

export function getProviderContractDetails(capabilityId: string) {
  return isGenerationContractCapabilityId(capabilityId)
    ? providerContractDetails[capabilityId]
    : [];
}

function isGenerationContractCapabilityId(
  id: string,
): id is GenerationContractCapabilityId {
  return generationContractCapabilityIds.includes(
    id as GenerationContractCapabilityId,
  );
}
