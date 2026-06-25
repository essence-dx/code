import type {
  WorkspacePolicyFinding,
  WorkspacePolicyReviewReport,
} from "@/features/admin/workspace-policy";

export function createWorkspacePolicyJson(report: WorkspacePolicyReviewReport) {
  return JSON.stringify(report, null, 2);
}

export function createWorkspacePolicyCsv(report: WorkspacePolicyReviewReport) {
  const rows = [
    ["Policy score", String(report.score)],
    ["Policy status", report.status],
    ["Active shares", String(report.activeShareCount)],
    ["Download shares", String(report.downloadShareCount)],
    ["Comment shares", String(report.commentShareCount)],
    ["Expired shares", String(report.expiredShareCount)],
    ["Stale sessions", String(report.staleSessionCount)],
    ["Expired sessions", String(report.expiredSessionCount)],
    [],
    ["Finding", "Status", "Value", "Detail"],
    ...report.findings.map((finding) => [
      finding.label,
      finding.status,
      finding.value,
      finding.detail,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function createWorkspacePolicyMarkdown(
  report: WorkspacePolicyReviewReport,
) {
  const lines = [
    "# Essence Workspace Policy Review",
    "",
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    `- Active shares: ${report.activeShareCount}`,
    `- Download shares: ${report.downloadShareCount}`,
    `- Comment shares: ${report.commentShareCount}`,
    `- Expired shares: ${report.expiredShareCount}`,
    `- Stale sessions: ${report.staleSessionCount}`,
    `- Expired sessions: ${report.expiredSessionCount}`,
    "",
    "## Findings",
    "",
    ...report.findings.flatMap(formatFinding),
  ];

  return lines.join("\n");
}

function formatFinding(finding: WorkspacePolicyFinding) {
  return [
    `### ${finding.label}`,
    "",
    `- Status: ${finding.status}`,
    `- Value: ${finding.value}`,
    `- Detail: ${finding.detail}`,
    "",
  ];
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
