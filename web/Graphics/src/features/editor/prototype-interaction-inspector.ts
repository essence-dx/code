import { getPrototypeFlowDiagnostics } from "@/features/editor/prototype-flow-diagnostics";
import { getPrototypePreviewModel } from "@/features/editor/prototype-preview";
import {
  prototypeInteractionStatusRank,
  type PrototypeInteractionInspectorReport,
  type PrototypeInteractionInspectorRow,
} from "@/features/editor/prototype-interaction-inspector-types";
import type { DesignDocument, DesignLayer, DesignPage } from "@/features/editor/types";

export function getPrototypeInteractionInspector(
  document: DesignDocument,
): PrototypeInteractionInspectorReport {
  const flow = getPrototypeFlowDiagnostics(document);
  const preview = getPrototypePreviewModel(document);
  const pagesById = new Map(document.pages.map((page) => [page.id, page]));
  const rows = [
    ...getStartPageRows(document, flow),
    ...document.pages.flatMap((page) =>
      page.layers.flatMap((layer) =>
        getLayerPrototypeRows({
          document,
          page,
          layer,
          pagesById,
          previewHotspot: preview.pages
            .find((previewPage) => previewPage.id === page.id)
            ?.hotspots.find((hotspot) => hotspot.id === layer.id),
        }),
      ),
    ),
    ...getPresentationRouteRows(document, preview),
  ].sort((left, right) => {
    if (left.status !== right.status) {
      return (
        prototypeInteractionStatusRank[left.status] -
        prototypeInteractionStatusRank[right.status]
      );
    }

    if (left.pageName !== right.pageName) {
      return left.pageName.localeCompare(right.pageName);
    }

    return left.label.localeCompare(right.label);
  });
  const hotspotCount = document.pages.reduce(
    (count, page) => count + page.layers.filter((layer) => layer.prototype).length,
    0,
  );

  return {
    score: getInspectorScore(rows, hotspotCount, document.pages.length),
    pageCount: document.pages.length,
    hotspotCount,
    startPageCount: document.pages.filter((page) => page.prototypeStart).length,
    routePageCount: preview.pages.length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    reviewCount: rows.filter((row) => row.status === "review").length,
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    repairableCount: rows.filter((row) => row.repairable).length,
    overlayReviewCount: rows.filter((row) => row.category === "overlay").length,
    scrollReviewCount: rows.filter((row) => row.category === "scroll").length,
    transitionReviewCount: rows.filter((row) => row.category === "transition")
      .length,
    unsupportedTriggerCount: rows.filter((row) => row.category === "trigger")
      .length,
    presentationRouteIssueCount: rows.filter(
      (row) =>
        row.category === "presentation-route" && row.status !== "ready",
    ).length,
    rows,
  };
}

function getStartPageRows(
  document: DesignDocument,
  flow: ReturnType<typeof getPrototypeFlowDiagnostics>,
): PrototypeInteractionInspectorRow[] {
  const rows: PrototypeInteractionInspectorRow[] = [];
  const recommendedStartPageId = getRecommendedStartPageId(document, flow);
  const recommendedStartPage = document.pages.find(
    (page) => page.id === recommendedStartPageId,
  );

  if (flow.hotspotCount > 0 && flow.startPageCount === 0 && recommendedStartPage) {
    rows.push(
      createPageRow(recommendedStartPage, {
        status: "blocked",
        category: "starting-point",
        label: "Missing prototype start",
        detail:
          "This file has prototype hotspots but no starting point, so the shared presentation route falls back to the active or first page.",
        action: "set-start",
        actionLabel: "Set start",
        routeEvidence: "Preview model has hotspots but no explicit start page.",
      }),
    );
  }

  if (flow.startPageCount > 1 && recommendedStartPage) {
    rows.push(
      createPageRow(recommendedStartPage, {
        status: "review",
        category: "starting-point",
        label: "Multiple start pages",
        detail:
          "The shared route chooses the first marked start page, so normalize the file to one intentional starting point.",
        action: "set-start",
        actionLabel: "Normalize",
        routeEvidence: `${flow.startPageCount} pages are marked as prototype starts.`,
      }),
    );
  }

  for (const page of document.pages.filter(
    (item) =>
      item.prototypeStart &&
      item.layers.every((layer) => !layer.prototype),
  )) {
    rows.push(
      createPageRow(page, {
        status: "review",
        category: "starting-point",
        label: "Start page has no hotspots",
        detail:
          "This starting point opens in presentation mode but gives viewers no route forward.",
        action: "set-start",
        actionLabel: "Review start",
        routeEvidence: "Start page renders, but has no clickable hotspots.",
      }),
    );
  }

  return rows;
}

