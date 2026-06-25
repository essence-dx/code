import {
  getLayerAnnotationReport,
  getLayerAssetReport,
  getLayerCodeConnectReport,
  getLayerComposeCode,
  getLayerCssCode,
  getLayerDevLinkReport,
  getLayerHandoffCode,
  getLayerHtmlCode,
  getLayerJsxCode,
  getLayerMeasurementReport,
  getLayerSvgAssetCode,
  getLayerSwiftUICode,
  getLayerVariableReport,
} from "@/features/editor/layer-codegen";
import { getDevModeReview } from "@/features/editor/dev-mode-review";
import {
  devModeInspectionStatusRank,
  type DevModeInspectionReport,
  type DevModeInspectionRow,
} from "@/features/editor/dev-mode-inspection-types";
import type { DesignDocument, DesignLayer, DesignPage } from "@/features/editor/types";

export function getDevModeInspection(
  document: DesignDocument,
): DevModeInspectionReport {
  const review = getDevModeReview(document);
  const reviewByLayerId = new Map(
    review.rows.map((row) => [`${row.pageId}:${row.layerId}`, row]),
  );
  const rows = document.pages
    .flatMap((page) =>
      page.layers
        .filter((layer) => layer.visible)
        .map((layer) =>
          getDevModeInspectionRow({
            document,
            page,
            layer,
            reviewRow: reviewByLayerId.get(`${page.id}:${layer.id}`),
          }),
        ),
    )
    .sort((left, right) => {
      if (left.status !== right.status) {
        return (
          devModeInspectionStatusRank[left.status] -
          devModeInspectionStatusRank[right.status]
        );
      }

      if (left.severity !== right.severity) {
        return getSeverityRank(left.severity) - getSeverityRank(right.severity);
      }

      return `${left.pageName}:${left.layerName}`.localeCompare(
        `${right.pageName}:${right.layerName}`,
      );
    });
  const inspectedLayerCount = rows.length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;

  return {
    score:
      inspectedLayerCount === 0
        ? 100
        : Math.max(
            0,
            Math.round(
              ((readyCount + reviewCount * 0.55) / inspectedLayerCount) * 100,
            ),
          ),
    inspectedLayerCount,
    readyCount,
    reviewCount,
    blockedCount,
    markableCount: rows.filter(
      (row) => row.status !== "blocked" && !row.readyForDev,
    ).length,
    measurementOverlayCount: rows.filter((row) => row.boundsLabel.length > 0)
      .length,
    assetSliceCount: rows.filter((row) => row.exportable).length,
    cssExportCount: rows.filter((row) => row.cssLineCount > 0).length,
    swiftExportCount: rows.filter((row) => row.swiftLineCount > 0).length,
    composeExportCount: rows.filter((row) => row.composeLineCount > 0).length,
    handoffBundleCount: rows.filter((row) => row.handoffBundleReady).length,
    openAnnotationCount: rows.reduce(
      (total, row) => total + row.openAnnotationCount,
      0,
    ),
    rows,
  };
}

export function getDevModeInspectionReadyLayerIds(rows: DevModeInspectionRow[]) {
  return rows
    .filter((row) => row.status !== "blocked" && !row.readyForDev)
    .map((row) => row.layerId);
}

export function getDevModeInspectionBundle(
  document: DesignDocument,
  rows: DevModeInspectionRow[],
) {
  const rowKeys = new Set(rows.map((row) => `${row.pageId}:${row.layerId}`));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      fileName: "Current design document",
      layerCount: rows.length,
      readyCount: rows.filter((row) => row.status === "ready").length,
      reviewCount: rows.filter((row) => row.status === "review").length,
      blockedCount: rows.filter((row) => row.status === "blocked").length,
      assetSliceCount: rows.filter((row) => row.exportable).length,
      openAnnotationCount: rows.reduce(
        (total, row) => total + row.openAnnotationCount,
        0,
      ),
    },
    layers: document.pages.flatMap((page) =>
      page.layers
        .filter((layer) => rowKeys.has(`${page.id}:${layer.id}`))
        .map((layer) => createBundleLayer(document, page, layer)),
    ),
  };
}

