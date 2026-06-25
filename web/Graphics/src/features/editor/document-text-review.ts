import { getTextFontInventory } from "@/features/editor/text-font-inventory";
import { getTextHandoffReport } from "@/features/editor/text-handoff";
import { getTextLayerReview } from "@/features/editor/text-layer-review";
import type { DesignDocument } from "@/features/editor/types";

export type DocumentTextReviewStatus = "ready" | "review" | "blocked";

export type DocumentTextReviewRow = {
  id: string;
  pageId: string;
  pageName: string;
  layerId: string;
  layerName: string;
  status: Exclude<DocumentTextReviewStatus, "ready">;
  label: string;
  detail: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  width: number;
  height: number;
  requiredWidth: number;
  requiredHeight: number;
};

export type DocumentTextPageSummary = {
  pageId: string;
  pageName: string;
  status: DocumentTextReviewStatus;
  textLayerCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
};

export type DocumentTextReviewReport = {
  score: number;
  status: DocumentTextReviewStatus;
  textLayerCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  issueCount: number;
  fontFamilyCount: number;
  fontReviewCount: number;
  tokenMatchCount: number;
  pageSummaries: DocumentTextPageSummary[];
  rows: DocumentTextReviewRow[];
};

export function getDocumentTextReview(
  document: DesignDocument,
): DocumentTextReviewReport {
  const pageReviews = document.pages.map((page) => ({
    page,
    review: getTextLayerReview(page.layers),
  }));
  const rows = pageReviews.flatMap(({ page, review }) =>
    review.issues.flatMap((issue) => {
      const layer = review.layers.find((item) => item.layerId === issue.layerId);

      if (!layer) {
        return [];
      }

      return {
        id: `${page.id}:${issue.id}`,
        pageId: page.id,
        pageName: page.name,
        layerId: issue.layerId,
        layerName: issue.layerName,
        status: issue.status,
        label: issue.label,
        detail: issue.detail,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        lineHeight: layer.lineHeight,
        letterSpacing: layer.letterSpacing,
        width: layer.width,
        height: layer.height,
        requiredWidth: layer.requiredWidth,
        requiredHeight: layer.requiredHeight,
      } satisfies DocumentTextReviewRow;
    }),
  );
  const textLayerCount = pageReviews.reduce(
    (total, item) => total + item.review.textLayerCount,
    0,
  );
  const readyCount = pageReviews.reduce(
    (total, item) => total + item.review.readyCount,
    0,
  );
  const reviewCount = pageReviews.reduce(
    (total, item) => total + item.review.reviewCount,
    0,
  );
  const blockedCount = pageReviews.reduce(
    (total, item) => total + item.review.blockedCount,
    0,
  );
  const fontInventory = getTextFontInventory(document.pages);
  const handoff = getTextHandoffReport(
    document.pages.flatMap((page) => page.layers),
    document.variables,
  );
  const baseScore =
    textLayerCount === 0
      ? 100
      : Math.round(((readyCount + reviewCount * 0.55) / textLayerCount) * 100);
  const score = Math.max(0, baseScore - fontInventory.reviewFamilyCount * 4);

  return {
    score,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    textLayerCount,
    readyCount,
    reviewCount,
    blockedCount,
    issueCount: rows.length,
    fontFamilyCount: fontInventory.fontFamilyCount,
    fontReviewCount: fontInventory.reviewFamilyCount,
    tokenMatchCount: handoff.tokenMatchCount,
    pageSummaries: pageReviews.map(({ page, review }) => ({
      pageId: page.id,
      pageName: page.name,
      status:
        review.blockedCount > 0
          ? "blocked"
          : review.reviewCount > 0
            ? "review"
            : "ready",
      textLayerCount: review.textLayerCount,
      readyCount: review.readyCount,
      reviewCount: review.reviewCount,
      blockedCount: review.blockedCount,
    })),
    rows: rows.sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "blocked" ? -1 : 1;
      }

      return `${left.pageName}:${left.layerName}`.localeCompare(
        `${right.pageName}:${right.layerName}`,
      );
    }),
  };
}

export function getDocumentTextReviewCsv(
  report: DocumentTextReviewReport,
  rows: DocumentTextReviewRow[] = report.rows,
) {
  return [
    [
      "status",
      "page",
      "layer",
      "label",
      "detail",
      "fontFamily",
      "fontSize",
      "lineHeight",
      "letterSpacing",
      "width",
      "height",
      "requiredWidth",
      "requiredHeight",
    ],
    ...rows.map((row) => [
      row.status,
      row.pageName,
      row.layerName,
      row.label,
      row.detail,
      row.fontFamily,
      row.fontSize,
      row.lineHeight,
      row.letterSpacing,
      row.width,
      row.height,
      row.requiredWidth,
      row.requiredHeight,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getDocumentTextReviewMarkdown(
  report: DocumentTextReviewReport,
  rows: DocumentTextReviewRow[] = report.rows,
) {
  const lines = [
    "# Document Text Review",
    "",
    `Score: ${report.score}`,
    `Text layers: ${report.textLayerCount}`,
    `Ready: ${report.readyCount}`,
    `Needs review: ${report.reviewCount}`,
    `Blocked: ${report.blockedCount}`,
    `Font families: ${report.fontFamilyCount}`,
    `Fonts needing review: ${report.fontReviewCount}`,
    `Token matches: ${report.tokenMatchCount}`,
    "",
    "## Pages",
    "",
    ...report.pageSummaries.map(
      (page) =>
        `- ${page.pageName}: ${page.status} / ${page.readyCount} ready, ${page.reviewCount} review, ${page.blockedCount} blocked`,
    ),
    "",
    "## Issues",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No text review issues found.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.status.toUpperCase()} - ${row.pageName} / ${row.layerName}: ${row.label}. ${row.detail}`,
    );
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
