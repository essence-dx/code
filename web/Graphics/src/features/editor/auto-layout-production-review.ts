import {
  createAutoLayoutLayerPatches,
  getLayerSizing,
} from "@/features/editor/auto-layout";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getFrameLayoutReview,
  type FrameLayoutReviewRow,
} from "@/features/editor/frame-layout-review";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";
import {
  autoLayoutProductionStatusRank,
  type AutoLayoutProductionReviewReport,
  type AutoLayoutProductionReviewRow,
} from "@/features/editor/auto-layout-production-review-types";

export function getAutoLayoutProductionReview(
  document: DesignDocument,
): AutoLayoutProductionReviewReport {
  const rows = document.pages
    .flatMap((page) => getPageAutoLayoutProductionRows(page))
    .sort((left, right) => {
      if (left.status !== right.status) {
        return (
          autoLayoutProductionStatusRank[left.status] -
          autoLayoutProductionStatusRank[right.status]
        );
      }

      if (left.pageName !== right.pageName) {
        return left.pageName.localeCompare(right.pageName);
      }

      if (left.frameName !== right.frameName) {
        return left.frameName.localeCompare(right.frameName);
      }

      return left.category.localeCompare(right.category);
    });
  const frameCount = document.pages.reduce(
    (total, page) =>
      total + page.layers.filter((layer) => layer.type === "frame").length,
    0,
  );
  const autoLayoutFrameCount = document.pages.reduce(
    (total, page) =>
      total +
      page.layers.filter(
        (layer) => layer.type === "frame" && Boolean(layer.autoLayout),
      ).length,
    0,
  );

  return {
    score: getReviewScore(rows, frameCount),
    pageCount: document.pages.length,
    frameCount,
    readyCount: rows.filter((row) => row.status === "ready").length,
    reviewCount: rows.filter((row) => row.status === "review").length,
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    repairableCount: rows.filter((row) => row.repairable).length,
    autoLayoutFrameCount,
    manualFrameCount: frameCount - autoLayoutFrameCount,
    wrapFrameCount: document.pages.reduce(
      (total, page) =>
        total +
        page.layers.filter(
          (layer) =>
            layer.type === "frame" && layer.autoLayout?.wrap === "wrap",
        ).length,
      0,
    ),
    gridFrameCount: document.pages.reduce(
      (total, page) =>
        total +
        page.layers.filter(
          (layer) =>
            layer.type === "frame" && (layer.layoutGrids?.length ?? 0) > 0,
        ).length,
      0,
    ),
    hiddenGridCount: rows.reduce((total, row) => total + row.hiddenGridCount, 0),
    nestedAutoLayoutCount: rows.filter(
      (row) => row.category === "nested" || row.nestedAutoLayoutCount > 0,
    ).length,
    migrationCount: rows.filter((row) => row.action === "migrate").length,
    regressionEvidenceCount: rows.filter(
      (row) => row.regressionPatchCount > 0,
    ).length,
    rows,
  };
}

function getPageAutoLayoutProductionRows(
  page: DesignPage,
): AutoLayoutProductionReviewRow[] {
  const frameReview = getFrameLayoutReview(page);
  const reviewByFrameId = new Map(
    frameReview.rows.map((row) => [row.frameId, row]),
  );

  return page.layers
    .filter((layer) => layer.type === "frame")
    .flatMap((frame) =>
      getFrameAutoLayoutProductionRows(
        page,
        frame,
        reviewByFrameId.get(frame.id),
      ),
    );
}

