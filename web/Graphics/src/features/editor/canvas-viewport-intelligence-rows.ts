import {
  getTopCostEntries,
  hasExpensiveEffect,
  type PageViewportFacts,
} from "@/features/editor/canvas-viewport-intelligence-model";
import { canvasViewportThresholds } from "@/features/editor/canvas-viewport-intelligence-thresholds";
import type {
  CanvasViewportIntelligenceRow,
} from "@/features/editor/canvas-viewport-intelligence-types";

export function getPageViewportRows(
  facts: PageViewportFacts,
): CanvasViewportIntelligenceRow[] {
  const rows: CanvasViewportIntelligenceRow[] = [
    ...getRenderWindowRows(facts),
    ...getOffscreenRows(facts),
    ...getInteractionRows(facts),
    ...getHitTestRows(facts),
    ...getSafeModeRows(facts),
  ];

  if (rows.length === 0 && facts.visibleEntries.length > 0) {
    return [
      createRow(facts, {
        id: `viewport-ready-${facts.page.pageId}`,
        status: "ready",
        category: "ready",
        label: "Viewport queue ready",
        detail:
          "This page stays within render-window, pointer interaction, and hit-test thresholds.",
        layerIds: facts.visibleEntries.slice(0, 8).map((entry) => entry.layerId),
        action: "select",
        actionLabel: "Select sample",
        metric: facts.estimatedRenderCost,
        renderWindowLabel: "Page",
        recommendation:
          "Use this review before adding dense overlays, image-heavy frames, or more prototype interactions.",
      }),
    ];
  }

  return rows;
}

function getRenderWindowRows(facts: PageViewportFacts) {
  return facts.renderWindows
    .filter(
      (window) =>
        window.entries.length >=
        canvasViewportThresholds.reviewWindowLayerCount,
    )
    .slice(0, 8)
    .map((window) =>
      createRow(facts, {
        id: `render-window-${facts.page.pageId}-${window.id}`,
        status:
          window.entries.length >=
          canvasViewportThresholds.blockedWindowLayerCount
            ? "blocked"
            : "review",
        category: "render-window",
        label: "Render-window queue",
        detail: `${window.label} queues ${window.entries.length} visible layers with an estimated render cost of ${Math.round(window.renderCost)}.`,
        layerIds: [
          ...(window.frameEntry ? [window.frameEntry.layerId] : []),
          ...getTopCostEntries(window.entries, 24).map((entry) => entry.layerId),
        ],
        action: "select",
        actionLabel: "Queue",
        metric: window.entries.length,
        renderWindowLabel: window.label,
        recommendation:
          "Split dense frames, hide inactive explorations, or flatten static artwork before adding more viewport overlays.",
      }),
    );
}

function getOffscreenRows(facts: PageViewportFacts) {
  if (
    facts.offscreenEntries.length <
    canvasViewportThresholds.reviewOffscreenLayerCount
  ) {
    return [];
  }

  return [
    createRow(facts, {
      id: `offscreen-visible-${facts.page.pageId}`,
      status:
        facts.offscreenEntries.length >=
        canvasViewportThresholds.blockedOffscreenLayerCount
          ? "blocked"
          : "review",
      category: "render-window",
      label: "Off-window visible layers",
      detail: `${facts.offscreenEntries.length} visible layers are outside detected frame render windows.`,
      layerIds: getTopCostEntries(facts.offscreenEntries, 32).map(
        (entry) => entry.layerId,
      ),
      action: "lock-layers",
      actionLabel: "Lock",
      metric: facts.offscreenEntries.length,
      renderWindowLabel: "Off-window",
      recommendation:
        "Lock static off-window references or move stale explorations to a separate page so pointer scans stay predictable.",
    }),
  ];
}

