import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignDocument, DesignLayer, DesignPage } from "@/features/editor/types";
import {
  createClosedVectorPathPatch,
  createSnappedVectorPathPatch,
} from "@/features/editor/vector-path-editing";
import {
  getLayerPathViewBox,
  getVectorPathMetadata,
  hasArcCommand,
  hasMoveCommand,
  hasVisibleFill,
  hasVisibleStroke,
  isBooleanVectorLayer,
  isOutsideViewBox,
  isValidBounds,
  type VectorPathMetadata,
} from "@/features/editor/vector-path-review-metadata";
import {
  type VectorPathReviewAction,
  type VectorPathReviewReport,
  type VectorPathReviewRow,
  type VectorPathReviewSeverity,
  type VectorPathReviewStatus,
} from "@/features/editor/vector-path-review-types";
import { createNormalizedPathPatch } from "@/features/editor/vector-operations";

export type {
  VectorPathReviewAction,
  VectorPathReviewReport,
  VectorPathReviewRow,
  VectorPathReviewSeverity,
  VectorPathReviewStatus,
} from "@/features/editor/vector-path-review-types";

type VectorPathLayerEntry = {
  page: DesignPage;
  layer: DesignLayer;
  selected: boolean;
};

const actionRank: Record<VectorPathReviewAction, number> = {
  normalize: 0,
  snap: 1,
  close: 2,
  select: 3,
};

