import type {
  ComponentOverrideReviewReport,
  ComponentOverrideReviewRow,
} from "@/features/editor/component-override-review-types";

export function getComponentOverrideReviewCsv(
  report: ComponentOverrideReviewReport,
  rows: ComponentOverrideReviewRow[] = report.rows,
) {
  return [
    [
      "status",
      "page",
      "component",
      "variant",
      "layers",
      "overrides",
      "property_diffs",
      "slot_issues",
      "variant_adoption_percent",
      "resettable",
      "detail",
    ],
    ...rows.map((row) => [
      row.status,
      row.pageName,
      row.componentName,
      row.variantName,
      row.instanceLayerCount,
      row.overrideCount,
      row.propertyDiffCount,
      row.slotIssueCount,
      row.variantAdoptionPercent,
      row.canReset ? "yes" : "no",
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getComponentOverrideReviewMarkdown(
  report: ComponentOverrideReviewReport,
  rows: ComponentOverrideReviewRow[] = report.rows,
) {
  const lines = [
    "# Component Override Review",
    "",
    `Score: ${report.score}`,
    `Instances: ${report.instanceCount}`,
    `Ready: ${report.readyCount}`,
    `Needs review: ${report.reviewCount}`,
    `Blocked: ${report.blockedCount}`,
    `Resettable: ${report.resettableCount}`,
    `Overrides: ${report.overrideCount}`,
    `Property diffs: ${report.propertyDiffCount}`,
    `Slot issues: ${report.slotIssueCount}`,
    `Used components: ${report.componentAdoptionCount}`,
    `Unused components: ${report.unusedComponentCount}`,
    `Variant coverage: ${report.usedVariantCount}/${report.variantCount} (${report.variantCoveragePercent}%)`,
    "",
    "## Instances",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No component instances found.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.status.toUpperCase()} - ${row.pageName} / ${row.componentName} / ${row.variantName}: ${row.detail}`,
    );

    row.resetPreview.slice(0, 3).forEach((preview) => {
      lines.push(
        `  - Reset preview: ${preview.layerName} ${preview.label}: ${preview.current} -> ${preview.source}`,
      );
    });

    row.propertyDiffs.slice(0, 3).forEach((diff) => {
      lines.push(
        `  - Property diff: ${diff.propertyName}: ${diff.current} -> ${diff.source}`,
      );
    });

    row.slotIssues.slice(0, 3).forEach((issue) => {
      lines.push(`  - Slot: ${issue.label}. ${issue.detail}`);
    });
  }

  return lines.join("\n");
}

function formatCsvCell(value: boolean | number | string) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
