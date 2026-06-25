import {
  getAccessBudgetExternalDomains,
  getTrustedAccessBudgetDomains,
} from "@/features/admin/admin-workspace-access-budget-domains";
import {
  getAccessBudgetCommands,
  getAccessBudgetRoleBudgets,
  getAccessBudgetRows,
} from "@/features/admin/admin-workspace-access-budget-rows";
import type {
  AdminWorkspaceAccessBudgetInput,
  AdminWorkspaceAccessBudgetReport,
  AdminWorkspaceAccessBudgetThresholds,
} from "@/features/admin/admin-workspace-access-budget-types";
import { isElevatedRole } from "@/features/admin/admin-workspace-access-budget-utils";

export type {
  AdminWorkspaceAccessBudgetCategory,
  AdminWorkspaceAccessBudgetCollaborator,
  AdminWorkspaceAccessBudgetFile,
  AdminWorkspaceAccessBudgetInput,
  AdminWorkspaceAccessBudgetReport,
  AdminWorkspaceAccessBudgetRow,
  AdminWorkspaceAccessBudgetSession,
  AdminWorkspaceAccessBudgetShare,
  AdminWorkspaceAccessBudgetStatus,
  AdminWorkspaceAccessBudgetThresholds,
  AdminWorkspaceAccessBudgetUser,
  AdminWorkspaceAccessDomain,
  AdminWorkspaceAccessRoleBudget,
} from "@/features/admin/admin-workspace-access-budget-types";

const defaultThresholds: AdminWorkspaceAccessBudgetThresholds = {
  elevatedSeatLimit: 25,
  externalDomainLimit: 2,
  staleCollaboratorDays: 90,
};

export function getAdminWorkspaceAccessBudgetReport({
  adminEmails,
  budgets,
  collaborators,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  roleChangePendingCount,
  sessions,
  shares,
  users,
  workspacePolicy,
}: AdminWorkspaceAccessBudgetInput): AdminWorkspaceAccessBudgetReport {
  const thresholds = { ...defaultThresholds, ...budgets };
  const trustedDomains = getTrustedAccessBudgetDomains(adminEmails, users, files);
  const activeFiles = files.filter((file) => !file.trashedAt);
  const activeFileIds = new Set(activeFiles.map((file) => file.id));
  const activeCollaborators = collaborators.filter((collaborator) =>
    activeFileIds.has(collaborator.fileId),
  );
  const activeShares = shares.filter((share) => !share.disabledAt);
  const domains = getAccessBudgetExternalDomains({
    activeCollaborators,
    files: activeFiles,
    trustedDomains,
    users,
  });
  const elevatedCollaborators = activeCollaborators.filter((collaborator) =>
    isElevatedRole(collaborator.role),
  );
  const staleSince = now - thresholds.staleCollaboratorDays * 24 * 60 * 60 * 1000;
  const staleCollaborators = activeCollaborators.filter(
    (collaborator) => new Date(collaborator.updatedAt).getTime() < staleSince,
  );
  const noExpiryShares = activeShares.filter((share) => !share.expiresAt);
  const downloadShares = activeShares.filter((share) => share.allowDownload);
  const expiredActiveShares = activeShares.filter((share) =>
    share.expiresAt ? new Date(share.expiresAt).getTime() < now : false,
  );
  const staleSessions = sessions.filter((session) => {
    const staleSessionMs =
      workspacePolicy.settings.staleSessionDays * 24 * 60 * 60 * 1000;

    return new Date(session.updatedAt).getTime() < now - staleSessionMs;
  });
  const rows = getAccessBudgetRows({
    domains,
    downloadShares,
    elevatedCollaborators,
    expiredActiveShares,
    files: activeFiles,
    noExpiryShares,
    roleChangePendingCount,
    staleCollaborators,
    staleSessions,
    thresholds,
    users,
    workspacePolicy,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;

  return {
    generatedAt,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    trustedDomains,
    userCount: users.length,
    verifiedUserCount: users.filter((user) => user.emailVerified).length,
    unverifiedUserCount: users.filter((user) => !user.emailVerified).length,
    collaboratorCount: activeCollaborators.length,
    elevatedCollaboratorCount: elevatedCollaborators.length,
    staleCollaboratorCount: staleCollaborators.length,
    staleSessionCount: staleSessions.length,
    externalDomainCount: domains.length,
    riskyShareCount:
      noExpiryShares.length + downloadShares.length + expiredActiveShares.length,
    noExpiryShareCount: noExpiryShares.length,
    downloadShareCount: downloadShares.length,
    expiredActiveShareCount: expiredActiveShares.length,
    pendingRoleChangeCount: roleChangePendingCount,
    thresholds,
    roleBudgets: getAccessBudgetRoleBudgets(activeCollaborators, thresholds),
    domains,
    rows,
    commands: getAccessBudgetCommands(),
  };
}
