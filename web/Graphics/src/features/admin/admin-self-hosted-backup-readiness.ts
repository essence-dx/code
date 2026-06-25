import type {
  AdminReleaseApprovalSnapshot,
} from "@/features/admin/admin-release-approval-snapshots";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export type AdminSelfHostedBackupReadinessStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminSelfHostedBackupReadinessKind =
  | "artifacts"
  | "database"
  | "schedule"
  | "shares"
  | "versions";

export type AdminSelfHostedBackupReadinessRow = {
  id: string;
  status: AdminSelfHostedBackupReadinessStatus;
  kind: AdminSelfHostedBackupReadinessKind;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
  latestAt: string | null;
};

export type AdminSelfHostedBackupReadinessReport = {
  generatedAt: string;
  status: AdminSelfHostedBackupReadinessStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  databaseKind: AdminRollbackReadinessReport["database"]["databaseKind"];
  databaseConfigured: boolean;
  databaseAuthReady: boolean;
  backupScheduleConfigured: boolean;
  backupTargetConfigured: boolean;
  backupCommandConfigured: boolean;
  backupSchedule: string | null;
  backupTarget: string | null;
  versionAnchorCount: number;
  filesWithoutVersions: number;
  activeShareCount: number;
  staleShareCount: number;
  elevatedShareCount: number;
  releaseApprovalCount: number;
  deploySmokeScore: number;
  rollbackScore: number;
  commands: string[];
  rows: AdminSelfHostedBackupReadinessRow[];
};

export type AdminSelfHostedBackupReadinessInput = {
  rollbackReadiness: AdminRollbackReadinessReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  productionDeploySmoke: ProductionDeploySmokeReport;
  activeShareCount: number;
  env?: BackupEnvironment;
  generatedAt?: string;
};

type BackupEnvironment = Record<string, string | undefined>;

export function getAdminSelfHostedBackupReadinessReport({
  rollbackReadiness,
  releaseApprovalSnapshots,
  productionDeploySmoke,
  activeShareCount,
  env = {},
  generatedAt = new Date().toISOString(),
}: AdminSelfHostedBackupReadinessInput): AdminSelfHostedBackupReadinessReport {
  const backupSchedule = getEnvValue(
    env,
    "ESSENCE_BACKUP_SCHEDULE",
    "BACKUP_SCHEDULE",
  );
  const backupTarget = getEnvValue(
    env,
    "ESSENCE_BACKUP_TARGET",
    "BACKUP_TARGET",
  );
  const backupCommand = getEnvValue(
    env,
    "ESSENCE_BACKUP_COMMAND",
    "BACKUP_COMMAND",
  );
  const databaseTarget = getDatabaseTarget(env.TURSO_DATABASE_URL);
  const rows = [
    getDatabaseBackupRow({ rollbackReadiness, databaseTarget }),
    getScheduleBackupRow({ backupSchedule, backupTarget, backupCommand }),
    getVersionBackupRow(rollbackReadiness),
    getShareBackupRow({ rollbackReadiness, activeShareCount }),
    getReleaseArtifactBackupRow({
      releaseApprovalSnapshots,
      productionDeploySmoke,
      rollbackReadiness,
    }),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminSelfHostedBackupReadinessStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    readyCount,
    reviewCount,
    blockedCount,
    databaseKind: rollbackReadiness.database.databaseKind,
    databaseConfigured: rollbackReadiness.database.configured,
    databaseAuthReady:
      !rollbackReadiness.database.authTokenRequired ||
      rollbackReadiness.database.authTokenConfigured,
    backupScheduleConfigured: Boolean(backupSchedule),
    backupTargetConfigured: Boolean(backupTarget),
    backupCommandConfigured: Boolean(backupCommand),
    backupSchedule,
    backupTarget: maskBackupTarget(backupTarget),
    versionAnchorCount: rollbackReadiness.versionAnchorCount,
    filesWithoutVersions: rollbackReadiness.filesWithoutVersions,
    activeShareCount,
    staleShareCount: rollbackReadiness.staleShareCount,
    elevatedShareCount: rollbackReadiness.elevatedShareCount,
    releaseApprovalCount: releaseApprovalSnapshots.length,
    deploySmokeScore: productionDeploySmoke.score,
    rollbackScore: rollbackReadiness.score,
    commands: getBackupCommands({
      backupCommand,
      productionDeploySmoke,
      databaseKind: rollbackReadiness.database.databaseKind,
    }),
    rows,
  };
}

