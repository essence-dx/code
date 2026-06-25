import {
  createPageLayerIndex,
  type LayerIndexEntry,
} from "@/features/editor/layer-index";
import {
  getLayerInteractionCost,
  getTopCostEntries,
  intersectsBounds,
} from "@/features/editor/canvas-viewport-intelligence-cost";
import { getPageViewportFacts } from "@/features/editor/canvas-viewport-intelligence-model";
import type { DesignPage } from "@/features/editor/types";

export type CanvasInteractionProfilerStatus = "ready" | "review" | "blocked";

export type CanvasInteractionProfilerCategory =
  | "selection-latency"
  | "pan-zoom-frame"
  | "hit-test-hotspot"
  | "ready";

export type CanvasInteractionProfilerRow = {
  id: string;
  status: CanvasInteractionProfilerStatus;
  category: CanvasInteractionProfilerCategory;
  label: string;
  detail: string;
  layerIds: string[];
  layerNames: string[];
  metric: number;
  threshold: number;
  replaySteps: string[];
  optimizationNote: string;
  recommendation: string;
};

export type CanvasInteractionReplayNote = {
  id: string;
  status: CanvasInteractionProfilerStatus;
  label: string;
  layerIds: string[];
  replaySteps: string[];
  optimizationNote: string;
};

export type CanvasInteractionProfilerReport = {
  generatedAt: string;
  score: number;
  status: CanvasInteractionProfilerStatus;
  pageId: string;
  pageName: string;
  selectedLayerCount: number;
  visibleLayerCount: number;
  selectableLayerCount: number;
  renderWindowCount: number;
  estimatedSelectionLatencyMs: number;
  panZoomFrameBudgetMs: number;
  hitTestHotspotCount: number;
  hitTestPairCount: number;
  hitTestStackDepth: number;
  pointerReplayStepCount: number;
  optimizationNoteCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: CanvasInteractionProfilerRow[];
  replayNotes: CanvasInteractionReplayNote[];
};

type CanvasInteractionProfilerInput = {
  page: DesignPage;
  selectedLayerIds?: string[];
  generatedAt?: string;
};

type HitTestHotspot = {
  id: string;
  anchor: LayerIndexEntry;
  entries: LayerIndexEntry[];
  depth: number;
  pairCount: number;
};

const reviewSelectionLatencyMs = 18;
const blockedSelectionLatencyMs = 34;
const reviewPanZoomFrameBudgetMs = 16.7;
const blockedPanZoomFrameBudgetMs = 28;
const reviewHitTestDepth = 8;
const blockedHitTestDepth = 18;
const maxProfiledHitTestLayers = 180;
const maxEvidenceLayerIds = 36;

