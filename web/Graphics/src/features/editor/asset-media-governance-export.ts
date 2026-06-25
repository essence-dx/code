import type {
  AssetMediaGovernanceReport,
  AssetMediaGovernanceRow,
} from "@/features/editor/asset-media-governance";

export function getAssetMediaGovernanceCsv(
  report: AssetMediaGovernanceReport,
  rows: AssetMediaGovernanceRow[] = report.rows,
) {
  const header: Array<keyof AssetMediaGovernanceRow> = [
    "id",
    "status",
    "category",
    "assetKind",
    "label",
    "pageName",
    "layerIds",
    "metric",
    "detail",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "layers",
      "images",
      "referenced_images",
      "embedded_images",
      "embedded_image_bytes",
      "missing_alt",
      "source_issues",
      "video_placeholders",
      "font_families",
      "font_reviews",
      "serialized_bytes",
      "optimization_queue",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.layerCount,
      report.imageLayerCount,
      report.referencedImageCount,
      report.embeddedImageCount,
      report.embeddedImageBytes,
      report.missingAltCount,
      report.sourceAttributionIssueCount,
      report.videoPlaceholderCount,
      report.fontFamilyCount,
      report.fontReviewCount,
      report.serializedBytes,
      report.optimizationQueueCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getAssetMediaGovernanceMarkdown(
  report: AssetMediaGovernanceReport,
  rows: AssetMediaGovernanceRow[] = report.rows,
) {
  return [
    "# Asset And Media Governance",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Images: ${report.imageLayerCount}`,
    `Referenced images: ${report.referencedImageCount}`,
    `Embedded images: ${report.embeddedImageCount}`,
    `Embedded image bytes: ${report.embeddedImageBytes}`,
    `Missing alt or source notes: ${report.sourceAttributionIssueCount}`,
    `Video placeholders: ${report.videoPlaceholderCount}`,
    `Font families: ${report.fontFamilyCount}`,
    `Font reviews: ${report.fontReviewCount}`,
    `Serialized bytes: ${report.serializedBytes}`,
    `Optimization queue: ${report.optimizationQueueCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No asset governance rows."]),
  ].join("\n");
}

export function getAssetMediaGovernanceBundleJson(
  report: AssetMediaGovernanceReport,
  rows: AssetMediaGovernanceRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.asset-media-governance",
      version: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        score: report.score,
        status: report.status,
        pages: report.pageCount,
        layers: report.layerCount,
        images: report.imageLayerCount,
        referencedImages: report.referencedImageCount,
        embeddedImages: report.embeddedImageCount,
        embeddedImageBytes: report.embeddedImageBytes,
        missingAlt: report.missingAltCount,
        sourceAttributionIssues: report.sourceAttributionIssueCount,
        videoPlaceholders: report.videoPlaceholderCount,
        fontFamilies: report.fontFamilyCount,
        fontReviews: report.fontReviewCount,
        serializedBytes: report.serializedBytes,
        optimizationQueue: report.optimizationQueueCount,
        blocked: report.blockedCount,
        review: report.reviewCount,
      },
      rows,
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
