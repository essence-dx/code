import type {
  AssetLibraryManagementReport,
  AssetLibraryManagementRow,
} from "@/features/editor/asset-library-management";

export function getAssetLibraryManagementCsv(
  report: AssetLibraryManagementReport,
  rows: AssetLibraryManagementRow[] = report.rows,
) {
  const header: Array<keyof AssetLibraryManagementRow> = [
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
    "mediaAssetId",
    "fontFamily",
  ];

  return [
    [
      "score",
      "status",
      "layers",
      "media_assets",
      "reusable_media",
      "duplicate_sources",
      "missing_metadata",
      "replacement_queue",
      "font_families",
      "unsafe_fonts",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.layerCount,
      report.mediaAssetCount,
      report.reusableMediaCount,
      report.duplicateSourceCount,
      report.missingMetadataCount,
      report.replacementQueueCount,
      report.fontFamilyCount,
      report.unsafeFontCount,
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

export function getAssetLibraryManagementMarkdown(
  report: AssetLibraryManagementReport,
  rows: AssetLibraryManagementRow[] = report.rows,
) {
  return [
    "# Asset Library Management",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Media assets: ${report.mediaAssetCount}`,
    `Reusable media: ${report.reusableMediaCount}`,
    `Duplicate sources: ${report.duplicateSourceCount}`,
    `Missing source or license metadata: ${report.missingMetadataCount}`,
    `Replacement queue: ${report.replacementQueueCount}`,
    `Font families: ${report.fontFamilyCount}`,
    `Unsafe fonts: ${report.unsafeFontCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Media Registry",
    ...(report.mediaAssets.length > 0
      ? report.mediaAssets.map(
          (asset) =>
            `- ${asset.id}: ${asset.layerIds.length} layer(s), ${asset.sourceType}, ${asset.format ?? "unknown format"}, ${asset.bytes} bytes, source ${asset.sourceName ?? "missing"}, license ${asset.license ?? "missing"}`,
        )
      : ["- No media assets."]),
    "",
    "## Font Registry",
    ...(report.fontAssets.length > 0
      ? report.fontAssets.map(
          (font) =>
            `- ${font.fontFamily}: ${font.layerIds.length} layer(s), export safe ${font.exportSafe ? "yes" : "no"}`,
        )
      : ["- No editable text fonts."]),
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No asset library rows."]),
  ].join("\n");
}

export function getAssetLibraryManagementBundleJson(
  report: AssetLibraryManagementReport,
  rows: AssetLibraryManagementRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.asset-library-management",
      version: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        score: report.score,
        status: report.status,
        layers: report.layerCount,
        mediaAssets: report.mediaAssetCount,
        reusableMedia: report.reusableMediaCount,
        duplicateSources: report.duplicateSourceCount,
        missingMetadata: report.missingMetadataCount,
        replacementQueue: report.replacementQueueCount,
        fontFamilies: report.fontFamilyCount,
        unsafeFonts: report.unsafeFontCount,
        blocked: report.blockedCount,
        review: report.reviewCount,
      },
      mediaAssets: report.mediaAssets,
      fontAssets: report.fontAssets,
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
