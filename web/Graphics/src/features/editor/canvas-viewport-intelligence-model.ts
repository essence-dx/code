import {
  type LayerIndexEntry,
  type PageLayerIndex,
} from "@/features/editor/layer-index";
import {
  getLayerInteractionCost,
  getLayerRenderCost,
  getTopCostEntries,
  hasExpensiveEffect,
  intersectsBounds,
} from "@/features/editor/canvas-viewport-intelligence-cost";
import { canvasViewportThresholds } from "@/features/editor/canvas-viewport-intelligence-thresholds";

export type PageViewportFacts = {
  page: PageLayerIndex;
  visibleEntries: LayerIndexEntry[];
  selectableEntries: LayerIndexEntry[];
  frameEntries: LayerIndexEntry[];
  renderWindows: RenderWindowFacts[];
  offscreenEntries: LayerIndexEntry[];
  expensiveEntries: LayerIndexEntry[];
  hitTest: HitTestEvidence;
  interactionCost: number;
  estimatedRenderCost: number;
  renderWindowLayerCount: number;
  safeModeThresholdCount: number;
};

export type RenderWindowFacts = {
  id: string;
  label: string;
  frameEntry?: LayerIndexEntry;
  entries: LayerIndexEntry[];
  renderCost: number;
  interactionCost: number;
};

export type HitTestEvidence = {
  pairCount: number;
  exactPairCount: number;
  stackDepth: number;
  layerIds: string[];
};

export function getPageViewportFacts(
  page: PageLayerIndex,
): PageViewportFacts {
  const visibleEntries = page.visibleLayerIds
    .map((layerId) => page.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => Boolean(entry));
  const selectableEntries = visibleEntries.filter((entry) => entry.selectable);
  const frameEntries = visibleEntries.filter((entry) => entry.type === "frame");
  const renderWindows = getRenderWindows(page, visibleEntries, frameEntries);
  const windowLayerIds = new Set(
    renderWindows.flatMap((window) =>
      window.entries.map((entry) => entry.layerId),
    ),
  );
  const offscreenEntries = visibleEntries.filter(
    (entry) => !windowLayerIds.has(entry.layerId),
  );
  const expensiveEntries = visibleEntries
    .filter((entry) => getLayerRenderCost(entry.layer, entry.bounds) >= 12)
    .sort(
      (left, right) =>
        getLayerRenderCost(right.layer, right.bounds) -
        getLayerRenderCost(left.layer, left.bounds),
    );
  const hitTest = getHitTestEvidence(selectableEntries);
  const estimatedRenderCost = Math.round(
    visibleEntries.reduce(
      (total, entry) => total + getLayerRenderCost(entry.layer, entry.bounds),
      0,
    ),
  );
  const interactionCost = Math.round(
    selectableEntries.reduce(
      (total, entry) =>
        total + getLayerInteractionCost(entry.layer, entry.bounds),
      0,
    ) + hitTest.pairCount / 12,
  );

  return {
    page,
    visibleEntries,
    selectableEntries,
    frameEntries,
    renderWindows,
    offscreenEntries,
    expensiveEntries,
    hitTest,
    interactionCost,
    estimatedRenderCost,
    renderWindowLayerCount: renderWindows.reduce(
      (total, window) => total + window.entries.length,
      0,
    ),
    safeModeThresholdCount: getSafeModeThresholdCount({
      visibleEntries,
      offscreenEntries,
      expensiveEntries,
      hitTest,
      interactionCost,
      estimatedRenderCost,
    }),
  };
}

function getRenderWindows(
  page: PageLayerIndex,
  visibleEntries: LayerIndexEntry[],
  frameEntries: LayerIndexEntry[],
): RenderWindowFacts[] {
  const windows = frameEntries.map((frameEntry) => {
    const entries = visibleEntries.filter(
      (entry) =>
        entry.layerId === frameEntry.layerId ||
        entry.parentId === frameEntry.layerId ||
        intersectsBounds(frameEntry.bounds, entry.bounds),
    );

    return createRenderWindow(
      frameEntry.layerId,
      frameEntry.layer.name,
      entries,
      frameEntry,
    );
  });

  if (windows.length > 0) {
    return windows;
  }

  if (visibleEntries.length === 0) {
    return [];
  }

  return [
    createRenderWindow(
      `${page.pageId}-page-window`,
      page.pageName,
      visibleEntries,
    ),
  ];
}

function createRenderWindow(
  id: string,
  label: string,
  entries: LayerIndexEntry[],
  frameEntry?: LayerIndexEntry,
): RenderWindowFacts {
  return {
    id,
    label,
    frameEntry,
    entries,
    renderCost: entries.reduce(
      (total, entry) => total + getLayerRenderCost(entry.layer, entry.bounds),
      0,
    ),
    interactionCost: entries.reduce(
      (total, entry) =>
        total + getLayerInteractionCost(entry.layer, entry.bounds),
      0,
    ),
  };
}

function getHitTestEvidence(entries: LayerIndexEntry[]): HitTestEvidence {
  const candidates =
    entries.length > canvasViewportThresholds.maxExactHitTestLayers
      ? getTopCostEntries(
          entries,
          canvasViewportThresholds.maxExactHitTestLayers,
        )
      : entries;
  const sorted = [...candidates].sort(
    (left, right) => left.bounds.x - right.bounds.x,
  );
  const layerIds = new Set<string>();
  let pairCount = 0;
  let stackDepth = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];

    if (!entry) {
      continue;
    }

    let localDepth = 1;

    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const next = sorted[nextIndex];

      if (!next || next.bounds.x > entry.bounds.right) {
        break;
      }

      if (!intersectsBounds(entry.bounds, next.bounds)) {
        continue;
      }

      pairCount += 1;
      localDepth += 1;

      if (layerIds.size < canvasViewportThresholds.maxEvidenceLayerIds) {
        layerIds.add(entry.layerId);
        layerIds.add(next.layerId);
      }
    }

    stackDepth = Math.max(stackDepth, localDepth);
  }

  const scale =
    candidates.length > 0 ? Math.max(1, entries.length / candidates.length) : 1;

  return {
    pairCount:
      candidates.length === entries.length
        ? pairCount
        : Math.round(pairCount * scale * scale),
    exactPairCount: pairCount,
    stackDepth,
    layerIds: [...layerIds],
  };
}

function getSafeModeThresholdCount(input: {
  visibleEntries: LayerIndexEntry[];
  offscreenEntries: LayerIndexEntry[];
  expensiveEntries: LayerIndexEntry[];
  hitTest: HitTestEvidence;
  interactionCost: number;
  estimatedRenderCost: number;
}) {
  return [
    input.visibleEntries.length >=
      canvasViewportThresholds.reviewWindowLayerCount * 3,
    input.offscreenEntries.length >=
      canvasViewportThresholds.reviewOffscreenLayerCount,
    input.expensiveEntries.length >=
      canvasViewportThresholds.reviewExpensiveLayerCount,
    input.hitTest.pairCount >= canvasViewportThresholds.reviewHitTestPairCount,
    input.hitTest.stackDepth >= canvasViewportThresholds.reviewStackDepth,
    input.interactionCost >= canvasViewportThresholds.reviewInteractionCost,
    input.estimatedRenderCost >= canvasViewportThresholds.reviewRenderCost,
  ].filter(Boolean).length;
}

export { getTopCostEntries, hasExpensiveEffect };
