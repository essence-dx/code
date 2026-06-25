import {
  getLayerAnnotationReport,
  getLayerAssetReport,
  getLayerCodeConnectReport,
  getLayerDevLinkReport,
  getLayerVariableReport,
} from "@/features/editor/layer-codegen";
import type { DesignDocument, DesignLayer } from "@/features/editor/types";

export type DevModeReviewStatus = "ready" | "review" | "blocked";

export type DevModeReviewSeverity = "high" | "medium" | "low";

export type DevModeReviewRow = {
  id: string;
  pageId: string;
  pageName: string;
  layerId: string;
  layerName: string;
  layerType: DesignLayer["type"];
  status: DevModeReviewStatus;
  severity: DevModeReviewSeverity;
  summary: string;
  detail: string;
  readyForDev: boolean;
  exportable: boolean;
  assetKind: string;
  recommendedFormat: string;
  devLinkCount: number;
  hasCodeConnect: boolean;
  variableMatchCount: number;
  openAnnotationCount: number;
};

export type DevModeReviewReport = {
  score: number;
  totalLayerCount: number;
  visibleLayerCount: number;
  readyLayerCount: number;
  readyForHandoffCount: number;
  reviewCount: number;
  blockedCount: number;
  exportableAssetCount: number;
  devLinkCount: number;
  codeConnectCount: number;
  tokenMatchedLayerCount: number;
  openAnnotationCount: number;
  rows: DevModeReviewRow[];
};

type DevModeReviewIssue = {
  label: string;
  detail: string;
  severity: DevModeReviewSeverity;
};

export function getDevModeReview(
  document: DesignDocument,
): DevModeReviewReport {
  const rows = document.pages.flatMap((page) =>
    page.layers
      .filter((layer) => layer.visible)
      .map((layer) => getLayerDevModeReviewRow(document, page.id, page.name, layer)),
  );
  const visibleLayerCount = rows.length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyForHandoffCount = rows.filter((row) => row.status === "ready").length;

  return {
    score:
      visibleLayerCount === 0
        ? 100
        : Math.max(
            0,
            Math.round(
              ((readyForHandoffCount + reviewCount * 0.5) / visibleLayerCount) *
                100,
            ),
          ),
    totalLayerCount: document.pages.reduce(
      (total, page) => total + page.layers.length,
      0,
    ),
    visibleLayerCount,
    readyLayerCount: rows.filter((row) => row.readyForDev).length,
    readyForHandoffCount,
    reviewCount,
    blockedCount,
    exportableAssetCount: rows.filter((row) => row.exportable).length,
    devLinkCount: rows.reduce((total, row) => total + row.devLinkCount, 0),
    codeConnectCount: rows.filter((row) => row.hasCodeConnect).length,
    tokenMatchedLayerCount: rows.filter((row) => row.variableMatchCount > 0)
      .length,
    openAnnotationCount: rows.reduce(
      (total, row) => total + row.openAnnotationCount,
      0,
    ),
    rows: rows.sort((left, right) => {
      if (left.status !== right.status) {
        return getStatusRank(left.status) - getStatusRank(right.status);
      }

      if (left.severity !== right.severity) {
        return getSeverityRank(left.severity) - getSeverityRank(right.severity);
      }

      return `${left.pageName}:${left.layerName}`.localeCompare(
        `${right.pageName}:${right.layerName}`,
      );
    }),
  };
}

