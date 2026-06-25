import {
  createFrameResizeConstraintPatches,
  getConstraintsSignature,
  getLayerConstraints,
} from "@/features/editor/constraints";
import { getLayoutGridSignature } from "@/features/editor/layout-grids";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";
import {
  applyRectPatch,
  getConstraintLabel,
  getNextFrameRect,
  getResponsiveConstraints,
  isDefaultConstraintPair,
  isInsideRect,
  resizePreviewScenarios,
} from "@/features/editor/responsive-constraints-review-utils";
import {
  responsiveConstraintsStatusRank,
  type ResponsiveConstraintsReviewReport,
  type ResponsiveConstraintsReviewRow,
} from "@/features/editor/responsive-constraints-review-types";

export function getResponsiveConstraintsReview(
  document: DesignDocument,
): ResponsiveConstraintsReviewReport {
  const rows = [
    ...document.pages.flatMap((page) => getPageRows(page)),
    ...getCrossPageRows(document.pages),
  ].sort((left, right) => {
    if (left.status !== right.status) {
      return (
        responsiveConstraintsStatusRank[left.status] -
        responsiveConstraintsStatusRank[right.status]
      );
    }

    if (left.pageName !== right.pageName) {
      return left.pageName.localeCompare(right.pageName);
    }

    return left.category.localeCompare(right.category);
  });
  const frameCount = document.pages.reduce(
    (total, page) =>
      total + page.layers.filter((layer) => layer.type === "frame").length,
    0,
  );
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 18 - reviewCount * 7);

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: document.pages.length,
    frameCount,
    simulatedFrameCount: rows.filter(
      (row) => row.category === "resize-simulation",
    ).length,
    resizeScenarioCount: resizePreviewScenarios.length,
    overflowCount: rows.reduce((total, row) => total + row.overflowCount, 0),
    unstableCount: rows.reduce((total, row) => total + row.unstableCount, 0),
    missingConstraintCount: rows.filter((row) => row.category === "constraints")
      .length,
    nestedFrameCount: rows.filter((row) => row.category === "nested").length,
    groupIssueCount: rows.filter((row) => row.category === "group").length,
    componentIssueCount: rows.filter((row) => row.category === "component")
      .length,
    maskIssueCount: rows.filter((row) => row.category === "mask").length,
    gridIssueCount: rows.filter((row) => row.category === "grid").length,
    crossPageIssueCount: rows.filter((row) => row.category === "cross-page")
      .length,
    repairableCount: rows.filter((row) => row.repairable).length,
    readyCount,
    reviewCount,
    blockedCount,
    rows: rows.length > 0 ? rows : [getReadyRow(document, score)],
  };
}

function getPageRows(page: DesignPage): ResponsiveConstraintsReviewRow[] {
  const frames = page.layers.filter((layer) => layer.type === "frame");

  return [
    ...frames.flatMap((frame) => getFrameRows(page, frame)),
    ...getGroupRows(page),
  ];
}

function getFrameRows(
  page: DesignPage,
  frame: DesignLayer,
): ResponsiveConstraintsReviewRow[] {
  const children = page.layers.filter((layer) => layer.parentId === frame.id);
  const layoutChildren = children.filter((layer) => !layer.absolutePositioned);
  const rows: ResponsiveConstraintsReviewRow[] = [];

  rows.push(...getResizeSimulationRows(page, frame, layoutChildren));
  rows.push(...getConstraintCandidateRows(page, frame, layoutChildren));
  rows.push(...getNestedFrameRows(page, frame, layoutChildren));
  rows.push(...getComponentRows(page, frame, layoutChildren));
  rows.push(...getMaskRows(page, frame, layoutChildren));
  rows.push(...getGridRows(page, frame, layoutChildren));

  if (rows.length === 0 && layoutChildren.length > 0) {
    rows.push(
      createRow(page, {
        frame,
        status: "ready",
        category: "ready",
        label: "Responsive constraints ready",
        detail:
          "Frame children have stable constraints across compact, wide, and tall resize previews.",
        layerIds: [frame.id],
        action: "select",
        actionLabel: "Select",
        metric: layoutChildren.length,
        previewLabel: "All previews",
        overflowCount: 0,
        unstableCount: 0,
        recommendation:
          "Keep resize preview exports attached to component or layout handoffs.",
      }),
    );
  }

  return rows;
}