function getInteractionRows(facts: PageViewportFacts) {
  const rows: CanvasViewportIntelligenceRow[] = [];

  if (facts.interactionCost >= canvasViewportThresholds.reviewInteractionCost) {
    rows.push(
      createRow(facts, {
        id: `interaction-cost-${facts.page.pageId}`,
        status:
          facts.interactionCost >=
          canvasViewportThresholds.blockedInteractionCost
            ? "blocked"
            : "review",
        category: "interaction-cost",
        label: "Pointer interaction cost",
        detail: `${facts.page.pageName} has an estimated pointer interaction cost of ${facts.interactionCost}.`,
        layerIds: getTopCostEntries(facts.selectableEntries, 32).map(
          (entry) => entry.layerId,
        ),
        action: "select",
        actionLabel: "Queue",
        metric: facts.interactionCost,
        renderWindowLabel: "Page",
        recommendation:
          "Reduce selectable overlays, lock static backgrounds, and keep dense frames grouped before shipping collaboration-heavy files.",
      }),
    );
  }

  if (
    facts.expensiveEntries.length >=
    canvasViewportThresholds.reviewExpensiveLayerCount
  ) {
    rows.push(
      createRow(facts, {
        id: `expensive-viewport-layers-${facts.page.pageId}`,
        status:
          facts.expensiveEntries.length >=
          canvasViewportThresholds.blockedExpensiveLayerCount
            ? "blocked"
            : "review",
        category: "interaction-cost",
        label: "Expensive viewport layers",
        detail: `${facts.expensiveEntries.length} visible layers add image, vector, effect, mask, blend, or large-bounds pressure.`,
        layerIds: facts.expensiveEntries
          .slice(0, 32)
          .map((entry) => entry.layerId),
        action: facts.expensiveEntries.some((entry) =>
          hasExpensiveEffect(entry.layer),
        )
          ? "disable-effects"
          : "select",
        actionLabel: facts.expensiveEntries.some((entry) =>
          hasExpensiveEffect(entry.layer),
        )
          ? "Effects off"
          : "Queue",
        metric: facts.expensiveEntries.length,
        renderWindowLabel: "Page",
        recommendation:
          "Disable live effects for editing, simplify dense paths, and flatten static blended assets after visual approval.",
      }),
    );
  }

  if (facts.estimatedRenderCost >= canvasViewportThresholds.reviewRenderCost) {
    rows.push(
      createRow(facts, {
        id: `viewport-render-cost-${facts.page.pageId}`,
        status:
          facts.estimatedRenderCost >=
          canvasViewportThresholds.blockedRenderCost
            ? "blocked"
            : "review",
        category: "interaction-cost",
        label: "Viewport render cost",
        detail: `${facts.page.pageName} has an estimated viewport render cost of ${facts.estimatedRenderCost}.`,
        layerIds: getTopCostEntries(facts.visibleEntries, 32).map(
          (entry) => entry.layerId,
        ),
        action: "select",
        actionLabel: "Queue",
        metric: facts.estimatedRenderCost,
        renderWindowLabel: "Page",
        recommendation:
          "Review large image, vector, effect, mask, and blend layers before recording visual baselines.",
      }),
    );
  }

  return rows;
}

function getHitTestRows(facts: PageViewportFacts) {
  if (
    facts.hitTest.pairCount <
      canvasViewportThresholds.reviewHitTestPairCount &&
    facts.hitTest.stackDepth < canvasViewportThresholds.reviewStackDepth
  ) {
    return [];
  }

  const blocked =
    facts.hitTest.pairCount >=
      canvasViewportThresholds.blockedHitTestPairCount ||
    facts.hitTest.stackDepth >= canvasViewportThresholds.blockedStackDepth;

  return [
    createRow(facts, {
      id: `deep-hit-test-${facts.page.pageId}`,
      status: blocked ? "blocked" : "review",
      category: "hit-test",
      label: "Deep hit-test stack",
      detail: `${facts.page.pageName} has about ${facts.hitTest.pairCount} overlapping selectable pairs and stack depth ${facts.hitTest.stackDepth}.`,
      layerIds: facts.hitTest.layerIds,
      action: "select",
      actionLabel: "Inspect",
      metric: Math.max(facts.hitTest.pairCount, facts.hitTest.stackDepth),
      renderWindowLabel: "Page",
      recommendation:
        "Group foreground controls, lock background artwork, and reduce overlapping transparent hit areas.",
    }),
  ];
}

function getSafeModeRows(facts: PageViewportFacts) {
  if (facts.safeModeThresholdCount < 2) {
    return [];
  }

  return [
    createRow(facts, {
      id: `viewport-safe-mode-${facts.page.pageId}`,
      status: facts.safeModeThresholdCount >= 4 ? "blocked" : "review",
      category: "safe-mode",
      label: "Safe-mode threshold",
      detail: `${facts.safeModeThresholdCount} viewport thresholds are active on ${facts.page.pageName}.`,
      layerIds: getTopCostEntries(facts.visibleEntries, 36).map(
        (entry) => entry.layerId,
      ),
      action: facts.expensiveEntries.some((entry) =>
        hasExpensiveEffect(entry.layer),
      )
        ? "disable-effects"
        : "lock-layers",
      actionLabel: facts.expensiveEntries.some((entry) =>
        hasExpensiveEffect(entry.layer),
      )
        ? "Effects off"
        : "Lock",
      metric: facts.safeModeThresholdCount,
      renderWindowLabel: "Page",
      recommendation:
        "Use safe editing mode before heavy collaboration, screenshots, or export checks on this page.",
    }),
  ];
}

function createRow(
  facts: PageViewportFacts,
  input: Pick<
    CanvasViewportIntelligenceRow,
    | "id"
    | "status"
    | "category"
    | "label"
    | "detail"
    | "layerIds"
    | "action"
    | "actionLabel"
    | "metric"
    | "renderWindowLabel"
    | "recommendation"
  >,
): CanvasViewportIntelligenceRow {
  const layerNames = input.layerIds
    .map((layerId) => facts.page.byId.get(layerId)?.layer.name)
    .filter((name): name is string => Boolean(name));

  return {
    ...input,
    pageId: facts.page.pageId,
    pageName: facts.page.pageName,
    layerIds: Array.from(new Set(input.layerIds)).slice(
      0,
      canvasViewportThresholds.maxEvidenceLayerIds,
    ),
    layerNames: Array.from(new Set(layerNames)).slice(0, 12),
    estimatedRenderCost: facts.estimatedRenderCost,
    interactionCost: facts.interactionCost,
    hitTestPairCount: facts.hitTest.pairCount,
    stackDepth: facts.hitTest.stackDepth,
    offscreenLayerCount: facts.offscreenEntries.length,
    repairable: input.action !== "select" && input.status !== "ready",
  };
}
