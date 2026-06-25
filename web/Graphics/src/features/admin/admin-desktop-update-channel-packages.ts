import {
  compareVersions,
  getRowsScore,
  getRowsStatus,
  type AdminDesktopUpdateChannelKind,
  type AdminDesktopUpdateChannelPackage,
  type AdminDesktopUpdateChannelRow,
  type AdminDesktopUpdateChannelSettings,
} from "@/features/admin/admin-desktop-update-channel-core";
import type {
  AdminDesktopReleaseConfig,
  AdminReleaseChannelsReport,
} from "@/features/admin/admin-release-channels";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";

export function getDesktopUpdatePackages({
  desktopReleaseConfig,
  operatorRehearsals,
  releaseArtifactManifest,
  releaseChannels,
  settings,
}: {
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  operatorRehearsals: AdminOperatorRehearsalReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
  settings: AdminDesktopUpdateChannelSettings;
}): AdminDesktopUpdateChannelPackage[] {
  return (["stable", "beta", "canary"] as const).map((channel) =>
    createUpdatePackage({
      channel,
      desktopReleaseConfig,
      label: `${formatChannel(channel)} desktop channel`,
      operatorRehearsals,
      releaseArtifactManifest,
      releaseChannels,
      settings: {
        ...settings,
        rolloutPercent:
          settings.activeChannel === channel ? settings.rolloutPercent : 0,
      },
    }),
  );
}

function createUpdatePackage({
  channel,
  desktopReleaseConfig,
  label,
  operatorRehearsals,
  releaseArtifactManifest,
  releaseChannels,
  settings,
}: {
  channel: AdminDesktopUpdateChannelKind;
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  label: string;
  operatorRehearsals: AdminOperatorRehearsalReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
  settings: AdminDesktopUpdateChannelSettings;
}): AdminDesktopUpdateChannelPackage {
  const desktopReleasePackage = releaseChannels.packages.find(
    (releasePackage) => releasePackage.channel === "desktop",
  );
  const desktopManifest = releaseArtifactManifest.artifacts.find(
    (artifact) => artifact.kind === "desktop",
  );
  const desktopRehearsal = operatorRehearsals.runs.find(
    (run) => run.kind === "desktop-handoff",
  );
  const rows = [
    getStableMetadataRow({ channel, desktopReleaseConfig, settings }),
    getVersionParityRow(desktopReleaseConfig, settings),
    getFeedReadinessRow({ channel, desktopReleaseConfig, settings }),
    getRolloutHoldRow(settings),
    {
      id: `${channel}-desktop-release-package`,
      status: desktopReleasePackage?.status ?? "blocked",
      label: "Desktop release package",
      value: desktopReleasePackage?.packageName ?? "missing",
      detail:
        desktopReleasePackage?.rows
          .map((row) => `${row.label}: ${row.detail}`)
          .join(" ") ?? "No desktop release package is available.",
      recommendation:
        "Keep the desktop release package ready before publishing update channel metadata.",
      artifactCount: desktopReleasePackage?.artifacts.length ?? 0,
    },
    {
      id: `${channel}-desktop-manifest-artifact`,
      status: desktopManifest?.status ?? "blocked",
      label: "Signed desktop manifest",
      value: desktopManifest?.signatureStatus ?? "missing",
      detail:
        desktopManifest?.detail ??
        "The signed release manifest does not include a desktop artifact.",
      recommendation:
        "Archive the desktop manifest checksum and signature with update metadata.",
      artifactCount: desktopManifest ? 1 : 0,
    },
    {
      id: `${channel}-desktop-rehearsal`,
      status: desktopRehearsal?.status ?? "review",
      label: "Desktop handoff rehearsal",
      value: desktopRehearsal ? `${desktopRehearsal.score}/100` : "missing",
      detail:
        desktopRehearsal?.objective ??
        "Desktop package handoff rehearsal evidence is unavailable.",
      recommendation:
        "Run or review the desktop package handoff drill before increasing rollout.",
      artifactCount: desktopRehearsal?.steps.length ?? 0,
    },
  ] satisfies AdminDesktopUpdateChannelRow[];

  return {
    channel,
    label,
    status: getRowsStatus(rows.map((row) => row.status)),
    score: getRowsScore(rows),
    currentVersion: settings.currentVersion,
    targetVersion: settings.targetVersion,
    minimumVersion: settings.minimumVersion,
    rolloutPercent: settings.rolloutPercent,
    feedUrl: settings.feedUrl,
    hold: settings.hold,
    rows,
  };
}

