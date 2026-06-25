import type {
  AdminWorkspaceAccessBudgetCollaborator,
  AdminWorkspaceAccessBudgetFile,
  AdminWorkspaceAccessBudgetUser,
  AdminWorkspaceAccessDomain,
} from "@/features/admin/admin-workspace-access-budget-types";
import {
  accessBudgetStatusWeight,
  getEmailDomain,
  getLatestIso,
  getMostCommonDomain,
  isElevatedRole,
} from "@/features/admin/admin-workspace-access-budget-utils";

export function getTrustedAccessBudgetDomains(
  adminEmails: string[],
  users: AdminWorkspaceAccessBudgetUser[],
  files: AdminWorkspaceAccessBudgetFile[],
) {
  const domains = new Set(adminEmails.map(getEmailDomain).filter(Boolean));

  if (domains.size === 0) {
    const fallback = getMostCommonDomain([
      ...users.map((user) => user.email),
      ...files.map((file) => file.ownerEmail),
    ]);

    if (fallback) {
      domains.add(fallback);
    }
  }

  return [...domains].sort();
}

export function getAccessBudgetExternalDomains({
  activeCollaborators,
  files,
  trustedDomains,
  users,
}: {
  activeCollaborators: AdminWorkspaceAccessBudgetCollaborator[];
  files: AdminWorkspaceAccessBudgetFile[];
  trustedDomains: string[];
  users: AdminWorkspaceAccessBudgetUser[];
}) {
  const trusted = new Set(trustedDomains);
  const byDomain = new Map<string, AdminWorkspaceAccessDomain>();

  for (const domain of users.map((row) => getEmailDomain(row.email))) {
    if (domain && !trusted.has(domain)) {
      updateDomain(byDomain, domain, { userCount: 1 });
    }
  }

  for (const file of files) {
    const domain = getEmailDomain(file.ownerEmail);

    if (domain && !trusted.has(domain)) {
      updateDomain(byDomain, domain, {
        latestAt: file.updatedAt,
        ownerFileCount: 1,
      });
    }
  }

  for (const collaborator of activeCollaborators) {
    const domain = getEmailDomain(collaborator.collaboratorEmail);

    if (domain && !trusted.has(domain)) {
      updateDomain(byDomain, domain, {
        collaboratorCount: 1,
        elevatedCollaboratorCount: isElevatedRole(collaborator.role) ? 1 : 0,
        latestAt: collaborator.updatedAt,
      });
    }
  }

  return [...byDomain.values()]
    .map((domain): AdminWorkspaceAccessDomain => ({
      ...domain,
      status:
        domain.elevatedCollaboratorCount > 0 || domain.ownerFileCount > 0
          ? "blocked"
          : "review",
    }))
    .sort(
      (left, right) =>
        accessBudgetStatusWeight[left.status] -
          accessBudgetStatusWeight[right.status] ||
        right.elevatedCollaboratorCount - left.elevatedCollaboratorCount ||
        right.collaboratorCount - left.collaboratorCount ||
        left.domain.localeCompare(right.domain),
    );
}

function updateDomain(
  byDomain: Map<string, AdminWorkspaceAccessDomain>,
  domain: string,
  patch: Partial<Omit<AdminWorkspaceAccessDomain, "domain" | "status">>,
) {
  const current =
    byDomain.get(domain) ??
    ({
      domain,
      status: "review",
      userCount: 0,
      collaboratorCount: 0,
      ownerFileCount: 0,
      elevatedCollaboratorCount: 0,
      latestAt: null,
    } satisfies AdminWorkspaceAccessDomain);

  byDomain.set(domain, {
    ...current,
    collaboratorCount: current.collaboratorCount + (patch.collaboratorCount ?? 0),
    elevatedCollaboratorCount:
      current.elevatedCollaboratorCount +
      (patch.elevatedCollaboratorCount ?? 0),
    latestAt: getLatestIso(current.latestAt, patch.latestAt ?? null),
    ownerFileCount: current.ownerFileCount + (patch.ownerFileCount ?? 0),
    userCount: current.userCount + (patch.userCount ?? 0),
  });
}
