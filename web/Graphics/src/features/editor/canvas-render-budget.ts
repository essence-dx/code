import { createPageLayerIndex, type LayerIndexEntry } from "@/features/editor/layer-index";
import type { DesignLayer, DesignPage } from "@/features/editor/types";

export type CanvasRenderBudgetStatus = "ready" | "review" | "blocked";

export type CanvasRenderBudgetRow = {
  id: string;
  status: CanvasRenderBudgetStatus;
  label: string;
  detail: string;
  layerIds: string[];
  metric: number;
  recommendation: string;
};

export type CanvasRenderBudgetTelemetry = {
  score: number;
  status: CanvasRenderBudgetStatus;
  pageId: string;
  pageName: string;
  visibleLayerCount: number;
  selectableLayerCount: number;
  effectLayerCount: number;
  compositedLayerCount: number;
  maskedLayerCount: number;
  imageLayerCount: number;
  vectorLayerCount: number;
  vectorCommandCount: number;
  largeLayerCount: number;
  totalVisibleArea: number;
  estimatedRenderCost: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: CanvasRenderBudgetRow[];
};

const reviewVisibleLayerCount = 120;
const blockedVisibleLayerCount = 260;
const reviewEffectLayerCount = 8;
const blockedEffectLayerCount = 20;
const reviewCompositedLayerCount = 10;
const blockedCompositedLayerCount = 30;
const reviewVectorCommandCount = 500;
const blockedVectorCommandCount = 1500;
const reviewLargeLayerCount = 4;
const blockedLargeLayerCount = 12;
const reviewLargeLayerArea = 1_000_000;
const reviewRenderCost = 180;
const blockedRenderCost = 360;

export function getCanvasRenderBudgetTelemetry(
  page: DesignPage,
): CanvasRenderBudgetTelemetry {
  const index = createPageLayerIndex(page);
  const visibleEntries = index.visibleLayerIds
    .map((layerId) => index.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => Boolean(entry));
  const effectEntries = visibleEntries.filter((entry) =>
    hasExpensiveEffect(entry.layer),
  );
  const compositedEntries = visibleEntries.filter((entry) =>
    hasCompositingCost(entry.layer),
  );
  const maskedEntries = visibleEntries.filter((entry) => Boolean(entry.layer.mask));
  const imageEntries = visibleEntries.filter((entry) => entry.type === "image");
  const vectorEntries = visibleEntries.filter((entry) => entry.type === "path");
  const largeEntries = visibleEntries.filter(
    (entry) => entry.bounds.area >= reviewLargeLayerArea,
  );
  const vectorCommandCount = vectorEntries.reduce(
    (total, entry) => total + getPathCommandCount(entry.layer),
    0,
  );
  const totalVisibleArea = visibleEntries.reduce(
    (total, entry) => total + entry.bounds.area,
    0,
  );
  const estimatedRenderCost = getEstimatedRenderCost({
    visibleEntries,
    effectEntries,
    compositedEntries,
    maskedEntries,
    imageEntries,
    vectorCommandCount,
    largeEntries,
  });
  const rows: CanvasRenderBudgetRow[] = [
    ...getVisibleLayerRows(index.pageName, visibleEntries),
    ...getRenderCostRows(estimatedRenderCost),
    ...getEffectRows(effectEntries),
    ...getCompositingRows(compositedEntries, maskedEntries),
    ...getVectorRows(vectorCommandCount, vectorEntries),
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
    pageId: page.id,
    pageName: page.name,
    visibleLayerCount: visibleEntries.length,
    selectableLayerCount: index.selectableLayerIds.length,
    effectLayerCount: effectEntries.length,
    compositedLayerCount: compositedEntries.length,
    maskedLayerCount: maskedEntries.length,
    imageLayerCount: imageEntries.length,
    vectorLayerCount: vectorEntries.length,
    vectorCommandCount,
    largeLayerCount: largeEntries.length,
    totalVisibleArea,
    estimatedRenderCost,
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "canvas-render-budget-ready",
              status: "ready",
              label: "Canvas render budget ready",
              detail:
                "The active page is within visible layer, compositing, vector, and effect budgets.",
              layerIds: [],
              metric: estimatedRenderCost,
              recommendation:
                "Keep this page inside budget before adding heavier interactions or visual baselines.",
            } satisfies CanvasRenderBudgetRow,
          ],
  };
}

