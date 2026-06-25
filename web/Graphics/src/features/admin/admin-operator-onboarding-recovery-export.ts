import type { AdminOperatorOnboardingRecoveryReport } from "@/features/admin/admin-operator-onboarding-recovery";

export function getAdminOperatorOnboardingRecoveryJson(
  report: AdminOperatorOnboardingRecoveryReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminOperatorOnboardingRecoveryCsv(
  report: AdminOperatorOnboardingRecoveryReport,
) {
  return [
    [
      "playbook_id",
      "track",
      "playbook_status",
      "step_id",
      "step_status",
      "owner",
      "label",
      "evidence",
      "expected_result",
      "command",
      "latest_at",
    ].join(","),
    ...report.playbooks.flatMap((playbook) =>
      playbook.steps.map((step) =>
        [
          playbook.id,
          playbook.track,
          playbook.status,
          step.id,
          step.status,
          step.owner,
          step.label,
          redactOperatorOnboardingRecoveryText(step.evidence),
          step.expectedResult,
          step.command ?? "",
          step.latestAt ?? "",
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ),
  ].join("\n");
}

export function getAdminOperatorOnboardingRecoveryMarkdown(
  report: AdminOperatorOnboardingRecoveryReport,
) {
  return [
    "# Operator Onboarding And Recovery Playbooks",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Playbooks: ${report.readyPlaybookCount} ready, ${report.reviewPlaybookCount} review, ${report.blockedPlaybookCount} blocked`,
    `Steps: ${report.readyStepCount} ready, ${report.reviewStepCount} review, ${report.blockedStepCount} blocked`,
    "",
    "## Commands",
    "",
    ...report.commands.map(
      (command) => `- \`${redactOperatorOnboardingRecoveryText(command)}\``,
    ),
    "",
    "## Playbooks",
    "",
    ...report.playbooks.flatMap((playbook) => [
      `### ${playbook.title}`,
      "",
      `- Track: ${playbook.track}`,
      `- Status: ${playbook.status}`,
      `- Owner: ${playbook.owner}`,
      `- Objective: ${playbook.objective}`,
      `- Handoff export: ${playbook.handoffExportId}`,
      "",
      ...playbook.steps.flatMap((step) => [
        `#### ${step.label}`,
        "",
        `- Status: ${step.status}`,
        `- Owner: ${step.owner}`,
        `- Evidence: ${redactOperatorOnboardingRecoveryText(step.evidence)}`,
        `- Expected result: ${step.expectedResult}`,
        step.command
          ? `- Command: \`${redactOperatorOnboardingRecoveryText(step.command)}\``
          : "- Command: none",
        "",
      ]),
    ]),
    "## Handoff Exports",
    "",
    ...report.handoffExports.flatMap((handoff) => [
      `- ${handoff.label} (${handoff.status})`,
      `  - File: ${handoff.filename}`,
      `  - Summary: ${handoff.summary}`,
      `  - Command: ${handoff.command}`,
    ]),
  ].join("\n");
}

export function redactOperatorOnboardingRecoveryText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(
      /\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\b/gi,
      "[redacted-token]",
    )
    .replace(/\/share\/[A-Za-z0-9_-]+/g, "/share/[redacted-token]");
}

function escapeCsvCell(value: string | number | boolean) {
  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}
