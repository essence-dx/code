import type { ProviderCapability } from "@/lib/ai/schemas";

const setupPriorityCapabilityIds = [
  "song-generation",
  "custom-song-generation",
  "extend-song",
  "cover-remix",
  "stem-extraction",
  "voice-generation",
];

export type ProviderSetupGroupId =
  | "create"
  | "other"
  | "studio"
  | "transform"
  | "voice";

export type ProviderSetupGroup = {
  id: ProviderSetupGroupId;
  items: ProviderCapability[];
  label: string;
};

export type ProviderSetupBadge = {
  label: string;
  summary: string;
};

export const providerSetupOutcomeMaxLength = 64;

const setupGroupOrder: ProviderSetupGroupId[] = [
  "create",
  "transform",
  "studio",
  "voice",
  "other",
];

const setupGroupLabels: Record<ProviderSetupGroupId, string> = {
  create: "Create songs",
  other: "Other unlocks",
  studio: "Studio prep",
  transform: "Transform tracks",
  voice: "Voice",
};

const setupGroupByCapabilityId: Record<string, ProviderSetupGroupId> = {
  "cover-remix": "transform",
  "custom-song-generation": "create",
  "extend-song": "transform",
  "song-generation": "create",
  "stem-extraction": "studio",
  "voice-generation": "voice",
};

const setupOutcomeByCapabilityId: Record<string, string> = {
  "cover-remix": "Unlock covers and remixes from an existing song.",
  "custom-song-generation": "Unlock full songs from your lyrics, title, and style.",
  "extend-song": "Unlock continuations from an existing clip.",
  "song-generation": "Unlock full song generation from a short prompt.",
  "stem-extraction": "Unlock vocal and instrumental stems for Studio edits.",
  "voice-generation": "Unlock generated vocals from a verified voice profile.",
};

export function getProviderSetupItems(capabilities: ProviderCapability[]) {
  return capabilities
    .filter((capability) => capability.state !== "ready")
    .sort((left, right) => {
      const leftIndex = setupPriorityCapabilityIds.indexOf(left.id);
      const rightIndex = setupPriorityCapabilityIds.indexOf(right.id);

      return sortPriority(leftIndex) - sortPriority(rightIndex);
    })
    .slice(0, 4);
}

export function groupProviderSetupItems(
  capabilities: ProviderCapability[],
): ProviderSetupGroup[] {
  const groups = new Map<ProviderSetupGroupId, ProviderCapability[]>();

  for (const capability of getProviderSetupItems(capabilities)) {
    const group = getProviderSetupOutcomeGroup(capability);
    groups.set(group, [...(groups.get(group) ?? []), capability]);
  }

  return setupGroupOrder
    .filter((group) => groups.has(group))
    .map((group) => ({
      id: group,
      items: groups.get(group) ?? [],
      label: setupGroupLabels[group],
    }));
}

export function getProviderSetupSummary(capabilities: ProviderCapability[]) {
  return formatProviderSetupSummary(getProviderSetupSummaryState(capabilities));
}

export function getProviderSetupBadgeLabel(capabilities: ProviderCapability[]) {
  return formatProviderSetupBadgeLabel(
    getProviderSetupSummaryState(capabilities),
  );
}

export function getProviderSetupBadge(
  capabilities: ProviderCapability[],
): ProviderSetupBadge {
  const state = getProviderSetupSummaryState(capabilities);

  return {
    label: formatProviderSetupBadgeLabel(state),
    summary: formatProviderSetupSummary(state),
  };
}

export function getProviderSetupOutcome(capability: ProviderCapability) {
  return setupOutcomeByCapabilityId[capability.id] ?? capability.summary;
}

export function getProviderSetupOutcomeGroup(
  capability: ProviderCapability,
): ProviderSetupGroupId {
  return setupGroupByCapabilityId[capability.id] ?? "other";
}

export function isProviderSetupOutcomeCompact(
  capability: ProviderCapability,
  maxLength = providerSetupOutcomeMaxLength,
) {
  return getProviderSetupOutcome(capability).length <= maxLength;
}

export function getRemainingProviderSetupItemCount(
  capabilities: ProviderCapability[],
  visibleCount: number,
) {
  return Math.max(
    0,
    capabilities.filter((capability) => capability.state !== "ready").length -
      visibleCount,
  );
}

function sortPriority(index: number) {
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getPrioritySetupCapabilities(capabilities: ProviderCapability[]) {
  return capabilities.filter((capability) =>
    setupPriorityCapabilityIds.includes(capability.id),
  );
}

type ProviderSetupSummaryState = {
  hasPriorityCapabilities: boolean;
  locked: number;
  total: number;
};

function getProviderSetupSummaryState(
  capabilities: ProviderCapability[],
): ProviderSetupSummaryState {
  const priorityCapabilities = getPrioritySetupCapabilities(capabilities);
  const hasPriorityCapabilities = priorityCapabilities.length > 0;
  const summaryCapabilities = hasPriorityCapabilities
    ? priorityCapabilities
    : capabilities;
  const locked = summaryCapabilities.filter(
    (capability) => capability.state !== "ready",
  ).length;

  return {
    hasPriorityCapabilities,
    locked,
    total: summaryCapabilities.length,
  };
}

function formatProviderSetupSummary({
  hasPriorityCapabilities,
  locked,
  total,
}: ProviderSetupSummaryState) {
  if (!total) {
    return "Checking creation paths";
  }

  if (!locked) {
    return hasPriorityCapabilities
      ? "Priority paths ready"
      : "Provider paths ready";
  }

  return formatProviderSetupLockedCount({
    locked,
    prefix: hasPriorityCapabilities ? "priority " : "",
    total,
  });
}

function formatProviderSetupBadgeLabel({
  locked,
  total,
}: ProviderSetupSummaryState) {
  if (!total) {
    return "Checking";
  }

  if (!locked) {
    return "Ready";
  }

  return `${locked}/${total} locked`;
}

function formatProviderSetupLockedCount({
  locked,
  prefix,
  total,
}: {
  locked: number;
  prefix: string;
  total: number;
}) {
  return `${locked}/${total} ${prefix}${locked === 1 ? "path" : "paths"} locked`;
}
