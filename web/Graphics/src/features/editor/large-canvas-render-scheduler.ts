import { createPageLayerIndex, type LayerIndexEntry } from "@/features/editor/layer-index";
import {
  getLayerInteractionCost,
  getLayerRenderCost,
  intersectsBounds,
} from "@/features/editor/canvas-viewport-intelligence-cost";
import { getPageViewportFacts } from "@/features/editor/canvas-viewport-intelligence-model";
import {
  getCanvasInteractionProfilerReport,
  type CanvasInteractionProfilerStatus,
} from "@/features/editor/canvas-interaction-profiler";
import {
  getCanvasRenderBudgetTelemetry,
  type CanvasRenderBudgetStatus,
} from "@/features/editor/canvas-render-budget";
import type { DesignPage } from "@/features/editor/types";

export type LargeCanvasRenderSchedulerStatus = "ready" | "review" | "blocked";

export type LargeCanvasRenderSchedulerCategory =
  | "profiler-evidence"
  | "ready"
  | "selection-cache"
  | "vector-simplification"
  | "viewport-tile-queue";

export type LargeCanvasRenderQueue = {
  id: string;
  status: LargeCanvasRenderSchedulerStatus;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layerIds: string[];
  layerNames: string[];
  renderCost: number;
  interactionCost: number;
  schedulerAction: string;
};

export type LargeCanvasRenderSchedulerRow = {
  id: string;
  status: LargeCanvasRenderSchedulerStatus;
  category: LargeCanvasRenderSchedulerCategory;
  label: string;
  detail: string;
  layerIds: string[];
  metric: number;
  threshold: number;
  queueId?: string;
  schedulerAction: string;
  evidence: string;
};

export type LargeCanvasRenderSchedulerEvidence = {
  id: string;
  status: LargeCanvasRenderSchedulerStatus;
  label: string;
  metric: number;
  detail: string;
};

export type LargeCanvasRenderSchedulerReport = {
  generatedAt: string;
  score: number;
  status: LargeCanvasRenderSchedulerStatus;
  pageId: string;
  pageName: string;
  tileSize: number;
  visibleLayerCount: number;
  selectableLayerCount: number;
  selectedLayerCount: number;
  scheduledTileCount: number;
  hotTileCount: number;
  queuedLayerCount: number;
  selectionCacheInvalidationCount: number;
  vectorCommandCount: number;
  simplificationCandidateCount: number;
  profilerEvidenceCount: number;
  renderBudgetStatus: LargeCanvasRenderSchedulerStatus;
  interactionProfilerStatus: LargeCanvasRenderSchedulerStatus;
  viewportSafeModeThresholdCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: LargeCanvasRenderSchedulerRow[];
  queues: LargeCanvasRenderQueue[];
  profilerEvidence: LargeCanvasRenderSchedulerEvidence[];
};

type LargeCanvasRenderSchedulerInput = {
  page: DesignPage;
  selectedLayerIds?: string[];
  generatedAt?: string;
  tileSize?: number;
};

type TileBucket = {
  id: string;
  x: number;
  y: number;
  entries: LayerIndexEntry[];
};

type VectorCandidate = {
  entry: LayerIndexEntry;
  commandCount: number;
};

const defaultTileSize = 512;
const reviewTileLayerCount = 18;
const blockedTileLayerCount = 34;
const reviewTileRenderCost = 130;
const blockedTileRenderCost = 260;
const reviewSelectionInvalidationCount = 12;
const blockedSelectionInvalidationCount = 36;
const reviewVectorCommandCount = 28;
const blockedVectorCommandCount = 80;
const maxEvidenceLayerIds = 48;