export function getVectorPathReview({
  document,
  selectedLayerIds = [],
}: {
  document: DesignDocument;
  selectedLayerIds?: string[];
}): VectorPathReviewReport {
  const selectedSet = new Set(selectedLayerIds);
  const entries = getVectorPathLayerEntries(document, selectedSet);
  const rows = entries
    .flatMap((entry) => getVectorPathRows(entry))
    .sort(sortVectorRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const repairableLayerIds = new Set(
    rows.filter((row) => row.action !== "select").map((row) => row.layerId),
  );

  return {
    score:
      entries.length === 0
        ? 100
        : Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    pathLayerCount: entries.length,
    selectedPathLayerCount: entries.filter((entry) => entry.selected).length,
    exportSafeLayerCount: readyCount,
    readyCount,
    reviewCount,
    blockedCount,
    repairableCount: repairableLayerIds.size,
    anchorCount: rows.reduce((total, row) => total + row.anchorCount, 0),
    controlHandleCount: rows.reduce(
      (total, row) => total + row.controlHandleCount,
      0,
    ),
    commandCount: rows.reduce((total, row) => total + row.commandCount, 0),
    booleanReviewCount: rows.filter(
      (row) => row.label === "Boolean repair review",
    ).length,
    rows,
  };
}

export function getVectorPathReviewPatches(
  document: DesignDocument,
  rows: VectorPathReviewRow[],
): LayerPatch[] {
  const layerById = getLayerById(document);
  const draftById = new Map<string, DesignLayer>();
  const patchByLayerId = new Map<string, Partial<DesignLayer>>();

  for (const row of [...rows].sort(
    (left, right) => actionRank[left.action] - actionRank[right.action],
  )) {
    if (row.action === "select") {
      continue;
    }

    const source = draftById.get(row.layerId) ?? layerById.get(row.layerId);

    if (!source) {
      continue;
    }

    const patch = getVectorPathActionPatch(source, row.action);

    if (!patch) {
      continue;
    }

    const nextLayer = { ...source, ...patch };
    const existingPatch = patchByLayerId.get(row.layerId) ?? {};

    draftById.set(row.layerId, nextLayer);
    patchByLayerId.set(row.layerId, { ...existingPatch, ...patch });
  }

  return Array.from(patchByLayerId, ([layerId, patch]) => ({
    layerId,
    patch,
  }));
}

export function getVectorPathReviewCsv(
  report: VectorPathReviewReport,
  rows: VectorPathReviewRow[] = report.rows,
) {
  return [
    [
      "status",
      "severity",
      "page",
      "layer",
      "selected",
      "label",
      "anchors",
      "handles",
      "commands",
      "subpaths",
      "action",
      "detail",
    ],
    ...rows.map((row) => [
      row.status,
      row.severity,
      row.pageName,
      row.layerName,
      row.selected ? "yes" : "no",
      row.label,
      row.anchorCount,
      row.controlHandleCount,
      row.commandCount,
      row.subpathCount,
      row.actionLabel,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getVectorPathReviewMarkdown(
  report: VectorPathReviewReport,
  rows: VectorPathReviewRow[] = report.rows,
) {
  const lines = [
    "# Vector Path Review",
    "",
    `Score: ${report.score}`,
    `Vector paths: ${report.pathLayerCount}`,
    `Selected paths: ${report.selectedPathLayerCount}`,
    `Export-safe paths: ${report.exportSafeLayerCount}`,
    `Blocked: ${report.blockedCount}`,
    `Needs review: ${report.reviewCount}`,
    `Repairable layers: ${report.repairableCount}`,
    `Anchors: ${report.anchorCount}`,
    `Control handles: ${report.controlHandleCount}`,
    `Commands: ${report.commandCount}`,
    `Boolean reviews: ${report.booleanReviewCount}`,
    "",
    "## Rows",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No vector path rows found.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.status.toUpperCase()} / ${row.severity.toUpperCase()} - ${row.pageName} / ${row.layerName}: ${row.label}. ${row.detail} Action: ${row.actionLabel}.`,
    );
  }

  return lines.join("\n");
}

function getVectorPathLayerEntries(
  document: DesignDocument,
  selectedLayerIds: Set<string>,
) {
  return document.pages.flatMap((page) =>
    page.layers
      .filter(
        (layer) =>
          layer.type === "path" &&
          (layer.visible || selectedLayerIds.has(layer.id)),
      )
      .map(
        (layer): VectorPathLayerEntry => ({
          page,
          layer,
          selected: selectedLayerIds.has(layer.id),
        }),
      ),
  );
}

function getVectorPathRows(entry: VectorPathLayerEntry): VectorPathReviewRow[] {
  const meta = getVectorPathMetadata(entry.layer);
  const rows: VectorPathReviewRow[] = [];

  if (!entry.layer.pathData?.trim()) {
    rows.push(
      createRow(entry, meta, {
        status: "blocked",
        severity: "high",
        label: "Empty vector path",
        detail: "Path layers need SVG path data before export or Dev Mode handoff.",
        action: "select",
        actionLabel: "Select",
      }),
    );

    return rows;
  }

  if (meta.unsupportedCommands.length > 0) {
    rows.push(
      createRow(entry, meta, {
        status: "blocked",
        severity: "high",
        label: "Unsupported path command",
        detail: `${meta.unsupportedCommands.join(", ")} command${meta.unsupportedCommands.length === 1 ? "" : "s"} cannot be edited or normalized safely.`,
        action: "select",
        actionLabel: "Inspect path data",
      }),
    );
  }

  if (meta.anchors === 0 || !hasMoveCommand(meta.commands)) {
    rows.push(
      createRow(entry, meta, {
        status: "blocked",
        severity: "high",
        label: "Malformed vector path",
        detail: "The path does not expose editable anchors from an initial move command.",
        action: "select",
        actionLabel: "Inspect path data",
      }),
    );
  }

  if (!meta.hasValidViewBox) {
    rows.push(
      createRow(entry, meta, {
        status: "blocked",
        severity: "high",
        label: "Invalid path viewBox",
        detail: "Path viewBox values must be finite and positive for reliable canvas handles and export scaling.",
        action: "normalize",
        actionLabel: "Normalize",
      }),
    );
  } else if (!entry.layer.pathViewBox) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "low",
        label: "Missing path viewBox",
        detail: "Normalize the path so canvas handles, slices, and SVG exports share a stable coordinate space.",
        action: "normalize",
        actionLabel: "Normalize",
      }),
    );
  }

  if (meta.bounds && isOutsideViewBox(meta.bounds, meta.viewBox)) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "medium",
        label: "Path outside viewBox",
        detail: "Some anchors sit outside the stored viewBox, which can make point handles and SVG slices drift.",
        action: "normalize",
        actionLabel: "Normalize",
      }),
    );
  }

  if (!meta.closed && hasVisibleFill(entry.layer)) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "medium",
        label: "Open filled path",
        detail: "Filled vectors should be closed before boolean review, slicing, or export handoff.",
        action: "close",
        actionLabel: "Close path",
      }),
    );
  }

  if (meta.fractionalPointCount >= Math.max(2, Math.ceil(meta.anchors / 2))) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "low",
        label: "Fractional node positions",
        detail: `${meta.fractionalPointCount} anchors or handles are off whole-pixel coordinates.`,
        action: "snap",
        actionLabel: "Snap nodes",
      }),
    );
  }

  if (meta.relativePointCount > 0) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "low",
        label: "Relative node handles",
        detail: `${meta.relativePointCount} relative nodes can be edited in Properties but do not expose direct canvas handles yet.`,
        action: "select",
        actionLabel: "Inspect nodes",
      }),
    );
  }

  if (hasArcCommand(meta.commands)) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "low",
        label: "Arc endpoint review",
        detail: "Arc endpoints are editable, but radius and sweep controls should be inspected before export.",
        action: "select",
        actionLabel: "Inspect arcs",
      }),
    );
  }

  if (isBooleanVectorLayer(entry.layer, meta)) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "medium",
        label: "Boolean repair review",
        detail: `${meta.subpathCount} subpath${meta.subpathCount === 1 ? "" : "s"} found. Confirm fill rule, normalize bounds, and inspect overlaps before destructive handoff.`,
        action: "normalize",
        actionLabel: "Normalize",
      }),
    );
  }

  if (!hasVisibleFill(entry.layer) && !hasVisibleStroke(entry.layer)) {
    rows.push(
      createRow(entry, meta, {
        status: "review",
        severity: "medium",
        label: "Invisible vector export",
        detail: "The path has no visible fill or stroke, so exports may look empty.",
        action: "select",
        actionLabel: "Select",
      }),
    );
  }

  if (meta.commandCount > 320 || meta.anchors > 160) {
    rows.push(
      createRow(entry, meta, {
        status: meta.commandCount > 640 ? "blocked" : "review",
        severity: meta.commandCount > 640 ? "high" : "medium",
        label: "Dense vector path",
        detail: `${meta.commandCount} path commands and ${meta.anchors} anchors can slow canvas handles and handoff exports.`,
        action: "select",
        actionLabel: "Inspect density",
      }),
    );
  }

  if (rows.length === 0) {
    rows.push(
      createRow(entry, meta, {
        status: "ready",
        severity: "low",
        label: "Export-safe vector",
        detail: "Path data, viewBox, node handles, and visible paint are ready for export review.",
        action: "select",
        actionLabel: "Select",
      }),
    );
  }

  return rows;
}

function createRow(
  entry: VectorPathLayerEntry,
  meta: VectorPathMetadata,
  input: Pick<
    VectorPathReviewRow,
    "status" | "severity" | "label" | "detail" | "action" | "actionLabel"
  >,
): VectorPathReviewRow {
  return {
    ...input,
    id: `${entry.page.id}:${entry.layer.id}:${input.label.toLowerCase().replaceAll(/\W+/g, "-")}`,
    pageId: entry.page.id,
    pageName: entry.page.name,
    layerId: entry.layer.id,
    layerName: entry.layer.name,
    selected: entry.selected,
    anchorCount: meta.anchors,
    controlHandleCount: meta.controls,
    commandCount: meta.commandCount,
    subpathCount: meta.subpathCount,
  };
}

function getVectorPathActionPatch(
  layer: DesignLayer,
  action: Exclude<VectorPathReviewAction, "select">,
) {
  if (action === "close") {
    return createClosedVectorPathPatch(layer);
  }

  if (action === "snap") {
    return createSnappedVectorPathPatch(layer);
  }

  const source = isValidBounds(getLayerPathViewBox(layer))
    ? layer
    : { ...layer, pathViewBox: undefined };

  return createNormalizedPathPatch(source);
}

function getLayerById(document: DesignDocument) {
  return new Map(
    document.pages.flatMap((page) =>
      page.layers.map((layer) => [layer.id, layer] as const),
    ),
  );
}

function sortVectorRows(left: VectorPathReviewRow, right: VectorPathReviewRow) {
  if (left.status !== right.status) {
    return getStatusRank(left.status) - getStatusRank(right.status);
  }

  if (left.severity !== right.severity) {
    return getSeverityRank(left.severity) - getSeverityRank(right.severity);
  }

  if (left.selected !== right.selected) {
    return left.selected ? -1 : 1;
  }

  return `${left.pageName}:${left.layerName}:${left.label}`.localeCompare(
    `${right.pageName}:${right.layerName}:${right.label}`,
  );
}

function getStatusRank(status: VectorPathReviewStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 1 : 2;
}

function getSeverityRank(severity: VectorPathReviewSeverity) {
  if (severity === "high") {
    return 0;
  }

  return severity === "medium" ? 1 : 2;
}

function formatCsvCell(value: boolean | number | string) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