function getResizeSimulationRows(
  page: DesignPage,
  frame: DesignLayer,
  children: DesignLayer[],
) {
  if (children.length === 0) {
    return [];
  }

  return resizePreviewScenarios.flatMap((scenario) => {
    const nextFrame = getNextFrameRect(frame, scenario);
    const patches = createFrameResizeConstraintPatches({
      frame,
      nextFrame,
      layers: page.layers,
    });
    const patchById = new Map(patches.map((patch) => [patch.layerId, patch.patch]));
    const simulated = children.map((layer) => ({
      layer,
      rect: applyRectPatch(layer, patchById.get(layer.id) ?? {}),
    }));
    const overflow = simulated.filter((item) => !isInsideRect(nextFrame, item.rect));
    const unstable = simulated.filter((item) => {
      const widthDelta = Math.abs(item.rect.width - item.layer.width);
      const heightDelta = Math.abs(item.rect.height - item.layer.height);

      return (
        item.rect.width < 8 ||
        item.rect.height < 8 ||
        widthDelta > Math.max(48, frame.width * 0.25) ||
        heightDelta > Math.max(48, frame.height * 0.25)
      );
    });

    if (overflow.length === 0 && unstable.length === 0) {
      return [];
    }

    return [
      createRow(page, {
        frame,
        status: overflow.length > 0 ? "blocked" : "review",
        category: "resize-simulation",
        label: "Resize preview drift",
        detail: `${scenario.label} produces ${overflow.length} overflowing and ${unstable.length} unstable child layers.`,
        layerIds: [frame.id, ...overflow.concat(unstable).map((item) => item.layer.id)],
        action: "set-stretch",
        actionLabel: "Constrain",
        metric: overflow.length + unstable.length,
        previewLabel: scenario.label,
        overflowCount: overflow.length,
        unstableCount: unstable.length,
        recommendation:
          "Apply responsive constraints to edge-aligned children before handoff or component publishing.",
      }),
    ];
  });
}

function getConstraintCandidateRows(
  page: DesignPage,
  frame: DesignLayer,
  children: DesignLayer[],
) {
  const candidates = children.filter((layer) => {
    const current = getLayerConstraints(layer);
    const next = getResponsiveConstraints(frame, layer);

    return (
      isDefaultConstraintPair(layer) &&
      (current.horizontal !== next.horizontal || current.vertical !== next.vertical)
    );
  });

  if (candidates.length === 0) {
    return [];
  }

  return [
    createRow(page, {
      frame,
      status: candidates.length >= 8 ? "blocked" : "review",
      category: "constraints",
      label: "Constraint inference needed",
      detail: `${candidates.length} child layers still use default constraints despite responsive edge, center, scale, or stretch evidence.`,
      layerIds: candidates.map((layer) => layer.id),
      action: "set-stretch",
      actionLabel: "Constrain",
      metric: candidates.length,
      previewLabel: "Constraint map",
      overflowCount: 0,
      unstableCount: candidates.length,
      recommendation:
        "Infer constraints for edge-aligned and scalable children so resize previews match developer expectations.",
    }),
  ];
}

function getNestedFrameRows(
  page: DesignPage,
  frame: DesignLayer,
  children: DesignLayer[],
) {
  const nested = children.filter(
    (layer) =>
      layer.type === "frame" &&
      isDefaultConstraintPair(layer) &&
      layer.width / Math.max(1, frame.width) >= 0.45,
  );

  if (nested.length === 0) {
    return [];
  }

  return [
    createRow(page, {
      frame,
      status: "review",
      category: "nested",
      label: "Nested frame constraints",
      detail: `${nested.length} nested frames are large enough to need explicit responsive constraints.`,
      layerIds: [frame.id, ...nested.map((layer) => layer.id)],
      action: "set-stretch",
      actionLabel: "Constrain",
      metric: nested.length,
      previewLabel: "Nested frames",
      overflowCount: 0,
      unstableCount: nested.length,
      recommendation:
        "Set stretch or scale constraints on nested frames before relying on parent resize behavior.",
    }),
  ];
}

