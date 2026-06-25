import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";
import type { DeployEnvironmentPreflightReport } from "@/features/admin/deploy-environment-preflight";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export type AdminReleaseChannelKind = "desktop" | "self-hosted" | "web";

export type AdminReleaseChannelStatus = "ready" | "review" | "blocked";

export type AdminReleaseChannelArtifactKind =
  | "command"
  | "file"
  | "manifest"
  | "record"
  | "url";

export type AdminDesktopReleaseConfig = {
  tauriConfigPresent: boolean;
  tauriCargoPresent: boolean;
  nextStaticExportConfigured: boolean;
  frontendDist: string | null;
  beforeBuildCommand: string | null;
  identifier: string | null;
  productName: string | null;
  packageJsonVersion: string | null;
  tauriConfigVersion: string | null;
  cargoPackageVersion: string | null;
  packageVersion: string;
  tauriVersion: string | null;
  updaterPluginPresent: boolean;
  bundleActive: boolean;
  bundleTargets: string | null;
  iconCount: number;
};

export type AdminReleaseChannelArtifact = {
  id: string;
  channel: AdminReleaseChannelKind;
  kind: AdminReleaseChannelArtifactKind;
  label: string;
  value: string;
  required: boolean;
};

export type AdminReleaseChannelRow = {
  id: string;
  channel: AdminReleaseChannelKind;
  status: AdminReleaseChannelStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  artifactCount: number;
};

export type AdminReleaseChannelPackage = {
  channel: AdminReleaseChannelKind;
  label: string;
  packageName: string;
  packageVersion: string;
  releaseLabel: string;
  commitSha: string;
  deploymentUrl: string;
  status: AdminReleaseChannelStatus;
  score: number;
  generatedAt: string;
  artifacts: AdminReleaseChannelArtifact[];
  rows: AdminReleaseChannelRow[];
};

export type AdminReleaseChannelsReport = {
  generatedAt: string;
  status: AdminReleaseChannelStatus;
  score: number;
  channelCount: number;
  readyChannelCount: number;
  reviewChannelCount: number;
  blockedChannelCount: number;
  artifactCount: number;
  commandCount: number;
  packages: AdminReleaseChannelPackage[];
  rows: AdminReleaseChannelRow[];
  commands: string[];
};

export type AdminReleaseChannelsInput = {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  releaseApprovalDefaults: {
    commitSha: string;
    deploymentUrl: string;
  };
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  generatedAt?: string;
};