export function getLargeCanvasRenderSchedulerReport({
  page,
  selectedLayerIds = [],
  generatedAt = new Date().toISOString(),
  tileSize = defaultTileSize,
}: LargeCanvasRenderSchedulerInput): LargeCanvasRenderSchedulerReport {
  const index = createPageLayerIndex(page);
  const facts = getPageViewportFacts(index);
  const selectedEntries = Array.from(new Set(selectedLayerIds))
    .map((layerId) => index.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => Boolean(entry));
  const queues = getRenderQueues(facts.visibleEntries, tileSize);
  const hotQueues = queues.filter((queue) => queue.status !== "ready");
  const selectionInvalidationLayerIds = getSelectionInvalidationLayerIds(
    facts.selectableEntries,
    selectedEntries,
  );
  const vectorCandidates = getVectorCandidates(facts.visibleEntries);
  const interactionProfiler = getCanvasInteractionProfilerReport({
    page,
    selectedLayerIds,
    generatedAt,
  });
  const renderBudget = getCanvasRenderBudgetTelemetry(page);
  const viewportStatus = getViewportStatus(facts.safeModeThresholdCount);
  const profilerEvidence = [
    {
      id: "interaction-profiler",
      status: interactionProfiler.status,
      label: "Interaction profiler",
      metric: interactionProfiler.panZoomFrameBudgetMs,
      detail: `${interactionProfiler.hitTestHotspotCount} hotspot(s), ${interactionProfiler.pointerReplayStepCount} replay step(s), and ${interactionProfiler.panZoomFrameBudgetMs}ms pan/zoom frame estimate.`,
    },
    {
      id: "render-budget",
      status: renderBudget.status,
      label: "Render budget",
      metric: renderBudget.estimatedRenderCost,
      detail: `${renderBudget.visibleLayerCount} visible layer(s), ${renderBudget.vectorCommandCount} vector command(s), and ${renderBudget.estimatedRenderCost} render-cost points.`,
    },
    {
      id: "viewport-intelligence",
      status: viewportStatus,
      label: "Viewport intelligence",
      metric: facts.safeModeThresholdCount,
      detail: `${facts.renderWindows.length} render window(s), ${facts.offscreenEntries.length} off-window layer(s), and ${facts.safeModeThresholdCount} safe-mode threshold(s).`,
    },
  ] satisfies LargeCanvasRenderSchedulerEvidence[];
  const rows = [
    ...getTileQueueRows(hotQueues),
    ...getSelectionCacheRows(selectionInvalidationLayerIds, selectedEntries),
    ...getVectorSimplificationRows(vectorCandidates),
    ...getProfilerEvidenceRows(profilerEvidence),
  ];
  const finalRows =
    rows.length > 0 ? rows : [getReadyRow(page, queues, profilerEvidence)];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const vectorCommandCount = facts.visibleEntries.reduce(
    (total, entry) => total + getPathCommandCount(entry),
    0,
  );
  const queuedLayerCount = new Set(
    queues.flatMap((queue) => queue.layerIds),
  ).size;

  return {
    generatedAt,
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageId: page.id,
    pageName: page.name,
    tileSize,
    visibleLayerCount: facts.visibleEntries.length,
    selectableLayerCount: facts.selectableEntries.length,
    selectedLayerCount: selectedEntries.length,
    scheduledTileCount: queues.length,
    hotTileCount: hotQueues.length,
    queuedLayerCount,
    selectionCacheInvalidationCount: selectionInvalidationLayerIds.length,
    vectorCommandCount,
    simplificationCandidateCount: vectorCandidates.length,
    profilerEvidenceCount: profilerEvidence.length,
    renderBudgetStatus: normalizeStatus(renderBudget.status),
    interactionProfilerStatus: normalizeStatus(interactionProfiler.status),
    viewportSafeModeThresholdCount: facts.safeModeThresholdCount,
    blockedCount,
    reviewCount,
    readyCount,
    rows: finalRows,
    queues,
    profilerEvidence,
  };
}

