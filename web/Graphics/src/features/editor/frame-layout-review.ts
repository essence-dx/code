import {
  defaultAutoLayout,
  getLayerSizing,
} from "@/features/editor/auto-layout";
import type { LayerPatch } from "@/features/editor/document-utils";
import type {
  DesignAutoLayoutMode,
  DesignLayer,
  DesignLayoutSizingMode,
  DesignPage,
} from "@/features/editor/types";

export type FrameLayoutReviewStatus = "ready" | "review" | "blocked";

export type FrameLayoutReviewRow = {
  id: string;
  frameId: string;
  frameName: string;
  status: FrameLayoutReviewStatus;
  mode: DesignAutoLayoutMode | "manual";
  childCount: number;
  containedUnownedCount: number;
  overflowCount: number;
  fillChildCount: number;
  hugChildCount: number;
  absoluteChildCount: number;
  frameSizing: string;
  detail: string;
};

export type FrameLayoutReviewReport = {
  frameCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  autoLayoutFrameCount: number;
  manualFrameCount: number;
  containedUnownedCount: number;
  overflowLayerCount: number;
  absoluteChildCount: number;
  migrationCount: number;
  rows: FrameLayoutReviewRow[];
};

const statusRank: Record<FrameLayoutReviewStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getFrameLayoutReview(page: DesignPage): FrameLayoutReviewReport {
  const rows = page.layers
    .filter((layer) => layer.type === "frame")
    .map((frame) => createFrameLayoutRow(frame, page.layers))
    .sort((left, right) => {
      if (left.status !== right.status) {
        return statusRank[left.status] - statusRank[right.status];
      }

      return left.frameName.localeCompare(right.frameName);
    });

  return {
    frameCount: rows.length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    reviewCount: rows.filter((row) => row.status === "review").length,
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    autoLayoutFrameCount: rows.filter((row) => row.mode !== "manual").length,
    manualFrameCount: rows.filter((row) => row.mode === "manual").length,
    containedUnownedCount: rows.reduce(
      (total, row) => total + row.containedUnownedCount,
      0,
    ),
    overflowLayerCount: rows.reduce((total, row) => total + row.overflowCount, 0),
    absoluteChildCount: rows.reduce(
      (total, row) => total + row.absoluteChildCount,
      0,
    ),
    migrationCount: rows.filter(isMigrationCandidate).length,
    rows,
  };
}

export function getManualFrameLayoutMigrationPatches(
  page: DesignPage,
): LayerPatch[] {
  return page.layers.flatMap((frame) => {
    if (frame.type !== "frame" || frame.autoLayout) {
      return [];
    }

    const children = getLayoutChildren(frame, page.layers);
    const containedUnownedCount = page.layers.filter(
      (layer) =>
        layer.parentId !== frame.id &&
        isFrameChildCandidate(frame, layer) &&
        isInsideFrame(frame, layer),
    ).length;
    const overflowCount = children.filter((layer) => !isInsideFrame(frame, layer))
      .length;

    if (children.length < 2 || containedUnownedCount > 0 || overflowCount > 0) {
      return [];
    }

    const mode = inferAutoLayoutMode(children);

    return {
      layerId: frame.id,
      patch: {
        autoLayout: {
          ...defaultAutoLayout,
          mode,
          gap: inferAutoLayoutGap(children, mode),
          paddingX: inferHorizontalPadding(frame, children),
          paddingY: inferVerticalPadding(frame, children),
          align: inferAutoLayoutAlignment(frame, children, mode),
        },
      },
    };
  });
}