function getDatabaseBackupRow({
  rollbackReadiness,
  databaseTarget,
}: {
  rollbackReadiness: AdminRollbackReadinessReport;
  databaseTarget: string | null;
}): AdminSelfHostedBackupReadinessRow {
  const database = rollbackReadiness.database;

  if (!database.configured) {
    return {
      id: "backup-database-missing",
      status: "blocked",
      kind: "database",
      label: "Turso data source",
      value: "missing",
      detail: "No Turso or SQLite database URL is configured for backup export.",
      recommendation:
        "Set TURSO_DATABASE_URL before approving self-hosted backup readiness.",
      target: null,
      latestAt: null,
    };
  }

  if (database.authTokenRequired && !database.authTokenConfigured) {
    return {
      id: "backup-database-auth-missing",
      status: "blocked",
      kind: "database",
      label: "Turso data auth",
      value: database.databaseKind,
      detail:
        "The remote libSQL database is configured, but TURSO_AUTH_TOKEN is missing.",
      recommendation:
        "Set TURSO_AUTH_TOKEN in the deployment environment before running scheduled exports.",
      target: databaseTarget,
      latestAt: null,
    };
  }

  if (database.databaseKind === "unknown") {
    return {
      id: "backup-database-kind-review",
      status: "review",
      kind: "database",
      label: "Database backup source",
      value: "unknown",
      detail:
        "A database URL is configured, but the backup report cannot identify it as remote libSQL or local SQLite.",
      recommendation:
        "Confirm the database backup command works against the configured URL before approving the schedule.",
      target: databaseTarget,
      latestAt: null,
    };
  }

  return {
    id: "backup-database-ready",
    status: "ready",
    kind: "database",
    label: "Turso data source",
    value: database.databaseKind,
    detail: `${database.users} users, ${database.activeFiles} active files, ${database.activeShares} active shares, and ${database.versions} versions are visible for backup coverage.`,
    recommendation:
      "Pair the database dump with rollback readiness and release approval exports.",
    target: databaseTarget,
    latestAt: null,
  };
}

function getScheduleBackupRow({
  backupSchedule,
  backupTarget,
  backupCommand,
}: {
  backupSchedule: string | null;
  backupTarget: string | null;
  backupCommand: string | null;
}): AdminSelfHostedBackupReadinessRow {
  if (!backupSchedule || !backupTarget) {
    return {
      id: "backup-schedule-missing",
      status: "blocked",
      kind: "schedule",
      label: "Backup schedule",
      value: getMissingScheduleValue({ backupSchedule, backupTarget }),
      detail:
        "A self-hosted backup schedule needs both a cadence and a destination.",
      recommendation:
        "Set ESSENCE_BACKUP_SCHEDULE and ESSENCE_BACKUP_TARGET to document the automated backup cadence and storage target.",
      target: maskBackupTarget(backupTarget),
      latestAt: null,
    };
  }

  if (!backupCommand) {
    return {
      id: "backup-command-missing",
      status: "review",
      kind: "schedule",
      label: "Backup command",
      value: backupSchedule,
      detail:
        "The cadence and destination are configured, but the runnable backup command is not documented.",
      recommendation:
        "Set ESSENCE_BACKUP_COMMAND to the exact command used by the scheduled runner.",
      target: maskBackupTarget(backupTarget),
      latestAt: null,
    };
  }

  return {
    id: "backup-schedule-ready",
    status: "ready",
    kind: "schedule",
    label: "Backup schedule",
    value: backupSchedule,
    detail:
      "The backup cadence, destination, and runnable command are configured.",
    recommendation:
      "Keep the command output attached to release approval evidence after each restore drill.",
    target: maskBackupTarget(backupTarget),
    latestAt: null,
  };
}

function getVersionBackupRow(
  rollbackReadiness: AdminRollbackReadinessReport,
): AdminSelfHostedBackupReadinessRow {
  const latestVersion = rollbackReadiness.latestVersions[0];

  if (
    rollbackReadiness.database.activeFiles > 0 &&
    rollbackReadiness.versionAnchorCount === 0
  ) {
    return {
      id: "backup-version-anchors-missing",
      status: "blocked",
      kind: "versions",
      label: "Design-file versions",
      value: "0",
      detail:
        "No named design-file versions exist, so backups do not have restore anchors.",
      recommendation:
        "Create named versions for important files before taking production backup snapshots.",
      target: null,
      latestAt: null,
    };
  }

  if (rollbackReadiness.filesWithoutVersions > 0) {
    return {
      id: "backup-version-coverage-review",
      status: "review",
      kind: "versions",
      label: "Design-file versions",
      value: `${rollbackReadiness.versionAnchorCount}`,
      detail: `${rollbackReadiness.filesWithoutVersions} active files do not have named version restore anchors.`,
      recommendation:
        "Add named versions or mark those files as intentionally excluded from restore drills.",
      target: latestVersion?.fileName ?? null,
      latestAt: latestVersion?.createdAt ?? null,
    };
  }

  return {
    id: "backup-version-coverage-ready",
    status: "ready",
    kind: "versions",
    label: "Design-file versions",
    value: `${rollbackReadiness.versionAnchorCount}`,
    detail: "Active files have named version coverage for restore drills.",
    recommendation:
      "Export rollback readiness with each backup run so version anchors are reviewable.",
    target: latestVersion?.fileName ?? null,
    latestAt: latestVersion?.createdAt ?? null,
  };
}

