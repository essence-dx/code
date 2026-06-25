import {
  compareDesignDocuments,
  type ChangeSummary,
  type VersionComparison,
} from "@/features/editor/version-compare";
import type { DesignDocument } from "@/features/editor/types";

export type VersionCompareRisk = "low" | "medium" | "high";

export type VersionCompareReviewRow = {
  id: string;
  area: "metric" | "layer" | "component";
  status: "added" | "removed" | "changed";
  name: string;
  detail: string;
};

export type VersionCompareReview = {
  comparison: VersionComparison;
  risk: VersionCompareRisk;
  summary: string;
  totalChangeCount: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  layoutChangeCount: number;
  designSystemChangeCount: number;
  handoffChangeCount: number;
  rows: VersionCompareReviewRow[];
};

export function getVersionCompareReview(
  current: DesignDocument,
  previous: DesignDocument,
): VersionCompareReview {
  const comparison = compareDesignDocuments(current, previous);
  const rows = [
    ...getMetricRows(comparison),
    ...getChangeRows("layer", comparison.layerChanges),
    ...getChangeRows("component", comparison.componentChanges),
  ];
  const addedCount = rows.filter((row) => row.status === "added").length;
  const removedCount = rows.filter((row) => row.status === "removed").length;
  const changedCount = rows.filter((row) => row.status === "changed").length;
  const layoutChangeCount = rows.filter((row) => isLayoutChange(row)).length;
  const designSystemChangeCount = rows.filter((row) =>
    isDesignSystemChange(row),
  ).length;
  const handoffChangeCount = rows.filter((row) => isHandoffChange(row)).length;
  const risk = getVersionCompareRisk({
    removedCount,
    designSystemChangeCount,
    handoffChangeCount,
    totalChangeCount: rows.length,
  });

  return {
    comparison,
    risk,
    summary: getRiskSummary(risk, {
      removedCount,
      designSystemChangeCount,
      handoffChangeCount,
      totalChangeCount: rows.length,
    }),
    totalChangeCount: rows.length,
    addedCount,
    removedCount,
    changedCount,
    layoutChangeCount,
    designSystemChangeCount,
    handoffChangeCount,
    rows,
  };
}

export function getVersionCompareReviewCsv(review: VersionCompareReview) {
  return [
    ["area", "status", "name", "detail"],
    ...review.rows.map((row) => [row.area, row.status, row.name, row.detail]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getVersionCompareReviewMarkdown(
  review: VersionCompareReview,
  title: string,
) {
  const lines = [
    `# Version Compare - ${title}`,
    "",
    `Risk: ${review.risk}`,
    `Summary: ${review.summary}`,
    `Total changes: ${review.totalChangeCount}`,
    `Added: ${review.addedCount}`,
    `Changed: ${review.changedCount}`,
    `Removed: ${review.removedCount}`,
    `Layout changes: ${review.layoutChangeCount}`,
    `Design-system changes: ${review.designSystemChangeCount}`,
    `Handoff changes: ${review.handoffChangeCount}`,
    "",
    "## Changes",
    "",
  ];

  if (review.rows.length === 0) {
    lines.push("- No compare changes found.");
  }

  for (const row of review.rows) {
    lines.push(
      `- ${row.area.toUpperCase()} / ${row.status.toUpperCase()} - ${row.name}: ${row.detail}`,
    );
  }

  return lines.join("\n");
}

function getMetricRows(
  comparison: VersionComparison,
): VersionCompareReviewRow[] {
  return comparison.metrics.flatMap((metric) => {
    if (metric.current === metric.previous) {
      return [];
    }

    return {
      id: `metric:${metric.id}`,
      area: "metric",
      status: "changed",
      name: metric.label,
      detail: `${metric.previous} -> ${metric.current}`,
    } satisfies VersionCompareReviewRow;
  });
}

function getChangeRows(
  area: "layer" | "component",
  changes: ChangeSummary[],
): VersionCompareReviewRow[] {
  return changes.flatMap((change) =>
    change.details.map((detail, index) => ({
      id: `${area}:${change.id}:${index}`,
      area,
      status: change.status,
      name: change.name,
      detail,
    })),
  );
}

function isLayoutChange(row: VersionCompareReviewRow) {
  return /position|size|bounds|parent|auto layout|layout sizing|constraints|grid/i.test(
    row.detail,
  );
}

function isDesignSystemChange(row: VersionCompareReviewRow) {
  return /component|variable|style|token|paint|text style|effect|preset|slot/i.test(
    `${row.name} ${row.detail}`,
  );
}

function isHandoffChange(row: VersionCompareReviewRow) {
  return /ready for dev|dev links|code connect|prototype|annotation|comment/i.test(
    `${row.name} ${row.detail}`,
  );
}

function getVersionCompareRisk({
  removedCount,
  designSystemChangeCount,
  handoffChangeCount,
  totalChangeCount,
}: {
  removedCount: number;
  designSystemChangeCount: number;
  handoffChangeCount: number;
  totalChangeCount: number;
}): VersionCompareRisk {
  if (removedCount > 0 || designSystemChangeCount > 4 || totalChangeCount > 40) {
    return "high";
  }

  if (handoffChangeCount > 0 || designSystemChangeCount > 0 || totalChangeCount > 12) {
    return "medium";
  }

  return "low";
}

function getRiskSummary(
  risk: VersionCompareRisk,
  counts: {
    removedCount: number;
    designSystemChangeCount: number;
    handoffChangeCount: number;
    totalChangeCount: number;
  },
) {
  if (risk === "high") {
    return `${counts.removedCount} removals, ${counts.designSystemChangeCount} design-system changes, and ${counts.totalChangeCount} total changes need review before restore or merge.`;
  }

  if (risk === "medium") {
    return `${counts.handoffChangeCount} handoff changes and ${counts.designSystemChangeCount} design-system changes should be checked.`;
  }

  return "Small compare set with no removals or design-system risk detected.";
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
