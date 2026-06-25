import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import type { DesktopPackagingReadinessSource } from "@/features/desktop/desktop-packaging-readiness";
import { createDesktopPackagingReadinessCenter } from "@/features/desktop/desktop-packaging-readiness";
import type { DesktopSyncReconciliationCenter } from "@/features/desktop/desktop-sync-reconciliation";
import type { OperationalHealthReport } from "@/features/operations/operational-health";
import type { ReleaseReadinessReport } from "@/features/operations/release-readiness-gates";

describe("desktop packaging readiness", () => {
  test("blocks desktop release promotion when signing and updater evidence are missing", () => {
    const center = createDesktopPackagingReadinessCenter({
      source: createSource(),
      releaseReadiness: createReleaseReadinessReport(),
      offlineSync: createOfflineSyncCenter(),
      syncReconciliation: createSyncReconciliationCenter(),
      operationalHealth: createOperationalHealthReport(),
      auditLogs: [
        createAuditLog({
          id: "audit-desktop",
          action: "project.version.created",
          summary: "Created a release snapshot before desktop handoff.",
        }),
      ],
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.generatedAt, "2026-05-18T12:00:00.000Z");
    assert.equal(center.totals.releaseChannels, 3);
    assert.equal(center.totals.installerTargets, 3);
    assert.equal(center.totals.blockedChecks >= 2, true);
    assert.equal(
      center.gates.find((gate) => gate.id === "signing")?.status,
      "blocked",
    );
    assert.equal(
      center.gates.find((gate) => gate.id === "update-readiness")?.status,
      "blocked",
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Configure Tauri updater signing keys"),
      ),
      true,
    );
    assert.equal(
      center.releaseNotes.sections.some(
        (section) => section.title === "Installer QA evidence",
      ),
      true,
    );
    assert.equal(
      center.releasePacket.download.href.startsWith("data:application/json"),
      true,
    );
  });

  test("marks desktop release readiness ready when signed channels, installers, and QA evidence align", () => {
    const center = createDesktopPackagingReadinessCenter({
      source: createSource({
        appVersion: "1.4.0",
        cargoVersion: "1.4.0",
        license: "Apache-2.0",
        repository: "https://github.com/essencefromexistence/essence-studio",
        bundleTargets: ["nsis", "msi", "dmg", "appimage"],
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
      }),
      releaseReadiness: createReleaseReadinessReport({
        status: "ready",
        score: 96,
      }),
      offlineSync: createOfflineSyncCenter({ status: "ready", score: 94 }),
      syncReconciliation: createSyncReconciliationCenter({
        status: "ready",
        score: 95,
      }),
      operationalHealth: createOperationalHealthReport({ status: "healthy" }),
      auditLogs: [
        createAuditLog({
          action: "project.version.created",
          summary: "Release snapshot ready.",
        }),
      ],
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.score >= 90, true);
    assert.equal(center.totals.blockedChecks, 0);
    assert.equal(center.nextActions.length, 0);
    assert.equal(
      center.gates.every((gate) => gate.status === "ready"),
      true,
    );
    assert.equal(
      center.releaseNotes.sections.some((section) =>
        section.items.some((item) => item.includes("Stable channel 1.4.0")),
      ),
      true,
    );
  });
});

function createSource(
  overrides: Partial<DesktopPackagingReadinessSource> = {},
): DesktopPackagingReadinessSource {
  return {
    productName: "Essence Studio",
    identifier: "com.essencefromexistence.studio",
    appVersion: "0.1.0",
    cargoVersion: "0.1.0",
    rustVersion: "1.77.2",
    frontendDist: "https://essence-studio-omega.vercel.app",
    devUrl: "http://localhost:3000",
    beforeBuildCommand: "",
    bundleActive: true,
    bundleTargets: ["all"],
    icons: [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico",
    ],
    license: "",
    repository: "",
    tauriVersion: "2.11.1",
    tauriBuildVersion: "2.6.1",
    logPluginConfigured: true,
    signing: {
      updaterPublicKeyConfigured: false,
      windowsCertificateConfigured: false,
      macosIdentityConfigured: false,
    },
    updater: {
      active: false,
      endpoints: [],
    },
    releaseChannels: [
      createChannel({ id: "stable", label: "Stable", version: "0.1.0" }),
      createChannel({ id: "beta", label: "Beta", version: "0.1.0-beta.1" }),
      createChannel({
        id: "canary",
        label: "Canary",
        version: "0.1.0-canary.1",
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
    version: "0.1.0",
    updateEndpoint: null,
    promotedAt: null,
    ...overrides,
  };
}

function createReleaseReadinessReport(
  overrides: Partial<ReleaseReadinessReport> = {},
): ReleaseReadinessReport {
  return {
    generatedAt: "2026-05-18T10:00:00.000Z",
    status: "ready",
    score: 94,
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
        score: 94,
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
    score: 92,
    queue: [],
    diagnostics: [],
    nextActions: ["Offline handoff is ready."],
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
    status: "ready",
    score: 93,
    generatedAt: "2026-05-18T10:00:00.000Z",
    conflictDiffs: [],
    recoveryChoices: [],
    staleAssetRepairs: [],
    auditTrail: [],
    packet: {
      fileName: "desktop-sync.json",
      dataUrl: "data:application/json,%7B%7D",
      json: "{}",
      fingerprint: "desktop-sync",
    },
    nextActions: ["Desktop and cloud copies are aligned."],
    totals: {
      activeProjects: 2,
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
    id: "audit",
    action: "project.version.created",
    targetType: "project",
    targetId: "project-launch",
    summary: "Audit event",
    actorEmail: "studio@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