function getComponentRows(
  page: DesignPage,
  frame: DesignLayer,
  children: DesignLayer[],
) {
  const components = children.filter(
    (layer) => layer.componentId && isDefaultConstraintPair(layer),
  );

  if (components.length === 0) {
    return [];
  }

  return [
    createRow(page, {
      frame,
      status: "review",
      category: "component",
      label: "Component instance constraints",
      detail: `${components.length} component instance layers rely on default constraints inside a responsive frame.`,
      layerIds: components.map((layer) => layer.id),
      action: "set-stretch",
      actionLabel: "Constrain",
      metric: components.length,
      previewLabel: "Instances",
      overflowCount: 0,
      unstableCount: components.length,
      recommendation:
        "Stabilize component instance constraints before publishing variants or comparing cross-page handoffs.",
    }),
  ];
}

function getMaskRows(
  page: DesignPage,
  frame: DesignLayer,
  children: DesignLayer[],
) {
  const masks = children.filter((layer) => layer.mask || layer.maskSource);
  const riskyMasks = masks.filter((layer) => {
    const constraints = getLayerConstraints(layer);

    return (
      constraints.horizontal !== "scale" ||
      constraints.vertical !== "scale" ||
      !isInsideRect(frame, layer)
    );
  });

  if (riskyMasks.length === 0) {
    return [];
  }

  const overflowing = riskyMasks.filter((layer) => !isInsideRect(frame, layer));

  return [
    createRow(page, {
      frame,
      status: overflowing.length > 0 ? "blocked" : "review",
      category: "mask",
      label: "Mask resize behavior",
      detail: `${riskyMasks.length} mask-related layers need scale constraints or clipping review.`,
      layerIds: [frame.id, ...riskyMasks.map((layer) => layer.id)],
      action: overflowing.length > 0 ? "clip-frame" : "set-scale",
      actionLabel: overflowing.length > 0 ? "Clip" : "Scale",
      metric: riskyMasks.length,
      previewLabel: "Masks",
      overflowCount: overflowing.length,
      unstableCount: riskyMasks.length - overflowing.length,
      recommendation:
        "Scale mask layers with their frame and clip intentional overflow before responsive export.",
    }),
  ];
}

function getGridRows(
  page: DesignPage,
  frame: DesignLayer,
  children: DesignLayer[],
) {
  const shouldHaveGrid = frame.width >= 320 && children.length >= 3;
  const grids = frame.layoutGrids ?? [];
  const visibleGridCount = grids.filter((grid) => grid.visible).length;

  if (!shouldHaveGrid || visibleGridCount > 0) {
    return [];
  }

  return [
    createRow(page, {
      frame,
      status: "review",
      category: "grid",
      label: grids.length > 0 ? "Hidden responsive grid" : "Missing layout grid",
      detail:
        grids.length > 0
          ? "Responsive frame has layout grids, but all are hidden."
          : "Responsive frame has multiple children but no visible grid evidence.",
      layerIds: [frame.id],
      action: "show-grid",
      actionLabel: grids.length > 0 ? "Show grid" : "Add grid",
      metric: Math.max(1, grids.length),
      previewLabel: "Grid evidence",
      overflowCount: 0,
      unstableCount: 1,
      recommendation:
        "Attach visible grid evidence so developers can validate stretch, margin, and breakpoint behavior.",
    }),
  ];
}

function getGroupRows(page: DesignPage) {
  return (page.groups ?? []).flatMap((group) => {
    const layers = group.layerIds
      .map((layerId) => page.layers.find((layer) => layer.id === layerId))
      .filter((layer): layer is DesignLayer => Boolean(layer));
    const parentIds = new Set(layers.map((layer) => layer.parentId ?? "page"));

    if (layers.length < 2 || parentIds.size <= 1) {
      return [];
    }

    return [
      createRow(page, {
        status: "blocked",
        category: "group",
        label: "Group spans resize parents",
        detail: `${group.name} includes layers from ${parentIds.size} different resize scopes.`,
        layerIds: layers.map((layer) => layer.id),
        action: "select",
        actionLabel: "Select",
        metric: parentIds.size,
        previewLabel: "Group scope",
        overflowCount: parentIds.size - 1,
        unstableCount: layers.length,
        recommendation:
          "Keep grouped layers under one frame parent before relying on group moves, resizing, or component handoff.",
      }),
    ];
  });
}

