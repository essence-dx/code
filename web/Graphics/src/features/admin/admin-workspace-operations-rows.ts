import type { DeployEnvironmentPreflightReport } from "@/features/admin/deploy-environment-preflight";
import type { AdminNotificationDigestSubscriptionsReport } from "@/features/admin/admin-notification-digest-subscriptions";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";
import type { AdminProductionMonitoringDigest } from "@/features/admin/admin-production-monitoring-digest";
import type {
  AdminRollbackDatabaseSummary,
  AdminRollbackReadinessReport,
} from "@/features/admin/admin-rollback-readiness";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { RoleChangeApprovalQueue } from "@/features/admin/admin-role-change-approval";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type {
  AdminWorkspaceOperationsRow,
  WorkspaceOperationsAuditEvent,
  WorkspaceOperationsNotification,
} from "@/features/admin/admin-workspace-operations-types";
import {
  DEPLOY_SMOKE_BLOCKED_HOURS,
  DEPLOY_SMOKE_REVIEW_HOURS,
  formatWorkspaceOperationsBytes,
  getWorstStatus,
  uniqueStrings,
} from "@/features/admin/admin-workspace-operations-utils";

export function getStorageBudgetRow({
  activeFileCount,
  budgetBytes,
  storageUsedBytes,
  storageUsedPercent,
  trashedFileCount,
}: {
  activeFileCount: number;
  budgetBytes: number;
  storageUsedBytes: number;
  storageUsedPercent: number;
  trashedFileCount: number;
}): AdminWorkspaceOperationsRow {
  const status =
    storageUsedPercent >= 95
      ? "blocked"
      : storageUsedPercent >= 75
        ? "review"
        : "ready";

  return {
    id: "storage-budget",
    category: "storage",
    status,
    label: "Workspace storage budget",
    value: `${storageUsedPercent}%`,
    detail: `${formatWorkspaceOperationsBytes(storageUsedBytes)} stored across ${activeFileCount} active files and ${trashedFileCount} trashed files. Budget is ${formatWorkspaceOperationsBytes(budgetBytes)}.`,
    recommendation:
      status === "ready"
        ? "Keep monitoring document payload growth during asset-heavy releases."
        : "Archive large inactive files, clear stale trash, or raise ESSENCE_WORKSPACE_STORAGE_BUDGET_BYTES before the next release.",
    target: "ESSENCE_WORKSPACE_STORAGE_BUDGET_BYTES",
    latestAt: null,
  };
}