function getFrameAutoLayoutProductionRows(
  page: DesignPage,
  frame: DesignLayer,
  reviewRow?: FrameLayoutReviewRow,
): AutoLayoutProductionReviewRow[] {
  const base = getFrameFacts(page, frame, reviewRow);
  const rows: AutoLayoutProductionReviewRow[] = [];

  if (base.containedUnowned.length > 0) {
    rows.push(
      createReviewRow(base, {
        status: "blocked",
        category: "ownership",
        label: "Adopt contained layers",
        detail:
          "Visible unlocked layers sit inside this frame but are not owned by it, so auto layout cannot produce reliable handoff.",
        action: "adopt",
        actionLabel: "Adopt",
        layerIds: [frame.id, ...base.containedUnowned.map((layer) => layer.id)],
      }),
    );
  }

  if (base.overflowChildren.length > 0) {
    rows.push(
      createReviewRow(base, {
        status: "blocked",
        category: "ownership",
        label: "Resolve overflowing children",
        detail:
          "Owned layout children overflow this frame; resize, reparent, clip intentionally, or mark decorative children absolute before handoff.",
        action: "select",
        actionLabel: "Select",
        layerIds: [frame.id, ...base.overflowChildren.map((layer) => layer.id)],
      }),
    );
  }

  if (isMigrationCandidate(base)) {
    rows.push(
      createReviewRow(base, {
        status: "review",
        category: "migration",
        label: "Migrate manual frame",
        detail:
          "This multi-child manual frame can be converted to inferred auto layout with stable gap, padding, and alignment metadata.",
        action: "migrate",
        actionLabel: "Migrate",
        layerIds: [frame.id, ...base.layoutChildren.map((layer) => layer.id)],
      }),
    );
  }

  if (shouldRecommendWrap(base)) {
    rows.push(
      createReviewRow(base, {
        status: "review",
        category: "wrap",
        label: "Enable wrap",
        detail:
          "Dense horizontal children exceed the available production width. Enable wrap so responsive previews can form additional lines.",
        action: "enable-wrap",
        actionLabel: "Wrap",
        layerIds: [frame.id],
      }),
    );
  }

  if (base.frame.autoLayout?.wrap === "wrap" && base.visibleGridCount === 0) {
    rows.push(
      createReviewRow(base, {
        status: "review",
        category: "grid",
        label: base.gridCount > 0 ? "Show layout grid" : "Add layout grid",
        detail:
          "Wrapped frames need visible column or grid evidence so developers can validate responsive line breaks and margins.",
        action: base.gridCount > 0 ? "show-grid" : "add-grid",
        actionLabel: base.gridCount > 0 ? "Show grid" : "Add grid",
        layerIds: [frame.id],
      }),
    );
  }

  if (base.nestedAutoLayoutCount > 0 && base.frameSizing === "fixed / fixed") {
    rows.push(
      createReviewRow(base, {
        status: "review",
        category: "nested",
        label: "Review nested responsiveness",
        detail:
          "Nested auto-layout children are inside a fixed/fixed parent. Review hug/fill sizing before shipping responsive handoff.",
        action: "select",
        actionLabel: "Select",
        layerIds: [
          frame.id,
          ...base.nestedAutoLayoutFrames.map((layer) => layer.id),
        ],
      }),
    );
  }

  if (base.regressionPatchCount > 0) {
    rows.push(
      createReviewRow(base, {
        status: "review",
        category: "regression",
        label: "Review layout regression",
        detail:
          "Generated auto-layout positions differ from stored child bounds. Apply layout only after confirming the visual change is intended.",
        action: "apply-layout",
        actionLabel: "Apply",
        layerIds: [
          frame.id,
          ...base.regressionPatches.map((patch) => patch.layerId),
        ],
      }),
    );
  }

  if (rows.length === 0) {
    rows.push(
      createReviewRow(base, {
        status: "ready",
        category: "ready",
        label: "Responsive layout ready",
        detail:
          base.frame.autoLayout && base.visibleGridCount > 0
            ? "Auto layout, visible grid evidence, ownership, and generated positions are ready for production handoff."
            : base.frame.autoLayout
              ? "Auto layout ownership and generated positions are ready for production handoff."
              : "Single-child manual frame has stable ownership for production handoff.",
        action: "select",
        actionLabel: "Select",
        layerIds: [frame.id],
      }),
    );
  }

  return rows;
}

type FrameFacts = {
  page: DesignPage;
  frame: DesignLayer;
  layoutChildren: DesignLayer[];
  containedUnowned: DesignLayer[];
  overflowChildren: DesignLayer[];
  nestedAutoLayoutFrames: DesignLayer[];
  nestedAutoLayoutCount: number;
  nestedDepth: number;
  gridCount: number;
  visibleGridCount: number;
  hiddenGridCount: number;
  fillChildCount: number;
  hugChildCount: number;
  absoluteChildCount: number;
  frameSizing: string;
  responsiveScore: number;
  regressionPatches: LayerPatch[];
  regressionPatchCount: number;
  regressionEvidence: string;
  reviewRow?: FrameLayoutReviewRow;
};

