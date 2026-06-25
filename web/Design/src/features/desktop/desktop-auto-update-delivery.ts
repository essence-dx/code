import type {
  DesktopPackagingReadinessCenter,
  DesktopPackagingReadinessSource,
  DesktopPackagingStatus,
  DesktopReleaseChannelId,
} from "@/features/desktop/desktop-packaging-readiness";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

export type DesktopAutoUpdateStatus = DesktopPackagingStatus;

export type DesktopAutoUpdatePlatform =
  | "windows-x86_64"
  | "darwin-aarch64"
  | "linux-x86_64";

export type DesktopAutoUpdateArtifact = {
  id: string;
  channel: DesktopReleaseChannelId;
  version: string;
  platform: DesktopAutoUpdatePlatform;
  fileName: string;
  downloadUrl: string;
  signature: string;
  checksum: string;
  sizeBytes: number;
  publishedAt: string | null;
};

export type DesktopAutoUpdateFeed = {
  id: string;
  channelId: DesktopReleaseChannelId;
  channelLabel: string;
  version: string;
  endpoint: string | null;
  status: DesktopAutoUpdateStatus;
  artifacts: DesktopAutoUpdateArtifact[];
  missingPlatforms: DesktopAutoUpdatePlatform[];
  unsignedArtifactIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type DesktopAutoUpdatePromotion = {
  id: string;
  channelId: DesktopReleaseChannelId;
  channelLabel: string;
  version: string;
  status: DesktopAutoUpdateStatus;
  promotedAt: string | null;
  blockedReasons: string[];
  auditEvidenceIds: string[];
};

export type DesktopAutoUpdateRollbackWindow = {
  id: string;
  channelId: DesktopReleaseChannelId;
  channelLabel: string;
  currentVersion: string;
  rollbackVersion: string | null;
  openedAt: string;
  expiresAt: string;
  status: DesktopAutoUpdateStatus;
  artifactIds: string[];
};

export type DesktopAutoUpdateAuditPacket = {
  id: string;
  status: DesktopAutoUpdateStatus;
  generatedAt: string;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type DesktopAutoUpdateDeliveryCenter = {
  generatedAt: string;
  status: DesktopAutoUpdateStatus;
  score: number;
  feeds: DesktopAutoUpdateFeed[];
  promotions: DesktopAutoUpdatePromotion[];
  rollbackWindows: DesktopAutoUpdateRollbackWindow[];
  auditPacket: DesktopAutoUpdateAuditPacket;
  nextActions: string[];
  totals: {
    feeds: number;
    readyFeeds: number;
    blockedFeeds: number;
    readyPromotions: number;
    rollbackWindows: number;
    activeRollbackWindows: number;
    artifacts: number;
    signedArtifacts: number;
  };
};

export type DesktopAutoUpdateDeliveryInput = {
  source: DesktopPackagingReadinessSource;
  packaging: DesktopPackagingReadinessCenter;
  artifacts: DesktopAutoUpdateArtifact[];
  auditLogs: WorkspaceAuditLogSummary[];
  rollbackHours?: number;
  now?: string | Date;
};

type TauriUpdateFeedPayload = {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<
    string,
    {
      signature: string;
      url: string;
    }
  >;
};

const requiredPlatforms: DesktopAutoUpdatePlatform[] = [
  "windows-x86_64",
  "darwin-aarch64",
  "linux-x86_64",
];

const statusScores: Record<DesktopAutoUpdateStatus, number> = {
  ready: 100,
  review: 72,
  blocked: 35,
};

export function createDesktopAutoUpdateDeliveryCenter(
  input: DesktopAutoUpdateDeliveryInput,
): DesktopAutoUpdateDeliveryCenter {
  const generatedAt = normalizeNow(input.now).toISOString();
  const rollbackHours = input.rollbackHours ?? 72;
  const feeds = createFeeds({ input, generatedAt });
  const promotions = createPromotions({ input, feeds });
  const rollbackWindows = createRollbackWindows({
    input,
    generatedAt,
    rollbackHours,
    feeds,
  });
  const status = aggregateStatus([...feeds, ...promotions, ...rollbackWindows]);
  const score = average([
    ...feeds.map((feed) => statusScores[feed.status]),
    ...promotions.map((promotion) => statusScores[promotion.status]),
    ...rollbackWindows.map((window) => statusScores[window.status]),
  ]);
  const nextActions = createNextActions({
    packaging: input.packaging,
    feeds,
    promotions,
    rollbackWindows,
  });
  const auditPacket = createAuditPacket({
    input,
    generatedAt,
    status,
    score,
    feeds,
    promotions,
    rollbackWindows,
    nextActions,
  });

  return {
    generatedAt,
    status,
    score,
    feeds,
    promotions,
    rollbackWindows,
    auditPacket,
    nextActions,
    totals: {
      feeds: feeds.length,
      readyFeeds: feeds.filter((feed) => feed.status === "ready").length,
      blockedFeeds: feeds.filter((feed) => feed.status === "blocked").length,
      readyPromotions: promotions.filter(
        (promotion) => promotion.status === "ready",
      ).length,
      rollbackWindows: rollbackWindows.length,
      activeRollbackWindows: rollbackWindows.filter(
        (window) => window.status === "ready",
      ).length,
      artifacts: input.artifacts.length,
      signedArtifacts: input.artifacts.filter((artifact) =>
        Boolean(artifact.signature),
      ).length,
    },
  };
}

function createFeeds(input: {
  input: DesktopAutoUpdateDeliveryInput;
  generatedAt: string;
}): DesktopAutoUpdateFeed[] {
  return input.input.source.releaseChannels.map((channel) => {
    const artifacts = input.input.artifacts
      .filter(
        (artifact) =>
          artifact.channel === channel.id &&
          artifact.version === channel.version,
      )
      .sort((left, right) => left.platform.localeCompare(right.platform));
    const artifactPlatforms = new Set(
      artifacts.map((artifact) => artifact.platform),
    );
    const missingPlatforms = requiredPlatforms.filter(
      (platform) => !artifactPlatforms.has(platform),
    );
    const unsignedArtifactIds = artifacts
      .filter((artifact) => !artifact.signature)
      .map((artifact) => artifact.id);
    const status: DesktopAutoUpdateStatus =
      !channel.updateEndpoint ||
      missingPlatforms.length ||
      unsignedArtifactIds.length
        ? "blocked"
        : artifacts.length < requiredPlatforms.length
          ? "review"
          : "ready";
    const payload = createFeedPayload({
      channelLabel: channel.label,
      version: channel.version,
      generatedAt: input.generatedAt,
      artifacts,
    });
    const json = JSON.stringify(payload, null, 2);

    return {
      id: `desktop-update-feed-${channel.id}-${slugify(channel.version)}`,
      channelId: channel.id,
      channelLabel: channel.label,
      version: channel.version,
      endpoint: channel.updateEndpoint,
      status,
      artifacts,
      missingPlatforms,
      unsignedArtifactIds,
      download: {
        fileName: `${channel.id}-latest-${channel.version}.json`,
        href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
        json,
      },
    };
  });
}

function createFeedPayload(input: {
  channelLabel: string;
  version: string;
  generatedAt: string;
  artifacts: DesktopAutoUpdateArtifact[];
}): TauriUpdateFeedPayload {
  return {
    version: input.version,
    notes: `${input.channelLabel} desktop auto-update feed for ${input.version}.`,
    pub_date:
      input.artifacts.find((artifact) => artifact.publishedAt)?.publishedAt ??
      input.generatedAt,
    platforms: Object.fromEntries(
      input.artifacts.map((artifact) => [
        artifact.platform,
        {
          signature: artifact.signature,
          url: artifact.downloadUrl,
        },
      ]),
    ),
  };
}

function createPromotions(input: {
  input: DesktopAutoUpdateDeliveryInput;
  feeds: DesktopAutoUpdateFeed[];
}): DesktopAutoUpdatePromotion[] {
  return input.input.source.releaseChannels.map((channel) => {
    const feed = input.feeds.find((item) => item.channelId === channel.id);
    const blockedReasons = [
      ...(input.input.packaging.status === "ready"
        ? []
        : [
            `Resolve desktop packaging readiness before promoting ${channel.label}.`,
          ]),
      ...(feed?.status === "ready"
        ? []
        : [`Publish a ready signed update feed for ${channel.label}.`]),
      ...(input.input.source.signing.updaterPublicKeyConfigured
        ? []
        : [
            "Configure updater public-key verification before channel promotion.",
          ]),
    ];
    const status: DesktopAutoUpdateStatus = blockedReasons.length
      ? "blocked"
      : channel.promotedAt
        ? "ready"
        : "review";

    return {
      id: `desktop-update-promotion-${channel.id}-${slugify(channel.version)}`,
      channelId: channel.id,
      channelLabel: channel.label,
      version: channel.version,
      status,
      promotedAt: channel.promotedAt,
      blockedReasons,
      auditEvidenceIds: input.input.auditLogs
        .filter((log) =>
          new RegExp(
            `${channel.id}|${channel.label}|desktop|release`,
            "i",
          ).test(`${log.action} ${log.summary}`),
        )
        .map((log) => log.id),
    };
  });
}

function createRollbackWindows(input: {
  input: DesktopAutoUpdateDeliveryInput;
  generatedAt: string;
  rollbackHours: number;
  feeds: DesktopAutoUpdateFeed[];
}): DesktopAutoUpdateRollbackWindow[] {
  const openedAt = input.generatedAt;
  const expiresAt = addHours(openedAt, input.rollbackHours).toISOString();

  return input.input.source.releaseChannels.map((channel) => {
    const currentArtifacts = input.input.artifacts.filter(
      (artifact) =>
        artifact.channel === channel.id && artifact.version === channel.version,
    );
    const rollbackCandidates = input.input.artifacts
      .filter(
        (artifact) =>
          artifact.channel === channel.id &&
          artifact.version !== channel.version,
      )
      .sort((left, right) => compareVersionsDesc(left.version, right.version));
    const rollbackVersion = rollbackCandidates[0]?.version ?? null;
    const rollbackArtifactIds = rollbackCandidates
      .filter((artifact) => artifact.version === rollbackVersion)
      .map((artifact) => artifact.id);
    const feed = input.feeds.find((item) => item.channelId === channel.id);
    const status: DesktopAutoUpdateStatus =
      feed?.status === "blocked"
        ? "blocked"
        : rollbackVersion && currentArtifacts.length
          ? "ready"
          : "review";

    return {
      id: `desktop-update-rollback-${channel.id}-${slugify(channel.version)}`,
      channelId: channel.id,
      channelLabel: channel.label,
      currentVersion: channel.version,
      rollbackVersion,
      openedAt,
      expiresAt,
      status,
      artifactIds: [
        ...currentArtifacts.map((artifact) => artifact.id),
        ...rollbackArtifactIds,
      ],
    };
  });
}

function createNextActions(input: {
  packaging: DesktopPackagingReadinessCenter;
  feeds: DesktopAutoUpdateFeed[];
  promotions: DesktopAutoUpdatePromotion[];
  rollbackWindows: DesktopAutoUpdateRollbackWindow[];
}) {
  return [
    ...(input.packaging.status === "ready"
      ? []
      : [
          `Resolve desktop packaging readiness (${input.packaging.score}/100) before promoting signed auto-updates.`,
        ]),
    ...input.feeds.flatMap((feed) => [
      ...feed.missingPlatforms.map(
        (platform) =>
          `Publish ${feed.channelId} ${feed.version} ${platform} update artifact.`,
      ),
      ...feed.unsignedArtifactIds.map((artifactId) => {
        const artifact = feed.artifacts.find((item) => item.id === artifactId);

        return `Sign ${feed.channelId} ${feed.version} ${artifact?.platform ?? artifactId} update artifact.`;
      }),
      ...(feed.endpoint
        ? []
        : [
            `Attach ${feed.channelLabel} update endpoint before feed publishing.`,
          ]),
    ]),
    ...input.promotions.flatMap((promotion) => promotion.blockedReasons),
    ...input.rollbackWindows
      .filter((window) => window.status === "review")
      .map(
        (window) =>
          `Attach rollback artifacts for ${window.channelLabel} ${window.currentVersion}.`,
      ),
  ].slice(0, 8);
}

function createAuditPacket(input: {
  input: DesktopAutoUpdateDeliveryInput;
  generatedAt: string;
  status: DesktopAutoUpdateStatus;
  score: number;
  feeds: DesktopAutoUpdateFeed[];
  promotions: DesktopAutoUpdatePromotion[];
  rollbackWindows: DesktopAutoUpdateRollbackWindow[];
  nextActions: string[];
}): DesktopAutoUpdateAuditPacket {
  const payload = {
    kind: "essence-studio.desktop-auto-update-delivery",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    package: {
      productName: input.input.source.productName,
      identifier: input.input.source.identifier,
      appVersion: input.input.source.appVersion,
      updaterActive: input.input.source.updater.active,
      updaterPublicKeyConfigured:
        input.input.source.signing.updaterPublicKeyConfigured,
    },
    readinessPacketId: input.input.packaging.releasePacket.id,
    feeds: input.feeds.map((feed) => ({
      id: feed.id,
      channelId: feed.channelId,
      status: feed.status,
      version: feed.version,
      endpoint: feed.endpoint,
      artifactIds: feed.artifacts.map((artifact) => artifact.id),
      missingPlatforms: feed.missingPlatforms,
      unsignedArtifactIds: feed.unsignedArtifactIds,
    })),
    promotions: input.promotions,
    rollbackWindows: input.rollbackWindows,
    nextActions: input.nextActions,
    auditLogIds: input.input.auditLogs.map((log) => log.id),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "desktop-auto-update-delivery-audit-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    download: {
      fileName: `essence-desktop-auto-update-delivery-${input.input.source.appVersion}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function aggregateStatus(
  items: Array<{ status: DesktopAutoUpdateStatus }>,
): DesktopAutoUpdateStatus {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 100;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function compareVersionsDesc(left: string, right: string) {
  return right.localeCompare(left, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function addHours(value: string, hours: number) {
  const date = new Date(value);

  date.setUTCHours(date.getUTCHours() + hours);

  return date;
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}
