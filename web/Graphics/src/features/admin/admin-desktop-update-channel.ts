import {
  getDesktopUpdateSettings,
  getRowsStatus,
  uniqueStrings,
  type AdminDesktopUpdateChannelReport,
} from "@/features/admin/admin-desktop-update-channel-core";
import { getDesktopUpdatePackages } from "@/features/admin/admin-desktop-update-channel-packages";
import type { AdminDesktopReleaseConfig } from "@/features/admin/admin-release-channels";
import type { AdminReleaseChannelsReport } from "@/features/admin/admin-release-channels";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";

export type {
  AdminDesktopRolloutHold,
  AdminDesktopUpdateChannelKind,
  AdminDesktopUpdateChannelPackage,
  AdminDesktopUpdateChannelReport,
  AdminDesktopUpdateChannelRow,
  AdminDesktopUpdateChannelSettings,
  AdminDesktopUpdateChannelStatus,
} from "@/features/admin/admin-desktop-update-channel-core";

export type AdminDesktopUpdateChannelInput = {
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  env?: Record<string, string | undefined>;
  generatedAt?: string;
  operatorRehearsals: AdminOperatorRehearsalReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
};

export function getAdminDesktopUpdateChannelReport({
  desktopReleaseConfig,
  env = {},
  generatedAt = new Date().toISOString(),
  operatorRehearsals,
  releaseArtifactManifest,
  releaseChannels,
}: AdminDesktopUpdateChannelInput): AdminDesktopUpdateChannelReport {
  const settings = getDesktopUpdateSettings({ desktopReleaseConfig, env });
  const packages = getDesktopUpdatePackages({
    desktopReleaseConfig,
    releaseArtifactManifest,
    releaseChannels,
    operatorRehearsals,
    settings,
  });
  const rows = packages.flatMap((updatePackage) => updatePackage.rows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const commands = uniqueStrings(
    [
      "bun run tauri:build",
      "Export Admin > Release desktop update channel readiness JSON.",
      settings.feedUrl
        ? `Verify desktop update feed at ${settings.feedUrl}`
        : "Set ESSENCE_DESKTOP_UPDATE_FEED_URL before publishing automatic desktop updates.",
      settings.hold.active
        ? "Keep desktop rollout hold active until the release manager clears it."
        : "Save a release approval snapshot before increasing desktop rollout percentage.",
    ].filter(Boolean),
  );

  return {
    generatedAt,
    status: getRowsStatus(rows.map((row) => row.status)),
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    activeChannel: settings.activeChannel,
    currentVersion: settings.currentVersion,
    targetVersion: settings.targetVersion,
    minimumVersion: settings.minimumVersion,
    rolloutPercent: settings.rolloutPercent,
    holdActive: settings.hold.active,
    holdReason: settings.hold.reason,
    readyCount,
    reviewCount,
    blockedCount,
    packageCount: packages.length,
    commandCount: commands.length,
    rows,
    packages,
    commands,
  };
}