function getFrameFacts(
  page: DesignPage,
  frame: DesignLayer,
  reviewRow?: FrameLayoutReviewRow,
): FrameFacts {
  const ownedChildren = page.layers.filter((layer) => layer.parentId === frame.id);
  const layoutChildren = ownedChildren.filter(
    (layer) => !layer.absolutePositioned,
  );
  const containedUnowned = page.layers.filter(
    (layer) =>
      layer.parentId !== frame.id &&
      isFrameChildCandidate(frame, layer) &&
      isInsideFrame(frame, layer),
  );
  const overflowChildren = layoutChildren.filter(
    (layer) => !isInsideFrame(frame, layer),
  );
  const nestedAutoLayoutFrames = getNestedAutoLayoutFrames(frame, page.layers);
  const frameSizing = getSizingLabel(frame);
  const gridCount = frame.layoutGrids?.length ?? 0;
  const visibleGridCount =
    frame.layoutGrids?.filter((grid) => grid.visible).length ?? 0;
  const regressionPatches = frame.autoLayout
    ? getChangedLayerPatches(
        createAutoLayoutLayerPatches(frame, page.layers),
        new Map(page.layers.map((layer) => [layer.id, layer])),
      )
    : [];
  const facts: FrameFacts = {
    page,
    frame,
    layoutChildren,
    containedUnowned,
    overflowChildren,
    nestedAutoLayoutFrames,
    nestedAutoLayoutCount: nestedAutoLayoutFrames.length,
    nestedDepth: getNestedAutoLayoutDepth(frame, page.layers),
    gridCount,
    visibleGridCount,
    hiddenGridCount: gridCount - visibleGridCount,
    fillChildCount:
      reviewRow?.fillChildCount ??
      layoutChildren.filter((layer) => hasSizingMode(layer, "fill")).length,
    hugChildCount:
      reviewRow?.hugChildCount ??
      layoutChildren.filter((layer) => hasSizingMode(layer, "hug")).length,
    absoluteChildCount:
      reviewRow?.absoluteChildCount ??
      ownedChildren.length - layoutChildren.length,
    frameSizing,
    responsiveScore: 100,
    regressionPatches,
    regressionPatchCount: regressionPatches.length,
    regressionEvidence:
      regressionPatches.length > 0
        ? `${regressionPatches.length} generated layout patch${
            regressionPatches.length === 1 ? "" : "es"
          } would change stored bounds.`
        : "Generated auto-layout positions match stored child bounds.",
    reviewRow,
  };

  return {
    ...facts,
    responsiveScore: getResponsiveScore(facts),
  };
}

function createReviewRow(
  facts: FrameFacts,
  row: Pick<
    AutoLayoutProductionReviewRow,
    | "status"
    | "category"
    | "label"
    | "detail"
    | "action"
    | "actionLabel"
    | "layerIds"
  >,
): AutoLayoutProductionReviewRow {
  return {
    id: `${facts.page.id}:${facts.frame.id}:${row.category}:${row.action}`,
    pageId: facts.page.id,
    pageName: facts.page.name,
    frameId: facts.frame.id,
    frameName: facts.frame.name,
    status: row.status,
    category: row.category,
    label: row.label,
    detail: row.detail,
    action: row.action,
    actionLabel: row.actionLabel,
    layerIds: Array.from(new Set(row.layerIds)),
    mode: facts.frame.autoLayout?.mode ?? "manual",
    wrap: facts.frame.autoLayout?.wrap ?? (facts.frame.autoLayout ? "nowrap" : "manual"),
    childCount: facts.layoutChildren.length,
    containedUnownedCount: facts.containedUnowned.length,
    overflowCount: facts.overflowChildren.length,
    fillChildCount: facts.fillChildCount,
    hugChildCount: facts.hugChildCount,
    absoluteChildCount: facts.absoluteChildCount,
    gridCount: facts.gridCount,
    visibleGridCount: facts.visibleGridCount,
    hiddenGridCount: facts.hiddenGridCount,
    nestedAutoLayoutCount: facts.nestedAutoLayoutCount,
    nestedDepth: facts.nestedDepth,
    frameSizing: facts.frameSizing,
    responsiveScore: facts.responsiveScore,
    regressionPatchCount: facts.regressionPatchCount,
    regressionEvidence: facts.regressionEvidence,
    repairable: row.action !== "select",
  };
}

function shouldRecommendWrap(facts: FrameFacts) {
  const layout = facts.frame.autoLayout;

  if (!layout || layout.mode !== "horizontal" || layout.wrap === "wrap") {
    return false;
  }

  if (facts.layoutChildren.length < 4) {
    return false;
  }

  return (
    facts.layoutChildren.length >= 6 ||
    getHorizontalChildrenFootprint(facts.layoutChildren, layout.gap) >
      Math.max(1, facts.frame.width - layout.paddingX * 2)
  );
}

