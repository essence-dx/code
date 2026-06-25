import type {
  AdminDesktopUpdateChannelReport,
  AdminDesktopUpdateChannelStatus,
} from "@/features/admin/admin-desktop-update-channel";
import type {
  AdminRealtimeHealthReport,
  AdminRealtimeHealthStatus,
} from "@/features/admin/admin-realtime-health-monitor";
import type {
  AdminSelfHostedBackupReadinessReport,
  AdminSelfHostedBackupReadinessStatus,
} from "@/features/admin/admin-self-hosted-backup-readiness";
import type {
  DeployEnvironmentPreflightReport,
  DeployEnvironmentPreflightStatus,
} from "@/features/admin/deploy-environment-preflight";
import type {
  ProductionDeploySmokeReport,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";

export type SelfHostedSyncDiagnosticStatus = "ready" | "review" | "blocked";

export type SelfHostedSyncDiagnosticCategory =
  | "browser"
  | "database"
  | "desktop"
  | "operator"
  | "realtime"
  | "vercel";

export type SelfHostedSyncDiagnosticRow = {
  id: string;
  category: SelfHostedSyncDiagnosticCategory;
  status: SelfHostedSyncDiagnosticStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  repairCommand: string;
  latestAt: string | null;
};

export type SelfHostedSyncRepairCommand = {
  id: string;
  category: SelfHostedSyncDiagnosticCategory;
  command: string;
  reason: string;
};

export type SelfHostedSyncDiagnosticReport = {
  generatedAt: string;
  status: SelfHostedSyncDiagnosticStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  databaseKind: AdminSelfHostedBackupReadinessReport["databaseKind"];
  databaseAuthReady: boolean;
  desktopChannel: AdminDesktopUpdateChannelReport["activeChannel"];
  desktopVersionParity: string;
  browserBaseUrl: string;
  vercelEnv: string;
  runtime: string;
  realtimeScore: number;
  routeSmokeScore: number;
  repairCommandCount: number;
  rows: SelfHostedSyncDiagnosticRow[];
  repairCommands: SelfHostedSyncRepairCommand[];
};

export type SelfHostedSyncDiagnosticInput = {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  desktopUpdateChannels: AdminDesktopUpdateChannelReport;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  realtimeHealth: AdminRealtimeHealthReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
};

export function getSelfHostedSyncDiagnosticReport({
  deployEnvironmentPreflight,
  desktopUpdateChannels,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  realtimeHealth,
  selfHostedBackupReadiness,
}: SelfHostedSyncDiagnosticInput): SelfHostedSyncDiagnosticReport {
  const rows = [
    getDatabaseRow(selfHostedBackupReadiness),
    getDesktopRow(desktopUpdateChannels),
    getBrowserRow(productionDeploySmoke, deployEnvironmentPreflight),
    getVercelRow(deployEnvironmentPreflight),
    getRealtimeRow(realtimeHealth),
    getOperatorRow({
      deployEnvironmentPreflight,
      desktopUpdateChannels,
      selfHostedBackupReadiness,
    }),
  ].sort(sortRows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: SelfHostedSyncDiagnosticStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const repairCommands = getRepairCommands(rows);

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),
    readyCount,
    reviewCount,
    blockedCount,
    databaseKind: selfHostedBackupReadiness.databaseKind,
    databaseAuthReady: selfHostedBackupReadiness.databaseAuthReady,
    desktopChannel: desktopUpdateChannels.activeChannel,
    desktopVersionParity: `${desktopUpdateChannels.currentVersion} -> ${desktopUpdateChannels.targetVersion}`,
    browserBaseUrl: productionDeploySmoke.baseUrl,
    vercelEnv: deployEnvironmentPreflight.vercelEnv,
    runtime: deployEnvironmentPreflight.runtime,
    realtimeScore: realtimeHealth.score,
    routeSmokeScore: productionDeploySmoke.score,
    repairCommandCount: repairCommands.length,
    rows,
    repairCommands,
  };
}

