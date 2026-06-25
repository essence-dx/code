import {
  getAdminActionQueueRow,
  getAutomationRunRow,
  getDatabaseHealthRow,
  getDeploySmokeRow,
  getEmailDeliveryRow,
  getOperationsCommands,
  getStorageBudgetRow,
  getStorageVersionRow,
} from "@/features/admin/admin-workspace-operations-rows";
import type {
  AdminWorkspaceOperationsInput,
  AdminWorkspaceOperationsMetric,
  AdminWorkspaceOperationsReport,
} from "@/features/admin/admin-workspace-operations-types";
import {
  DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES,
  formatWorkspaceOperationsBytes,
  getAgeHours,
  getDocumentByteSize,
  getLatestDate,
  getWorstStatus,
  isRecent,
} from "@/features/admin/admin-workspace-operations-utils";

export type {
  AdminWorkspaceOperationsCategory,
  AdminWorkspaceOperationsInput,
  AdminWorkspaceOperationsMetric,
  AdminWorkspaceOperationsReport,
  AdminWorkspaceOperationsRow,
  AdminWorkspaceOperationsStatus,
  WorkspaceOperationsAuditEvent,
  WorkspaceOperationsFile,
  WorkspaceOperationsNotification,
} from "@/features/admin/admin-workspace-operations-types";

export function getAdminWorkspaceOperationsReport({
  auditEvents,
  database,
  deployEnvironmentPreflight,
  files,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
  notificationDigestSubscriptions,
  now = Date.now(),
  operatorRehearsals,
  productionDeploySmoke,
  productionMonitoringDigest,
  releaseApprovalSnapshots,
  roleChangeApprovals,
  rollbackReadiness,
  storageBudgetBytes = DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES,
}: AdminWorkspaceOperationsInput): AdminWorkspaceOperationsReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const trashedFiles = files.filter((file) => file.trashedAt);
  const storageUsedBytes = files.reduce(
    (total, file) => total + getDocumentByteSize(file.document),
    0,
  );
  const safeStorageBudgetBytes = Math.max(1, storageBudgetBytes);
  const storageUsedPercent = Math.round(
    (storageUsedBytes / safeStorageBudgetBytes) * 100,
  );
  const failedEmailDeliveries = notificationDeliveries.filter(
    (delivery) => delivery.status === "failed",
  );
  const latestDeliveryAt = getLatestDate(
    notificationDeliveries.map((delivery) => delivery.createdAt),
  );
  const latestApproval = releaseApprovalSnapshots[0] ?? null;
  const deploySmokeAgeHours = latestApproval
    ? getAgeHours(latestApproval.createdAt, now)
    : null;
  const recentAdminActions = auditEvents.filter((event) =>
    isRecent(event.createdAt, now, 7),
  );
  const automationReviewCount =
    operatorRehearsals.reviewRunCount + operatorRehearsals.blockedRunCount;
  const adminActionQueueCount =
    roleChangeApprovals.pendingCount +
    notificationDigestSubscriptions.unroutedActiveSignalCount +
    productionMonitoringDigest.blockedCount +
    productionMonitoringDigest.reviewCount;
  const rows = [
    getStorageBudgetRow({
      activeFileCount: activeFiles.length,
      budgetBytes: safeStorageBudgetBytes,
      storageUsedBytes,
      storageUsedPercent,
      trashedFileCount: trashedFiles.length,
    }),
    getStorageVersionRow({
      activeFileCount: activeFiles.length,
      rollbackReadiness,
    }),
    getDatabaseHealthRow({
      database,
      deployEnvironmentPreflight,
    }),
    getEmailDeliveryRow({
      deployEnvironmentPreflight,
      failedEmailDeliveries,
      latestDeliveryAt,
      notificationDeliveries,
      notificationDigestSubscriptions,
    }),
    getDeploySmokeRow({
      deploySmokeAgeHours,
      latestApproval,
      productionDeploySmoke,
    }),
    getAutomationRunRow({
      operatorRehearsals,
    }),
    getAdminActionQueueRow({
      adminActionQueueCount,
      notificationDigestSubscriptions,
      productionMonitoringDigest,
      recentAdminActions,
      roleChangeApprovals,
    }),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status = getWorstStatus(
    rows.map((row) => row.status),
    "ready",
  );
  const databaseStatus =
    rows.find((row) => row.id === "database-health")?.status ?? "review";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    storageBudgetBytes: safeStorageBudgetBytes,
    storageUsedBytes,
    storageUsedPercent,
    activeFileCount: activeFiles.length,
    trashedFileCount: trashedFiles.length,
    versionCount: database.versions,
    databaseKind: database.databaseKind,
    databaseStatus,
    failedEmailDeliveryCount: failedEmailDeliveries.length,
    deploySmokeAgeHours,
    automationReviewCount,
    adminActionQueueCount,
    readyCount,
    reviewCount,
    blockedCount,
    metrics: getWorkspaceOperationsMetrics({
      adminActionQueueCount,
      automationReviewCount,
      databaseStatus,
      failedEmailDeliveryCount: failedEmailDeliveries.length,
      productionDeploySmoke,
      recentAdminActionCount: recentAdminActions.length,
      reportRows: rows,
      storageBudgetBytes: safeStorageBudgetBytes,
      storageUsedBytes,
      storageUsedPercent,
      database,
      deploySmokeAgeHours,
      notificationDeliveryCount: notificationDeliveries.length,
      operatorRunCount: operatorRehearsals.runCount,
    }),
    rows,
    commands: getOperationsCommands({
      deployEnvironmentPreflight,
      operatorRehearsals,
      productionDeploySmoke,
    }),
  };
}