function isMigrationCandidate(facts: FrameFacts) {
  return (
    !facts.frame.autoLayout &&
    facts.layoutChildren.length > 1 &&
    facts.containedUnowned.length === 0 &&
    facts.overflowChildren.length === 0
  );
}

function getResponsiveScore(facts: FrameFacts) {
  let score = 100;

  if (facts.containedUnowned.length > 0) {
    score -= 28;
  }

  if (facts.overflowChildren.length > 0) {
    score -= 24;
  }

  if (isMigrationCandidate(facts)) {
    score -= 16;
  }

  if (shouldRecommendWrap(facts)) {
    score -= 12;
  }

  if (facts.frame.autoLayout?.wrap === "wrap" && facts.visibleGridCount === 0) {
    score -= 10;
  }

  if (facts.nestedAutoLayoutCount > 0 && facts.frameSizing === "fixed / fixed") {
    score -= 10;
  }

  if (facts.regressionPatchCount > 0) {
    score -= Math.min(16, 4 + facts.regressionPatchCount * 2);
  }

  return Math.max(0, score);
}

function getReviewScore(rows: AutoLayoutProductionReviewRow[], frameCount: number) {
  if (frameCount === 0) {
    return 100;
  }

  const penalty = rows.reduce((total, row) => {
    if (row.status === "blocked") {
      return total + 18;
    }

    if (row.status === "review") {
      return total + 8;
    }

    return total;
  }, 0);

  return Math.max(0, Math.round(100 - penalty / Math.max(1, frameCount)));
}

function getChangedLayerPatches(
  patches: LayerPatch[],
  layerById: Map<string, DesignLayer>,
): LayerPatch[] {
  return patches.filter(({ layerId, patch }) => {
    const layer = layerById.get(layerId);

    if (!layer) {
      return false;
    }

    return Object.entries(patch).some(([key, value]) => {
      const currentValue = layer[key as keyof DesignLayer];

      return currentValue !== value;
    });
  });
}

function getHorizontalChildrenFootprint(children: DesignLayer[], gap: number) {
  return (
    children.reduce((total, child) => total + child.width, 0) +
    Math.max(0, children.length - 1) * gap
  );
}

function getNestedAutoLayoutFrames(frame: DesignLayer, layers: DesignLayer[]) {
  const descendants = getDescendants(frame.id, layers);

  return descendants.filter(
    (layer) => layer.type === "frame" && Boolean(layer.autoLayout),
  );
}

function getNestedAutoLayoutDepth(
  frame: DesignLayer,
  layers: DesignLayer[],
): number {
  const children = layers.filter((layer) => layer.parentId === frame.id);

  if (children.length === 0) {
    return 0;
  }

  return children.reduce((maxDepth, child) => {
    const childDepth: number =
      child.type === "frame" && child.autoLayout
        ? 1 + getNestedAutoLayoutDepth(child, layers)
        : getNestedAutoLayoutDepth(child, layers);

    return Math.max(maxDepth, childDepth);
  }, 0);
}

function getDescendants(parentId: string, layers: DesignLayer[]) {
  const descendants: DesignLayer[] = [];
  const pending = layers.filter((layer) => layer.parentId === parentId);

  while (pending.length > 0) {
    const layer = pending.shift();

    if (!layer) {
      continue;
    }

    descendants.push(layer);
    pending.push(...layers.filter((child) => child.parentId === layer.id));
  }

  return descendants;
}

function hasSizingMode(layer: DesignLayer, mode: "fixed" | "hug" | "fill") {
  const sizing = getLayerSizing(layer);

  return sizing.horizontal === mode || sizing.vertical === mode;
}

function getSizingLabel(layer: DesignLayer) {
  const sizing = getLayerSizing(layer);

  return `${sizing.horizontal} / ${sizing.vertical}`;
}

function isFrameChildCandidate(frame: DesignLayer, layer: DesignLayer) {
  return layer.id !== frame.id && layer.visible && !layer.locked;
}

function isInsideFrame(frame: DesignLayer, layer: DesignLayer) {
  return (
    layer.x >= frame.x &&
    layer.y >= frame.y &&
    layer.x + layer.width <= frame.x + frame.width &&
    layer.y + layer.height <= frame.y + frame.height
  );
}