export function getDevModeReviewCsv(
  report: DevModeReviewReport,
  rows: DevModeReviewRow[] = report.rows,
) {
  return [
    [
      "status",
      "severity",
      "page",
      "layer",
      "type",
      "readyForDev",
      "exportable",
      "format",
      "devLinks",
      "codeConnect",
      "tokens",
      "openAnnotations",
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
      row.exportable ? "yes" : "no",
      row.recommendedFormat,
      row.devLinkCount,
      row.hasCodeConnect ? "yes" : "no",
      row.variableMatchCount,
      row.openAnnotationCount,
      row.summary,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getDevModeReviewMarkdown(
  report: DevModeReviewReport,
  rows: DevModeReviewRow[] = report.rows,
) {
  const lines = [
    "# Dev Mode Handoff Review",
    "",
    `Score: ${report.score}`,
    `Visible layers: ${report.visibleLayerCount}`,
    `Ready for handoff: ${report.readyForHandoffCount}`,
    `Needs review: ${report.reviewCount}`,
    `Blocked: ${report.blockedCount}`,
    `Ready flags: ${report.readyLayerCount}`,
    `Code Connect mappings: ${report.codeConnectCount}`,
    `Dev links: ${report.devLinkCount}`,
    `Token matched layers: ${report.tokenMatchedLayerCount}`,
    `Open annotations: ${report.openAnnotationCount}`,
    "",
    "## Queue",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No Dev Mode review rows match this queue.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.status.toUpperCase()} / ${row.severity.toUpperCase()} - ${row.pageName} / ${row.layerName}: ${row.summary}. ${row.detail}`,
    );
  }

  return lines.join("\n");
}

export function getDevModeReadyLayerIds(rows: DevModeReviewRow[]) {
  return rows
    .filter((row) => row.status !== "blocked" && !row.readyForDev)
    .map((row) => row.layerId);
}

function getLayerDevModeReviewRow(
  document: DesignDocument,
  pageId: string,
  pageName: string,
  layer: DesignLayer,
): DevModeReviewRow {
  const asset = getLayerAssetReport(layer);
  const comments =
    document.pages.find((page) => page.id === pageId)?.comments ?? [];
  const annotations = getLayerAnnotationReport(layer, comments);
  const openAnnotations = annotations.filter(
    (annotation) => annotation.status === "open",
  );
  const devLinks = getLayerDevLinkReport(layer);
  const codeConnect = getLayerCodeConnectReport(layer);
  const variableMatches = getLayerVariableReport(layer, document.variables);
  const issues = getLayerReviewIssues({
    layer,
    exportable: asset.exportable,
    devLinkCount: devLinks.length,
    hasCodeConnect: Boolean(codeConnect),
    variableMatchCount: variableMatches.length,
    openAnnotationCount: openAnnotations.length,
  });
  const severity = getHighestSeverity(issues);

  return {
    id: `${pageId}:${layer.id}`,
    pageId,
    pageName,
    layerId: layer.id,
    layerName: layer.name,
    layerType: layer.type,
    status: getStatus(issues),
    severity,
    summary: issues[0]?.label ?? "Ready for handoff",
    detail:
      issues.length > 0
        ? issues.map((issue) => issue.detail).join(" ")
        : `${layer.name} has a ready flag, exportable asset data, implementation references, token coverage, and no open annotations.`,
    readyForDev: Boolean(layer.readyForDev),
    exportable: asset.exportable,
    assetKind: asset.kind,
    recommendedFormat: asset.recommendedFormat,
    devLinkCount: devLinks.length,
    hasCodeConnect: Boolean(codeConnect),
    variableMatchCount: variableMatches.length,
    openAnnotationCount: openAnnotations.length,
  };
}

function getLayerReviewIssues({
  layer,
  exportable,
  devLinkCount,
  hasCodeConnect,
  variableMatchCount,
  openAnnotationCount,
}: {
  layer: DesignLayer;
  exportable: boolean;
  devLinkCount: number;
  hasCodeConnect: boolean;
  variableMatchCount: number;
  openAnnotationCount: number;
}) {
  const issues: DevModeReviewIssue[] = [];

  if (!layer.readyForDev) {
    issues.push({
      label: "Ready flag missing",
      detail: "Layer is not marked ready for Dev Mode handoff.",
      severity: "medium",
    });
  }

  if (!exportable) {
    issues.push({
      label: "Asset export blocked",
      detail: "Layer needs exportable source data before engineering handoff.",
      severity: "high",
    });
  }

  if (layer.type === "image" && !layer.imageAlt?.trim()) {
    issues.push({
      label: "Image alt text missing",
      detail: "Image layers should carry alt text before implementation.",
      severity: "high",
    });
  }

  if (openAnnotationCount > 0) {
    issues.push({
      label: "Open annotations",
      detail: `${openAnnotationCount} annotation${openAnnotationCount === 1 ? "" : "s"} still need resolution.`,
      severity: "high",
    });
  }

  if (!hasCodeConnect) {
    issues.push({
      label: "Code Connect missing",
      detail: "Add a Code Connect component mapping for implementation review.",
      severity: "medium",
    });
  }

  if (devLinkCount === 0) {
    issues.push({
      label: "Dev resources missing",
      detail: "Attach Storybook, repo, issue, VS Code, or docs links.",
      severity: "medium",
    });
  }

  if (variableMatchCount === 0) {
    issues.push({
      label: "Token references missing",
      detail: "No variable bindings or exact token value matches were found.",
      severity: "low",
    });
  }

  return issues;
}

function getStatus(issues: DevModeReviewIssue[]): DevModeReviewStatus {
  if (issues.some((issue) => issue.severity === "high")) {
    return "blocked";
  }

  if (issues.length > 0) {
    return "review";
  }

  return "ready";
}

function getHighestSeverity(issues: DevModeReviewIssue[]) {
  if (issues.some((issue) => issue.severity === "high")) {
    return "high";
  }

  if (issues.some((issue) => issue.severity === "medium")) {
    return "medium";
  }

  return "low";
}

function getStatusRank(status: DevModeReviewStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function getSeverityRank(severity: DevModeReviewSeverity) {
  if (severity === "high") {
    return 0;
  }

  if (severity === "medium") {
    return 1;
  }

  return 2;
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
