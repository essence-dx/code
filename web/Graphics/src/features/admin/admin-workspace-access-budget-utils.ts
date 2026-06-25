import type { AdminWorkspaceAccessBudgetStatus } from "@/features/admin/admin-workspace-access-budget-types";

export const accessBudgetStatusWeight: Record<
  AdminWorkspaceAccessBudgetStatus,
  number
> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getEmailDomain(email: string) {
  const [, domain = ""] = email.toLowerCase().trim().split("@");

  return domain;
}

export function getLatestIso(left: string | null, right: string | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

export function getMostCommonDomain(emails: string[]) {
  const counts = new Map<string, number>();

  for (const email of emails) {
    const domain = getEmailDomain(email);

    if (domain) {
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0];
}

export function isElevatedRole(role: string) {
  return role === "editor" || role === "commenter";
}
