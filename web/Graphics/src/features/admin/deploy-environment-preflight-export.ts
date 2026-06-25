import type { DeployEnvironmentPreflightReport } from "@/features/admin/deploy-environment-preflight";

export function getDeployEnvironmentPreflightJson(
  report: DeployEnvironmentPreflightReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getDeployEnvironmentPreflightCsv(
  report: DeployEnvironmentPreflightReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "env_keys",
      "required",
      "secret",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.envKeys.join(" "),
        row.required,
        row.secret,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getDeployEnvironmentPreflightMarkdown(
  report: DeployEnvironmentPreflightReport,
) {
  return [
    "# Deploy Environment Preflight",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `App origin: ${report.appOrigin}`,
    `Vercel environment: ${report.vercelEnv}`,
    `Runtime: ${report.runtime}`,
    `Checks: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Checks",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.envKeys.join(", ")}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