export function getLargeCanvasRenderSchedulerCsv(
  report: LargeCanvasRenderSchedulerReport,
  rows: LargeCanvasRenderSchedulerRow[] = report.rows,
) {
  const header: Array<keyof LargeCanvasRenderSchedulerRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "layerIds",
    "metric",
    "threshold",
    "queueId",
    "schedulerAction",
    "evidence",
  ];

  return [
    [
      "score",
      "status",
      "page",
      "tile_size",
      "visible_layers",
      "selectable_layers",
      "selected_layers",
      "scheduled_tiles",
      "hot_tiles",
      "queued_layers",
      "selection_cache_invalidations",
      "vector_commands",
      "simplification_candidates",
      "profiler_evidence",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageName,
      report.tileSize,
      report.visibleLayerCount,
      report.selectableLayerCount,
      report.selectedLayerCount,
      report.scheduledTileCount,
      report.hotTileCount,
      report.queuedLayerCount,
      report.selectionCacheInvalidationCount,
      report.vectorCommandCount,
      report.simplificationCandidateCount,
      report.profilerEvidenceCount,
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

export function getLargeCanvasRenderSchedulerMarkdown(
  report: LargeCanvasRenderSchedulerReport,
  rows: LargeCanvasRenderSchedulerRow[] = report.rows,
) {
  return [
    "# Large Canvas Render Scheduler",
    "",
    `Generated: ${report.generatedAt}`,
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Page: ${report.pageName}`,
    `Tile size: ${report.tileSize}`,
    `Visible layers: ${report.visibleLayerCount}`,
    `Scheduled viewport-tiled queues: ${report.scheduledTileCount}`,
    `Hot tiles: ${report.hotTileCount}`,
    `Selection cache invalidations: ${report.selectionCacheInvalidationCount}`,
    `Vector commands: ${report.vectorCommandCount}`,
    `Simplification candidates: ${report.simplificationCandidateCount}`,
    `Profiler evidence: ${report.profilerEvidenceCount}`,
    "",
    "## Scheduler Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Action: ${row.schedulerAction}`,
    ),
    "",
    "## Profiler Evidence",
    ...report.profilerEvidence.map(
      (item) => `- [${item.status}] ${item.label}: ${item.detail}`,
    ),
  ].join("\n");
}

export function getLargeCanvasRenderSchedulerJson(
  report: LargeCanvasRenderSchedulerReport,
  rows: LargeCanvasRenderSchedulerRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.large-canvas-render-scheduler",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        pageId: report.pageId,
        pageName: report.pageName,
        tileSize: report.tileSize,
        visibleLayerCount: report.visibleLayerCount,
        selectableLayerCount: report.selectableLayerCount,
        selectedLayerCount: report.selectedLayerCount,
        scheduledTileCount: report.scheduledTileCount,
        hotTileCount: report.hotTileCount,
        queuedLayerCount: report.queuedLayerCount,
        selectionCacheInvalidationCount:
          report.selectionCacheInvalidationCount,
        vectorCommandCount: report.vectorCommandCount,
        simplificationCandidateCount: report.simplificationCandidateCount,
        profilerEvidenceCount: report.profilerEvidenceCount,
        renderBudgetStatus: report.renderBudgetStatus,
        interactionProfilerStatus: report.interactionProfilerStatus,
        viewportSafeModeThresholdCount: report.viewportSafeModeThresholdCount,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
        readyCount: report.readyCount,
      },
      queues: report.queues,
      profilerEvidence: report.profilerEvidence,
      rows,
    },
    null,
    2,
  );
}

function getRenderQueues(
  entries: LayerIndexEntry[],
  tileSize: number,
): LargeCanvasRenderQueue[] {
  const buckets = new Map<string, TileBucket>();

  for (const entry of entries) {
    const startX = Math.floor(entry.bounds.x / tileSize);
    const endX = Math.floor((entry.bounds.right - 1) / tileSize);
    const startY = Math.floor(entry.bounds.y / tileSize);
    const endY = Math.floor((entry.bounds.bottom - 1) / tileSize);

    for (let tileY = startY; tileY <= endY; tileY += 1) {
      for (let tileX = startX; tileX <= endX; tileX += 1) {
        const id = `${tileX}:${tileY}`;
        const bucket =
          buckets.get(id) ??
          ({
            id,
            x: tileX * tileSize,
            y: tileY * tileSize,
            entries: [],
          } satisfies TileBucket);

        bucket.entries.push(entry);
        buckets.set(id, bucket);
      }
    }
  }

  return [...buckets.values()]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((bucket) => createRenderQueue(bucket, tileSize));
}

