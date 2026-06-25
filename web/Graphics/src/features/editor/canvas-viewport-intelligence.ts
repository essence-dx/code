import { createDocumentLayerIndex } from "@/features/editor/layer-index";
import type { DesignDocument } from "@/features/editor/types";
import {
  getPageViewportFacts,
} from "@/features/editor/canvas-viewport-intelligence-model";
import {
  getPageViewportRows,
} from "@/features/editor/canvas-viewport-intelligence-rows";
import {
  canvasViewportIntelligenceStatusRank,
  type CanvasViewportIntelligenceReport,
  type CanvasViewportIntelligenceRow,
} from "@/features/editor/canvas-viewport-intelligence-types";

export function getCanvasViewportIntelligence(
  document: DesignDocument,
): CanvasViewportIntelligenceReport {
  const index = createDocumentLayerIndex(document);
  const pageFacts = index.pages.map(getPageViewportFacts);
  const rows = pageFacts
    .flatMap((facts) => getPageViewportRows(facts))
    .sort((left, right) => {
      if (left.status !== right.status) {
        return (
          canvasViewportIntelligenceStatusRank[left.status] -
          canvasViewportIntelligenceStatusRank[right.status]
        );
      }

      if (left.pageName !== right.pageName) {
        return left.pageName.localeCompare(right.pageName);
      }

      return left.category.localeCompare(right.category);
    });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 18 - reviewCount * 7);

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: index.pages.length,
    reviewedLayerCount: pageFacts.reduce(
      (total, facts) => total + facts.visibleEntries.length,
      0,
    ),
    renderWindowCount: pageFacts.reduce(
      (total, facts) => total + facts.renderWindows.length,
      0,
    ),
    renderWindowLayerCount: pageFacts.reduce(
      (total, facts) => total + facts.renderWindowLayerCount,
      0,
    ),
    offscreenLayerCount: pageFacts.reduce(
      (total, facts) => total + facts.offscreenEntries.length,
      0,
    ),
    expensiveLayerCount: pageFacts.reduce(
      (total, facts) => total + facts.expensiveEntries.length,
      0,
    ),
    deepHitTestPairCount: pageFacts.reduce(
      (total, facts) => total + facts.hitTest.pairCount,
      0,
    ),
    deepHitTestStackDepth: Math.max(
      0,
      ...pageFacts.map((facts) => facts.hitTest.stackDepth),
    ),
    interactionCost: pageFacts.reduce(
      (total, facts) => total + facts.interactionCost,
      0,
    ),
    estimatedRenderCost: pageFacts.reduce(
      (total, facts) => total + facts.estimatedRenderCost,
      0,
    ),
    safeModeThresholdCount: pageFacts.reduce(
      (total, facts) => total + facts.safeModeThresholdCount,
      0,
    ),
    repairableCount: rows.filter((row) => row.repairable).length,
    readyCount,
    reviewCount,
    blockedCount,
    rows: rows.length > 0 ? rows : [getReadyRow(document, score)],
  };
}

function getReadyRow(
  document: DesignDocument,
  score: number,
): CanvasViewportIntelligenceRow {
  return {
    id: "canvas-viewport-intelligence-ready",
    pageId: document.activePageId,
    pageName: "Document",
    status: "ready",
    category: "ready",
    label: "Viewport intelligence ready",
    detail:
      "Render-window queues, interaction cost, hit-test depth, and safe-mode thresholds are within budget.",
    layerIds: [],
    layerNames: [],
    action: "select",
    actionLabel: "No action",
    metric: score,
    renderWindowLabel: "Document",
    estimatedRenderCost: 0,
    interactionCost: 0,
    hitTestPairCount: 0,
    stackDepth: 0,
    offscreenLayerCount: 0,
    recommendation:
      "Keep viewport review exports attached to large feature or release handoffs.",
    repairable: false,
  };
}