export function getAdminReleaseChannelsReport({
  deployEnvironmentPreflight,
  productionDeploySmoke,
  rollbackReadiness,
  selfHostedBackupReadiness,
  releaseApprovalSnapshots,
  releaseApprovalDefaults,
  desktopReleaseConfig,
  generatedAt = new Date().toISOString(),
}: AdminReleaseChannelsInput): AdminReleaseChannelsReport {
  const latestApproval = releaseApprovalSnapshots[0] ?? null;
  const releaseLabel = latestApproval?.releaseLabel ?? "Production release";
  const commitSha =
    releaseApprovalDefaults.commitSha || latestApproval?.commitSha || "unresolved";
  const deploymentUrl =
    releaseApprovalDefaults.deploymentUrl ||
    latestApproval?.deploymentUrl ||
    productionDeploySmoke.baseUrl;
  const packages = [
    getWebReleasePackage({
      deployEnvironmentPreflight,
      deploymentUrl,
      generatedAt,
      commitSha,
      latestApproval,
      productionDeploySmoke,
      releaseApprovalCount: releaseApprovalSnapshots.length,
      releaseLabel,
      rollbackReadiness,
    }),
    getDesktopReleasePackage({
      commitSha,
      deploymentUrl,
      desktopReleaseConfig,
      generatedAt,
      latestApproval,
      releaseApprovalCount: releaseApprovalSnapshots.length,
      releaseLabel,
    }),
    getSelfHostedReleasePackage({
      commitSha,
      deploymentUrl,
      generatedAt,
      latestApproval,
      productionDeploySmoke,
      releaseApprovalCount: releaseApprovalSnapshots.length,
      releaseLabel,
      rollbackReadiness,
      selfHostedBackupReadiness,
    }),
  ];
  const readyChannelCount = packages.filter(
    (releasePackage) => releasePackage.status === "ready",
  ).length;
  const reviewChannelCount = packages.filter(
    (releasePackage) => releasePackage.status === "review",
  ).length;
  const blockedChannelCount = packages.filter(
    (releasePackage) => releasePackage.status === "blocked",
  ).length;
  const artifacts = packages.flatMap((releasePackage) => releasePackage.artifacts);
  const commands = uniqueStrings(
    artifacts
      .filter((artifact) => artifact.kind === "command")
      .map((artifact) => artifact.value),
  );

  return {
    generatedAt,
    status:
      blockedChannelCount > 0
        ? "blocked"
        : reviewChannelCount > 0
          ? "review"
          : "ready",
    score: Math.round(
      packages.reduce((sum, releasePackage) => sum + releasePackage.score, 0) /
        packages.length,
    ),
    channelCount: packages.length,
    readyChannelCount,
    reviewChannelCount,
    blockedChannelCount,
    artifactCount: artifacts.length,
    commandCount: commands.length,
    packages,
    rows: packages.flatMap((releasePackage) => releasePackage.rows),
    commands,
  };
}

