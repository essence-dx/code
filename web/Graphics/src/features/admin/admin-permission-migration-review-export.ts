import type {
  AdminPermissionMigration,
  AdminPermissionMigrationReviewReport,
  AdminPermissionMigrationReviewRow,
} from "@/features/admin/admin-permission-migration-review-types";

export function getAdminPermissionMigrationReviewJson(
  report: AdminPermissionMigrationReviewReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminPermissionMigrationReviewCsv(
  report: AdminPermissionMigrationReviewReport,
) {
  const rowHeader: Array<keyof AdminPermissionMigrationReviewRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "count",
    "target",
    "latestAt",
  ];
  const migrationHeader: Array<keyof AdminPermissionMigration> = [
    "id",
    "category",
    "status",
    "surface",
    "fileName",
    "ownerEmail",
    "currentAccess",
    "targetAccess",
    "risk",
    "leastPrivilegeRecommendation",
    "evidenceCount",
    "latestAt",
  ];

  return [
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["review-row", ...rowHeader.map((key) => row[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...migrationHeader].join(","),
    ...report.migrations.map((migration) =>
      ["migration", ...migrationHeader.map((key) => migration[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminPermissionMigrationReviewMarkdown(
  report: AdminPermissionMigrationReviewReport,
) {
  return [
    "# Granular Permission Migration Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Migrations: ${report.migrationCount}`,
    `Files: ${report.fileMigrationCount}`,
    `Shares: ${report.shareMigrationCount}`,
    `Branches: ${report.branchMigrationCount}`,
    `Libraries: ${report.libraryMigrationCount}`,
    `Components: ${report.componentMigrationCount}`,
    `Least privilege recommendations: ${report.leastPrivilegeRecommendationCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Migration Queue",
    "",
    ...report.migrations.map((migration) =>
      [
        `- [${migration.status}] ${migration.fileName}`,
        `  - Surface: ${migration.surface}`,
        `  - Current: ${migration.currentAccess}`,
        `  - Target: ${migration.targetAccess}`,
        `  - Risk: ${migration.risk}`,
        `  - Least privilege: ${migration.leastPrivilegeRecommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ]
    .map(redactSensitive)
    .join("\n");
}

function redactSensitive(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\b/gi, "[redacted-token]")
    .replace(/\/share\/[A-Za-z0-9_-]+/g, "/share/[redacted-token]");
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