export function getFrameLayoutReviewCsv(report: FrameLayoutReviewReport) {
  return [
    [
      "status",
      "frame",
      "mode",
      "children",
      "containedUnowned",
      "overflow",
      "fillChildren",
      "hugChildren",
      "absoluteChildren",
      "frameSizing",
      "detail",
    ],
    ...report.rows.map((row) => [
      row.status,
      row.frameName,
      row.mode,
      row.childCount,
      row.containedUnownedCount,
      row.overflowCount,
      row.fillChildCount,
      row.hugChildCount,
      row.absoluteChildCount,
      row.frameSizing,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getFrameLayoutReviewMarkdown(report: FrameLayoutReviewReport) {
  const warnings = getFrameLayoutHandoffWarnings(report);
  const lines = [
    "# Frame Layout Review",
    "",
    `Frames: ${report.frameCount}`,
    `Auto layout frames: ${report.autoLayoutFrameCount}`,
    `Manual frames: ${report.manualFrameCount}`,
    `Ready: ${report.readyCount}`,
    `Review: ${report.reviewCount}`,
    `Blocked: ${report.blockedCount}`,
    `Contained but unowned layers: ${report.containedUnownedCount}`,
    `Overflowing owned layers: ${report.overflowLayerCount}`,
    `Absolute-positioned children: ${report.absoluteChildCount}`,
    `Manual migration candidates: ${report.migrationCount}`,
    "",
    "## Handoff Warnings",
    "",
    ...(
      warnings.length > 0
        ? warnings.map((warning) => `- ${warning}`)
        : ["- No frame layout warnings."]
    ),
    "",
    "## Frames",
    "",
  ];

  if (report.rows.length === 0) {
    lines.push("- No frame layers found on this page.");
  }

  for (const row of report.rows) {
    lines.push(
      `- ${row.frameName} (${row.status}) - ${row.mode}, ${row.childCount} children, ${row.frameSizing}. ${row.detail}`,
    );
  }

  return lines.join("\n");
}

export function getFrameLayoutHandoffWarnings(report: FrameLayoutReviewReport) {
  return report.rows
    .filter((row) => row.status !== "ready")
    .map((row) => `${row.frameName}: ${row.detail}`);
}

function createFrameLayoutRow(
  frame: DesignLayer,
  layers: DesignLayer[],
): FrameLayoutReviewRow {
  const ownedChildren = layers.filter((layer) => layer.parentId === frame.id);
  const layoutChildren = getLayoutChildren(frame, layers);
  const absoluteChildCount = ownedChildren.length - layoutChildren.length;
  const containedUnowned = layers.filter(
    (layer) =>
      layer.parentId !== frame.id &&
      isFrameChildCandidate(frame, layer) &&
      isInsideFrame(frame, layer),
  );
  const overflowChildren = layoutChildren.filter(
    (layer) => !isInsideFrame(frame, layer),
  );
  const fillChildCount = layoutChildren.filter((layer) =>
    hasSizingMode(layer, "fill"),
  ).length;
  const hugChildCount = layoutChildren.filter((layer) =>
    hasSizingMode(layer, "hug"),
  ).length;
  const frameSizing = getSizingLabel(frame);
  const mode = frame.autoLayout?.mode ?? "manual";
  const { status, detail } = getFrameStatus({
    childCount: layoutChildren.length,
    containedUnownedCount: containedUnowned.length,
    overflowCount: overflowChildren.length,
    absoluteChildCount,
    hasAutoLayout: Boolean(frame.autoLayout),
    frameSizing,
  });

  return {
    id: frame.id,
    frameId: frame.id,
    frameName: frame.name,
    status,
    mode,
    childCount: layoutChildren.length,
    containedUnownedCount: containedUnowned.length,
    overflowCount: overflowChildren.length,
    fillChildCount,
    hugChildCount,
    absoluteChildCount,
    frameSizing,
    detail,
  };
}

function isMigrationCandidate(row: FrameLayoutReviewRow) {
  return (
    row.mode === "manual" &&
    row.childCount > 1 &&
    row.containedUnownedCount === 0 &&
    row.overflowCount === 0
  );
}

function getFrameStatus({
  childCount,
  containedUnownedCount,
  overflowCount,
  absoluteChildCount,
  hasAutoLayout,
  frameSizing,
}: {
  childCount: number;
  containedUnownedCount: number;
  overflowCount: number;
  absoluteChildCount: number;
  hasAutoLayout: boolean;
  frameSizing: string;
}): Pick<FrameLayoutReviewRow, "status" | "detail"> {
  if (containedUnownedCount > 0) {
    return {
      status: "blocked",
      detail:
        "Contained layers are not adopted by the frame; adopt them before layout handoff.",
    };
  }

  if (overflowCount > 0) {
    return {
      status: "blocked",
      detail:
        "Owned child layers overflow the frame bounds; resize, reparent, or clip intentionally.",
    };
  }

  if (childCount === 0) {
    return {
      status: absoluteChildCount > 0 ? "ready" : "review",
      detail:
        absoluteChildCount > 0
          ? "Frame contains only absolute-positioned children."
          : "Frame has no owned layers yet.",
    };
  }

  if (!hasAutoLayout && childCount > 1) {
    return {
      status: "review",
      detail:
        "Multi-child frame is manually positioned; add auto layout for responsive handoff.",
    };
  }

  if (hasAutoLayout && frameSizing === "fixed / fixed") {
    return {
      status: "review",
      detail:
        "Auto layout is enabled, but the frame still uses fixed sizing on both axes.",
    };
  }

  return {
    status: "ready",
    detail: hasAutoLayout
      ? "Auto layout ownership and sizing are ready for handoff."
      : "Single-child frame has stable ownership.",
  };
}

function hasSizingMode(layer: DesignLayer, mode: DesignLayoutSizingMode) {
  const sizing = getLayerSizing(layer);

  return sizing.horizontal === mode || sizing.vertical === mode;
}

function getLayoutChildren(frame: DesignLayer, layers: DesignLayer[]) {
  return layers.filter(
    (layer) => layer.parentId === frame.id && !layer.absolutePositioned,
  );
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

function inferAutoLayoutMode(children: DesignLayer[]): DesignAutoLayoutMode {
  const minX = Math.min(...children.map((layer) => layer.x));
  const maxX = Math.max(...children.map((layer) => layer.x));
  const minY = Math.min(...children.map((layer) => layer.y));
  const maxY = Math.max(...children.map((layer) => layer.y));

  return maxX - minX >= maxY - minY ? "horizontal" : "vertical";
}

function inferAutoLayoutGap(
  children: DesignLayer[],
  mode: DesignAutoLayoutMode,
) {
  const sorted = [...children].sort((left, right) =>
    mode === "horizontal"
      ? left.x - right.x || left.y - right.y
      : left.y - right.y || left.x - right.x,
  );
  const gaps = sorted
    .slice(1)
    .map((layer, index) => {
      const previous = sorted[index];

      return mode === "horizontal"
        ? layer.x - (previous.x + previous.width)
        : layer.y - (previous.y + previous.height);
    })
    .filter((gap) => gap >= 0)
    .sort((left, right) => left - right);

  if (gaps.length === 0) {
    return defaultAutoLayout.gap;
  }

  return Math.round(gaps[Math.floor(gaps.length / 2)] ?? defaultAutoLayout.gap);
}

function inferHorizontalPadding(frame: DesignLayer, children: DesignLayer[]) {
  const left = Math.min(...children.map((layer) => layer.x)) - frame.x;
  const right =
    frame.x +
    frame.width -
    Math.max(...children.map((layer) => layer.x + layer.width));

  return Math.max(0, Math.round(Math.min(left, right)));
}

function inferVerticalPadding(frame: DesignLayer, children: DesignLayer[]) {
  const top = Math.min(...children.map((layer) => layer.y)) - frame.y;
  const bottom =
    frame.y +
    frame.height -
    Math.max(...children.map((layer) => layer.y + layer.height));

  return Math.max(0, Math.round(Math.min(top, bottom)));
}

function inferAutoLayoutAlignment(
  frame: DesignLayer,
  children: DesignLayer[],
  mode: DesignAutoLayoutMode,
) {
  const frameStart = mode === "horizontal" ? frame.y : frame.x;
  const frameSize = mode === "horizontal" ? frame.height : frame.width;
  const childStarts = children.map((layer) =>
    mode === "horizontal" ? layer.y : layer.x,
  );
  const childEnds = children.map((layer) =>
    mode === "horizontal" ? layer.y + layer.height : layer.x + layer.width,
  );
  const childStart = Math.min(...childStarts);
  const childEnd = Math.max(...childEnds);
  const startGap = childStart - frameStart;
  const endGap = frameStart + frameSize - childEnd;

  if (Math.abs(startGap - endGap) <= 2) {
    return "center";
  }

  return endGap < startGap ? "end" : "start";
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
