import type { WorkspacePolicyReviewReport } from "@/features/admin/workspace-policy";
import type {
  AdminWorkspaceAccessBudgetCollaborator,
  AdminWorkspaceAccessBudgetFile,
  AdminWorkspaceAccessBudgetRow,
  AdminWorkspaceAccessBudgetShare,
  AdminWorkspaceAccessBudgetSession,
  AdminWorkspaceAccessBudgetThresholds,
  AdminWorkspaceAccessBudgetUser,
  AdminWorkspaceAccessDomain,
  AdminWorkspaceAccessRoleBudget,
} from "@/features/admin/admin-workspace-access-budget-types";
import {
  accessBudgetStatusWeight,
  getLatestIso,
  isElevatedRole,
} from "@/features/admin/admin-workspace-access-budget-utils";

export type AccessBudgetRowsInput = {
  domains: AdminWorkspaceAccessDomain[];
  downloadShares: AdminWorkspaceAccessBudgetShare[];
  elevatedCollaborators: AdminWorkspaceAccessBudgetCollaborator[];
  expiredActiveShares: AdminWorkspaceAccessBudgetShare[];
  files: AdminWorkspaceAccessBudgetFile[];
  noExpiryShares: AdminWorkspaceAccessBudgetShare[];
  roleChangePendingCount: number;
  staleCollaborators: AdminWorkspaceAccessBudgetCollaborator[];
  staleSessions: AdminWorkspaceAccessBudgetSession[];
  thresholds: AdminWorkspaceAccessBudgetThresholds;
  users: AdminWorkspaceAccessBudgetUser[];
  workspacePolicy: WorkspacePolicyReviewReport;
};

export function getAccessBudgetRows({
  domains,
  downloadShares,
  elevatedCollaborators,
  expiredActiveShares,
  files,
  noExpiryShares,
  roleChangePendingCount,
  staleCollaborators,
  staleSessions,
  thresholds,
  users,
  workspacePolicy,
}: AccessBudgetRowsInput) {
  const rows = [
    getUnverifiedUsersRow(users),
    getExternalDomainBudgetRow(domains, thresholds),
    ...domains.slice(0, 8).map(toExternalDomainRow),
    getStaleCollaboratorRow(staleCollaborators, thresholds),
    getElevatedSeatBudgetRow(elevatedCollaborators, thresholds),
    getEditorHeavyFileRow(files),
    getNoExpiryShareRow(noExpiryShares, workspacePolicy),
    getDownloadShareRow(downloadShares, workspacePolicy),
    getExpiredActiveShareRow(expiredActiveShares),
    getPendingRoleChangeRow(roleChangePendingCount),
    getStaleSessionRow(staleSessions, workspacePolicy),
  ]
    .filter((row): row is AdminWorkspaceAccessBudgetRow => Boolean(row))
    .sort(sortAccessBudgetRows);

  return rows.length > 0 ? rows : [getReadyRow()];
}

export function getAccessBudgetRoleBudgets(
  collaborators: AdminWorkspaceAccessBudgetCollaborator[],
  thresholds: AdminWorkspaceAccessBudgetThresholds,
): AdminWorkspaceAccessRoleBudget[] {
  const editorCount = collaborators.filter(
    (collaborator) => collaborator.role === "editor",
  ).length;
  const commenterCount = collaborators.filter(
    (collaborator) => collaborator.role === "commenter",
  ).length;
  const elevatedCount = editorCount + commenterCount;

  return [
    toRoleBudget("Elevated collaborators", elevatedCount, thresholds.elevatedSeatLimit),
    toRoleBudget(
      "Editors",
      editorCount,
      Math.max(5, Math.ceil(thresholds.elevatedSeatLimit / 2)),
    ),
    toRoleBudget("Commenters", commenterCount, thresholds.elevatedSeatLimit),
  ];
}

export function getAccessBudgetCommands() {
  return [
    "Review external domains before promoting publish channels.",
    "Downgrade stale editor and commenter grants to viewer after handoff.",
    "Expire public links that are not tied to an active review or release.",
    "Resolve pending role-change requests before release approval.",
    "Export the access budget report with the governance packet.",
  ];
}

function toRoleBudget(
  label: string,
  used: number,
  limit: number,
): AdminWorkspaceAccessRoleBudget {
  const remaining = Math.max(0, limit - used);
  const pressure = limit > 0 ? used / limit : 1;

  return {
    label,
    used,
    limit,
    remaining,
    status: used > limit ? "blocked" : pressure >= 0.8 ? "review" : "ready",
    detail: `${used} used, ${remaining} available`,
  };
}

