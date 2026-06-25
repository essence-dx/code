import type {
  InteractionHarnessRow,
  InteractionTestHarnessReport,
} from "@/features/editor/interaction-test-harness-types";

export function getInteractionTestHarnessJson(
  report: InteractionTestHarnessReport,
  rows: InteractionHarnessRow[] = report.rows,
) {
  return JSON.stringify(
    {
      schema: "essence.interaction-test-harness.v1",
      exportedAt: new Date().toISOString(),
      summary: {
        score: report.score,
        activePageId: report.activePageId,
        activePageName: report.activePageName,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        selectableLayerCount: report.selectableLayerCount,
      },
      rows,
    },
    null,
    2,
  );
}

export function getInteractionTestHarnessCsv(
  report: InteractionTestHarnessReport,
  rows: InteractionHarnessRow[] = report.rows,
) {
  return [
    ["status", "category", "page", "layers", "label", "detail", "evidence", "steps"],
    ...rows.map((row) => [
      row.status,
      row.category,
      row.pageName,
      row.layerIds.join(" "),
      row.label,
      row.detail,
      row.evidence,
      row.steps.join(" | "),
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getInteractionTestHarnessMarkdown(
  report: InteractionTestHarnessReport,
  rows: InteractionHarnessRow[] = report.rows,
) {
  const lines = [
    "# Interaction Test Harness",
    "",
    `Score: ${report.score}`,
    `Active page: ${report.activePageName}`,
    `Ready: ${report.readyCount}`,
    `Needs review: ${report.reviewCount}`,
    `Blocked: ${report.blockedCount}`,
    `Selectable layers: ${report.selectableLayerCount}`,
    "",
    "## Flows",
    "",
    `- Keyboard: ${report.keyboardFlowCount}`,
    `- Pointer: ${report.pointerFlowCount}`,
    `- Selection: ${report.selectionFlowCount}`,
    `- Resize: ${report.resizeFlowCount}`,
    `- Text edit: ${report.textEditFlowCount}`,
    `- Prototype: ${report.prototypeFlowCount}`,
    `- Export: ${report.exportFlowCount}`,
    "",
    "## Test Rows",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No interaction test rows were generated.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.status.toUpperCase()} / ${row.category} / ${row.pageName}: ${row.label}. ${row.detail}`,
    );
    lines.push(`  - Evidence: ${row.evidence}`);
    row.steps.forEach((step) => {
      lines.push(`  - Step: ${step}`);
    });
  }

  return lines.join("\n");
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