export function getCanvasRenderBudgetCsv(
  report: CanvasRenderBudgetTelemetry,
  rows: CanvasRenderBudgetRow[] = report.rows,
) {
  const header: Array<keyof CanvasRenderBudgetRow> = [
    "id",
    "status",
    "label",
    "detail",
    "layerIds",
    "metric",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "page",
      "visible_layers",
      "selectable_layers",
      "effect_layers",
      "composited_layers",
      "masked_layers",
      "image_layers",
      "vector_layers",
      "vector_commands",
      "large_layers",
      "total_visible_area",
      "estimated_render_cost",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageName,
      report.visibleLayerCount,
      report.selectableLayerCount,
      report.effectLayerCount,
      report.compositedLayerCount,
      report.maskedLayerCount,
      report.imageLayerCount,
      report.vectorLayerCount,
      report.vectorCommandCount,
      report.largeLayerCount,
      report.totalVisibleArea,
      report.estimatedRenderCost,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getCanvasRenderBudgetMarkdown(
  report: CanvasRenderBudgetTelemetry,
  rows: CanvasRenderBudgetRow[] = report.rows,
) {
  return [
    "# Canvas Render Budget",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Page: ${report.pageName}`,
    `Visible layers: ${report.visibleLayerCount}`,
    `Effect layers: ${report.effectLayerCount}`,
    `Composited layers: ${report.compositedLayerCount}`,
    `Masked layers: ${report.maskedLayerCount}`,
    `Vector commands: ${report.vectorCommandCount}`,
    `Large layers: ${report.largeLayerCount}`,
    `Estimated render cost: ${report.estimatedRenderCost}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No canvas render budget rows."]),
  ].join("\n");
}

function getVisibleLayerRows(
  pageName: string,
  visibleEntries: LayerIndexEntry[],
) {
  if (visibleEntries.length < reviewVisibleLayerCount) {
    return [];
  }

  return [
    {
      id: "visible-layer-render-budget",
      status:
        visibleEntries.length >= blockedVisibleLayerCount ? "blocked" : "review",
      label: "Visible layer budget",
      detail: `${pageName} has ${visibleEntries.length} visible layers in the render stack.`,
      layerIds: visibleEntries.slice(0, 48).map((entry) => entry.layerId),
      metric: visibleEntries.length,
      recommendation:
        "Hide inactive layers, split dense explorations, or move static artwork into optimized images before capture.",
    } satisfies CanvasRenderBudgetRow,
  ];
}

function getRenderCostRows(estimatedRenderCost: number) {
  if (estimatedRenderCost < reviewRenderCost) {
    return [];
  }

  return [
    {
      id: "estimated-render-cost",
      status:
        estimatedRenderCost >= blockedRenderCost ? "blocked" : "review",
      label: "Estimated render cost",
      detail: `The active page has an estimated render cost of ${estimatedRenderCost}.`,
      layerIds: [],
      metric: estimatedRenderCost,
      recommendation:
        "Review compositing, vectors, images, and large bounds before adding more canvas overlays.",
    } satisfies CanvasRenderBudgetRow,
  ];
}

function getEffectRows(effectEntries: LayerIndexEntry[]) {
  if (effectEntries.length < reviewEffectLayerCount) {
    return [];
  }

  return [
    {
      id: "effect-render-budget",
      status:
        effectEntries.length >= blockedEffectLayerCount ? "blocked" : "review",
      label: "Effect render budget",
      detail: `${effectEntries.length} visible layers use blur, shadow, or background blur effects.`,
      layerIds: effectEntries.map((entry) => entry.layerId),
      metric: effectEntries.length,
      recommendation:
        "Reduce live blur and shadow layers before mobile screenshots or high-scale exports.",
    } satisfies CanvasRenderBudgetRow,
  ];
}

function getCompositingRows(
  compositedEntries: LayerIndexEntry[],
  maskedEntries: LayerIndexEntry[],
) {
  const layerIds = Array.from(
    new Set([
      ...compositedEntries.map((entry) => entry.layerId),
      ...maskedEntries.map((entry) => entry.layerId),
    ]),
  );

  if (layerIds.length < reviewCompositedLayerCount) {
    return [];
  }

  return [
    {
      id: "compositing-render-budget",
      status:
        layerIds.length >= blockedCompositedLayerCount ? "blocked" : "review",
      label: "Compositing budget",
      detail: `${layerIds.length} visible layers use blend modes or masks that require compositing.`,
      layerIds,
      metric: layerIds.length,
      recommendation:
        "Flatten decorative blended or masked artwork once the design direction is stable.",
    } satisfies CanvasRenderBudgetRow,
  ];
}

function getVectorRows(
  vectorCommandCount: number,
  vectorEntries: LayerIndexEntry[],
) {
  if (vectorCommandCount < reviewVectorCommandCount) {
    return [];
  }

  return [
    {
      id: "vector-render-budget",
      status:
        vectorCommandCount >= blockedVectorCommandCount ? "blocked" : "review",
      label: "Vector render budget",
      detail: `${vectorCommandCount} SVG path commands are visible on the active page.`,
      layerIds: vectorEntries.map((entry) => entry.layerId),
      metric: vectorCommandCount,
      recommendation:
        "Simplify dense vectors or convert static decorative paths into optimized assets.",
    } satisfies CanvasRenderBudgetRow,
  ];
}

function getLargeLayerRows(largeEntries: LayerIndexEntry[]) {
  if (largeEntries.length < reviewLargeLayerCount) {
    return [];
  }

  return [
    {
      id: "large-layer-render-budget",
      status:
        largeEntries.length >= blockedLargeLayerCount ? "blocked" : "review",
      label: "Large bounds render budget",
      detail: `${largeEntries.length} visible layers have very large page-space bounds.`,
      layerIds: largeEntries.map((entry) => entry.layerId),
      metric: largeEntries.length,
      recommendation:
        "Resize oversized layer bounds so pointer math, snapshots, and exports stay predictable.",
    } satisfies CanvasRenderBudgetRow,
  ];
}

function getEstimatedRenderCost(input: {
  visibleEntries: LayerIndexEntry[];
  effectEntries: LayerIndexEntry[];
  compositedEntries: LayerIndexEntry[];
  maskedEntries: LayerIndexEntry[];
  imageEntries: LayerIndexEntry[];
  vectorCommandCount: number;
  largeEntries: LayerIndexEntry[];
}) {
  return Math.round(
    input.visibleEntries.length +
      input.effectEntries.length * 8 +
      input.compositedEntries.length * 4 +
      input.maskedEntries.length * 3 +
      input.imageEntries.length * 3 +
      input.largeEntries.length * 5 +
      input.vectorCommandCount / 20,
  );
}

function hasExpensiveEffect(layer: DesignLayer) {
  return Boolean(
    layer.effectsVisible !== false &&
      ((layer.shadowEnabled && (layer.shadowBlur ?? 0) > 0) ||
        (layer.layerBlur ?? 0) > 0 ||
        (layer.backgroundBlur ?? 0) > 0),
  );
}

function hasCompositingCost(layer: DesignLayer) {
  return Boolean(
    (layer.blendMode && layer.blendMode !== "normal") ||
      (layer.fillPaints ?? []).some(
        (paint) =>
          paint.visible &&
          paint.opacity > 0 &&
          paint.blendMode &&
          paint.blendMode !== "normal",
      ),
  );
}

function getPathCommandCount(layer: DesignLayer) {
  return layer.pathData?.match(/[a-z]/gi)?.length ?? 0;
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
