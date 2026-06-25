import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";
import {
  canConvertLayerToPath,
  canOutlineStroke,
  createBooleanVectorLayer,
  createOutlinedStrokeLayer,
  cutLayerAtPoint,
} from "@/features/editor/vector-operations";
import {
  createRefinedPencilPathPatch,
  getEditableVectorPathPoints,
  getVectorPathControlTethers,
  getVectorPathInsertPoints,
} from "@/features/editor/vector-path-editing";
import {
  getVectorPathReview,
  type VectorPathReviewRow,
} from "@/features/editor/vector-path-review";
import {
  getVectorPathMetadata,
  isBooleanVectorLayer,
} from "@/features/editor/vector-path-review-metadata";

export type VectorDrawAuthoringReviewStatus =
  | "blocked"
  | "ready"
  | "review";

export type VectorDrawAuthoringReviewRowCategory =
  | "bend-cutter-operation"
  | "boolean-preview"
  | "export-topology"
  | "pen-pencil-refinement"
  | "stroke-outline";

export type VectorDrawAuthoringReviewRow = {
  id: string;
  status: VectorDrawAuthoringReviewStatus;
  category: VectorDrawAuthoringReviewRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type VectorDrawAuthoringReviewReport = {
  generatedAt: string;
  status: VectorDrawAuthoringReviewStatus;
  score: number;
  activePageId: string;
  layerCount: number;
  pathLayerCount: number;
  penRefinementCount: number;
  pencilRefinementCount: number;
  bendOperationCount: number;
  cutterOperationCount: number;
  booleanPreviewCount: number;
  strokeOutlineWorkflowCount: number;
  exportSafeTopologyCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  topologyRows: VectorPathReviewRow[];
  rows: VectorDrawAuthoringReviewRow[];
};

const statusRank: Record<VectorDrawAuthoringReviewStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getVectorDrawAuthoringReviewReport({
  activePage,
  commandPaletteCommands,
  document,
  generatedAt = new Date().toISOString(),
  selectedLayerIds = [],
}: {
  activePage: DesignPage;
  commandPaletteCommands: CommandPaletteCommand[];
  document: DesignDocument;
  generatedAt?: string;
  selectedLayerIds?: string[];
}): VectorDrawAuthoringReviewReport {
  const layers = document.pages.flatMap((page) => page.layers);
  const visibleLayers = layers.filter((layer) => layer.visible);
  const pathLayers = visibleLayers.filter(
    (layer) => layer.type === "path" && Boolean(layer.pathData?.trim()),
  );
  const commandIds = new Set(commandPaletteCommands.map((command) => command.id));
  const vectorReview = getVectorPathReview({ document, selectedLayerIds });
  const booleanLayerCount = pathLayers.filter((layer) =>
    isBooleanVectorLayer(layer, getVectorPathMetadata(layer)),
  ).length;
  const canPreviewBoolean = Boolean(
    createBooleanVectorLayer(visibleLayers.filter(canConvertLayerToPath).slice(0, 2), "union"),
  );
  const penRefinementCount = pathLayers.filter(hasEditableAnchors).length;
  const pencilRefinementCount =
    commandIds.has("tool-pencil") && canCreatePencilPatch() ? 1 : 0;
  const bendOperationCount = pathLayers.filter(hasBendOperationEvidence).length;
  const cutterOperationCount = visibleLayers.filter(canCutLayerAtCenter).length;
  const booleanPreviewCount =
    commandPaletteCommands.filter((command) =>
      command.id.startsWith("vector-preview-"),
    ).length +
    (canPreviewBoolean ? 1 : 0) +
    booleanLayerCount;
  const strokeOutlineWorkflowCount = visibleLayers.filter(
    (layer) => canOutlineStroke(layer) && createOutlinedStrokeLayer(layer),
  ).length;
  const exportSafeTopologyCount = vectorReview.exportSafeLayerCount;
  const rows = getRows({
    bendOperationCount,
    booleanApplyCommandCount: commandPaletteCommands.filter((command) =>
      /^vector-(union|subtract|intersect|exclude)$/.test(command.id),
    ).length,
    booleanLayerCount,
    booleanPreviewCount,
    commandIds,
    cutterOperationCount,
    exportSafeTopologyCount,
    penRefinementCount,
    pencilRefinementCount,
    strokeOutlineWorkflowCount,
    vectorBlockedCount: vectorReview.blockedCount,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    activePageId: activePage.id,
    layerCount: activePage.layers.length,
    pathLayerCount: pathLayers.length,
    penRefinementCount,
    pencilRefinementCount,
    bendOperationCount,
    cutterOperationCount,
    booleanPreviewCount,
    strokeOutlineWorkflowCount,
    exportSafeTopologyCount,
    readyCount,
    reviewCount,
    blockedCount,
    topologyRows: vectorReview.rows,
    rows: rows.sort(sortRows),
  };
}

export function getVectorDrawAuthoringReviewJson(
  report: VectorDrawAuthoringReviewReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getVectorDrawAuthoringReviewCsv(
  report: VectorDrawAuthoringReviewReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
      "evidence",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.metric,
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getVectorDrawAuthoringReviewMarkdown(
  report: VectorDrawAuthoringReviewReport,
) {
  return [
    "# Vector Draw Authoring Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active page: ${report.activePageId}`,
    `Visible vector paths: ${report.pathLayerCount}`,
    `Pen refinement: ${report.penRefinementCount}`,
    `Pencil refinement: ${report.pencilRefinementCount}`,
    `Bend operations: ${report.bendOperationCount}`,
    `Cutter operations: ${report.cutterOperationCount}`,
    `Boolean previews: ${report.booleanPreviewCount}`,
    `Stroke outline workflows: ${report.strokeOutlineWorkflowCount}`,
    `Export-safe topology: ${report.exportSafeTopologyCount}`,
    "",
    "This handoff covers pen/pencil refinement, bend/cutter operations, boolean preview hardening, stroke outline workflows, and export-safe topology.",
    "",
    "## review rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Evidence: ${row.evidence}. ${row.recommendation}`,
    ),
    "",
    "## topology rows",
    "",
    ...(report.topologyRows.length > 0
      ? report.topologyRows.map(
          (row) =>
            `- [${row.status}] ${row.layerName}: ${row.label}. ${row.detail}`,
        )
      : ["- No vector topology rows found."]),
  ].join("\n");
}

function getRows({
  bendOperationCount,
  booleanApplyCommandCount,
  booleanLayerCount,
  booleanPreviewCount,
  commandIds,
  cutterOperationCount,
  exportSafeTopologyCount,
  penRefinementCount,
  pencilRefinementCount,
  strokeOutlineWorkflowCount,
  vectorBlockedCount,
}: {
  bendOperationCount: number;
  booleanApplyCommandCount: number;
  booleanLayerCount: number;
  booleanPreviewCount: number;
  commandIds: Set<string>;
  cutterOperationCount: number;
  exportSafeTopologyCount: number;
  penRefinementCount: number;
  pencilRefinementCount: number;
  strokeOutlineWorkflowCount: number;
  vectorBlockedCount: number;
}): VectorDrawAuthoringReviewRow[] {
  return [
    {
      id: "pen-pencil-refinement:tools",
      status:
        commandIds.has("tool-pen") &&
        commandIds.has("tool-pencil") &&
        penRefinementCount > 0 &&
        pencilRefinementCount > 0
          ? "ready"
          : penRefinementCount > 0 || pencilRefinementCount > 0
            ? "review"
            : "blocked",
      category: "pen-pencil-refinement",
      label: "Pen and pencil refinement",
      detail: `${penRefinementCount} editable pen path${penRefinementCount === 1 ? "" : "s"} and ${pencilRefinementCount} pencil smoothing workflow${pencilRefinementCount === 1 ? "" : "s"} are available.`,
      evidence: commandIds.has("tool-pencil")
        ? "Pencil tool command and smoothing patch are wired."
        : "Pencil tool command is missing.",
      recommendation:
        "Keep pen nodes and freehand pencil smoothing available from both toolbar and command palette.",
      metric: penRefinementCount + pencilRefinementCount,
    },
    {
      id: "bend-cutter-operation:coverage",
      status:
        bendOperationCount > 0 && cutterOperationCount > 0
          ? "ready"
          : bendOperationCount > 0 || cutterOperationCount > 0
            ? "review"
            : "blocked",
      category: "bend-cutter-operation",
      label: "Bend and cutter operations",
      detail: `${bendOperationCount} vector bend handle workflow${bendOperationCount === 1 ? "" : "s"} and ${cutterOperationCount} cutter candidate${cutterOperationCount === 1 ? "" : "s"} are detected.`,
      evidence: `${commandIds.has("tool-cutter") ? "Cutter command is available" : "Cutter command missing"}; node insert and control tethers are reviewed.`,
      recommendation:
        "Use bend handles for curve refinement and cutter candidates for safe slicing workflows.",
      metric: bendOperationCount + cutterOperationCount,
    },
    {
      id: "boolean-preview:hardening",
      status:
        booleanPreviewCount > 0 && booleanApplyCommandCount > 0
          ? "ready"
          : booleanPreviewCount > 0
            ? "review"
            : "blocked",
      category: "boolean-preview",
      label: "Boolean preview hardening",
      detail: `${booleanPreviewCount} preview or boolean vector evidence item${booleanPreviewCount === 1 ? "" : "s"} and ${booleanApplyCommandCount} apply command${booleanApplyCommandCount === 1 ? "" : "s"} are available.`,
      evidence: `${booleanLayerCount} boolean-like vector layer${booleanLayerCount === 1 ? "" : "s"} found.`,
      recommendation:
        "Keep preview commands paired with apply commands before publishing boolean vector edits.",
      metric: booleanPreviewCount + booleanApplyCommandCount,
    },
    {
      id: "stroke-outline:workflow",
      status:
        strokeOutlineWorkflowCount > 0 &&
        commandIds.has("outline-selection-stroke")
          ? "ready"
          : strokeOutlineWorkflowCount > 0
            ? "review"
            : "blocked",
      category: "stroke-outline",
      label: "Stroke outline workflows",
      detail: `${strokeOutlineWorkflowCount} layer${strokeOutlineWorkflowCount === 1 ? "" : "s"} can convert visible strokes into exportable outlines.`,
      evidence: commandIds.has("outline-selection-stroke")
        ? "Outline stroke command is available."
        : "Outline stroke command is missing.",
      recommendation:
        "Keep outline conversion available for final SVG and Dev Mode handoff.",
      metric: strokeOutlineWorkflowCount,
    },
    {
      id: "export-topology:safety",
      status:
        exportSafeTopologyCount > 0 && vectorBlockedCount === 0
          ? "ready"
          : exportSafeTopologyCount > 0
            ? "review"
            : "blocked",
      category: "export-topology",
      label: "Export-safe topology",
      detail: `${exportSafeTopologyCount} export-safe topology row${exportSafeTopologyCount === 1 ? "" : "s"} and ${vectorBlockedCount} blocker${vectorBlockedCount === 1 ? "" : "s"} are detected by vector path review.`,
      evidence: "Vector path review contributes topology rows to this Draw handoff.",
      recommendation:
        "Clear vector blockers before releasing Draw-heavy design system assets.",
      metric: exportSafeTopologyCount,
    },
  ];
}

function hasEditableAnchors(layer: DesignLayer) {
  return getEditableVectorPathPoints(layer.pathData ?? "").some(
    (point) => point.kind === "anchor",
  );
}

function hasBendOperationEvidence(layer: DesignLayer) {
  return (
    getVectorPathControlTethers(layer).length > 0 ||
    getVectorPathInsertPoints(layer).length > 0
  );
}

function canCutLayerAtCenter(layer: DesignLayer) {
  return Boolean(
    cutLayerAtPoint(layer, {
      x: layer.x + layer.width / 2,
      y: layer.y + layer.height / 2,
    }),
  );
}

function canCreatePencilPatch() {
  return Boolean(
    createRefinedPencilPathPatch([
      { x: 0, y: 12 },
      { x: 16, y: 2 },
      { x: 34, y: 14 },
      { x: 52, y: 6 },
    ]),
  );
}

function sortRows(
  first: VectorDrawAuthoringReviewRow,
  second: VectorDrawAuthoringReviewRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.label.localeCompare(second.label);
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