function getDatabaseRow(
  report: AdminSelfHostedBackupReadinessReport,
): SelfHostedSyncDiagnosticRow {
  const status = fromSharedStatus(report.status);
  const value = report.databaseConfigured
    ? report.databaseKind
    : "not configured";

  return {
    id: "self-hosted-sync-database",
    category: "database",
    status,
    label: "Turso/libSQL sync source",
    value,
    detail: report.databaseConfigured
      ? `${report.databaseKind} is configured, auth is ${report.databaseAuthReady ? "ready" : "missing"}, backup schedule is ${report.backupScheduleConfigured ? "configured" : "missing"}, and ${report.versionAnchorCount} rollback version anchor${report.versionAnchorCount === 1 ? "" : "s"} are visible.`
      : "No Turso/libSQL database source is configured for self-hosted sync.",
    recommendation:
      status === "ready"
        ? "Database source, auth, backup schedule, and version anchors are ready for self-hosted sync."
        : "Fix database auth, backup schedule, backup target, and named-version anchors before self-hosted cutover.",
    repairCommand:
      report.commands.find((command) => command.includes("turso")) ??
      "bun run db:push",
    latestAt: report.generatedAt,
  };
}

function getDesktopRow(
  report: AdminDesktopUpdateChannelReport,
): SelfHostedSyncDiagnosticRow {
  const status = fromDesktopStatus(report.status);
  const packageLabel = `${report.packageCount} package${report.packageCount === 1 ? "" : "s"}`;

  return {
    id: "self-hosted-sync-desktop",
    category: "desktop",
    status,
    label: "Desktop package parity",
    value: `${report.currentVersion} -> ${report.targetVersion}`,
    detail: `${report.activeChannel} channel has ${packageLabel}, rollout ${report.rolloutPercent}%, hold ${report.holdActive ? "active" : "clear"}, and ${report.blockedCount} blocked package row${report.blockedCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Desktop update metadata matches the current release channel."
        : "Repair desktop feed, package signatures, or rollout holds before self-hosted desktop distribution.",
    repairCommand: "bun run tauri:build",
    latestAt: report.generatedAt,
  };
}

function getBrowserRow(
  smoke: ProductionDeploySmokeReport,
  preflight: DeployEnvironmentPreflightReport,
): SelfHostedSyncDiagnosticRow {
  const status = fromSharedStatus(smoke.status);
  const originMatches =
    preflight.appOrigin === "not configured" ||
    smoke.baseUrl === "https://<deployment-url>" ||
    preflight.appOrigin === smoke.baseUrl;

  return {
    id: "self-hosted-sync-browser",
    category: "browser",
    status: !originMatches && status === "ready" ? "review" : status,
    label: "Browser route parity",
    value: `${smoke.readyCount}/${smoke.routeCount} routes`,
    detail: `${smoke.requiredRouteCount} required browser route${smoke.requiredRouteCount === 1 ? "" : "s"} are tracked. App origin is ${preflight.appOrigin}; smoke base URL is ${smoke.baseUrl}.`,
    recommendation:
      originMatches && status === "ready"
        ? "Browser route evidence matches the configured app origin."
        : "Refresh deployed route smoke against the same origin used by auth and public links.",
    repairCommand: "bun run ops:post-deploy-smoke",
    latestAt: smoke.generatedAt,
  };
}

function getVercelRow(
  report: DeployEnvironmentPreflightReport,
): SelfHostedSyncDiagnosticRow {
  const status = fromSharedStatus(report.status);

  return {
    id: "self-hosted-sync-vercel",
    category: "vercel",
    status,
    label: "Vercel runtime parity",
    value: `${report.vercelEnv} / ${report.runtime}`,
    detail: `${report.requiredCount} required env row${report.requiredCount === 1 ? "" : "s"}, ${report.secretCount} secret row${report.secretCount === 1 ? "" : "s"}, ${report.blockedCount} blocked and ${report.reviewCount} review preflight row${report.reviewCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Vercel env and runtime preflight is ready for self-hosted parity comparison."
        : "Resolve missing envs, app origin drift, and runtime warnings before comparing self-hosted behavior.",
    repairCommand: "bun run ops:env-preflight",
    latestAt: report.generatedAt,
  };
}

function getRealtimeRow(
  report: AdminRealtimeHealthReport,
): SelfHostedSyncDiagnosticRow {
  const status = fromRealtimeStatus(report.status);

  return {
    id: "self-hosted-sync-realtime",
    category: "realtime",
    status,
    label: "Realtime sync parity",
    value: `${report.score}/100`,
    detail: `${report.monitoredRoomCount} monitored room${report.monitoredRoomCount === 1 ? "" : "s"}, ${report.offlineReplayQueueCount} offline replay item${report.offlineReplayQueueCount === 1 ? "" : "s"}, ${report.eventDriftCount} drift event${report.eventDriftCount === 1 ? "" : "s"}, and ${report.pendingSaveSignalCount} pending save signal${report.pendingSaveSignalCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Realtime evidence is ready for browser, desktop, and self-hosted parity checks."
        : "Refresh collaboration rooms and resolve save/reconnect drift before self-hosted sync approval.",
    repairCommand: "Export Admin > Governance workspace realtime health JSON.",
    latestAt: report.generatedAt,
  };
}

function getOperatorRow({
  deployEnvironmentPreflight,
  desktopUpdateChannels,
  selfHostedBackupReadiness,
}: {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  desktopUpdateChannels: AdminDesktopUpdateChannelReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
}): SelfHostedSyncDiagnosticRow {
  const commandCount =
    deployEnvironmentPreflight.commands.length +
    desktopUpdateChannels.commands.length +
    selfHostedBackupReadiness.commands.length;
  const status: SelfHostedSyncDiagnosticStatus =
    commandCount >= 6 ? "ready" : commandCount > 0 ? "review" : "blocked";

  return {
    id: "self-hosted-sync-operator-repairs",
    category: "operator",
    status,
    label: "Operator repair commands",
    value: `${commandCount}`,
    detail: `${commandCount} repair or verification command${commandCount === 1 ? "" : "s"} are available across env preflight, backup readiness, and desktop channel reports.`,
    recommendation:
      status === "ready"
        ? "Repair commands are sufficient for a repeatable self-hosted parity runbook."
        : "Add explicit env, database, desktop, and route smoke repair commands before handoff.",
    repairCommand: "Export Admin > Governance self-hosted sync diagnostics Markdown.",
    latestAt: selfHostedBackupReadiness.generatedAt,
  };
}

function getRepairCommands(
  rows: SelfHostedSyncDiagnosticRow[],
): SelfHostedSyncRepairCommand[] {
  return rows.map((row) => ({
    id: `${row.id}-repair`,
    category: row.category,
    command: row.repairCommand,
    reason:
      row.status === "ready"
        ? `${row.label} verification command.`
        : row.recommendation,
  }));
}

function fromSharedStatus(
  status:
    | AdminSelfHostedBackupReadinessStatus
    | DeployEnvironmentPreflightStatus
    | ProductionDeploySmokeStatus,
): SelfHostedSyncDiagnosticStatus {
  return status;
}

function fromDesktopStatus(
  status: AdminDesktopUpdateChannelStatus,
): SelfHostedSyncDiagnosticStatus {
  return status;
}

function fromRealtimeStatus(
  status: AdminRealtimeHealthStatus,
): SelfHostedSyncDiagnosticStatus {
  return status;
}

function sortRows(
  first: SelfHostedSyncDiagnosticRow,
  second: SelfHostedSyncDiagnosticRow,
) {
  return (
    getStatusWeight(first.status) - getStatusWeight(second.status) ||
    first.category.localeCompare(second.category)
  );
}

function getStatusWeight(status: SelfHostedSyncDiagnosticStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}