function createRenderQueue(
  bucket: TileBucket,
  tileSize: number,
): LargeCanvasRenderQueue {
  const renderCost = Math.round(
    bucket.entries.reduce(
      (total, entry) => total + getLayerRenderCost(entry.layer, entry.bounds),
      0,
    ),
  );
  const interactionCost = Math.round(
    bucket.entries.reduce(
      (total, entry) =>
        total + getLayerInteractionCost(entry.layer, entry.bounds),
      0,
    ),
  );
  const status =
    bucket.entries.length >= blockedTileLayerCount ||
    renderCost >= blockedTileRenderCost
      ? "blocked"
      : bucket.entries.length >= reviewTileLayerCount ||
          renderCost >= reviewTileRenderCost
        ? "review"
        : "ready";

  return {
    id: `tile-${bucket.id}`,
    status,
    label: `Tile ${bucket.id}`,
    x: bucket.x,
    y: bucket.y,
    width: tileSize,
    height: tileSize,
    layerIds: bucket.entries
      .slice(0, maxEvidenceLayerIds)
      .map((entry) => entry.layerId),
    layerNames: bucket.entries
      .slice(0, maxEvidenceLayerIds)
      .map((entry) => entry.layer.name),
    renderCost,
    interactionCost,
    schedulerAction:
      status === "ready"
        ? "Keep this tile in the normal viewport draw queue."
        : "Split this tile into prioritized draw work and defer non-selected decoration until idle.",
  };
}

function getTileQueueRows(
  hotQueues: LargeCanvasRenderQueue[],
): LargeCanvasRenderSchedulerRow[] {
  if (hotQueues.length === 0) {
    return [];
  }

  const worstQueue = [...hotQueues].sort(
    (left, right) =>
      right.renderCost - left.renderCost ||
      right.layerIds.length - left.layerIds.length,
  )[0];

  if (!worstQueue) {
    return [];
  }

  return [
    {
      id: "large-canvas-viewport-tile-queue",
      status: hotQueues.some((queue) => queue.status === "blocked")
        ? "blocked"
        : "review",
      category: "viewport-tile-queue",
      label: "Viewport-tiled draw queue",
      detail: `${hotQueues.length} tile queue(s) need scheduling attention; the hottest tile carries ${worstQueue.layerIds.length} layer(s) and ${worstQueue.renderCost} render-cost points.`,
      layerIds: worstQueue.layerIds,
      metric: Math.max(
        worstQueue.layerIds.length,
        Math.round(worstQueue.renderCost),
      ),
      threshold: reviewTileLayerCount,
      queueId: worstQueue.id,
      schedulerAction:
        "Prioritize selected and visible-path layers first, batch large image/effect work, and defer off-priority decoration to idle frames.",
      evidence: `${worstQueue.label} at ${worstQueue.x},${worstQueue.y}`,
    },
  ];
}

function getSelectionInvalidationLayerIds(
  selectableEntries: LayerIndexEntry[],
  selectedEntries: LayerIndexEntry[],
) {
  if (selectedEntries.length === 0) {
    return [];
  }

  const layerIds = new Set<string>();

  for (const selectedEntry of selectedEntries) {
    layerIds.add(selectedEntry.layerId);

    for (const entry of selectableEntries) {
      if (intersectsBounds(selectedEntry.bounds, entry.bounds)) {
        layerIds.add(entry.layerId);
      }
    }
  }

  return [...layerIds].slice(0, maxEvidenceLayerIds);
}

function getSelectionCacheRows(
  layerIds: string[],
  selectedEntries: LayerIndexEntry[],
): LargeCanvasRenderSchedulerRow[] {
  if (
    selectedEntries.length === 0 ||
    layerIds.length < reviewSelectionInvalidationCount
  ) {
    return [];
  }

  return [
    {
      id: "large-canvas-selection-cache-invalidation",
      status:
        layerIds.length >= blockedSelectionInvalidationCount
          ? "blocked"
          : "review",
      category: "selection-cache",
      label: "Selection cache invalidation",
      detail: `${selectedEntries.length} selected layer(s) invalidate ${layerIds.length} overlapping selectable layer(s).`,
      layerIds,
      metric: layerIds.length,
      threshold: reviewSelectionInvalidationCount,
      schedulerAction:
        "Invalidate hit-test and outline caches by tile instead of rebuilding the full selectable index.",
      evidence: `${selectedEntries.map((entry) => entry.layer.name).join(", ")} selection footprint`,
    },
  ];
}