function getCrossPageRows(pages: DesignPage[]) {
  const framesByName = new Map<string, Array<{ page: DesignPage; frame: DesignLayer }>>();

  for (const page of pages) {
    for (const frame of page.layers.filter((layer) => layer.type === "frame")) {
      const key = frame.name.trim().toLowerCase();

      if (!key) {
        continue;
      }

      framesByName.set(key, [...(framesByName.get(key) ?? []), { page, frame }]);
    }
  }

  return [...framesByName.entries()].flatMap(([name, entries]) => {
    if (entries.length < 2) {
      return [];
    }

    const signatures = new Set(
      entries.map(({ page, frame }) => getFrameHandoffSignature(page, frame)),
    );

    if (signatures.size <= 1) {
      return [];
    }

    return [
      createRow(entries[0].page, {
        status: signatures.size >= 3 ? "blocked" : "review",
        category: "cross-page",
        label: "Cross-page frame drift",
        detail: `${entries.length} frames named ${name} have ${signatures.size} different constraint, grid, or mode signatures.`,
        layerIds: entries.map((entry) => entry.frame.id),
        action: "select",
        actionLabel: "Review",
        metric: signatures.size,
        previewLabel: "Cross-page",
        overflowCount: 0,
        unstableCount: signatures.size,
        recommendation:
          "Align repeated frame grids, constraints, and layout modes before comparing handoff across pages.",
      }),
    ];
  });
}

function createRow(
  page: DesignPage,
  input: Omit<
    ResponsiveConstraintsReviewRow,
    | "id"
    | "pageId"
    | "pageName"
    | "frameId"
    | "frameName"
    | "layerNames"
    | "repairable"
  > & {
    frame?: DesignLayer;
  },
): ResponsiveConstraintsReviewRow {
  const { frame, ...rowInput } = input;
  const layerNames = input.layerIds
    .map((layerId) => page.layers.find((layer) => layer.id === layerId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    ...rowInput,
    id: `${page.id}:${frame?.id ?? "page"}:${input.category}:${input.label}`,
    pageId: page.id,
    pageName: page.name,
    frameId: frame?.id,
    frameName: frame?.name,
    layerIds: Array.from(new Set(input.layerIds)).slice(0, 40),
    layerNames: Array.from(new Set(layerNames)).slice(0, 12),
    repairable: input.action !== "select" && input.status !== "ready",
  };
}

function getFrameHandoffSignature(page: DesignPage, frame: DesignLayer) {
  const children = page.layers.filter((layer) => layer.parentId === frame.id);
  const childConstraints = children
    .map((layer) => `${layer.type}:${getConstraintsSignature(layer)}`)
    .sort()
    .join("|");

  return [
    frame.autoLayout?.mode ?? "manual",
    frame.autoLayout?.wrap ?? "manual",
    getConstraintLabel(frame),
    getLayoutGridSignature(frame.layoutGrids),
    childConstraints,
  ].join(";");
}

function getReadyRow(
  document: DesignDocument,
  score: number,
): ResponsiveConstraintsReviewRow {
  return {
    id: "responsive-constraints-ready",
    pageId: document.activePageId,
    pageName: "Document",
    status: "ready",
    category: "ready",
    label: "Responsive constraints ready",
    detail:
      "Resize previews, nested frames, groups, components, masks, grids, and cross-page signatures are stable.",
    layerIds: [],
    layerNames: [],
    action: "select",
    actionLabel: "No action",
    metric: score,
    previewLabel: "Document",
    overflowCount: 0,
    unstableCount: 0,
    recommendation:
      "Keep responsive constraint review exports attached to design-system release handoffs.",
    repairable: false,
  };
}