function getUnverifiedUsersRow(
  users: AdminWorkspaceAccessBudgetUser[],
): AdminWorkspaceAccessBudgetRow | null {
  const unverifiedUsers = users.filter((user) => !user.emailVerified);

  if (unverifiedUsers.length === 0) {
    return null;
  }

  return {
    id: "access-budget-unverified-users",
    category: "users",
    status: "review",
    label: "Unverified accounts can still create access drift",
    detail: `${unverifiedUsers.length} user accounts still need email verification.`,
    recommendation: "Verify or remove pending accounts before broad collaborator invites.",
    owner: "Workspace admins",
    count: unverifiedUsers.length,
    latestAt: null,
  };
}

function getExternalDomainBudgetRow(
  domains: AdminWorkspaceAccessDomain[],
  thresholds: AdminWorkspaceAccessBudgetThresholds,
): AdminWorkspaceAccessBudgetRow | null {
  if (domains.length === 0) {
    return null;
  }

  return {
    id: "access-budget-external-domain-budget",
    category: "domains",
    status: domains.length > thresholds.externalDomainLimit ? "blocked" : "review",
    label: "External domain budget",
    detail: `${domains.length} external domains are present; budget is ${thresholds.externalDomainLimit}.`,
    recommendation: "Confirm each external domain has an active project need and owner.",
    owner: "Workspace admins",
    count: domains.length,
    latestAt: domains.reduce(
      (latest, domain) => getLatestIso(latest, domain.latestAt),
      null as string | null,
    ),
  };
}

function toExternalDomainRow(
  domain: AdminWorkspaceAccessDomain,
): AdminWorkspaceAccessBudgetRow {
  return {
    id: `access-budget-domain-${domain.domain}`,
    category: "domains",
    status: domain.status,
    label: domain.domain,
    detail: `${domain.userCount} users, ${domain.collaboratorCount} collaborators, ${domain.ownerFileCount} owned files.`,
    recommendation:
      domain.status === "blocked"
        ? "Review elevated access from this domain before production sharing."
        : "Keep this domain on the access review list until the handoff closes.",
    owner: domain.domain,
    count: domain.userCount + domain.collaboratorCount + domain.ownerFileCount,
    latestAt: domain.latestAt,
  };
}

function getStaleCollaboratorRow(
  staleCollaborators: AdminWorkspaceAccessBudgetCollaborator[],
  thresholds: AdminWorkspaceAccessBudgetThresholds,
): AdminWorkspaceAccessBudgetRow | null {
  if (staleCollaborators.length === 0) {
    return null;
  }

  return {
    id: "access-budget-stale-collaborators",
    category: "collaborators",
    status: staleCollaborators.some((collaborator) =>
      isElevatedRole(collaborator.role),
    )
      ? "blocked"
      : "review",
    label: "Stale collaborator grants",
    detail: `${staleCollaborators.length} grants have not changed for ${thresholds.staleCollaboratorDays}+ days.`,
    recommendation: "Reconfirm stale editor/commenter grants or downgrade them to viewer.",
    owner: "File owners",
    count: staleCollaborators.length,
    latestAt: staleCollaborators.reduce(
      (latest, collaborator) => getLatestIso(latest, collaborator.updatedAt),
      null as string | null,
    ),
  };
}

function getElevatedSeatBudgetRow(
  elevatedCollaborators: AdminWorkspaceAccessBudgetCollaborator[],
  thresholds: AdminWorkspaceAccessBudgetThresholds,
): AdminWorkspaceAccessBudgetRow | null {
  if (elevatedCollaborators.length === 0) {
    return null;
  }

  const pressure = elevatedCollaborators.length / thresholds.elevatedSeatLimit;

  if (pressure < 0.8) {
    return null;
  }

  return {
    id: "access-budget-elevated-seat-budget",
    category: "seat-hygiene",
    status:
      elevatedCollaborators.length > thresholds.elevatedSeatLimit
        ? "blocked"
        : "review",
    label: "Elevated access budget pressure",
    detail: `${elevatedCollaborators.length} editor/commenter grants are using a ${thresholds.elevatedSeatLimit} grant budget.`,
    recommendation: "Move passive collaborators to viewer before expanding the workspace.",
    owner: "Workspace admins",
    count: elevatedCollaborators.length,
    latestAt: elevatedCollaborators.reduce(
      (latest, collaborator) => getLatestIso(latest, collaborator.updatedAt),
      null as string | null,
    ),
  };
}

function getEditorHeavyFileRow(
  files: AdminWorkspaceAccessBudgetFile[],
): AdminWorkspaceAccessBudgetRow | null {
  const editorHeavyFiles = files.filter((file) => file.editorCount >= 4);

  if (editorHeavyFiles.length === 0) {
    return null;
  }

  return {
    id: "access-budget-editor-heavy-files",
    category: "seat-hygiene",
    status: "review",
    label: "Editor-heavy files",
    detail: `${editorHeavyFiles.length} files have four or more editors.`,
    recommendation: "Use commenter/viewer roles for review-only collaborators.",
    owner: "File owners",
    count: editorHeavyFiles.length,
    latestAt: editorHeavyFiles.reduce(
      (latest, file) => getLatestIso(latest, file.updatedAt),
      null as string | null,
    ),
  };
}