function getLayerPrototypeRows({
  document,
  page,
  layer,
  pagesById,
  previewHotspot,
}: {
  document: DesignDocument;
  page: DesignPage;
  layer: DesignLayer;
  pagesById: Map<string, DesignPage>;
  previewHotspot:
    | ReturnType<typeof getPrototypePreviewModel>["pages"][number]["hotspots"][number]
    | undefined;
}): PrototypeInteractionInspectorRow[] {
  const prototype = layer.prototype;

  if (!prototype) {
    return [];
  }

  const targetPage = pagesById.get(prototype.targetPageId);
  const rows: PrototypeInteractionInspectorRow[] = [];
  const base = {
    document,
    page,
    layer,
    targetPage,
    previewHotspot,
  };

  if (!targetPage) {
    rows.push(
      createLayerRow(base, {
        status: "blocked",
        category: "presentation-route",
        label: "Missing target page",
        detail:
          "The presentation route disables this hotspot because its target page does not exist.",
        action: "clear-prototype",
        actionLabel: "Clear",
        routeEvidence: "Shared prototype preview marks this hotspot as broken.",
      }),
    );
  }

  if (prototype.trigger !== "click") {
    rows.push(
      createLayerRow(base, {
        status: "review",
        category: "trigger",
        label: "Presentation trigger fallback",
        detail:
          "The current shared prototype route replays hotspots through click activation, so add or normalize a click trigger for reliable handoff.",
        action: "set-click-trigger",
        actionLabel: "Set click",
        routeEvidence: `${prototype.trigger} is stored, while the preview uses clickable hotspot buttons.`,
      }),
    );
  }

  if (prototype.action === "overlay") {
    rows.push(...getOverlayRows(base));
  }

  rows.push(...getScrollRows(base));
  rows.push(...getTransitionRows(base));

  if (previewHotspot && isHotspotOutsidePreview(previewHotspot)) {
    rows.push(
      createLayerRow(base, {
        status: "blocked",
        category: "presentation-route",
        label: "Hotspot outside route frame",
        detail:
          "The hotspot bounds fall outside the exported presentation frame and may not be reachable in preview.",
        action: "select",
        actionLabel: "Select",
        routeEvidence: `${previewHotspot.left.toFixed(1)}%, ${previewHotspot.top.toFixed(1)}%, ${previewHotspot.width.toFixed(1)}%, ${previewHotspot.height.toFixed(1)}%`,
      }),
    );
  }

  if (rows.length === 0) {
    rows.push(
      createLayerRow(base, {
        status: "ready",
        category: "ready",
        label: "Interaction route ready",
        detail:
          "The hotspot has a valid target, click replay path, supported scroll behavior, and transition settings for the shared prototype route.",
        action: "select",
        actionLabel: "Select",
        routeEvidence: "Preview route can render and activate this hotspot.",
      }),
    );
  }

  return rows;
}

function getOverlayRows(input: LayerRowInput) {
  const prototype = input.layer.prototype;
  const rows: PrototypeInteractionInspectorRow[] = [];

  if (!prototype) {
    return rows;
  }

  if (prototype.transition === "instant") {
    rows.push(
      createLayerRow(input, {
        status: "review",
        category: "overlay",
        label: "Overlay has no transition",
        detail:
          "Overlay presentations render immediately. Use dissolve or slide timing when the handoff needs visible overlay motion.",
        action: "set-duration",
        actionLabel: "Set timing",
        routeEvidence: "Overlay route renders the target as a modal over the current page.",
      }),
    );
  }

  if (prototype.targetPageId === input.page.id) {
    rows.push(
      createLayerRow(input, {
        status: "review",
        category: "overlay",
        label: "Self-targeting overlay",
        detail:
          "This overlay opens the same page, which can feel like a no-op in the presentation route.",
        action: "select",
        actionLabel: "Select",
        routeEvidence: "Overlay target page id matches the source page id.",
      }),
    );
  }

  return rows;
}

