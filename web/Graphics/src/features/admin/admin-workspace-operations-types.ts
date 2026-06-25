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
import type { DesignCommentNotificationDelivery } from "@/features/editor/types";

export type AdminWorkspaceOperationsStatus = "ready" | "review" | "blocked";

export type AdminWorkspaceOperationsCategory =
  | "admin-queue"
  | "automation"
  | "database"
  | "deploy-smoke"
  | "email"
  | "storage";

export type AdminWorkspaceOperationsMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: AdminWorkspaceOperationsStatus;
};

export type AdminWorkspaceOperationsRow = {
  id: string;
  category: AdminWorkspaceOperationsCategory;
  status: AdminWorkspaceOperationsStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
  latestAt: string | null;
};

export type AdminWorkspaceOperationsReport = {
  generatedAt: string;
  status: AdminWorkspaceOperationsStatus;
  score: number;
  storageBudgetBytes: number;
  storageUsedBytes: number;
  storageUsedPercent: number;
  activeFileCount: number;
  trashedFileCount: number;
  versionCount: number;
  databaseKind: AdminRollbackDatabaseSummary["databaseKind"];
  databaseStatus: AdminWorkspaceOperationsStatus;
  failedEmailDeliveryCount: number;
  deploySmokeAgeHours: number | null;
  automationReviewCount: number;
  adminActionQueueCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  metrics: AdminWorkspaceOperationsMetric[];
  rows: AdminWorkspaceOperationsRow[];
  commands: string[];
};

export type WorkspaceOperationsFile = {
  id: string;
  name: string;
  ownerEmail: string;
  updatedAt: string;
  trashedAt: string | null;
  document: unknown;
};

export type WorkspaceOperationsNotification = {
  status: DesignCommentNotificationDelivery["status"];
  createdAt: string;
  recipientEmail: string;
  fileName: string;
  reason: string | null;
};

export type WorkspaceOperationsAuditEvent = {
  id: string;
  action: string;
  actorEmail: string;
  targetLabel: string;
  createdAt: string;
};

export type AdminWorkspaceOperationsInput = {
  files: WorkspaceOperationsFile[];
  notificationDeliveries: WorkspaceOperationsNotification[];
  auditEvents: WorkspaceOperationsAuditEvent[];
  database: AdminRollbackDatabaseSummary;
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  productionMonitoringDigest: AdminProductionMonitoringDigest;
  notificationDigestSubscriptions: AdminNotificationDigestSubscriptionsReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  roleChangeApprovals: RoleChangeApprovalQueue;
  rollbackReadiness: AdminRollbackReadinessReport;
  operatorRehearsals: AdminOperatorRehearsalReport;
  generatedAt?: string;
  now?: number;
  storageBudgetBytes?: number;
};
