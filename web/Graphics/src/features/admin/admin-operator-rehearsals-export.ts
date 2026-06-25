import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";

export function getAdminOperatorRehearsalsJson(
  report: AdminOperatorRehearsalReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminOperatorRehearsalsCsv(
  report: AdminOperatorRehearsalReport,
) {
  return [
    [
      "run_id",
      "run_label",
      "kind",
      "step_id",
      "status",
      "step_label",
      "owner_role",
      "evidence",
      "expected_result",
      "command",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.runId,
        row.runLabel,
        row.kind,
        row.id,
        row.status,
        row.label,
        row.ownerRole,
        row.evidence,
        row.expectedResult,
        row.command,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "run_id",
      "kind",
      "status",
      "score",
      "ready_steps",
      "review_steps",
      "blocked_steps",
      "commands",
      "cadence",
      "objective",
    ].join(","),
    ...report.runs.map((run) =>
      [
        run.id,
        run.kind,
        run.status,
        run.score,
        run.readyStepCount,
        run.reviewStepCount,
        run.blockedStepCount,
        run.commandCount,
        run.cadence,
        run.objective,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminOperatorRehearsalsMarkdown(
  report: AdminOperatorRehearsalReport,
) {
  return [
    "# Operator Rehearsal Runs",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Runs: ${report.readyRunCount} ready, ${report.reviewRunCount} review, ${report.blockedRunCount} blocked`,
    `Steps: ${report.readyStepCount} ready, ${report.reviewStepCount} review, ${report.blockedStepCount} blocked`,
    "",
    "## Runs",
    "",
    ...report.runs.flatMap((run) => [
      `### ${run.label}`,
      "",
      `Status: ${run.status}`,
      `Score: ${run.score}`,
      `Owner: ${run.ownerRole}`,
      `Cadence: ${run.cadence}`,
      `Objective: ${run.objective}`,
      "",
      "Steps:",
      "",
      ...run.steps.map(
        (step) =>
          `- [${step.status}] ${step.label}: ${step.evidence} Expected: ${step.expectedResult}${step.command ? ` Command: \`${step.command}\`` : ""}`,
      ),
      "",
    ]),
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ].join("\n");
}

function escapeCsvCell(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