function getScrollRows(input: LayerRowInput) {
  const prototype = input.layer.prototype;

  if (!prototype) {
    return [];
  }

  const scrollBehavior =
    prototype.scrollBehavior ?? (prototype.preserveScroll ? "preserve" : "reset");

  if (scrollBehavior === "lock" && prototype.action !== "overlay") {
    return [
      createLayerRow(input, {
        status: "review",
        category: "scroll",
        label: "Scroll lock on navigation",
        detail:
          "The shared route only uses scroll lock for overlays. Navigation hotspots should reset or preserve scroll intentionally.",
        action: "set-scroll-reset",
        actionLabel: "Reset scroll",
        routeEvidence: "Preview viewport locks overflow only while an overlay is open.",
      }),
    ];
  }

  return [];
}

function getTransitionRows(input: LayerRowInput) {
  const prototype = input.layer.prototype;
  const rows: PrototypeInteractionInspectorRow[] = [];

  if (!prototype) {
    return rows;
  }

  if (prototype.transition !== "instant" && prototype.durationMs <= 0) {
    rows.push(
      createLayerRow(input, {
        status: "review",
        category: "transition",
        label: "Transition duration missing",
        detail:
          "A non-instant transition with zero duration cannot be visually verified in presentation mode.",
        action: "set-duration",
        actionLabel: "Set duration",
        routeEvidence: `${prototype.transition} is configured with ${prototype.durationMs}ms.`,
      }),
    );
  }

  if (prototype.transition === "instant" && prototype.durationMs > 0) {
    rows.push(
      createLayerRow(input, {
        status: "review",
        category: "transition",
        label: "Instant transition has duration",
        detail:
          "The presentation route ignores animation timing for instant transitions, so the handoff should not carry stale duration metadata.",
        action: "set-duration",
        actionLabel: "Clear timing",
        routeEvidence: `Instant transition stores ${prototype.durationMs}ms.`,
      }),
    );
  }

  if (prototype.smartAnimate && prototype.durationMs < 150) {
    rows.push(
      createLayerRow(input, {
        status: "review",
        category: "transition",
        label: "Smart animate too fast",
        detail:
          "Smart animate metadata exists, but the duration is too short for a reviewer to verify the motion.",
        action: "set-duration",
        actionLabel: "Set duration",
        routeEvidence: `Smart animate is enabled at ${prototype.durationMs}ms.`,
      }),
    );
  }

  if (prototype.durationMs > 5000) {
    rows.push(
      createLayerRow(input, {
        status: "review",
        category: "transition",
        label: "Transition duration too long",
        detail:
          "Very long transitions slow down shared presentation review and usually indicate stale timing metadata.",
        action: "set-duration",
        actionLabel: "Set duration",
        routeEvidence: `${prototype.durationMs}ms exceeds the editor control max.`,
      }),
    );
  }

  return rows;
}

function getPresentationRouteRows(
  document: DesignDocument,
  preview: ReturnType<typeof getPrototypePreviewModel>,
) {
  const firstPage = document.pages[0];

  if (!firstPage) {
    return [
      createDetachedRouteRow({
        status: "blocked",
        label: "No pages for presentation",
        detail:
          "The shared prototype route cannot render a preview because this document has no pages.",
        routeEvidence: "Preview model has no page entries.",
      }),
    ];
  }

  if (preview.pages.length !== document.pages.length) {
    return [
      createPageRow(firstPage, {
        status: "blocked",
        category: "presentation-route",
        label: "Preview page export mismatch",
        detail:
          "The shared prototype route model does not include every design page.",
        action: "select",
        actionLabel: "Review",
        routeEvidence: `${preview.pages.length} preview pages for ${document.pages.length} design pages.`,
      }),
    ];
  }

  return [
    createPageRow(firstPage, {
      status: "ready",
      category: "presentation-route",
      label: "Presentation route evidence ready",
      detail:
        "The shared prototype route can build a preview model for each page and has a deterministic start-page fallback.",
      action: "select",
      actionLabel: "Review",
      routeEvidence: `/share/[token]/prototype renders ${preview.pages.length} pages from start ${preview.startPageId}.`,
    }),
  ];
}

type LayerRowInput = {
  document: DesignDocument;
  page: DesignPage;
  layer: DesignLayer;
  targetPage?: DesignPage;
  previewHotspot?:
    | ReturnType<typeof getPrototypePreviewModel>["pages"][number]["hotspots"][number]
    | undefined;
};