function getDevModeInspectionRow({
  document,
  page,
  layer,
  reviewRow,
}: {
  document: DesignDocument;
  page: DesignPage;
  layer: DesignLayer;
  reviewRow: ReturnType<typeof getDevModeReview>["rows"][number] | undefined;
}): DevModeInspectionRow {
  const measurements = getLayerMeasurementReport(layer, page.layers);
  const asset = getLayerAssetReport(layer);
  const comments = page.comments ?? [];
  const annotations = getLayerAnnotationReport(layer, comments);
  const openAnnotations = annotations.filter(
    (annotation) => annotation.status === "open",
  );
  const variables = getLayerVariableReport(layer, document.variables);
  const devLinks = getLayerDevLinkReport(layer);
  const codeConnect = getLayerCodeConnectReport(layer);
  const css = getLayerCssCode(layer);
  const swift = getLayerSwiftUICode(layer);
  const compose = getLayerComposeCode(layer);
  const html = getLayerHtmlCode(layer);
  const jsx = getLayerJsxCode(layer);
  const handoffReady =
    Boolean(layer.readyForDev) &&
    asset.exportable &&
    Boolean(codeConnect) &&
    devLinks.length > 0 &&
    openAnnotations.length === 0;

  return {
    id: `${page.id}:${layer.id}`,
    pageId: page.id,
    pageName: page.name,
    layerId: layer.id,
    layerName: layer.name,
    layerType: layer.type,
    status: reviewRow?.status ?? "ready",
    severity: reviewRow?.severity ?? "low",
    readyForDev: Boolean(layer.readyForDev),
    summary: reviewRow?.summary ?? "Ready for handoff",
    detail:
      reviewRow?.detail ??
      "Layer has code, measurement, asset, annotation, and token inspection data.",
    boundsLabel: `${measurements.bounds.x},${measurements.bounds.y} ${measurements.bounds.width}x${measurements.bounds.height}`,
    spacingLabel:
      measurements.nearestSpacing
        .map((item) => `${item.side}:${item.distance}px to ${item.layerName}`)
        .join(" / ") || "No aligned neighbors",
    measurementOverlayLabel: `x ${measurements.bounds.x}, y ${measurements.bounds.y}, w ${measurements.bounds.width}, h ${measurements.bounds.height}`,
    assetKind: asset.kind,
    assetFormat: asset.recommendedFormat,
    exportable: asset.exportable,
    assetSliceName: `${slugify(layer.name)}.${asset.recommendedFormat === "Source image" ? "source" : "svg"}`,
    cssLineCount: getLineCount(css),
    swiftLineCount: getLineCount(swift),
    composeLineCount: getLineCount(compose),
    htmlLineCount: getLineCount(html),
    jsxLineCount: getLineCount(jsx),
    codeConnectReady: Boolean(codeConnect),
    devLinkCount: devLinks.length,
    tokenCount: variables.length,
    annotationCount: annotations.length,
    openAnnotationCount: openAnnotations.length,
    handoffBundleReady: handoffReady,
    layerIds: [layer.id],
  };
}

function createBundleLayer(
  document: DesignDocument,
  page: DesignPage,
  layer: DesignLayer,
) {
  const asset = getLayerAssetReport(layer);

  return {
    id: layer.id,
    name: layer.name,
    pageId: page.id,
    pageName: page.name,
    type: layer.type,
    readyForDev: Boolean(layer.readyForDev),
    measurements: getLayerMeasurementReport(layer, page.layers),
    asset: {
      kind: asset.kind,
      recommendedFormat: asset.recommendedFormat,
      exportable: asset.exportable,
      fileName: `${slugify(layer.name)}.${asset.recommendedFormat === "Source image" ? "source" : "svg"}`,
      svg: getLayerSvgAssetCode(layer),
    },
    code: {
      css: getLayerCssCode(layer),
      html: getLayerHtmlCode(layer),
      jsx: getLayerJsxCode(layer),
      swiftUI: getLayerSwiftUICode(layer),
      compose: getLayerComposeCode(layer),
    },
    handoff: JSON.parse(
      getLayerHandoffCode(
        layer,
        document.variables,
        page.comments ?? [],
        page.layers,
        document.pages,
      ),
    ) as unknown,
    annotations: getLayerAnnotationReport(layer, page.comments ?? []),
    variables: getLayerVariableReport(layer, document.variables),
    devLinks: getLayerDevLinkReport(layer),
    codeConnect: getLayerCodeConnectReport(layer),
  };
}

function getLineCount(value: string) {
  return value.trim().length === 0 ? 0 : value.split(/\r?\n/).length;
}

function getSeverityRank(severity: DevModeInspectionRow["severity"]) {
  if (severity === "high") {
    return 0;
  }

  if (severity === "medium") {
    return 1;
  }

  return 2;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "design-layer"
  );
}
