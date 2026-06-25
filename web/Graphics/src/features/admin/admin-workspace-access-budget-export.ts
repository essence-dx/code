import type {
  AdminWorkspaceAccessBudgetReport,
  AdminWorkspaceAccessBudgetRow,
} from "@/features/admin/admin-workspace-access-budget";

export function getAdminWorkspaceAccessBudgetJson(
  report: AdminWorkspaceAccessBudgetReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminWorkspaceAccessBudgetCsv(
  report: AdminWorkspaceAccessBudgetReport,
) {
  const header: Array<keyof AdminWorkspaceAccessBudgetRow> = [
    "id",
    "category",
    "status",
    "label",
    "detail",
    "recommendation",
    "owner",
    "count",
    "latestAt",
  ];

  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminWorkspaceAccessBudgetMarkdown(
  report: AdminWorkspaceAccessBudgetReport,
) {
  return [
    "# Workspace Access Budget",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Trusted domains: ${report.trustedDomains.join(", ") || "none"}`,
    `Users: ${report.userCount}`,
    `Verified users: ${report.verifiedUserCount}`,
    `Collaborators: ${report.collaboratorCount}`,
    `Elevated collaborators: ${report.elevatedCollaboratorCount}`,
    `External domains: ${report.externalDomainCount}`,
    `Stale grants: ${report.staleCollaboratorCount}`,
    `Risky shares: ${report.riskyShareCount}`,
    `Pending role changes: ${report.pendingRoleChangeCount}`,
    "",
    "## Role Budgets",
    "",
    ...report.roleBudgets.map(
      (budget) =>
        `- [${budget.status}] ${budget.label}: ${budget.used}/${budget.limit} (${budget.remaining} remaining)`,
    ),
    "",
    "## Review Queue",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Owner: ${row.owner}`,
        `  - Count: ${row.count}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