function getStableMetadataRow({
  channel,
  desktopReleaseConfig,
  settings,
}: {
  channel: AdminDesktopUpdateChannelKind;
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  settings: AdminDesktopUpdateChannelSettings;
}): AdminDesktopUpdateChannelRow {
  const hasMetadata = Boolean(
    desktopReleaseConfig.productName &&
      desktopReleaseConfig.identifier &&
      settings.currentVersion &&
      settings.targetVersion,
  );

  return {
    id: `${channel}-update-metadata`,
    status: hasMetadata ? "ready" : "blocked",
    label: "Stable update metadata",
    value: `${desktopReleaseConfig.productName ?? "missing"} / ${desktopReleaseConfig.identifier ?? "missing"}`,
    detail: hasMetadata
      ? `${desktopReleaseConfig.productName} ${settings.targetVersion} is mapped to ${channel} with identifier ${desktopReleaseConfig.identifier}.`
      : "Desktop update metadata needs product name, identifier, current version, and target version.",
    recommendation:
      "Keep product name, app identifier, active channel, current version, and target version in the release record.",
    artifactCount: hasMetadata ? 1 : 0,
  };
}

function getVersionParityRow(
  desktopReleaseConfig: AdminDesktopReleaseConfig,
  settings: AdminDesktopUpdateChannelSettings,
): AdminDesktopUpdateChannelRow {
  const versions = [
    desktopReleaseConfig.packageJsonVersion,
    desktopReleaseConfig.tauriConfigVersion,
    desktopReleaseConfig.cargoPackageVersion,
  ].filter((version): version is string => Boolean(version));
  const uniqueVersions = new Set(versions);
  const targetComparison = compareVersions(
    settings.targetVersion,
    settings.currentVersion,
  );
  const minimumComparison = compareVersions(
    settings.currentVersion,
    settings.minimumVersion,
  );
  const parityReady = versions.length === 3 && uniqueVersions.size === 1;

  return {
    id: "desktop-update-version-parity",
    status:
      versions.length < 3 || targetComparison < 0 || minimumComparison < 0
        ? "blocked"
        : parityReady
          ? "ready"
          : "review",
    label: "Package version comparison",
    value: `current ${settings.currentVersion} -> target ${settings.targetVersion}`,
    detail: `package.json ${desktopReleaseConfig.packageJsonVersion ?? "missing"}, tauri.conf ${desktopReleaseConfig.tauriConfigVersion ?? "missing"}, Cargo ${desktopReleaseConfig.cargoPackageVersion ?? "missing"}, minimum ${settings.minimumVersion}.`,
    recommendation:
      "Keep package.json, tauri.conf.json, and Cargo.toml versions aligned, and never set target or minimum versions ahead of the current package unexpectedly.",
    artifactCount: versions.length,
  };
}

function getFeedReadinessRow({
  channel,
  desktopReleaseConfig,
  settings,
}: {
  channel: AdminDesktopUpdateChannelKind;
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  settings: AdminDesktopUpdateChannelSettings;
}): AdminDesktopUpdateChannelRow {
  const automaticUpdates = Boolean(settings.feedUrl);
  const updaterReady = automaticUpdates && desktopReleaseConfig.updaterPluginPresent;

  return {
    id: `${channel}-update-feed`,
    status: updaterReady ? "ready" : "review",
    label: "Update feed and signature",
    value: settings.feedUrl ?? "manual package handoff",
    detail: automaticUpdates
      ? `Update feed is configured; Tauri updater plugin is ${desktopReleaseConfig.updaterPluginPresent ? "present" : "not installed"}. Signature requirement is ${settings.signatureRequired ? "enabled" : "not enabled"}.`
      : "No automatic desktop update feed is configured; operators must use signed package handoff.",
    recommendation:
      "Configure ESSENCE_DESKTOP_UPDATE_FEED_URL and add tauri-plugin-updater before relying on automatic desktop updates.",
    artifactCount: updaterReady ? 2 : automaticUpdates ? 1 : 0,
  };
}

function getRolloutHoldRow(
  settings: AdminDesktopUpdateChannelSettings,
): AdminDesktopUpdateChannelRow {
  const invalidRollout = settings.rolloutPercent < 0 || settings.rolloutPercent > 100;
  const missingHoldReason = settings.hold.active && !settings.hold.reason;

  return {
    id: "desktop-update-rollout-hold",
    status: invalidRollout ? "blocked" : missingHoldReason ? "review" : "ready",
    label: "Rollout hold controls",
    value: settings.hold.active
      ? `held at ${settings.rolloutPercent}%`
      : `${settings.rolloutPercent}% rollout`,
    detail: settings.hold.active
      ? `Desktop rollout is held${settings.hold.reason ? ` because ${settings.hold.reason}` : " without a recorded reason"}.`
      : "Desktop rollout is not held by environment controls.",
    recommendation:
      "Use ESSENCE_DESKTOP_UPDATE_HOLD, ESSENCE_DESKTOP_UPDATE_HOLD_REASON, and ESSENCE_DESKTOP_UPDATE_ROLLOUT_PERCENT to control desktop rollout exposure.",
    artifactCount: settings.hold.active ? 2 : 1,
  };
}

function formatChannel(channel: AdminDesktopUpdateChannelKind) {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}
