import { getDocumentAccessibilityAudit } from "@/features/editor/accessibility-audit";
import { getLocalLibraryStatus } from "@/features/editor/component-library-manifest";
import { getDevModeReview } from "@/features/editor/dev-mode-review";
import { getDocumentTextReview } from "@/features/editor/document-text-review";
import { getExportPreflightReview } from "@/features/editor/export-preflight-review";
import { getPrototypeFlowDiagnostics } from "@/features/editor/prototype-flow-diagnostics";
import type { DesignDocument, DesignLayer } from "@/features/editor/types";

export type DocumentHealthStatus = "pass" | "warning" | "critical";

export type DocumentHealthCheck = {
  id: string;
  label: string;
  detail: string;
  status: DocumentHealthStatus;
  count: number;
  layerIds?: string[];
  commentIds?: string[];
  fixAction?: "mark-ready" | "resolve-comments" | "clear-prototype";
  fixLabel?: string;
};

export type DocumentHealthReport = {
  score: number;
  status: DocumentHealthStatus;
  checks: DocumentHealthCheck[];
  passCount: number;
  warningCount: number;
  criticalCount: number;
};

export function getDocumentHealthReport(
  document: DesignDocument,
): DocumentHealthReport {
  const accessibility = getDocumentAccessibilityAudit(document.pages);
  const comments = document.pages.flatMap((page) => page.comments ?? []);
  const unresolvedComments = comments.filter((comment) => !comment.resolved);
  const brokenPrototypeLayers = getBrokenPrototypeLayers(document);
  const prototypeFlow = getPrototypeFlowDiagnostics(document);
  const activeBrokenPrototypeLayerIds = brokenPrototypeLayers
    .filter((item) => item.pageId === document.activePageId)
    .map((item) => item.layerId);
  const activePrototypeIssueLayerIds = prototypeFlow.issues
    .filter((issue) => issue.pageId === document.activePageId)
    .map((issue) => issue.layerId)
    .filter((layerId): layerId is string => Boolean(layerId));
  const textReview = getDocumentTextReview(document);
  const activeTextIssueLayerIds = textReview.rows
    .filter((row) => row.pageId === document.activePageId)
    .map((row) => row.layerId);
  const devModeReview = getDevModeReview(document);
  const activeDevModeRows = devModeReview.rows.filter(
    (row) => row.pageId === document.activePageId && row.status !== "ready",
  );
  const activeDevModeLayerIds = activeDevModeRows.map((row) => row.layerId);
  const markReadyLayerIds = activeDevModeRows
    .filter((row) => row.status !== "blocked" && !row.readyForDev)
    .map((row) => row.layerId);
  const exportPreflight = getExportPreflightReview({ document });
  const activeExportIssueLayerIds = exportPreflight.rows
    .filter((row) => row.pageId === document.activePageId && row.layerId)
    .map((row) => row.layerId)
    .filter((layerId): layerId is string => Boolean(layerId));
  const libraryStatus = getLocalLibraryStatus(document);
  const checks: DocumentHealthCheck[] = [
    {
      id: "accessibility",
      label: "Accessibility",
      status:
        accessibility.highCount > 0
          ? "critical"
          : accessibility.mediumCount > 0
            ? "warning"
            : "pass",
      count: accessibility.issues.length,
      detail: `${accessibility.highCount} high, ${accessibility.mediumCount} medium, ${accessibility.lowCount} low issues across document`,
      layerIds: accessibility.issues
        .filter((issue) => issue.pageId === document.activePageId)
        .map((issue) => issue.layerId)
        .filter((layerId): layerId is string => Boolean(layerId)),
    },
    {
      id: "comments",
      label: "Open comments",
      status: unresolvedComments.length > 0 ? "warning" : "pass",
      count: unresolvedComments.length,
      detail:
        unresolvedComments.length > 0
          ? `${unresolvedComments.length} comments still need review`
          : "All comments are resolved",
      commentIds: unresolvedComments.map((comment) => comment.id),
      fixAction: unresolvedComments.length > 0 ? "resolve-comments" : undefined,
      fixLabel: "Resolve",
    },
    {
      id: "prototype",
      label: "Prototype links",
      status:
        prototypeFlow.brokenCount > 0
          ? "critical"
          : prototypeFlow.warningCount > 0
            ? "warning"
            : "pass",
      count: prototypeFlow.warningCount,
      detail:
        prototypeFlow.warningCount > 0
          ? `${prototypeFlow.brokenCount} broken, ${prototypeFlow.unreachableCount} unreachable, ${prototypeFlow.deadEndCount} dead-end prototype issues`
          : "Prototype flow is connected and targets resolve",
      layerIds: activePrototypeIssueLayerIds,
      fixAction:
        activeBrokenPrototypeLayerIds.length > 0 ? "clear-prototype" : undefined,
      fixLabel: "Clear links",
    },
    {
      id: "text-review",
      label: "Text review",
      status:
        textReview.blockedCount > 0
          ? "critical"
          : textReview.reviewCount > 0 || textReview.fontReviewCount > 0
            ? "warning"
            : "pass",
      count:
        textReview.blockedCount +
        textReview.reviewCount +
        textReview.fontReviewCount,
      detail: `${textReview.readyCount} ready, ${textReview.reviewCount} review, ${textReview.blockedCount} blocked text layers; ${textReview.fontReviewCount} fonts need review`,
      layerIds: activeTextIssueLayerIds,
    },
    {
      id: "dev-readiness",
      label: "Dev readiness",
      status:
        devModeReview.blockedCount > 0
          ? "critical"
          : devModeReview.reviewCount > 0
            ? "warning"
            : "pass",
      count: devModeReview.blockedCount + devModeReview.reviewCount,
      detail: `${devModeReview.readyForHandoffCount} handoff-ready, ${devModeReview.reviewCount} review, ${devModeReview.blockedCount} blocked layers`,
      layerIds: activeDevModeLayerIds,
      fixAction: markReadyLayerIds.length > 0 ? "mark-ready" : undefined,
      fixLabel: "Mark ready",
    },
    {
      id: "export-preflight",
      label: "Export preflight",
      status:
        exportPreflight.blockedCount > 0
          ? "critical"
          : exportPreflight.reviewCount > 0
            ? "warning"
            : "pass",
      count: exportPreflight.blockedCount + exportPreflight.reviewCount,
      detail: `${exportPreflight.exportableLayerCount} exportable, ${exportPreflight.reviewCount} review, ${exportPreflight.blockedCount} blocked export checks`,
      layerIds: activeExportIssueLayerIds,
    },
    {
      id: "library",
      label: "Library state",
      status:
        libraryStatus.pendingUpdateCount > 0 || libraryStatus.detachedCount > 0
          ? "warning"
          : "pass",
      count: libraryStatus.pendingUpdateCount + libraryStatus.detachedCount,
      detail: `${libraryStatus.changedCount} changed, ${libraryStatus.pendingUpdateCount} pending, ${libraryStatus.detachedCount} detached components`,
    },
  ];
  const criticalCount = checks.filter((check) => check.status === "critical")
    .length;
  const warningCount = checks.filter((check) => check.status === "warning")
    .length;
  const passCount = checks.filter((check) => check.status === "pass").length;

  return {
    score: Math.max(0, 100 - criticalCount * 22 - warningCount * 9),
    status:
      criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "pass",
    checks,
    passCount,
    warningCount,
    criticalCount,
  };
}

function getBrokenPrototypeLayers(document: DesignDocument) {
  const pagesById = new Map(document.pages.map((page) => [page.id, page]));

  return document.pages.flatMap((page) =>
    page.layers
      .filter((layer) => isBrokenPrototypeLayer(layer, pagesById))
      .map((layer) => ({
        pageId: page.id,
        layerId: layer.id,
      })),
  );
}

function isBrokenPrototypeLayer(
  layer: DesignLayer,
  pagesById: Map<string, unknown>,
) {
  return Boolean(
    layer.prototype?.targetPageId && !pagesById.has(layer.prototype.targetPageId),
  );
}
