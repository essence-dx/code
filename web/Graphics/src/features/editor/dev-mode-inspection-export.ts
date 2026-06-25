import {
  getDevModeInspectionBundle,
  type getDevModeInspection,
} from "@/features/editor/dev-mode-inspection";
import type {
  DevModeInspectionReport,
  DevModeInspectionRow,
} from "@/features/editor/dev-mode-inspection-types";
import type { DesignDocument } from "@/features/editor/types";

export function getDevModeInspectionCsv(
  report: DevModeInspectionReport,
  rows: DevModeInspectionRow[] = report.rows,
) {
  return [
    [
      "status",
      "severity",
      "page",
      "layer",
      "type",
      "readyForDev",
      "bounds",
      "spacing",
      "assetKind",
      "assetFormat",
      "assetSlice",
      "cssLines",
      "swiftLines",
      "composeLines",
      "htmlLines",
      "jsxLines",
      "codeConnect",
      "devLinks",
      "tokens",
      "annotations",
      "openAnnotations",
      "handoffReady",
      "summary",
      "detail",
    ],
    ...rows.map((row) => [
      row.status,
      row.severity,
      row.pageName,
      row.layerName,
      row.layerType,
      row.readyForDev ? "yes" : "no",
      row.boundsLabel,
      row.spacingLabel,
      row.assetKind,
      row.assetFormat,
      row.assetSliceName,
      row.cssLineCount,
      row.swiftLineCount,
      row.composeLineCount,
      row.htmlLineCount,
      row.jsxLineCount,
      row.codeConnectReady ? "yes" : "no",
      row.devLinkCount,
      row.tokenCount,
      row.annotationCount,
      row.openAnnotationCount,
      row.handoffBundleReady ? "yes" : "no",
      row.summary,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getDevModeInspectionMarkdown(
  report: DevModeInspectionReport,
  rows: DevModeInspectionRow[] = report.rows,
) {
  const lines = [
    "# Dev Mode Inspection",
    "",
    `Score: ${report.score}`,
    `Inspected layers: ${report.inspectedLayerCount}`,
    `Ready: ${report.readyCount}`,
    `Review: ${report.reviewCount}`,
    `Blocked: ${report.blockedCount}`,
    `Markable: ${report.markableCount}`,
    `Measurement overlays: ${report.measurementOverlayCount}`,
    `Asset slices: ${report.assetSliceCount}`,
    `CSS exports: ${report.cssExportCount}`,
    `SwiftUI exports: ${report.swiftExportCount}`,
    `Compose exports: ${report.composeExportCount}`,
    `Handoff bundles: ${report.handoffBundleCount}`,
    `Open annotations: ${report.openAnnotationCount}`,
    "",
    "## Layers",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No Dev Mode inspection rows match this queue.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.status.toUpperCase()} - ${row.pageName} / ${row.layerName}: ${row.measurementOverlayLabel}; asset ${row.assetSliceName}; CSS ${row.cssLineCount} lines; SwiftUI ${row.swiftLineCount} lines; Compose ${row.composeLineCount} lines. ${row.summary}. ${row.detail}`,
    );
  }

  return lines.join("\n");
}

export function getDevModeInspectionBundleJson(
  document: DesignDocument,
  report: ReturnType<typeof getDevModeInspection>,
  rows: DevModeInspectionRow[] = report.rows,
) {
  return JSON.stringify(
    {
      report: {
        score: report.score,
        inspectedLayerCount: report.inspectedLayerCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        assetSliceCount: report.assetSliceCount,
        handoffBundleCount: report.handoffBundleCount,
      },
      bundle: getDevModeInspectionBundle(document, rows),
    },
    null,
    2,
  );
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
