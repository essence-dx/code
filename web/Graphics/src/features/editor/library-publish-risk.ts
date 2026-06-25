import type { LocalLibraryStatus } from "@/features/editor/component-library-manifest";
import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { DesignDocument } from "@/features/editor/types";

export type LibraryPublishRiskSeverity = "low" | "medium" | "high";

export type LibraryPublishRiskItem = {
  id: string;
  label: string;
  detail: string;
  severity: LibraryPublishRiskSeverity;
  impact: number;
};

export type LibraryPublishRiskReport = {
  score: number;
  label: string;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  items: LibraryPublishRiskItem[];
};

type LibraryPublishRiskInput = {
  document: DesignDocument;
  libraryStatus: LocalLibraryStatus;
  publishReadiness: LibraryPublishReadinessReport;
};

export function getLibraryPublishRiskReport({
  document,
  libraryStatus,
  publishReadiness,
}: LibraryPublishRiskInput): LibraryPublishRiskReport {
  const openCommentCount = document.pages.reduce(
    (count, page) =>
      count + (page.comments ?? []).filter((comment) => !comment.resolved).length,
    0,
  );
  const brokenPrototypeCount = getBrokenPrototypeCount(document);
  const activityCount = document.activityEvents?.length ?? 0;
  const blockerCount = publishReadiness.blockedCount;
  const reviewCount = publishReadiness.reviewCount;
  const items: LibraryPublishRiskItem[] = [
    getRiskItem({
      id: "readiness-blockers",
      label: "Readiness blockers",
      count: blockerCount,
      unit: "blocked checklist item",
      impactPerItem: 24,
      mediumThreshold: 1,
      highThreshold: 2,
    }),
    getRiskItem({
      id: "readiness-review",
      label: "Review items",
      count: reviewCount,
      unit: "review checklist item",
      impactPerItem: 8,
      mediumThreshold: 2,
      highThreshold: 5,
    }),
    getRiskItem({
      id: "open-comments",
      label: "Open comments",
      count: openCommentCount,
      unit: "open comment",
      impactPerItem: 3,
      mediumThreshold: 3,
      highThreshold: 10,
    }),
    getRiskItem({
      id: "broken-prototypes",
      label: "Broken prototypes",
      count: brokenPrototypeCount,
      unit: "broken hotspot",
      impactPerItem: 14,
      mediumThreshold: 1,
      highThreshold: 3,
    }),
    getRiskItem({
      id: "pending-updates",
      label: "Pending library updates",
      count: libraryStatus.pendingUpdateCount,
      unit: "pending update",
      impactPerItem: 16,
      mediumThreshold: 1,
      highThreshold: 3,
    }),
    getRiskItem({
      id: "activity-volume",
      label: "Recent activity",
      count: activityCount,
      unit: "activity event",
      impactPerItem: activityCount > 30 ? 1 : 0,
      mediumThreshold: 30,
      highThreshold: 60,
    }),
  ];
  const totalImpact = items.reduce((total, item) => total + item.impact, 0);
  const score = Math.max(0, 100 - Math.min(100, totalImpact));

  return {
    score,
    label: getRiskLabel(score),
    highCount: items.filter((item) => item.severity === "high").length,
    mediumCount: items.filter((item) => item.severity === "medium").length,
    lowCount: items.filter((item) => item.severity === "low").length,
    items,
  };
}

export function getLibraryPublishRiskCsv(report: LibraryPublishRiskReport) {
  const header: Array<keyof LibraryPublishRiskItem> = [
    "id",
    "label",
    "severity",
    "impact",
    "detail",
  ];

  return [
    ["score", report.score].map(escapeCsvCell).join(","),
    ["label", report.label].map(escapeCsvCell).join(","),
    ["highCount", report.highCount].map(escapeCsvCell).join(","),
    ["mediumCount", report.mediumCount].map(escapeCsvCell).join(","),
    ["lowCount", report.lowCount].map(escapeCsvCell).join(","),
    "",
    header.join(","),
    ...report.items.map((item) =>
      header.map((key) => escapeCsvCell(item[key])).join(","),
    ),
  ].join("\n");
}

function getBrokenPrototypeCount(document: DesignDocument) {
  const pageIds = new Set(document.pages.map((page) => page.id));

  return document.pages.reduce(
    (count, page) =>
      count +
      page.layers.filter(
        (layer) =>
          layer.prototype?.targetPageId &&
          !pageIds.has(layer.prototype.targetPageId),
      ).length,
    0,
  );
}

function getRiskItem({
  id,
  label,
  count,
  unit,
  impactPerItem,
  mediumThreshold,
  highThreshold,
}: {
  id: string;
  label: string;
  count: number;
  unit: string;
  impactPerItem: number;
  mediumThreshold: number;
  highThreshold: number;
}): LibraryPublishRiskItem {
  return {
    id,
    label,
    detail: `${count} ${unit}${count === 1 ? "" : "s"}`,
    severity:
      count >= highThreshold ? "high" : count >= mediumThreshold ? "medium" : "low",
    impact: count * impactPerItem,
  };
}

function getRiskLabel(score: number) {
  if (score >= 85) {
    return "Low risk";
  }

  if (score >= 65) {
    return "Review";
  }

  return "High risk";
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
