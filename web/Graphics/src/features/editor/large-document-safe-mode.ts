import {
  getCanvasRenderBudgetTelemetry,
} from "@/features/editor/canvas-render-budget";
import {
  createDocumentLayerIndex,
  type LayerIndexEntry,
} from "@/features/editor/layer-index";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type LargeDocumentSafeModeStatus = "ready" | "review" | "blocked";

export type LargeDocumentSafeModeAction =
  | "select"
  | "disable-effects"
  | "hide-layers"
  | "lock-layers";

export type LargeDocumentSafeModeRow = {
  id: string;
  status: LargeDocumentSafeModeStatus;
  label: string;
  detail: string;
  layerIds: string[];
  metric: number;
  action: LargeDocumentSafeModeAction;
  actionLabel: string;
  recommendation: string;
};

export type LargeDocumentSafeModeReport = {
  score: number;
  status: LargeDocumentSafeModeStatus;
  pageName: string;
  documentLayerCount: number;
  activeVisibleLayerCount: number;
  renderCost: number;
  effectLayerCount: number;
  hiddenLayerCount: number;
  largeLayerCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: LargeDocumentSafeModeRow[];
};

const reviewDocumentLayerCount = 500;
const blockedDocumentLayerCount = 1000;
const reviewHiddenLayerCount = 120;
const blockedHiddenLayerCount = 280;
const reviewEffectLayerCount = 6;
const blockedEffectLayerCount = 18;
const reviewLargeLayerArea = 1_200_000;
const blockedLargeLayerArea = 3_000_000;
const reviewVisibleLayerCount = 140;
const blockedVisibleLayerCount = 300;
const reviewRenderCost = 180;
const blockedRenderCost = 360;

export function getLargeDocumentSafeModeReport(
  document: DesignDocument,
  activePage: DesignPage,
): LargeDocumentSafeModeReport {
  const documentIndex = createDocumentLayerIndex(document);
  const activeRenderBudget = getCanvasRenderBudgetTelemetry(activePage);
  const hiddenEntries = documentIndex.entries.filter((entry) => !entry.visible);
  const activePageIndex = documentIndex.pagesById.get(activePage.id);
  const activeVisibleEntries =
    activePageIndex?.visibleLayerIds
      .map((layerId) => activePageIndex.byId.get(layerId))
      .filter((entry): entry is LayerIndexEntry => Boolean(entry)) ?? [];
  const effectEntries = activeVisibleEntries.filter((entry) =>
    hasExpensiveEffect(entry.layer),
  );
  const largeEntries = activeVisibleEntries.filter(
    (entry) => entry.bounds.area >= reviewLargeLayerArea,
  );
  const rows: LargeDocumentSafeModeRow[] = [
    ...getDocumentSizeRows(documentIndex.entries.length),
    ...getVisibleLayerRows(activePage.name, activeVisibleEntries.length),
    ...getRenderCostRows(activeRenderBudget.estimatedRenderCost),
    ...getEffectRows(effectEntries),
    ...getHiddenLayerRows(hiddenEntries),
    ...getLargeLayerRows(largeEntries),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageName: activePage.name,
    documentLayerCount: documentIndex.entries.length,
    activeVisibleLayerCount: activeRenderBudget.visibleLayerCount,
    renderCost: activeRenderBudget.estimatedRenderCost,
    effectLayerCount: effectEntries.length,
    hiddenLayerCount: hiddenEntries.length,
    largeLayerCount: largeEntries.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "large-document-safe-mode-ready",
              status: "ready",
              label: "Safe mode not needed",
              detail:
                "The document and active page are within the current safe-mode thresholds.",
              layerIds: [],
              metric: score,
              action: "select",
              actionLabel: "No action",
              recommendation:
                "Keep safe-mode exports available for future large-document release reviews.",
            } satisfies LargeDocumentSafeModeRow,
          ],
  };
}

export function getSafeModeLayerPatch(
  action: LargeDocumentSafeModeAction,
): Partial<DesignLayer> | null {
  if (action === "disable-effects") {
    return {
      effectsVisible: false,
    };
  }

  if (action === "hide-layers") {
    return {
      visible: false,
    };
  }

  if (action === "lock-layers") {
    return {
      locked: true,
    };
  }

  return null;
}