function getWorkspaceOperationsMetrics({
  adminActionQueueCount,
  automationReviewCount,
  database,
  databaseStatus,
  deploySmokeAgeHours,
  failedEmailDeliveryCount,
  notificationDeliveryCount,
  operatorRunCount,
  productionDeploySmoke,
  recentAdminActionCount,
  reportRows,
  storageBudgetBytes,
  storageUsedBytes,
  storageUsedPercent,
}: {
  adminActionQueueCount: number;
  automationReviewCount: number;
  database: AdminWorkspaceOperationsInput["database"];
  databaseStatus: AdminWorkspaceOperationsReport["databaseStatus"];
  deploySmokeAgeHours: number | null;
  failedEmailDeliveryCount: number;
  notificationDeliveryCount: number;
  operatorRunCount: number;
  productionDeploySmoke: AdminWorkspaceOperationsInput["productionDeploySmoke"];
  recentAdminActionCount: number;
  reportRows: AdminWorkspaceOperationsReport["rows"];
  storageBudgetBytes: number;
  storageUsedBytes: number;
  storageUsedPercent: number;
}): AdminWorkspaceOperationsMetric[] {
  return [
    {
      id: "storage",
      label: "Storage used",
      value: `${storageUsedPercent}%`,
      detail: `${formatWorkspaceOperationsBytes(storageUsedBytes)} of ${formatWorkspaceOperationsBytes(storageBudgetBytes)}`,
      status: reportRows[0]?.status ?? "review",
    },
    {
      id: "database",
      label: "Database",
      value: database.databaseKind,
      detail: `${database.activeFiles} files, ${database.versions} versions`,
      status: databaseStatus,
    },
    {
      id: "email",
      label: "Email failed",
      value: `${failedEmailDeliveryCount}`,
      detail: `${notificationDeliveryCount} delivery attempts loaded`,
      status:
        reportRows.find((row) => row.id === "email-delivery")?.status ??
        "review",
    },
    {
      id: "deploy-smoke",
      label: "Smoke age",
      value:
        deploySmokeAgeHours === null
          ? "No approval"
          : `${Math.round(deploySmokeAgeHours)}h`,
      detail: `${productionDeploySmoke.readyCount} ready, ${productionDeploySmoke.reviewCount} review, ${productionDeploySmoke.blockedCount} blocked`,
      status:
        reportRows.find((row) => row.id === "deploy-smoke-recency")?.status ??
        "review",
    },
    {
      id: "automation",
      label: "Automation review",
      value: `${automationReviewCount}`,
      detail: `${operatorRunCount} operator rehearsals`,
      status:
        reportRows.find((row) => row.id === "automation-runs")?.status ??
        "review",
    },
    {
      id: "admin-queue",
      label: "Admin queue",
      value: `${adminActionQueueCount}`,
      detail: `${recentAdminActionCount} admin actions in 7 days`,
      status:
        reportRows.find((row) => row.id === "admin-action-queue")?.status ??
        "review",
    },
  ];
}