function createLayerRow(
  input: LayerRowInput,
  row: Pick<
    PrototypeInteractionInspectorRow,
    | "status"
    | "category"
    | "label"
    | "detail"
    | "action"
    | "actionLabel"
    | "routeEvidence"
  >,
): PrototypeInteractionInspectorRow {
  const prototype = input.layer.prototype;
  const scrollBehavior =
    prototype?.scrollBehavior ?? (prototype?.preserveScroll ? "preserve" : "reset");

  return {
    id: `${input.page.id}:${input.layer.id}:${row.category}:${row.action}`,
    status: row.status,
    category: row.category,
    label: row.label,
    detail: row.detail,
    action: row.action,
    actionLabel: row.actionLabel,
    pageId: input.page.id,
    pageName: input.page.name,
    layerId: input.layer.id,
    layerName: input.layer.name,
    layerIds: [input.layer.id],
    targetPageId: prototype?.targetPageId,
    targetPageName:
      input.targetPage?.name ??
      (prototype?.targetPageId ? "Unknown page" : undefined),
    targetExists: Boolean(input.targetPage),
    trigger: prototype?.trigger ?? "none",
    prototypeAction: prototype?.action ?? "navigate",
    transition: prototype?.transition ?? "none",
    durationMs: prototype?.durationMs ?? 0,
    scrollBehavior: scrollBehavior ?? "none",
    overlayPosition: prototype?.overlayPosition ?? "center",
    deviceFrame: prototype?.deviceFrame ?? "none",
    routeEvidence: row.routeEvidence,
    repairable:
      row.action !== "select" && row.action !== "set-start",
  };
}

function createPageRow(
  page: DesignPage,
  row: Pick<
    PrototypeInteractionInspectorRow,
    | "status"
    | "category"
    | "label"
    | "detail"
    | "action"
    | "actionLabel"
    | "routeEvidence"
  >,
): PrototypeInteractionInspectorRow {
  return {
    id: `${page.id}:${row.category}:${row.action}`,
    status: row.status,
    category: row.category,
    label: row.label,
    detail: row.detail,
    action: row.action,
    actionLabel: row.actionLabel,
    pageId: page.id,
    pageName: page.name,
    layerIds: [],
    targetExists: true,
    trigger: "none",
    prototypeAction: "none",
    transition: "none",
    durationMs: 0,
    scrollBehavior: "none",
    overlayPosition: "none",
    deviceFrame: "none",
    routeEvidence: row.routeEvidence,
    repairable: row.action === "set-start",
  };
}

function createDetachedRouteRow({
  status,
  label,
  detail,
  routeEvidence,
}: {
  status: PrototypeInteractionInspectorRow["status"];
  label: string;
  detail: string;
  routeEvidence: string;
}): PrototypeInteractionInspectorRow {
  return {
    id: "presentation-route:empty",
    status,
    category: "presentation-route",
    label,
    detail,
    action: "select",
    actionLabel: "Review",
    pageId: "",
    pageName: "Document",
    layerIds: [],
    targetExists: false,
    trigger: "none",
    prototypeAction: "none",
    transition: "none",
    durationMs: 0,
    scrollBehavior: "none",
    overlayPosition: "none",
    deviceFrame: "none",
    routeEvidence,
    repairable: false,
  };
}

function getRecommendedStartPageId(
  document: DesignDocument,
  flow: ReturnType<typeof getPrototypeFlowDiagnostics>,
) {
  if (flow.startPageCount === 1) {
    return document.pages.find((page) => page.prototypeStart)?.id ?? null;
  }

  return (
    flow.pages.find((page) => page.prototypeStart && page.outgoingCount > 0)
      ?.pageId ??
    flow.pages.find((page) => page.outgoingCount > 0 && page.incomingCount === 0)
      ?.pageId ??
    flow.pages.find((page) => page.outgoingCount > 0)?.pageId ??
    document.pages[0]?.id ??
    null
  );
}

function isHotspotOutsidePreview(
  hotspot: ReturnType<typeof getPrototypePreviewModel>["pages"][number]["hotspots"][number],
) {
  return (
    hotspot.left < 0 ||
    hotspot.top < 0 ||
    hotspot.width <= 0 ||
    hotspot.height <= 0 ||
    hotspot.left + hotspot.width > 100 ||
    hotspot.top + hotspot.height > 100
  );
}

function getInspectorScore(
  rows: PrototypeInteractionInspectorRow[],
  hotspotCount: number,
  pageCount: number,
) {
  if (hotspotCount === 0 && pageCount > 0) {
    return 100;
  }

  const denominator = Math.max(1, hotspotCount + pageCount);
  const penalty = rows.reduce((total, row) => {
    if (row.status === "blocked") {
      return total + 18;
    }

    if (row.status === "review") {
      return total + 7;
    }

    return total;
  }, 0);

  return Math.max(0, Math.round(100 - penalty / denominator));
}