function getNoExpiryShareRow(
  shares: AdminWorkspaceAccessBudgetShare[],
  workspacePolicy: WorkspacePolicyReviewReport,
): AdminWorkspaceAccessBudgetRow | null {
  if (shares.length === 0) {
    return null;
  }

  return {
    id: "access-budget-no-expiry-shares",
    category: "share-drift",
    status:
      workspacePolicy.settings.defaultShareExpiryDays > 0 ? "blocked" : "review",
    label: "Public links without expiry",
    detail: `${shares.length} active links have no expiry date.`,
    recommendation: "Set an expiry window or disable links not tied to active review.",
    owner: "File owners",
    count: shares.length,
    latestAt: shares.reduce(
      (latest, share) => getLatestIso(latest, share.createdAt),
      null as string | null,
    ),
  };
}

function getDownloadShareRow(
  shares: AdminWorkspaceAccessBudgetShare[],
  workspacePolicy: WorkspacePolicyReviewReport,
): AdminWorkspaceAccessBudgetRow | null {
  if (shares.length === 0) {
    return null;
  }

  return {
    id: "access-budget-download-shares",
    category: "share-drift",
    status: workspacePolicy.settings.allowPublicDownloads ? "review" : "blocked",
    label: "Download-enabled public links",
    detail: `${shares.length} active public links allow downloads.`,
    recommendation: "Disable downloads unless the handoff explicitly needs source export.",
    owner: "File owners",
    count: shares.length,
    latestAt: shares.reduce(
      (latest, share) => getLatestIso(latest, share.createdAt),
      null as string | null,
    ),
  };
}

function getExpiredActiveShareRow(
  shares: AdminWorkspaceAccessBudgetShare[],
): AdminWorkspaceAccessBudgetRow | null {
  if (shares.length === 0) {
    return null;
  }

  return {
    id: "access-budget-expired-active-shares",
    category: "share-drift",
    status: "blocked",
    label: "Expired links still enabled",
    detail: `${shares.length} links are expired but not disabled.`,
    recommendation: "Disable expired links or create a fresh reviewed share target.",
    owner: "Workspace admins",
    count: shares.length,
    latestAt: shares.reduce(
      (latest, share) => getLatestIso(latest, share.expiresAt ?? share.createdAt),
      null as string | null,
    ),
  };
}

function getPendingRoleChangeRow(
  pendingCount: number,
): AdminWorkspaceAccessBudgetRow | null {
  if (pendingCount === 0) {
    return null;
  }

  return {
    id: "access-budget-pending-role-changes",
    category: "role-requests",
    status: "review",
    label: "Pending elevated-role requests",
    detail: `${pendingCount} collaborator role-change requests are waiting for admin review.`,
    recommendation: "Approve only request-scoped upgrades and reject stale requests.",
    owner: "Workspace admins",
    count: pendingCount,
    latestAt: null,
  };
}

function getStaleSessionRow(
  sessions: AdminWorkspaceAccessBudgetSession[],
  workspacePolicy: WorkspacePolicyReviewReport,
): AdminWorkspaceAccessBudgetRow | null {
  if (sessions.length === 0) {
    return null;
  }

  return {
    id: "access-budget-stale-sessions",
    category: "users",
    status:
      workspacePolicy.settings.sessionMode === "revoke-expired"
        ? "blocked"
        : "review",
    label: "Stale active sessions",
    detail: `${sessions.length} sessions are older than the ${workspacePolicy.settings.staleSessionDays}-day session policy.`,
    recommendation: "Revoke stale sessions before expanding workspace access.",
    owner: "Workspace admins",
    count: sessions.length,
    latestAt: sessions.reduce(
      (latest, session) => getLatestIso(latest, session.updatedAt),
      null as string | null,
    ),
  };
}

function getReadyRow(): AdminWorkspaceAccessBudgetRow {
  return {
    id: "access-budget-ready",
    category: "seat-hygiene",
    status: "ready",
    label: "Access budget is clean",
    detail:
      "No external-domain, stale-grant, elevated-role, public-link, or pending role-change drift is currently blocking release.",
    recommendation: "Export this report with the release packet.",
    owner: "Workspace admins",
    count: 0,
    latestAt: null,
  };
}

function sortAccessBudgetRows(
  left: AdminWorkspaceAccessBudgetRow,
  right: AdminWorkspaceAccessBudgetRow,
) {
  return (
    accessBudgetStatusWeight[left.status] -
      accessBudgetStatusWeight[right.status] ||
    right.count - left.count ||
    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -
      (left.latestAt ? new Date(left.latestAt).getTime() : 0)
  );
}