function getWebReleasePackage({
  deployEnvironmentPreflight,
  deploymentUrl,
  generatedAt,
  commitSha,
  latestApproval,
  productionDeploySmoke,
  releaseApprovalCount,
  releaseLabel,
  rollbackReadiness,
}: {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  deploymentUrl: string;
  generatedAt: string;
  commitSha: string;
  latestApproval: AdminReleaseApprovalSnapshot | null;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalCount: number;
  releaseLabel: string;
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminReleaseChannelPackage {
  const channel: AdminReleaseChannelKind = "web";
  const artifacts = [
    artifact(channel, "url", "Production URL", deploymentUrl, true),
    artifact(channel, "record", "Commit SHA", commitSha, true),
    ...productionDeploySmoke.commands.map((command, index) =>
      artifact(channel, "command", `Smoke command ${index + 1}`, command, true),
    ),
    ...deployEnvironmentPreflight.commands.map((command, index) =>
      artifact(channel, "command", `Preflight command ${index + 1}`, command, true),
    ),
  ];
  const rows = [
    row({
      channel,
      id: "web-env-preflight",
      status: deployEnvironmentPreflight.status,
      label: "Environment preflight",
      value: `${deployEnvironmentPreflight.score}/100`,
      detail: `${deployEnvironmentPreflight.readyCount} ready, ${deployEnvironmentPreflight.reviewCount} review, and ${deployEnvironmentPreflight.blockedCount} blocked checks for auth, Turso, Brevo, URLs, and runtime.`,
      recommendation:
        "Resolve blocked or review env checks before promoting the web channel.",
      artifactCount: deployEnvironmentPreflight.commands.length,
    }),
    row({
      channel,
      id: "web-route-smoke",
      status: productionDeploySmoke.status,
      label: "Post-deploy smoke",
      value: `${productionDeploySmoke.score}/100`,
      detail: `${productionDeploySmoke.routeCount} web routes are covered, including auth, editor, admin, share, prototype, and release handoff surfaces.`,
      recommendation:
        "Run smoke commands against the final Vercel deployment URL before approval.",
      artifactCount: productionDeploySmoke.commands.length,
    }),
    row({
      channel,
      id: "web-rollback",
      status: rollbackReadiness.status,
      label: "Rollback evidence",
      value: `${rollbackReadiness.score}/100`,
      detail: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.shareAuditEventCount} share audit events are visible.`,
      recommendation:
        "Export rollback readiness with every production approval snapshot.",
      artifactCount: rollbackReadiness.deploymentUrls.length,
    }),
    getApprovalRow({
      channel,
      latestApproval,
      releaseApprovalCount,
    }),
  ];

  return releasePackage({
    artifacts,
    channel,
    commitSha,
    deploymentUrl,
    generatedAt,
    label: "Web release",
    packageName: "essence-figma-web",
    packageVersion: "vercel",
    releaseLabel,
    rows,
  });
}

function getDesktopReleasePackage({
  commitSha,
  deploymentUrl,
  desktopReleaseConfig,
  generatedAt,
  latestApproval,
  releaseApprovalCount,
  releaseLabel,
}: {
  commitSha: string;
  deploymentUrl: string;
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  generatedAt: string;
  latestApproval: AdminReleaseApprovalSnapshot | null;
  releaseApprovalCount: number;
  releaseLabel: string;
}): AdminReleaseChannelPackage {
  const channel: AdminReleaseChannelKind = "desktop";
  const artifacts = [
    artifact(channel, "file", "Tauri config", "src-tauri/tauri.conf.json", true),
    artifact(channel, "file", "Rust manifest", "src-tauri/Cargo.toml", true),
    artifact(channel, "file", "Next config", "next.config.ts", true),
    artifact(channel, "command", "Desktop bundle command", "bun run tauri:build", true),
    artifact(channel, "command", "Static app build command", "bun run build", true),
  ];
  const rows = [
    row({
      channel,
      id: "desktop-tauri-config",
      status: desktopReleaseConfig.tauriConfigPresent ? "ready" : "blocked",
      label: "Tauri app config",
      value: desktopReleaseConfig.productName ?? "missing",
      detail: desktopReleaseConfig.tauriConfigPresent
        ? `Desktop shell is configured for ${desktopReleaseConfig.productName ?? "the product"} with frontendDist ${desktopReleaseConfig.frontendDist ?? "missing"}.`
        : "The Tauri config file is missing.",
      recommendation:
        "Keep product metadata, window bounds, and frontendDist explicit before packaging desktop releases.",
      artifactCount: 1,
    }),
    row({
      channel,
      id: "desktop-rust-manifest",
      status: getRustManifestStatus(desktopReleaseConfig),
      label: "Rust desktop manifest",
      value: desktopReleaseConfig.tauriVersion ?? "missing",
      detail: desktopReleaseConfig.tauriCargoPresent
        ? `Cargo manifest is present with Tauri ${desktopReleaseConfig.tauriVersion ?? "version not detected"}.`
        : "The Rust Cargo manifest for the desktop shell is missing.",
      recommendation:
        "Keep the Rust manifest version-pinned and checked before distributing desktop installers.",
      artifactCount: 1,
    }),
    row({
      channel,
      id: "desktop-static-export",
      status: getStaticExportStatus(desktopReleaseConfig),
      label: "Static export handoff",
      value: desktopReleaseConfig.nextStaticExportConfigured
        ? "configured"
        : "missing",
      detail: desktopReleaseConfig.nextStaticExportConfigured
        ? "Next.js is configured to emit a static export for the Tauri frontendDist package."
        : `Tauri expects ${desktopReleaseConfig.frontendDist ?? "a frontendDist"}, but next.config.ts does not declare output: "export".`,
      recommendation:
        "Set the Next.js static export option before relying on repeatable desktop bundles.",
      artifactCount: 2,
    }),
    row({
      channel,
      id: "desktop-bundle-artifacts",
      status: getBundleStatus(desktopReleaseConfig),
      label: "Installer bundle artifacts",
      value: desktopReleaseConfig.bundleTargets ?? "missing",
      detail: desktopReleaseConfig.bundleActive
        ? `${desktopReleaseConfig.iconCount} icon artifact${desktopReleaseConfig.iconCount === 1 ? "" : "s"} are declared for ${desktopReleaseConfig.bundleTargets ?? "the desktop target set"}.`
        : "Tauri bundling is not active.",
      recommendation:
        "Keep bundle targets and icons ready so release operators can create signed platform packages.",
      artifactCount: desktopReleaseConfig.iconCount,
    }),
    row({
      channel,
      id: "desktop-approval",
      status: releaseApprovalCount > 0 ? "ready" : "review",
      label: "Desktop approval anchor",
      value: `${releaseApprovalCount} snapshot${releaseApprovalCount === 1 ? "" : "s"}`,
      detail: latestApproval
        ? `Latest approval ${latestApproval.releaseLabel} can anchor the desktop package commit.`
        : "No release approval snapshot is available for desktop package handoff.",
      recommendation:
        "Create a release approval snapshot after the desktop bundle command succeeds.",
      artifactCount: latestApproval ? 1 : 0,
    }),
  ];

  return releasePackage({
    artifacts,
    channel,
    commitSha,
    deploymentUrl,
    generatedAt,
    label: "Desktop release",
    packageName: "essence-figma-desktop",
    packageVersion: desktopReleaseConfig.packageVersion,
    releaseLabel,
    rows,
  });
}

function getSelfHostedReleasePackage({
  commitSha,
  deploymentUrl,
  generatedAt,
  latestApproval,
  productionDeploySmoke,
  releaseApprovalCount,
  releaseLabel,
  rollbackReadiness,
  selfHostedBackupReadiness,
}: {
  commitSha: string;
  deploymentUrl: string;
  generatedAt: string;
  latestApproval: AdminReleaseApprovalSnapshot | null;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalCount: number;
  releaseLabel: string;
  rollbackReadiness: AdminRollbackReadinessReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
}): AdminReleaseChannelPackage {
  const channel: AdminReleaseChannelKind = "self-hosted";
  const artifacts = [
    artifact(channel, "record", "Database kind", selfHostedBackupReadiness.databaseKind, true),
    artifact(channel, "record", "Backup target", selfHostedBackupReadiness.backupTarget ?? "missing", true),
    ...selfHostedBackupReadiness.commands.map((command, index) =>
      artifact(channel, "command", `Recovery command ${index + 1}`, command, true),
    ),
    ...productionDeploySmoke.commands.map((command, index) =>
      artifact(channel, "command", `Smoke command ${index + 1}`, command, true),
    ),
    ...rollbackReadiness.deploymentUrls.map((url, index) =>
      artifact(channel, "url", `Deployment URL ${index + 1}`, url, false),
    ),
  ];
  const rows = [
    row({
      channel,
      id: "self-hosted-backup",
      status: selfHostedBackupReadiness.status,
      label: "Backup and restore package",
      value: `${selfHostedBackupReadiness.score}/100`,
      detail: `${selfHostedBackupReadiness.databaseKind} database, ${selfHostedBackupReadiness.versionAnchorCount} version anchors, and ${selfHostedBackupReadiness.activeShareCount} active shares are included in readiness review.`,
      recommendation:
        "Set backup schedule, backup target, and runnable backup command before approving self-hosted exports.",
      artifactCount: selfHostedBackupReadiness.commands.length,
    }),
    row({
      channel,
      id: "self-hosted-rollback",
      status: rollbackReadiness.status,
      label: "Rollback package",
      value: `${rollbackReadiness.score}/100`,
      detail: `${rollbackReadiness.latestVersions.length} latest version records and ${rollbackReadiness.deploymentLinkCount} deployment links are available.`,
      recommendation:
        "Attach rollback readiness to the self-hosted release package for operator recovery.",
      artifactCount: rollbackReadiness.latestVersions.length,
    }),
    row({
      channel,
      id: "self-hosted-smoke",
      status: productionDeploySmoke.status,
      label: "Self-hosted smoke checklist",
      value: `${productionDeploySmoke.score}/100`,
      detail: `${productionDeploySmoke.requiredRouteCount} required routes are documented for post-install checks.`,
      recommendation:
        "Run the same route smoke against the deployed self-hosted origin after installation.",
      artifactCount: productionDeploySmoke.commands.length,
    }),
    getApprovalRow({
      channel,
      latestApproval,
      releaseApprovalCount,
    }),
  ];

  return releasePackage({
    artifacts,
    channel,
    commitSha,
    deploymentUrl,
    generatedAt,
    label: "Self-hosted export",
    packageName: "essence-figma-self-hosted",
    packageVersion: selfHostedBackupReadiness.databaseKind,
    releaseLabel,
    rows,
  });
}

function getApprovalRow({
  channel,
  latestApproval,
  releaseApprovalCount,
}: {
  channel: AdminReleaseChannelKind;
  latestApproval: AdminReleaseApprovalSnapshot | null;
  releaseApprovalCount: number;
}) {
  return row({
    channel,
    id: `${channel}-approval-snapshot`,
    status: releaseApprovalCount > 0 ? "ready" : "review",
    label: "Release approval snapshot",
    value: `${releaseApprovalCount} snapshot${releaseApprovalCount === 1 ? "" : "s"}`,
    detail: latestApproval
      ? `Latest snapshot ${latestApproval.releaseLabel} was recorded by ${latestApproval.reviewerEmail}.`
      : "No approval snapshot has been saved for this release package.",
    recommendation:
      "Save a release approval snapshot with commit, deployment URL, smoke evidence, and rollback notes.",
    artifactCount: latestApproval ? 1 : 0,
  });
}

function releasePackage({
  artifacts,
  channel,
  commitSha,
  deploymentUrl,
  generatedAt,
  label,
  packageName,
  packageVersion,
  releaseLabel,
  rows,
}: Omit<AdminReleaseChannelPackage, "score" | "status">) {
  return {
    artifacts,
    channel,
    commitSha,
    deploymentUrl,
    generatedAt,
    label,
    packageName,
    packageVersion,
    releaseLabel,
    rows,
    score: getRowsScore(rows),
    status: getRowsStatus(rows),
  } satisfies AdminReleaseChannelPackage;
}

function row(input: AdminReleaseChannelRow): AdminReleaseChannelRow {
  return input;
}

function artifact(
  channel: AdminReleaseChannelKind,
  kind: AdminReleaseChannelArtifactKind,
  label: string,
  value: string,
  required: boolean,
): AdminReleaseChannelArtifact {
  return {
    id: `${channel}-${kind}-${slugify(label)}-${slugify(value).slice(0, 28)}`,
    channel,
    kind,
    label,
    value,
    required,
  };
}

function getRowsStatus(rows: AdminReleaseChannelRow[]) {
  if (rows.some((row) => row.status === "blocked")) {
    return "blocked";
  }

  if (rows.some((row) => row.status === "review")) {
    return "review";
  }

  return "ready";
}

function getRowsScore(rows: AdminReleaseChannelRow[]) {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;

  return Math.max(0, 100 - blockedCount * 22 - reviewCount * 7);
}

function getRustManifestStatus(
  config: AdminDesktopReleaseConfig,
): AdminReleaseChannelStatus {
  if (!config.tauriCargoPresent) {
    return "blocked";
  }

  return config.tauriVersion ? "ready" : "review";
}

function getStaticExportStatus(
  config: AdminDesktopReleaseConfig,
): AdminReleaseChannelStatus {
  if (!config.frontendDist) {
    return "blocked";
  }

  return config.nextStaticExportConfigured ? "ready" : "blocked";
}

function getBundleStatus(
  config: AdminDesktopReleaseConfig,
): AdminReleaseChannelStatus {
  if (!config.bundleActive) {
    return "blocked";
  }

  return config.bundleTargets && config.iconCount >= 4 ? "ready" : "review";
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
