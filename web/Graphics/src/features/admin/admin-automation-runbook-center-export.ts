import type {
  AdminAutomationRunbook,
  AdminAutomationRunbookCenterReport,
  AdminAutomationRunbookRow,
} from "@/features/admin/admin-automation-runbook-center";

export function getAdminAutomationRunbookCenterJson(
  report: AdminAutomationRunbookCenterReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminAutomationRunbookCenterCsv(
  report: AdminAutomationRunbookCenterReport,
) {
  const runbookHeader: Array<keyof AdminAutomationRunbook> = [
    "id",
    "category",
    "status",
    "title",
    "objective",
    "cadence",
    "owner",
    "rowCount",
    "commandCount",
    "blockedSignalCount",
    "reviewSignalCount",
    "evidenceBundle",
  ];
  const rowHeader: Array<keyof AdminAutomationRunbookRow> = [
    "id",
    "category",
    "status",
    "label",
    "cadence",
    "owner",
    "evidence",
    "command",
    "latestAt",
  ];

  return [
    [
      "generated_at",
      "status",
      "score",
      "scheduled_health",
      "repair_actions",
      "incident_drills",
      "evidence_bundles",
      "ready",
      "review",
      "blocked",
      "commands",
    ].join(","),
    [
      report.generatedAt,
      report.status,
      report.score,
      report.scheduledHealthCount,
      report.repairActionCount,
      report.incidentDrillCount,
      report.evidenceBundleCount,
      report.readyCount,
      report.reviewCount,
      report.blockedCount,
      report.commandCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    ["section", ...runbookHeader].join(","),
    ...report.runbooks.map((runbook) =>
      ["runbook", ...runbookHeader.map((key) => runbook[key])]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["row", ...rowHeader.map((key) => row[key])]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    ["command"].join(","),
    ...report.commands.map((command) =>
      [command].map(escapeCsvCell).join(","),
    ),
  ].join("\n");
}

export function getAdminAutomationRunbookCenterMarkdown(
  report: AdminAutomationRunbookCenterReport,
) {
  return [
    "# Automation Runbook Center",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    `Commands: ${report.commandCount}`,
    "",
    "## Runbooks",
    "",
    ...report.runbooks.map((runbook) =>
      [
        `- [${runbook.status}] ${runbook.title}`,
        `  - Category: ${runbook.category}`,
        `  - Cadence: ${runbook.cadence}`,
        `  - Owner: ${runbook.owner}`,
        `  - Objective: ${runbook.objective}`,
        `  - Evidence bundle: ${runbook.evidenceBundle}`,
        `  - Signals: ${runbook.blockedSignalCount} blocked, ${runbook.reviewSignalCount} review`,
        `  - Commands: ${runbook.commandCount}`,
      ].join("\n"),
    ),
    "",
    "## Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Cadence: ${row.cadence}`,
        `  - Owner: ${row.owner}`,
        `  - Evidence: ${row.evidence}`,
        `  - Command: \`${row.command}\``,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = Array.isArray(value)
    ? value.join("; ")
    : typeof value === "object" && value
      ? JSON.stringify(value)
      : String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