function getDocumentSizeRows(layerCount: number) {
  if (layerCount < reviewDocumentLayerCount) {
    return [];
  }

  return [
    {
      id: "safe-mode-document-size",
      status: layerCount >= blockedDocumentLayerCount ? "blocked" : "review",
      label: "Document layer count",
      detail: `${layerCount} layers are present across the document.`,
      layerIds: [],
      metric: layerCount,
      action: "select",
      actionLabel: "Review file",
      recommendation:
        "Split archived explorations into branch files before adding more render-heavy pages.",
    } satisfies LargeDocumentSafeModeRow,
  ];
}

function getVisibleLayerRows(pageName: string, visibleLayerCount: number) {
  if (visibleLayerCount < reviewVisibleLayerCount) {
    return [];
  }

  return [
    {
      id: "safe-mode-visible-layers",
      status:
        visibleLayerCount >= blockedVisibleLayerCount ? "blocked" : "review",
      label: "Active-page visible stack",
      detail: `${pageName} has ${visibleLayerCount} visible layers.`,
      layerIds: [],
      metric: visibleLayerCount,
      action: "select",
      actionLabel: "Review stack",
      recommendation:
        "Hide or archive inactive visible layers before opening collaboration-heavy sessions.",
    } satisfies LargeDocumentSafeModeRow,
  ];
}

function getRenderCostRows(renderCost: number) {
  if (renderCost < reviewRenderCost) {
    return [];
  }

  return [
    {
      id: "safe-mode-render-cost",
      status: renderCost >= blockedRenderCost ? "blocked" : "review",
      label: "Render cost",
      detail: `The active page render cost estimate is ${renderCost}.`,
      layerIds: [],
      metric: renderCost,
      action: "select",
      actionLabel: "Review budget",
      recommendation:
        "Turn on safe-mode review before exporting, recording snapshots, or adding more overlays.",
    } satisfies LargeDocumentSafeModeRow,
  ];
}

function getEffectRows(effectEntries: Array<{ layerId: string; layer: DesignLayer }>) {
  if (effectEntries.length < reviewEffectLayerCount) {
    return [];
  }

  return [
    {
      id: "safe-mode-disable-effects",
      status:
        effectEntries.length >= blockedEffectLayerCount ? "blocked" : "review",
      label: "Live effects",
      detail: `${effectEntries.length} visible layers use blur, shadow, or background blur effects.`,
      layerIds: effectEntries.map((entry) => entry.layerId),
      metric: effectEntries.length,
      action: "disable-effects",
      actionLabel: "Disable effects",
      recommendation:
        "Disable live effects temporarily for editing speed, then re-enable them for final visual QA.",
    } satisfies LargeDocumentSafeModeRow,
  ];
}

function getHiddenLayerRows(hiddenEntries: Array<{ layerId: string }>) {
  if (hiddenEntries.length < reviewHiddenLayerCount) {
    return [];
  }

  return [
    {
      id: "safe-mode-hidden-layers",
      status:
        hiddenEntries.length >= blockedHiddenLayerCount ? "blocked" : "review",
      label: "Hidden layer inventory",
      detail: `${hiddenEntries.length} hidden layers are still stored in this document.`,
      layerIds: hiddenEntries.slice(0, 80).map((entry) => entry.layerId),
      metric: hiddenEntries.length,
      action: "select",
      actionLabel: "Select hidden",
      recommendation:
        "Review hidden layers and move stale explorations into a branch file before release review.",
    } satisfies LargeDocumentSafeModeRow,
  ];
}

function getLargeLayerRows(
  largeEntries: Array<{ bounds: { area: number }; layerId: string }>,
) {
  if (largeEntries.length === 0) {
    return [];
  }

  const blockedCount = largeEntries.filter(
    (entry) => entry.bounds.area >= blockedLargeLayerArea,
  ).length;

  return [
    {
      id: "safe-mode-large-layers",
      status:
        blockedCount > 0 || largeEntries.length >= 8 ? "blocked" : "review",
      label: "Large visible layers",
      detail: `${largeEntries.length} visible layers have oversized bounds.`,
      layerIds: largeEntries.map((entry) => entry.layerId),
      metric: largeEntries.length,
      action: "lock-layers",
      actionLabel: "Lock layers",
      recommendation:
        "Lock oversized background or artwork layers while editing dense foreground content.",
    } satisfies LargeDocumentSafeModeRow,
  ];
}

function hasExpensiveEffect(layer: DesignLayer) {
  return Boolean(
    layer.effectsVisible !== false &&
      ((layer.shadowEnabled && (layer.shadowBlur ?? 0) > 0) ||
        (layer.layerBlur ?? 0) > 0 ||
        (layer.backgroundBlur ?? 0) > 0),
  );
}