export function getCanvasInteractionProfilerReport({
  page,
  selectedLayerIds = [],
  generatedAt = new Date().toISOString(),
}: CanvasInteractionProfilerInput): CanvasInteractionProfilerReport {
  const index = createPageLayerIndex(page);
  const facts = getPageViewportFacts(index);
  const selectedEntries = Array.from(new Set(selectedLayerIds))
    .map((layerId) => index.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => Boolean(entry));
  const hotspots = getHitTestHotspots(facts.selectableEntries);
  const estimatedSelectionLatencyMs = getEstimatedSelectionLatencyMs({
    selectedEntries,
    selectableEntries: facts.selectableEntries,
    hitTestPairCount: facts.hitTest.pairCount,
    hitTestStackDepth: facts.hitTest.stackDepth,
    topHotspotDepth: hotspots[0]?.depth ?? 0,
  });
  const panZoomFrameBudgetMs = getPanZoomFrameBudgetMs({
    estimatedRenderCost: facts.estimatedRenderCost,
    expensiveLayerCount: facts.expensiveEntries.length,
    renderWindowLayerCount: facts.renderWindowLayerCount,
    safeModeThresholdCount: facts.safeModeThresholdCount,
  });
  const rows: CanvasInteractionProfilerRow[] = [
    ...getSelectionLatencyRows({
      estimatedSelectionLatencyMs,
      selectedEntries,
      selectableEntries: facts.selectableEntries,
      topHotspotDepth: hotspots[0]?.depth ?? 0,
    }),
    ...getPanZoomFrameRows({
      panZoomFrameBudgetMs,
      visibleEntries: facts.visibleEntries,
      renderWindowCount: facts.renderWindows.length,
      estimatedRenderCost: facts.estimatedRenderCost,
    }),
    ...getHitTestHotspotRows(hotspots),
  ];
  const finalRows =
    rows.length > 0
      ? rows
      : [
          createReadyRow({
            page,
            visibleEntries: facts.visibleEntries,
            estimatedSelectionLatencyMs,
            panZoomFrameBudgetMs,
          }),
        ];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const replayNotes = finalRows.map(getReplayNote);
  const pointerReplayStepCount = replayNotes.reduce(
    (total, note) => total + note.replaySteps.length,
    0,
  );
  const optimizationNoteCount = replayNotes.filter((note) =>
    Boolean(note.optimizationNote),
  ).length;
  const score = Math.max(0, 100 - blockedCount * 20 - reviewCount * 7);

  return {
    generatedAt,
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageId: page.id,
    pageName: page.name,
    selectedLayerCount: selectedEntries.length,
    visibleLayerCount: facts.visibleEntries.length,
    selectableLayerCount: facts.selectableEntries.length,
    renderWindowCount: facts.renderWindows.length,
    estimatedSelectionLatencyMs,
    panZoomFrameBudgetMs,
    hitTestHotspotCount: hotspots.length,
    hitTestPairCount: facts.hitTest.pairCount,
    hitTestStackDepth: facts.hitTest.stackDepth,
    pointerReplayStepCount,
    optimizationNoteCount,
    blockedCount,
    reviewCount,
    readyCount,
    rows: finalRows,
    replayNotes,
  };
}

