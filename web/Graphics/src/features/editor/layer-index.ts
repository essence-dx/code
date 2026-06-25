import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type LayerIndexBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  area: number;
};

export type LayerIndexEntry = {
  pageId: string;
  pageName: string;
  layerId: string;
  parentId?: string;
  groupId?: string;
  type: DesignLayer["type"];
  layer: DesignLayer;
  zIndex: number;
  bounds: LayerIndexBounds;
  visible: boolean;
  locked: boolean;
  selectable: boolean;
};

export type PageLayerIndex = {
  pageId: string;
  pageName: string;
  entries: LayerIndexEntry[];
  byId: Map<string, LayerIndexEntry>;
  byParentId: Map<string, LayerIndexEntry[]>;
  byGroupId: Map<string, LayerIndexEntry[]>;
  byType: Map<DesignLayer["type"], LayerIndexEntry[]>;
  duplicateLayerIds: string[];
  rootLayerIds: string[];
  visibleLayerIds: string[];
  selectableLayerIds: string[];
  renderOrderLayerIds: string[];
};

export type DocumentLayerIndex = {
  pages: PageLayerIndex[];
  pagesById: Map<string, PageLayerIndex>;
  entries: LayerIndexEntry[];
  layersById: Map<string, LayerIndexEntry>;
  duplicateLayerIds: string[];
  visibleLayerCount: number;
  selectableLayerCount: number;
};

export type LayerIndexStatus = "ready" | "review" | "blocked";

export type LayerIndexReviewRow = {
  id: string;
  status: LayerIndexStatus;
  label: string;
  detail: string;
  pageName?: string;
  layerIds: string[];
  metric: number;
  recommendation: string;
};

export type LayerIndexReview = {
  score: number;
  status: LayerIndexStatus;
  pageCount: number;
  layerCount: number;
  indexedLayerCount: number;
  visibleLayerCount: number;
  selectableLayerCount: number;
  duplicateLayerIdCount: number;
  missingParentCount: number;
  orphanGroupReferenceCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: LayerIndexReviewRow[];
};

type LayerLookupOptions = {
  includeLocked?: boolean;
  layerIds?: string[];
};

const reviewPageLayerCount = 300;
const blockedPageLayerCount = 800;
const reviewEmptyFrameCount = 8;
const blockedEmptyFrameCount = 20;
const reviewMissingGroupCount = 8;
const blockedMissingGroupCount = 20;

export function createPageLayerIndex(page: DesignPage): PageLayerIndex {
  const byId = new Map<string, LayerIndexEntry>();
  const byParentId = new Map<string, LayerIndexEntry[]>();
  const byGroupId = new Map<string, LayerIndexEntry[]>();
  const byType = new Map<DesignLayer["type"], LayerIndexEntry[]>();
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  const entries = page.layers.map((layer, zIndex) => {
    if (seenIds.has(layer.id)) {
      duplicateIds.add(layer.id);
    }

    seenIds.add(layer.id);

    const entry = {
      pageId: page.id,
      pageName: page.name,
      layerId: layer.id,
      parentId: layer.parentId,
      groupId: layer.groupId,
      type: layer.type,
      layer,
      zIndex,
      bounds: getLayerIndexBounds(layer),
      visible: layer.visible,
      locked: layer.locked,
      selectable: layer.visible && !layer.locked,
    } satisfies LayerIndexEntry;

    byId.set(layer.id, entry);
    pushMapValue(byType, layer.type, entry);

    if (layer.parentId) {
      pushMapValue(byParentId, layer.parentId, entry);
    }

    if (layer.groupId) {
      pushMapValue(byGroupId, layer.groupId, entry);
    }

    return entry;
  });

  return {
    pageId: page.id,
    pageName: page.name,
    entries,
    byId,
    byParentId,
    byGroupId,
    byType,
    duplicateLayerIds: [...duplicateIds],
    rootLayerIds: entries
      .filter((entry) => !entry.parentId)
      .map((entry) => entry.layerId),
    visibleLayerIds: entries
      .filter((entry) => entry.visible)
      .map((entry) => entry.layerId),
    selectableLayerIds: entries
      .filter((entry) => entry.selectable)
      .map((entry) => entry.layerId),
    renderOrderLayerIds: entries
      .filter((entry) => entry.visible)
      .map((entry) => entry.layerId),
  };
}