function getVectorCandidates(entries: LayerIndexEntry[]): VectorCandidate[] {
  return entries
    .map((entry) => ({
      entry,
      commandCount: getPathCommandCount(entry),
    }))
    .filter((candidate) => candidate.commandCount >= reviewVectorCommandCount)
    .sort((left, right) => right.commandCount - left.commandCount);
}

function getVectorSimplificationRows(
  candidates: VectorCandidate[],
): LargeCanvasRenderSchedulerRow[] {
  if (candidates.length === 0) {
    return [];
  }

  const topCandidates = candidates.slice(0, maxEvidenceLayerIds);
  const totalCommands = candidates.reduce(
    (total, candidate) => total + candidate.commandCount,
    0,
  );

  return [
    {
      id: "large-canvas-vector-simplification-budget",
      status:
        totalCommands >= 1_200 ||
        candidates.some(
          (candidate) => candidate.commandCount >= blockedVectorCommandCount,
        )
          ? "blocked"
          : "review",
      category: "vector-simplification",
      label: "Vector path simplification budget",
      detail: `${candidates.length} vector path(s) exceed the simplification threshold with ${totalCommands} commands total.`,
      layerIds: topCandidates.map((candidate) => candidate.entry.layerId),
      metric: totalCommands,
      threshold: reviewVectorCommandCount,
      schedulerAction:
        "Queue path simplification hints for static dense vectors and skip simplification for selected paths being edited.",
      evidence: `${topCandidates[0]?.entry.layer.name ?? "Vector path"} carries ${topCandidates[0]?.commandCount ?? 0} commands`,
    },
  ];
}

function getProfilerEvidenceRows(
  evidence: LargeCanvasRenderSchedulerEvidence[],
): LargeCanvasRenderSchedulerRow[] {
  const reviewEvidence = evidence.filter((item) => item.status !== "ready");

  if (reviewEvidence.length === 0) {
    return [];
  }

  return [
    {
      id: "large-canvas-profiler-evidence",
      status: reviewEvidence.some((item) => item.status === "blocked")
        ? "blocked"
        : "review",
      category: "profiler-evidence",
      label: "Profiler evidence",
      detail: `${reviewEvidence.length} profiler source(s) report scheduler pressure.`,
      layerIds: [],
      metric: reviewEvidence.reduce((total, item) => total + item.metric, 0),
      threshold: 1,
      schedulerAction:
        "Attach profiler evidence to the scheduler packet before accepting the large-canvas release gate.",
      evidence: reviewEvidence.map((item) => item.detail).join(" "),
    },
  ];
}

function getReadyRow(
  page: DesignPage,
  queues: LargeCanvasRenderQueue[],
  evidence: LargeCanvasRenderSchedulerEvidence[],
): LargeCanvasRenderSchedulerRow {
  return {
    id: "large-canvas-render-scheduler-ready",
    status: "ready",
    category: "ready",
    label: "Large-canvas scheduler ready",
    detail: `${page.name} has ${queues.length} viewport-tiled queue(s) inside layer, vector, selection, and profiler budgets.`,
    layerIds: [],
    metric: queues.length,
    threshold: reviewTileLayerCount,
    schedulerAction:
      "Keep drawing through the normal viewport queue and refresh this packet before shipping heavier pages.",
    evidence: evidence.map((item) => item.label).join(", "),
  };
}

function getViewportStatus(
  thresholdCount: number,
): LargeCanvasRenderSchedulerStatus {
  if (thresholdCount >= 4) {
    return "blocked";
  }

  return thresholdCount > 0 ? "review" : "ready";
}

function normalizeStatus(
  status: CanvasInteractionProfilerStatus | CanvasRenderBudgetStatus,
): LargeCanvasRenderSchedulerStatus {
  return status;
}

function getPathCommandCount(entry: LayerIndexEntry) {
  return entry.layer.pathData?.match(/[a-z]/gi)?.length ?? 0;
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