export function getCanvasInteractionProfilerCsv(
  report: CanvasInteractionProfilerReport,
  rows: CanvasInteractionProfilerRow[] = report.rows,
) {
  const header: Array<keyof CanvasInteractionProfilerRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "layerIds",
    "layerNames",
    "metric",
    "threshold",
    "replaySteps",
    "optimizationNote",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "page",
      "selected_layers",
      "visible_layers",
      "selectable_layers",
      "render_windows",
      "selection_latency_ms",
      "pan_zoom_frame_ms",
      "hit_test_hotspots",
      "hit_test_pairs",
      "hit_test_stack_depth",
      "replay_steps",
      "optimization_notes",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageName,
      report.selectedLayerCount,
      report.visibleLayerCount,
      report.selectableLayerCount,
      report.renderWindowCount,
      report.estimatedSelectionLatencyMs,
      report.panZoomFrameBudgetMs,
      report.hitTestHotspotCount,
      report.hitTestPairCount,
      report.hitTestStackDepth,
      report.pointerReplayStepCount,
      report.optimizationNoteCount,
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

export function getCanvasInteractionProfilerMarkdown(
  report: CanvasInteractionProfilerReport,
  rows: CanvasInteractionProfilerRow[] = report.rows,
) {
  const replayNotes = getReplayNotesForRows(report, rows);

  return [
    "# Canvas Interaction Profiler",
    "",
    `Generated: ${report.generatedAt}`,
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Page: ${report.pageName}`,
    `Selected layers: ${report.selectedLayerCount}`,
    `Visible layers: ${report.visibleLayerCount}`,
    `Selectable layers: ${report.selectableLayerCount}`,
    `Render windows: ${report.renderWindowCount}`,
    `Estimated selection latency: ${report.estimatedSelectionLatencyMs}ms`,
    `Pan and zoom frame estimate: ${report.panZoomFrameBudgetMs}ms`,
    `Hit-test hotspots: ${report.hitTestHotspotCount}`,
    `Hit-test pairs: ${report.hitTestPairCount}`,
    `Hit-test stack depth: ${report.hitTestStackDepth}`,
    `Replay steps: ${report.pointerReplayStepCount}`,
    `Optimization notes: ${report.optimizationNoteCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No canvas interaction profiler rows."]),
    "",
    "## Replay Notes",
    ...(replayNotes.length > 0
      ? replayNotes.flatMap((note) => [
          `- [${note.status}] ${note.label}: ${note.optimizationNote}`,
          ...note.replaySteps.map((step) => `  - ${step}`),
        ])
      : ["- No replay notes."]),
  ].join("\n");
}

export function getCanvasInteractionProfilerJson(
  report: CanvasInteractionProfilerReport,
  rows: CanvasInteractionProfilerRow[] = report.rows,
) {
  return JSON.stringify(
    {
      generatedAt: report.generatedAt,
      summary: {
        score: report.score,
        status: report.status,
        pageId: report.pageId,
        pageName: report.pageName,
        selectedLayerCount: report.selectedLayerCount,
        visibleLayerCount: report.visibleLayerCount,
        selectableLayerCount: report.selectableLayerCount,
        renderWindowCount: report.renderWindowCount,
        estimatedSelectionLatencyMs: report.estimatedSelectionLatencyMs,
        panZoomFrameBudgetMs: report.panZoomFrameBudgetMs,
        hitTestHotspotCount: report.hitTestHotspotCount,
        hitTestPairCount: report.hitTestPairCount,
        hitTestStackDepth: report.hitTestStackDepth,
        pointerReplayStepCount: report.pointerReplayStepCount,
        optimizationNoteCount: report.optimizationNoteCount,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
      },
      replayNotes: getReplayNotesForRows(report, rows),
      rows,
    },
    null,
    2,
  );
}

function getSelectionLatencyRows(input: {
  estimatedSelectionLatencyMs: number;
  selectedEntries: LayerIndexEntry[];
  selectableEntries: LayerIndexEntry[];
  topHotspotDepth: number;
}) {
  if (input.estimatedSelectionLatencyMs < reviewSelectionLatencyMs) {
    return [];
  }

  const evidenceEntries =
    input.selectedEntries.length > 0
      ? input.selectedEntries
      : getTopInteractionEntries(input.selectableEntries, 12);

  return [
    createRow({
      id: "selection-latency-budget",
      status:
        input.estimatedSelectionLatencyMs >= blockedSelectionLatencyMs
          ? "blocked"
          : "review",
      category: "selection-latency",
      label: "Selection latency budget",
      detail: `Estimated selection latency is ${input.estimatedSelectionLatencyMs}ms across ${input.selectableEntries.length} selectable layers.`,
      entries: evidenceEntries,
      metric: input.estimatedSelectionLatencyMs,
      threshold: reviewSelectionLatencyMs,
      replaySteps: [
        "Select the queued layers.",
        "Press Escape, then reselect the same layers to compare latency.",
        "Lock or hide static background artwork and repeat the selection pass.",
      ],
      optimizationNote:
        input.topHotspotDepth > 0
          ? `Deepest hotspot covers ${input.topHotspotDepth} overlapping selectable layers.`
          : "Selection cost is dominated by the number of selectable layers.",
      recommendation:
        "Lock static art, reduce transparent hit areas, and split dense exploration layers before live review.",
    }),
  ];
}

function getPanZoomFrameRows(input: {
  panZoomFrameBudgetMs: number;
  visibleEntries: LayerIndexEntry[];
  renderWindowCount: number;
  estimatedRenderCost: number;
}) {
  if (input.panZoomFrameBudgetMs < reviewPanZoomFrameBudgetMs) {
    return [];
  }

  return [
    createRow({
      id: "pan-zoom-frame-budget",
      status:
        input.panZoomFrameBudgetMs >= blockedPanZoomFrameBudgetMs
          ? "blocked"
          : "review",
      category: "pan-zoom-frame",
      label: "Pan and zoom frame budget",
      detail: `Estimated pan/zoom frame time is ${input.panZoomFrameBudgetMs}ms with render cost ${input.estimatedRenderCost}.`,
      entries: getTopCostEntries(input.visibleEntries, 24),
      metric: input.panZoomFrameBudgetMs,
      threshold: reviewPanZoomFrameBudgetMs,
      replaySteps: [
        "Zoom to 100%, then pan across the queued layer cluster.",
        "Repeat at 50% zoom and compare frame consistency.",
        "Flatten or hide the highest-cost visible layers and replay the pan pass.",
      ],
      optimizationNote: `${input.renderWindowCount} render window${
        input.renderWindowCount === 1 ? "" : "s"
      } contribute to the active-page pan and zoom estimate.`,
      recommendation:
        "Simplify high-cost visible layers and keep expensive effects out of active review frames.",
    }),
  ];
}

function getHitTestHotspotRows(hotspots: HitTestHotspot[]) {
  return hotspots.slice(0, 4).map((hotspot) =>
    createRow({
      id: hotspot.id,
      status: hotspot.depth >= blockedHitTestDepth ? "blocked" : "review",
      category: "hit-test-hotspot",
      label: "Hit-test hotspot",
      detail: `${hotspot.depth} selectable layers overlap near ${Math.round(
        hotspot.anchor.bounds.centerX,
      )}, ${Math.round(hotspot.anchor.bounds.centerY)}.`,
      entries: hotspot.entries,
      metric: hotspot.depth,
      threshold: reviewHitTestDepth,
      replaySteps: [
        `Inspect ${hotspot.anchor.layer.name}.`,
        "Use deep selection on the hotspot and note the layer stack depth.",
        "Group, lock, or move non-interactive layers out of the hotspot and repeat the pointer pass.",
      ],
      optimizationNote: `${hotspot.pairCount} overlapping pair${
        hotspot.pairCount === 1 ? "" : "s"
      } share this pointer target.`,
      recommendation:
        "Reduce overlapping transparent bounds, group related controls, or lock background layers that should not intercept pointer scans.",
    }),
  );
}

function createReadyRow(input: {
  page: DesignPage;
  visibleEntries: LayerIndexEntry[];
  estimatedSelectionLatencyMs: number;
  panZoomFrameBudgetMs: number;
}) {
  return createRow({
    id: "canvas-interaction-profiler-ready",
    status: "ready",
    category: "ready",
    label: "Canvas interactions ready",
    detail: `${input.page.name} stays within selection, pan/zoom, and hit-test interaction budgets.`,
    entries: input.visibleEntries.slice(0, 8),
    metric: Math.max(
      input.estimatedSelectionLatencyMs,
      input.panZoomFrameBudgetMs,
    ),
    threshold: reviewPanZoomFrameBudgetMs,
    replaySteps: [
      "Select a representative layer cluster.",
      "Pan and zoom the page at the expected review scale.",
    ],
    optimizationNote:
      "No blocking interaction hotspots were detected on the active page.",
    recommendation:
      "Keep profiler exports attached to release notes when adding denser canvas overlays.",
  });
}

function createRow(input: {
  id: string;
  status: CanvasInteractionProfilerStatus;
  category: CanvasInteractionProfilerCategory;
  label: string;
  detail: string;
  entries: LayerIndexEntry[];
  metric: number;
  threshold: number;
  replaySteps: string[];
  optimizationNote: string;
  recommendation: string;
}): CanvasInteractionProfilerRow {
  const entries = input.entries.slice(0, maxEvidenceLayerIds);

  return {
    id: input.id,
    status: input.status,
    category: input.category,
    label: input.label,
    detail: input.detail,
    layerIds: entries.map((entry) => entry.layerId),
    layerNames: entries.map((entry) => entry.layer.name).slice(0, 12),
    metric: input.metric,
    threshold: input.threshold,
    replaySteps: input.replaySteps,
    optimizationNote: input.optimizationNote,
    recommendation: input.recommendation,
  };
}

function getHitTestHotspots(entries: LayerIndexEntry[]): HitTestHotspot[] {
  const candidates =
    entries.length > maxProfiledHitTestLayers
      ? getTopInteractionEntries(entries, maxProfiledHitTestLayers)
      : entries;
  const hotspots = candidates
    .map((entry) => {
      const overlappingEntries = candidates.filter(
        (candidate) =>
          candidate.layerId !== entry.layerId &&
          intersectsBounds(entry.bounds, candidate.bounds),
      );
      const entriesByCost = getTopInteractionEntries(
        [entry, ...overlappingEntries],
        maxEvidenceLayerIds,
      );

      return {
        id: `hit-test-hotspot-${entry.layerId}`,
        anchor: entry,
        entries: entriesByCost,
        depth: overlappingEntries.length + 1,
        pairCount: overlappingEntries.length,
      } satisfies HitTestHotspot;
    })
    .filter((hotspot) => hotspot.depth >= reviewHitTestDepth)
    .sort((left, right) => {
      if (left.depth !== right.depth) {
        return right.depth - left.depth;
      }

      return right.pairCount - left.pairCount;
    });
  const coveredLayerIds = new Set<string>();
  const selected: HitTestHotspot[] = [];

  for (const hotspot of hotspots) {
    if (hotspot.entries.some((entry) => coveredLayerIds.has(entry.layerId))) {
      continue;
    }

    selected.push(hotspot);
    hotspot.entries.forEach((entry) => coveredLayerIds.add(entry.layerId));

    if (selected.length >= 6) {
      break;
    }
  }

  return selected.length > 0 ? selected : hotspots.slice(0, 1);
}

function getEstimatedSelectionLatencyMs(input: {
  selectedEntries: LayerIndexEntry[];
  selectableEntries: LayerIndexEntry[];
  hitTestPairCount: number;
  hitTestStackDepth: number;
  topHotspotDepth: number;
}) {
  const selectedInteractionCost = input.selectedEntries.reduce(
    (total, entry) =>
      total + getLayerInteractionCost(entry.layer, entry.bounds),
    0,
  );

  return roundToTenth(
    4 +
      input.selectableEntries.length * 0.05 +
      input.hitTestPairCount * 0.014 +
      input.hitTestStackDepth * 0.55 +
      input.selectedEntries.length * 0.9 +
      selectedInteractionCost / 14 +
      input.topHotspotDepth * 0.28,
  );
}

function getPanZoomFrameBudgetMs(input: {
  estimatedRenderCost: number;
  expensiveLayerCount: number;
  renderWindowLayerCount: number;
  safeModeThresholdCount: number;
}) {
  return roundToTenth(
    5 +
      input.estimatedRenderCost * 0.05 +
      input.renderWindowLayerCount * 0.025 +
      input.expensiveLayerCount * 0.2 +
      input.safeModeThresholdCount * 1.2,
  );
}

function getTopInteractionEntries(entries: LayerIndexEntry[], count: number) {
  return [...entries]
    .sort(
      (left, right) =>
        getLayerInteractionCost(right.layer, right.bounds) -
        getLayerInteractionCost(left.layer, left.bounds),
    )
    .slice(0, count);
}

function getReplayNote(
  row: CanvasInteractionProfilerRow,
): CanvasInteractionReplayNote {
  return {
    id: row.id,
    status: row.status,
    label: row.label,
    layerIds: row.layerIds,
    replaySteps: row.replaySteps,
    optimizationNote: row.optimizationNote,
  };
}

function getReplayNotesForRows(
  report: CanvasInteractionProfilerReport,
  rows: CanvasInteractionProfilerRow[],
) {
  const rowIds = new Set(rows.map((row) => row.id));

  return report.replayNotes.filter((note) => rowIds.has(note.id));
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
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