export function createDocumentLayerIndex(
  document: DesignDocument,
): DocumentLayerIndex {
  const pages = document.pages.map(createPageLayerIndex);
  const pagesById = new Map(pages.map((page) => [page.pageId, page]));
  const layersById = new Map<string, LayerIndexEntry>();
  const seenLayerIds = new Set<string>();
  const duplicateLayerIds = new Set<string>();
  const entries = pages.flatMap((page) => page.entries);

  for (const entry of entries) {
    if (seenLayerIds.has(entry.layerId)) {
      duplicateLayerIds.add(entry.layerId);
    }

    seenLayerIds.add(entry.layerId);
    layersById.set(entry.layerId, entry);
  }

  for (const page of pages) {
    page.duplicateLayerIds.forEach((layerId) => duplicateLayerIds.add(layerId));
  }

  return {
    pages,
    pagesById,
    entries,
    layersById,
    duplicateLayerIds: [...duplicateLayerIds],
    visibleLayerCount: entries.filter((entry) => entry.visible).length,
    selectableLayerCount: entries.filter((entry) => entry.selectable).length,
  };
}

export function getSelectableLayers(index: PageLayerIndex) {
  return index.selectableLayerIds
    .map((layerId) => index.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => Boolean(entry));
}

export function getLayerEntriesAtPoint(
  index: PageLayerIndex,
  point: { x: number; y: number },
  options: LayerLookupOptions = {},
) {
  const candidateIds = options.layerIds ?? index.renderOrderLayerIds;
  const candidates = candidateIds
    .map((layerId) => index.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => Boolean(entry));

  return candidates
    .filter(
      (entry) =>
        entry.visible &&
        (options.includeLocked || !entry.locked) &&
        containsPoint(entry.bounds, point),
    )
    .toReversed();
}

export function getTopLayerAtPoint(
  index: PageLayerIndex,
  point: { x: number; y: number },
  options: LayerLookupOptions = {},
) {
  return getLayerEntriesAtPoint(index, point, options)[0];
}

export function getLayersInBounds(
  index: PageLayerIndex,
  bounds: Pick<LayerIndexBounds, "x" | "y" | "width" | "height">,
  options: LayerLookupOptions & { mode?: "contain" | "intersect" } = {},
) {
  const queryBounds = getRectBounds(bounds);
  const candidateIds = options.layerIds ?? index.visibleLayerIds;
  const matches =
    options.mode === "contain" ? containsBounds : intersectsBounds;

  return candidateIds
    .map((layerId) => index.byId.get(layerId))
    .filter((entry): entry is LayerIndexEntry => {
      if (!entry) {
        return false;
      }

      return (
        entry.visible &&
        (options.includeLocked || !entry.locked) &&
        matches(queryBounds, entry.bounds)
      );
    });
}

export function getLayerIndexReview(
  document: DesignDocument,
): LayerIndexReview {
  const index = createDocumentLayerIndex(document);
  const duplicateRows = getDuplicateRows(index);
  const missingParentRows = getMissingParentRows(index);
  const groupRows = getGroupRows(document, index);
  const emptyFrameRows = getEmptyFrameRows(index);
  const zStackRows = getZStackRows(index);
  const rows: LayerIndexReviewRow[] = [
    ...duplicateRows,
    ...missingParentRows,
    ...groupRows,
    ...emptyFrameRows,
    ...zStackRows,
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: index.pages.length,
    layerCount: document.pages.reduce(
      (total, page) => total + page.layers.length,
      0,
    ),
    indexedLayerCount: index.entries.length,
    visibleLayerCount: index.visibleLayerCount,
    selectableLayerCount: index.selectableLayerCount,
    duplicateLayerIdCount: index.duplicateLayerIds.length,
    missingParentCount: missingParentRows.reduce(
      (total, row) => total + row.layerIds.length,
      0,
    ),
    orphanGroupReferenceCount: groupRows.reduce(
      (total, row) => total + row.layerIds.length,
      0,
    ),
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "layer-index-ready",
              status: "ready",
              label: "Layer index ready",
              detail:
                "Layer ids, parent links, groups, render order, and hit-test maps are coherent.",
              layerIds: [],
              metric: score,
              recommendation:
                "Reuse the layer index for large-document selection and audit flows.",
            } satisfies LayerIndexReviewRow,
          ],
  };
}

