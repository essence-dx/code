import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";

export type MarketplaceInstallTrend =
  | "new"
  | "rising"
  | "steady"
  | "needs-attention";

export type MarketplaceModerationStatus = "ready" | "watch" | "action";

export type MarketplaceInstallRecord = {
  templateId: string;
  installedAt: string;
};

export type MarketplaceGrowthState = {
  favoriteTemplateIds: string[];
  savedCreatorKeys: string[];
  offlinePackIds: string[];
  installRecords: MarketplaceInstallRecord[];
};

export type MarketplaceGrowthTemplate = MarketplaceDiscoveryTemplate & {
  creatorKey: string;
  favoriteScore: number;
  ratingAverage: number;
  reviewSignalCount: number;
  installTrend: MarketplaceInstallTrend;
  moderationStatus: MarketplaceModerationStatus;
  moderationReasons: string[];
  offlinePackId: string;
  isFavorite: boolean;
  isCreatorSaved: boolean;
  isInstalled: boolean;
};

export type MarketplaceGrowthCreator = {
  key: string;
  label: string;
  detail: string;
  templateCount: number;
  templateIds: string[];
  totalViews: number;
  totalUses: number;
  averageRating: number;
  averageQuality: number;
  saved: boolean;
};

export type MarketplaceOfflinePack = {
  id: string;
  label: string;
  collection: string;
  templateCount: number;
  templateIds: string[];
  totalViews: number;
  totalUses: number;
  averageQuality: number;
  estimatedSizeKb: number;
  saved: boolean;
  templates: MarketplaceGrowthTemplate[];
};

export type MarketplaceInstallHistoryItem = {
  template: MarketplaceGrowthTemplate;
  installedAt: string;
};

export type MarketplaceModerationQueueItem = {
  template: MarketplaceGrowthTemplate;
  status: MarketplaceModerationStatus;
  reasons: string[];
};

export type MarketplaceOfflinePackManifest = {
  id: string;
  label: string;
  createdAt: string;
  templateCount: number;
  templates: Array<{
    id: string;
    name: string;
    collection: string;
    width: number;
    height: number;
    thumbnail: string | null;
    creator: string;
  }>;
};

export type MarketplaceGrowth = {
  templates: MarketplaceGrowthTemplate[];
  featuredTemplates: MarketplaceGrowthTemplate[];
  favoriteTemplates: MarketplaceGrowthTemplate[];
  creators: MarketplaceGrowthCreator[];
  savedCreators: MarketplaceGrowthCreator[];
  offlinePacks: MarketplaceOfflinePack[];
  savedOfflinePacks: MarketplaceOfflinePack[];
  installHistory: MarketplaceInstallHistoryItem[];
  moderationQueue: MarketplaceModerationQueueItem[];
  totals: {
    published: number;
    favorites: number;
    savedCreators: number;
    installs: number;
    offlinePacks: number;
    averageRating: number;
    moderationNeeds: number;
  };
};

export const emptyMarketplaceGrowthState: MarketplaceGrowthState = {
  favoriteTemplateIds: [],
  savedCreatorKeys: [],
  offlinePackIds: [],
  installRecords: [],
};

export function normalizeMarketplaceGrowthState(
  state?: Partial<MarketplaceGrowthState> | null,
): MarketplaceGrowthState {
  return {
    favoriteTemplateIds: uniqueStrings(state?.favoriteTemplateIds),
    savedCreatorKeys: uniqueStrings(state?.savedCreatorKeys),
    offlinePackIds: uniqueStrings(state?.offlinePackIds),
    installRecords: uniqueInstallRecords(state?.installRecords),
  };
}

export function toggleMarketplaceGrowthListValue(
  values: string[],
  value: string,
): string[] {
  const normalizedValue = value.trim();

  if (!normalizedValue) return uniqueStrings(values);

  const nextValues = uniqueStrings(values);

  if (nextValues.includes(normalizedValue)) {
    return nextValues.filter((item) => item !== normalizedValue);
  }

  return [normalizedValue, ...nextValues];
}

export function addMarketplaceInstallRecord(
  state: MarketplaceGrowthState,
  templateId: string,
  installedAt = new Date().toISOString(),
): MarketplaceGrowthState {
  const normalizedTemplateId = templateId.trim();

  if (!normalizedTemplateId) return normalizeMarketplaceGrowthState(state);

  return normalizeMarketplaceGrowthState({
    ...state,
    installRecords: [
      { templateId: normalizedTemplateId, installedAt },
      ...state.installRecords.filter(
        (record) => record.templateId !== normalizedTemplateId,
      ),
    ],
  });
}

export function getMarketplaceCreatorKey(
  template: Pick<MarketplaceDiscoveryTemplate, "creatorLabel" | "creatorDetail">,
) {
  return `${template.creatorLabel}:${template.creatorDetail}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createMarketplaceOfflinePackId(collection: string) {
  const normalizedCollection = collection
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `pack-${normalizedCollection || "general"}`;
}

export function createOfflineTemplatePackManifest(
  pack: MarketplaceOfflinePack,
  createdAt = new Date().toISOString(),
): MarketplaceOfflinePackManifest {
  return {
    id: pack.id,
    label: pack.label,
    createdAt,
    templateCount: pack.templateCount,
    templates: pack.templates.map((template) => ({
      id: template.id,
      name: template.name,
      collection: template.collection,
      width: template.width,
      height: template.height,
      thumbnail: template.thumbnail,
      creator: template.creatorDetail,
    })),
  };
}

function uniqueStrings(values?: string[]) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function uniqueInstallRecords(records?: MarketplaceInstallRecord[]) {
  const seen = new Set<string>();
  const normalized: MarketplaceInstallRecord[] = [];

  for (const record of records ?? []) {
    const templateId = record.templateId.trim();
    const installedAt = record.installedAt.trim();

    if (!templateId || !installedAt || seen.has(templateId)) {
      continue;
    }

    normalized.push({ templateId, installedAt });
    seen.add(templateId);
  }

  return normalized;
}
