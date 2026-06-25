import type { AccessibilityPrivacyReleaseChecklist } from "@/features/admin/admin-accessibility-privacy-release";

export function getAccessibilityPrivacyReleaseJson(
  report: AccessibilityPrivacyReleaseChecklist,
) {
  return JSON.stringify(report, null, 2);
}

export function getAccessibilityPrivacyReleaseCsv(
  report: AccessibilityPrivacyReleaseChecklist,
) {
  return [
    [
      "id",
      "surface",
      "status",
      "label",
      "value",
      "evidence_count",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.surface,
        row.status,
        row.label,
        row.value,
        row.evidenceCount,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "status",
      "score",
      "documents",
      "checked_layers",
      "text_layers",
      "interactive_layers",
      "high_accessibility_issues",
      "medium_accessibility_issues",
      "low_accessibility_issues",
      "prototype_issues",
      "prototype_broken",
      "privacy_reviews",
    ].join(","),
    [
      report.status,
      report.score,
      report.documentCount,
      report.checkedLayerCount,
      report.textLayerCount,
      report.interactiveLayerCount,
      report.highAccessibilityIssueCount,
      report.mediumAccessibilityIssueCount,
      report.lowAccessibilityIssueCount,
      report.prototypeIssueCount,
      report.prototypeBrokenCount,
      report.privacyReviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
  ].join("\n");
}

export function getAccessibilityPrivacyReleaseMarkdown(
  report: AccessibilityPrivacyReleaseChecklist,
) {
  return [
    "# Accessibility And Privacy Release Checklist",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Documents reviewed: ${report.documentCount}`,
    `- Checked layers: ${report.checkedLayerCount}`,
    `- Text layers: ${report.textLayerCount}`,
    `- Interactive layers: ${report.interactiveLayerCount}`,
    `- High accessibility issues: ${report.highAccessibilityIssueCount}`,
    `- Medium accessibility issues: ${report.mediumAccessibilityIssueCount}`,
    `- Low accessibility issues: ${report.lowAccessibilityIssueCount}`,
    `- Prototype issues: ${report.prototypeIssueCount}`,
    `- Broken prototype targets: ${report.prototypeBrokenCount}`,
    `- Privacy review rows: ${report.privacyReviewCount}`,
    "",
    "## Checklist",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.surface} / ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
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