export function getStorageVersionRow({
  activeFileCount,
  rollbackReadiness,
}: {
  activeFileCount: number;
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminWorkspaceOperationsRow {
  const status =
    activeFileCount > 0 && rollbackReadiness.filesWithoutVersions > 0
      ? "review"
      : "ready";

  return {
    id: "storage-version-anchors",
    category: "storage",
    status,
    label: "Version anchors",
    value: `${rollbackReadiness.versionAnchorCount}`,
    detail: `${rollbackReadiness.filesWithoutVersions} active files do not have named rollback anchors.`,
    recommendation:
      status === "ready"
        ? "Keep named versions attached to release-sensitive design files."
        : "Create a named version before high-risk file edits or production release approval.",
    target: "Release rollback readiness",
    latestAt: rollbackReadiness.latestVersions[0]?.createdAt ?? null,
  };
}

export function getDatabaseHealthRow({
  database,
  deployEnvironmentPreflight,
}: {
  database: AdminRollbackDatabaseSummary;
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
}): AdminWorkspaceOperationsRow {
  const preflightRows = deployEnvironmentPreflight.rows.filter(
    (row) => row.category === "database",
  );
  const preflightStatus = getWorstStatus(
    preflightRows.map((row) => row.status),
    "ready",
  );
  const status = getWorstStatus(
    [
      database.configured ? "ready" : "blocked",
      database.authTokenRequired && !database.authTokenConfigured
        ? "blocked"
        : "ready",
      preflightStatus,
    ],
    "ready",
  );

  return {
    id: "database-health",
    category: "database",
    status,
    label: "Database health",
    value: database.databaseKind,
    detail: `${database.users} users, ${database.sessions} sessions, ${database.accounts} accounts, ${database.activeFiles} active files, ${database.activeShares} shares, and ${database.versions} versions.`,
    recommendation:
      status === "ready"
        ? "Keep Turso credentials synced across local, preview, and production."
        : "Fix database URL/auth token readiness before releasing admin or editor changes.",
    target: preflightRows.find((row) => row.status !== "ready")?.label ?? null,
    latestAt: null,
  };
}

export function getEmailDeliveryRow({
  deployEnvironmentPreflight,
  failedEmailDeliveries,
  latestDeliveryAt,
  notificationDeliveries,
  notificationDigestSubscriptions,
}: {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  failedEmailDeliveries: WorkspaceOperationsNotification[];
  latestDeliveryAt: string | null;
  notificationDeliveries: WorkspaceOperationsNotification[];
  notificationDigestSubscriptions: AdminNotificationDigestSubscriptionsReport;
}): AdminWorkspaceOperationsRow {
  const emailPreflightStatus = getWorstStatus(
    deployEnvironmentPreflight.rows
      .filter((row) => row.category === "email")
      .map((row) => row.status),
    "ready",
  );
  const status = getWorstStatus(
    [
      emailPreflightStatus,
      failedEmailDeliveries.length > 0 ? "review" : "ready",
      notificationDigestSubscriptions.unroutedActiveSignalCount > 0
        ? "review"
        : "ready",
    ],
    "ready",
  );

  return {
    id: "email-delivery",
    category: "email",
    status,
    label: "Email delivery",
    value: `${failedEmailDeliveries.length} failed`,
    detail: `${notificationDeliveries.length} recent comment deliveries, ${notificationDigestSubscriptions.activeSignalCount} active digest signals, and ${notificationDigestSubscriptions.unroutedActiveSignalCount} unrouted signals.`,
    recommendation:
      status === "ready"
        ? "Keep Brevo sender and digest routing attached to release approvals."
        : "Repair Brevo envs, failed delivery reasons, or unrouted digest subscriptions.",
    target:
      failedEmailDeliveries[0]?.reason ??
      deployEnvironmentPreflight.rows.find(
        (row) => row.category === "email" && row.status !== "ready",
      )?.label ??
      null,
    latestAt: latestDeliveryAt,
  };
}

export function getDeploySmokeRow({
  deploySmokeAgeHours,
  latestApproval,
  productionDeploySmoke,
}: {
  deploySmokeAgeHours: number | null;
  latestApproval: AdminReleaseApprovalSnapshot | null;
  productionDeploySmoke: ProductionDeploySmokeReport;
}): AdminWorkspaceOperationsRow {
  const recencyStatus =
    deploySmokeAgeHours === null
      ? "review"
      : deploySmokeAgeHours >= DEPLOY_SMOKE_BLOCKED_HOURS
        ? "blocked"
        : deploySmokeAgeHours >= DEPLOY_SMOKE_REVIEW_HOURS
          ? "review"
          : "ready";
  const artifactStatus =
    latestApproval && latestApproval.smokeArtifacts.length === 0
      ? "review"
      : "ready";
  const status = getWorstStatus(
    [productionDeploySmoke.status, recencyStatus, artifactStatus],
    "ready",
  );

  return {
    id: "deploy-smoke-recency",
    category: "deploy-smoke",
    status,
    label: "Deploy smoke recency",
    value:
      deploySmokeAgeHours === null
        ? "No approval"
        : `${Math.round(deploySmokeAgeHours)}h`,
    detail: latestApproval
      ? `Latest release approval ${latestApproval.releaseLabel} has ${latestApproval.smokeArtifacts.length} smoke artifacts. Current route checklist is ${productionDeploySmoke.score}/100.`
      : `No release approval snapshot is attached. Current route checklist is ${productionDeploySmoke.score}/100.`,
    recommendation:
      status === "ready"
        ? "Keep the latest deploy smoke artifact attached to the release approval snapshot."
        : "Run a fresh deployed route smoke and save a release approval snapshot with smoke artifacts.",
    target: latestApproval?.deploymentUrl ?? productionDeploySmoke.baseUrl,
    latestAt: latestApproval?.createdAt ?? productionDeploySmoke.generatedAt,
  };
}

export function getAutomationRunRow({
  operatorRehearsals,
}: {
  operatorRehearsals: AdminOperatorRehearsalReport;
}): AdminWorkspaceOperationsRow {
  return {
    id: "automation-runs",
    category: "automation",
    status: operatorRehearsals.status,
    label: "Automation and rehearsal runs",
    value: `${operatorRehearsals.readyRunCount}/${operatorRehearsals.runCount}`,
    detail: `${operatorRehearsals.reviewRunCount} review and ${operatorRehearsals.blockedRunCount} blocked rehearsals across ${operatorRehearsals.stepCount} steps.`,
    recommendation:
      operatorRehearsals.status === "ready"
        ? "Keep rehearsal evidence fresh for restore, import/export, privacy, desktop, and self-hosted recovery."
        : "Run the blocked rehearsal commands and attach the result to the release archive.",
    target:
      operatorRehearsals.rows.find((row) => row.status !== "ready")?.label ??
      null,
    latestAt: operatorRehearsals.generatedAt,
  };
}

export function getAdminActionQueueRow({
  adminActionQueueCount,
  notificationDigestSubscriptions,
  productionMonitoringDigest,
  recentAdminActions,
  roleChangeApprovals,
}: {
  adminActionQueueCount: number;
  notificationDigestSubscriptions: AdminNotificationDigestSubscriptionsReport;
  productionMonitoringDigest: AdminProductionMonitoringDigest;
  recentAdminActions: WorkspaceOperationsAuditEvent[];
  roleChangeApprovals: RoleChangeApprovalQueue;
}): AdminWorkspaceOperationsRow {
  const status =
    roleChangeApprovals.pendingCount > 0 ||
    notificationDigestSubscriptions.unroutedActiveSignalCount > 0 ||
    productionMonitoringDigest.blockedCount > 0
      ? "review"
      : "ready";

  return {
    id: "admin-action-queue",
    category: "admin-queue",
    status,
    label: "Admin action queue",
    value: `${adminActionQueueCount}`,
    detail: `${roleChangeApprovals.pendingCount} pending role changes, ${notificationDigestSubscriptions.unroutedActiveSignalCount} unrouted digest signals, and ${recentAdminActions.length} recent admin actions.`,
    recommendation:
      status === "ready"
        ? "Keep pending governance decisions empty before release signoff."
        : "Resolve pending role changes, route active digest signals, and review blocked monitoring rows.",
    target:
      roleChangeApprovals.requests.find((request) => request.status === "pending")
        ?.targetEmail ??
      productionMonitoringDigest.rows.find((row) => row.status !== "ready")
        ?.label ??
      null,
    latestAt: recentAdminActions[0]?.createdAt ?? null,
  };
}

export function getOperationsCommands({
  deployEnvironmentPreflight,
  operatorRehearsals,
  productionDeploySmoke,
}: {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  operatorRehearsals: AdminOperatorRehearsalReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
}) {
  return uniqueStrings([
    "bun run typecheck",
    ...deployEnvironmentPreflight.commands,
    ...productionDeploySmoke.commands,
    ...operatorRehearsals.commands.slice(0, 6),
  ]);
}