function getShareBackupRow({
  rollbackReadiness,
  activeShareCount,
}: {
  rollbackReadiness: AdminRollbackReadinessReport;
  activeShareCount: number;
}): AdminSelfHostedBackupReadinessRow {
  if (rollbackReadiness.staleShareCount > 0) {
    return {
      id: "backup-stale-public-shares",
      status: "blocked",
      kind: "shares",
      label: "Public share inventory",
      value: `${activeShareCount}`,
      detail: `${rollbackReadiness.staleShareCount} public shares are stale and should not be carried into a restore without review.`,
      recommendation:
        "Disable stale shares or document why they must survive the next backup snapshot.",
      target: null,
      latestAt: null,
    };
  }

  if (rollbackReadiness.elevatedShareCount > 0) {
    return {
      id: "backup-elevated-public-shares",
      status: "review",
      kind: "shares",
      label: "Public share inventory",
      value: `${activeShareCount}`,
      detail: `${rollbackReadiness.elevatedShareCount} active shares expose download, review, comments, or no-expiry access.`,
      recommendation:
        "Review elevated public shares before preserving them in restore documentation.",
      target: null,
      latestAt: null,
    };
  }

  return {
    id: "backup-public-shares-ready",
    status: "ready",
    kind: "shares",
    label: "Public share inventory",
    value: `${activeShareCount}`,
    detail: "No stale or elevated public share exposure is visible.",
    recommendation:
      "Export public share inventory with backup evidence so restored links can be audited.",
    target: null,
    latestAt: null,
  };
}

function getReleaseArtifactBackupRow({
  releaseApprovalSnapshots,
  productionDeploySmoke,
  rollbackReadiness,
}: {
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  productionDeploySmoke: ProductionDeploySmokeReport;
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminSelfHostedBackupReadinessRow {
  const latestSnapshot = releaseApprovalSnapshots[0];

  if (releaseApprovalSnapshots.length === 0) {
    return {
      id: "backup-release-artifacts-missing",
      status: "review",
      kind: "artifacts",
      label: "Release artifacts",
      value: "0",
      detail:
        "No release approval snapshots are stored with smoke and rollback evidence.",
      recommendation:
        "Create a release approval snapshot and attach smoke artifacts before relying on backups for production recovery.",
      target: null,
      latestAt: null,
    };
  }

  if (productionDeploySmoke.score < 80 || rollbackReadiness.score < 80) {
    return {
      id: "backup-release-artifacts-review",
      status: "review",
      kind: "artifacts",
      label: "Release artifacts",
      value: `${releaseApprovalSnapshots.length}`,
      detail: `Latest evidence exists, but deploy smoke is ${productionDeploySmoke.score} and rollback readiness is ${rollbackReadiness.score}.`,
      recommendation:
        "Improve smoke and rollback evidence before treating the backup as production-ready.",
      target: latestSnapshot?.deploymentUrl ?? null,
      latestAt: latestSnapshot?.createdAt ?? null,
    };
  }

  return {
    id: "backup-release-artifacts-ready",
    status: "ready",
    kind: "artifacts",
    label: "Release artifacts",
    value: `${releaseApprovalSnapshots.length}`,
    detail:
      "Release approval snapshots, deploy smoke, and rollback evidence are available for backup handoff.",
    recommendation:
      "Store the release approval snapshot alongside database and file-version backup artifacts.",
    target: latestSnapshot?.deploymentUrl ?? null,
    latestAt: latestSnapshot?.createdAt ?? null,
  };
}

function getBackupCommands({
  backupCommand,
  productionDeploySmoke,
  databaseKind,
}: {
  backupCommand: string | null;
  productionDeploySmoke: ProductionDeploySmokeReport;
  databaseKind: AdminRollbackReadinessReport["database"]["databaseKind"];
}) {
  const databaseCommand =
    databaseKind === "local-sqlite"
      ? "Copy the SQLite file referenced by TURSO_DATABASE_URL into encrypted backup storage."
      : 'turso db shell <database-name> ".dump" > backups/turso-YYYY-MM-DD.sql';

  return [
    backupCommand || databaseCommand,
    `ESSENCE_VISUAL_BASE_URL=${productionDeploySmoke.baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${productionDeploySmoke.shareToken} bun run visual:routes`,
    "Export Admin > Release rollback readiness JSON.",
    "Export Admin > Governance production monitoring digest Markdown.",
  ];
}

function getMissingScheduleValue({
  backupSchedule,
  backupTarget,
}: {
  backupSchedule: string | null;
  backupTarget: string | null;
}) {
  if (!backupSchedule && !backupTarget) {
    return "missing schedule and target";
  }

  return backupSchedule ? "missing target" : "missing schedule";
}

function getEnvValue(env: BackupEnvironment, ...keys: string[]) {
  for (const key of keys) {
    const value = env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getDatabaseTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return null;
  }

  if (databaseUrl.startsWith("file:")) {
    return "local SQLite file";
  }

  try {
    const url = new URL(databaseUrl);
    return url.host || url.protocol.replace(":", "");
  } catch {
    return null;
  }
}

function maskBackupTarget(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