export function getLayerIndexReviewCsv(
  report: LayerIndexReview,
  rows: LayerIndexReviewRow[] = report.rows,
) {
  const header: Array<keyof LayerIndexReviewRow> = [
    "id",
    "status",
    "label",
    "detail",
    "pageName",
    "layerIds",
    "metric",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "layers",
      "indexed_layers",
      "visible_layers",
      "selectable_layers",
      "duplicate_layer_ids",
      "missing_parents",
      "orphan_group_refs",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.layerCount,
      report.indexedLayerCount,
      report.visibleLayerCount,
      report.selectableLayerCount,
      report.duplicateLayerIdCount,
      report.missingParentCount,
      report.orphanGroupReferenceCount,
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

export function getLayerIndexReviewMarkdown(
  report: LayerIndexReview,
  rows: LayerIndexReviewRow[] = report.rows,
) {
  return [
    "# Layer Index Review",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Pages: ${report.pageCount}`,
    `Layers: ${report.layerCount}`,
    `Indexed layers: ${report.indexedLayerCount}`,
    `Visible layers: ${report.visibleLayerCount}`,
    `Selectable layers: ${report.selectableLayerCount}`,
    `Duplicate layer ids: ${report.duplicateLayerIdCount}`,
    `Missing parents: ${report.missingParentCount}`,
    `Orphan group references: ${report.orphanGroupReferenceCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No layer index review rows."]),
  ].join("\n");
}

function getDuplicateRows(index: DocumentLayerIndex) {
  if (index.duplicateLayerIds.length === 0) {
    return [];
  }

  return [
    {
      id: "duplicate-layer-ids",
      status: "blocked",
      label: "Duplicate layer ids",
      detail: `${index.duplicateLayerIds.length} layer id${index.duplicateLayerIds.length === 1 ? "" : "s"} appear more than once.`,
      layerIds: index.duplicateLayerIds,
      metric: index.duplicateLayerIds.length,
      recommendation:
        "Regenerate duplicate ids before relying on hit testing, Dev Mode handoff, or version compare.",
    } satisfies LayerIndexReviewRow,
  ];
}

function getMissingParentRows(index: DocumentLayerIndex) {
  return index.pages.flatMap((page) => {
    const missingParentEntries = page.entries.filter(
      (entry) => entry.parentId && !page.byId.has(entry.parentId),
    );

    if (missingParentEntries.length === 0) {
      return [];
    }

    return [
      {
        id: `missing-parent-${page.pageId}`,
        status: "blocked",
        label: "Missing parent references",
        detail: `${missingParentEntries.length} layer${missingParentEntries.length === 1 ? "" : "s"} point to parent frames that are not on this page.`,
        pageName: page.pageName,
        layerIds: missingParentEntries.map((entry) => entry.layerId),
        metric: missingParentEntries.length,
        recommendation:
          "Detach stale parent ids or restore the missing frame before auto-layout, selection, or export work.",
      } satisfies LayerIndexReviewRow,
    ];
  });
}

function getGroupRows(document: DesignDocument, index: DocumentLayerIndex) {
  const pagesById = new Map(document.pages.map((page) => [page.id, page]));

  return index.pages.flatMap((pageIndex) => {
    const page = pagesById.get(pageIndex.pageId);
    const groupIds = new Set((page?.groups ?? []).map((group) => group.id));
    const missingGroupEntries = pageIndex.entries.filter(
      (entry) => entry.groupId && !groupIds.has(entry.groupId),
    );
    const staleGroupLayerIds = (page?.groups ?? []).flatMap((group) =>
      group.layerIds.filter((layerId) => !pageIndex.byId.has(layerId)),
    );
    const totalIssueCount =
      missingGroupEntries.length + staleGroupLayerIds.length;

    if (totalIssueCount === 0) {
      return [];
    }

    return [
      {
        id: `group-index-${pageIndex.pageId}`,
        status:
          totalIssueCount >= blockedMissingGroupCount ? "blocked" : "review",
        label: "Group index references",
        detail: `${totalIssueCount} group reference${totalIssueCount === 1 ? "" : "s"} need review on this page.`,
        pageName: pageIndex.pageName,
        layerIds: [
          ...missingGroupEntries.map((entry) => entry.layerId),
          ...staleGroupLayerIds,
        ],
        metric: totalIssueCount,
        recommendation:
          "Repair stale group membership so group moves, selection, and export queues stay deterministic.",
      } satisfies LayerIndexReviewRow,
    ];
  });
}

function getEmptyFrameRows(index: DocumentLayerIndex) {
  return index.pages.flatMap((page) => {
    const emptyFrames = page.entries.filter(
      (entry) =>
        entry.type === "frame" && (page.byParentId.get(entry.layerId)?.length ?? 0) === 0,
    );

    if (emptyFrames.length < reviewEmptyFrameCount) {
      return [];
    }

    return [
      {
        id: `empty-frame-index-${page.pageId}`,
        status:
          emptyFrames.length >= blockedEmptyFrameCount ? "blocked" : "review",
        label: "Empty frame lookup",
        detail: `${emptyFrames.length} frames have no indexed children.`,
        pageName: page.pageName,
        layerIds: emptyFrames.slice(0, 24).map((entry) => entry.layerId),
        metric: emptyFrames.length,
        recommendation:
          "Remove placeholder frames or adopt child layers before large-file reviews.",
      } satisfies LayerIndexReviewRow,
    ];
  });
}

function getZStackRows(index: DocumentLayerIndex) {
  return index.pages
    .filter((page) => page.entries.length >= reviewPageLayerCount)
    .map(
      (page) =>
        ({
          id: `z-stack-budget-${page.pageId}`,
          status:
            page.entries.length >= blockedPageLayerCount ? "blocked" : "review",
          label: "Large page z-stack",
          detail: `${page.entries.length} layers are indexed on this page.`,
          pageName: page.pageName,
          layerIds: [],
          metric: page.entries.length,
          recommendation:
            "Use indexed hit testing and filtered review queues before adding more dense layers.",
        }) satisfies LayerIndexReviewRow,
    );
}

function pushMapValue<K>(
  map: Map<K, LayerIndexEntry[]>,
  key: K,
  value: LayerIndexEntry,
) {
  const bucket = map.get(key) ?? [];
  bucket.push(value);
  map.set(key, bucket);
}

function getLayerIndexBounds(layer: DesignLayer): LayerIndexBounds {
  return getRectBounds(layer);
}

function getRectBounds(
  rect: Pick<LayerIndexBounds, "x" | "y" | "width" | "height">,
): LayerIndexBounds {
  const width = Math.max(0, rect.width);
  const height = Math.max(0, rect.height);

  return {
    x: rect.x,
    y: rect.y,
    width,
    height,
    right: rect.x + width,
    bottom: rect.y + height,
    centerX: rect.x + width / 2,
    centerY: rect.y + height / 2,
    area: width * height,
  };
}

function containsPoint(
  bounds: LayerIndexBounds,
  point: { x: number; y: number },
) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.right &&
    point.y >= bounds.y &&
    point.y <= bounds.bottom
  );
}

function containsBounds(outer: LayerIndexBounds, inner: LayerIndexBounds) {
  return (
    inner.x >= outer.x &&
    inner.right <= outer.right &&
    inner.y >= outer.y &&
    inner.bottom <= outer.bottom
  );
}

function intersectsBounds(first: LayerIndexBounds, second: LayerIndexBounds) {
  return !(
    second.x > first.right ||
    second.right < first.x ||
    second.y > first.bottom ||
    second.bottom < first.y
  );
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
