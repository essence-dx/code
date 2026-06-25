import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import {
  createDesktopAutoUpdateDeliveryCenter,
  type DesktopAutoUpdateArtifact,
} from "@/features/desktop/desktop-auto-update-delivery";
import type { DesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import {
  createDesktopPackagingReadinessCenter,
  type DesktopPackagingReadinessSource,
} from "@/features/desktop/desktop-packaging-readiness";
import type { DesktopSyncReconciliationCenter } from "@/features/desktop/desktop-sync-reconciliation";
import type { OperationalHealthReport } from "@/features/operations/operational-health";
import type { ReleaseReadinessReport } from "@/features/operations/release-readiness-gates";

describe("desktop auto-update delivery", () => {
  test("publishes signed channel feeds with promotion controls, rollback windows, and an audit packet", () => {
    const source = createReadySource();
    const packaging = createDesktopPackagingReadinessCenter({
      source,
      releaseReadiness: createReleaseReadinessReport(),
      offlineSync: createOfflineSyncCenter(),
      syncReconciliation: createSyncReconciliationCenter(),
      operationalHealth: createOperationalHealthReport(),
      auditLogs: [createAuditLog()],
      now: "2026-05-18T12:00:00.000Z",
    });

    const center = createDesktopAutoUpdateDeliveryCenter({
      source,
      packaging,
      artifacts: [
        ...createChannelArtifacts({ channel: "stable", version: "1.4.0" }),
        ...createChannelArtifacts({
          channel: "stable",
          version: "1.3.2",
          publishedAt: "2026-05-16T09:00:00.000Z",
        }),
        ...createChannelArtifacts({
          channel: "beta",
          version: "1.5.0-beta.1",
        }),
        ...createChannelArtifacts({
          channel: "beta",
          version: "1.5.0-beta.0",
          publishedAt: "2026-05-17T09:00:00.000Z",
        }),
        ...createChannelArtifacts({
          channel: "canary",
          version: "1.5.0-canary.3",
        }),
        ...createChannelArtifacts({
          channel: "canary",
          version: "1.5.0-canary.2",
          publishedAt: "2026-05-17T08:00:00.000Z",
        }),
      ],
      auditLogs: [createAuditLog()],
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.feeds.length, 3);
    assert.equal(
      center.feeds.find((feed) => feed.channelId === "stable")?.status,
      "ready",
    );
    assert.equal(
      center.promotions.find((promotion) => promotion.channelId === "stable")
        ?.status,
      "ready",
    );
    assert.equal(
      center.rollbackWindows.find((window) => window.channelId === "stable")
        ?.status,
      "ready",
    );
    assert.equal(center.totals.readyFeeds, 3);
    assert.equal(center.totals.readyPromotions, 3);
    assert.equal(
      center.auditPacket.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      JSON.parse(center.feeds[0]?.download.json ?? "{}").platforms[
        "windows-x86_64"
      ].signature,
      "signed-windows-x86_64-1.4.0",
    );
  });

  test("blocks feed publishing and channel promotion when signatures or readiness are missing", () => {
    const source = createReadySource({
      signing: {
        updaterPublicKeyConfigured: false,
        windowsCertificateConfigured: true,
        macosIdentityConfigured: true,
      },
    });
    const packaging = createDesktopPackagingReadinessCenter({
      source,
      releaseReadiness: createReleaseReadinessReport(),
      offlineSync: createOfflineSyncCenter(),
      syncReconciliation: createSyncReconciliationCenter(),
      operationalHealth: createOperationalHealthReport(),
      auditLogs: [],
      now: "2026-05-18T12:00:00.000Z",
    });

    const center = createDesktopAutoUpdateDeliveryCenter({
      source,
      packaging,
      artifacts: [
        createArtifact({
          channel: "stable",
          version: "1.4.0",
          signature: "",
        }),
      ],
      auditLogs: [],
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(
      center.feeds.find((feed) => feed.channelId === "stable")?.status,
      "blocked",
    );
    assert.equal(
      center.promotions.find((promotion) => promotion.channelId === "stable")
        ?.status,
      "blocked",
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Sign stable 1.4.0 windows-x86_64"),
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Resolve desktop packaging readiness"),
      ),
      true,
    );
  });
});

function createReadySource(
  overrides: Partial<DesktopPackagingReadinessSource> = {},
): DesktopPackagingReadinessSource {
  return {
    productName: "Essence Studio",
    identifier: "com.essencefromexistence.studio",
    appVersion: "1.4.0",
    cargoVersion: "1.4.0",
    rustVersion: "1.77.2",
    frontendDist: "https://essence-studio-omega.vercel.app",
    devUrl: "http://localhost:3000",
    beforeBuildCommand: "",
    bundleActive: true,
    bundleTargets: ["nsis", "msi", "dmg", "appimage"],
    icons: [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico",
    ],
    license: "Apache-2.0",
    repository: "https://github.com/essencefromexistence/essence-studio",
    tauriVersion: "2.11.1",
    tauriBuildVersion: "2.6.1",
    logPluginConfigured: true,
    signing: {
      updaterPublicKeyConfigured: true,
      windowsCertificateConfigured: true,
      macosIdentityConfigured: true,
    },
    updater: {
      active: true,
      endpoints: [
        "https://updates.essence.studio/stable/latest.json",
        "https://updates.essence.studio/beta/latest.json",
        "https://updates.essence.studio/canary/latest.json",
      ],
    },
    releaseChannels: [
      createChannel({
        id: "stable",
        label: "Stable",
        version: "1.4.0",
        updateEndpoint: "https://updates.essence.studio/stable/latest.json",
        promotedAt: "2026-05-18T10:00:00.000Z",
      }),
      createChannel({
        id: "beta",
        label: "Beta",
        version: "1.5.0-beta.1",
        updateEndpoint: "https://updates.essence.studio/beta/latest.json",
        promotedAt: "2026-05-18T09:00:00.000Z",
      }),
      createChannel({
        id: "canary",
        label: "Canary",
        version: "1.5.0-canary.3",
        updateEndpoint: "https://updates.essence.studio/canary/latest.json",
        promotedAt: "2026-05-18T08:00:00.000Z",
      }),
    ],
    ...overrides,
  };
}

function createChannel(
  overrides: Partial<
    DesktopPackagingReadinessSource["releaseChannels"][number]
  > = {},
): DesktopPackagingReadinessSource["releaseChannels"][number] {
  return {
    id: "stable",
    label: "Stable",
    version: "1.4.0",
    updateEndpoint: "https://updates.essence.studio/stable/latest.json",
    promotedAt: "2026-05-18T10:00:00.000Z",
    ...overrides,
  };
}

function createArtifact(
  overrides: Partial<DesktopAutoUpdateArtifact> = {},
): DesktopAutoUpdateArtifact {
  const channel = overrides.channel ?? "stable";
  const version = overrides.version ?? "1.4.0";
  const platform = overrides.platform ?? "windows-x86_64";

  return {
    id: `${channel}-${platform}-${version}`,
    channel,
    version,
    platform,
    fileName: `essence-studio-${version}-${platform}.zip`,
    downloadUrl: `https://updates.essence.studio/${channel}/essence-studio-${version}-${platform}.zip`,
    signature: `signed-${platform}-${version}`,
    checksum: `sha256-${platform}-${version}`,
    sizeBytes: 42_000_000,
    publishedAt: "2026-05-18T11:00:00.000Z",
    ...overrides,
  };
}

function createChannelArtifacts(
  input: Pick<DesktopAutoUpdateArtifact, "channel" | "version"> &
    Partial<DesktopAutoUpdateArtifact>,
) {
  return (["windows-x86_64", "darwin-aarch64", "linux-x86_64"] as const).map(
    (platform) =>
      createArtifact({
        ...input,
        platform,
      }),
  );
}

function createReleaseReadinessReport(
  overrides: Partial<ReleaseReadinessReport> = {},
): ReleaseReadinessReport {
  return {
    generatedAt: "2026-05-18T10:00:00.000Z",
    status: "ready",
    score: 96,
    gates: [],
    nextActions: [],
    packet: {
      fileName: "release-readiness.json",
      dataUrl: "data:application/json,%7B%7D",
      payload: {
        kind: "essence-studio.release-readiness",
        version: 1,
        generatedAt: "2026-05-18T10:00:00.000Z",
        status: "ready",
        score: 96,
        gates: [],
        nextActions: [],
        routeDefinitions: [],
      },
    },
    totals: {
      criticalRoutes: 10,
      coveredCriticalRoutes: 10,
      environmentChecks: 6,
      blockedEnvironmentChecks: 0,
      activeProjects: 2,
      missingSnapshots: 0,
      staleSnapshots: 0,
      verifiedSeededAccounts: 1,
      vercelChecks: 2,
    },
    ...overrides,
  };
}

function createOfflineSyncCenter(
  overrides: Partial<DesktopOfflineSyncCenter> = {},
): DesktopOfflineSyncCenter {
  return {
    status: "ready",
    score: 95,
    queue: [],
    diagnostics: [],
    nextActions: [],
    totals: {
      queueItems: 0,
      conflicts: 0,
      resumableUploads: 0,
      exportHandoffs: 0,
      localToCloudHandoffs: 0,
      batchExports: 0,
      watchedFolders: 0,
      integrityIssues: 0,
      auditEvents: 1,
    },
    ...overrides,
  };
}

function createSyncReconciliationCenter(
  overrides: Partial<DesktopSyncReconciliationCenter> = {},
): DesktopSyncReconciliationCenter {
  return {
    generatedAt: "2026-05-18T10:00:00.000Z",
    status: "ready",
    score: 95,
    conflictDiffs: [],
    recoveryChoices: [],
    staleAssetRepairs: [],
    auditTrail: [],
    packet: {
      fileName: "sync-packet.json",
      dataUrl: "data:application/json,%7B%7D",
      json: "{}",
      fingerprint: "sync-packet",
    },
    nextActions: [],
    totals: {
      activeProjects: 0,
      conflictDiffs: 0,
      recoveryChoices: 0,
      staleAssetRepairs: 0,
      auditTrail: 1,
      failedExports: 0,
      missingVersions: 0,
      missingExports: 0,
      offlineQueueItems: 0,
    },
    ...overrides,
  };
}

function createOperationalHealthReport(
  overrides: Partial<OperationalHealthReport> = {},
): OperationalHealthReport {
  return {
    checkedAt: "2026-05-18T10:00:00.000Z",
    status: "healthy",
    groups: [],
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-desktop-release",
    action: "desktop.release.promoted",
    targetType: "desktop-release",
    targetId: "stable",
    summary: "Stable desktop auto-update channel promoted.",
    createdAt: "2026-05-18T10:00:00.000Z",
    actorEmail: "admin@essence.studio",
    metadata: {},
    ...overrides,
  };
}
