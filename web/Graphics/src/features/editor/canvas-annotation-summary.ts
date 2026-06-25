import { getConnectorReview } from "@/features/editor/connector-review";
import type {
  DesignInkPresetKind,
  DesignPage,
  DesignStampKind,
} from "@/features/editor/types";

export type CanvasAnnotationSummaryRow = {
  id: string;
  label: string;
  detail: string;
  status: "ready" | "review";
};

export type CanvasAnnotationSummary = {
  connectorCount: number;
  readyConnectorCount: number;
  brokenConnectorCount: number;
  stampCount: number;
  inkCount: number;
  stampCounts: Array<{
    kind: DesignStampKind;
    label: string;
    count: number;
  }>;
  inkCounts: Array<{
    kind: DesignInkPresetKind;
    label: string;
    count: number;
  }>;
  rows: CanvasAnnotationSummaryRow[];
};

const stampLabels: Record<DesignStampKind, string> = {
  approved: "Approved",
  question: "Question",
  risk: "Risk",
  decision: "Decision",
};

const inkLabels: Record<DesignInkPresetKind, string> = {
  marker: "Marker",
  highlighter: "Highlighter",
};

export function getCanvasAnnotationSummary(
  page: DesignPage,
): CanvasAnnotationSummary {
  const connectorReview = getConnectorReview(page);
  const stamps = page.layers.filter((layer) => layer.stamp);
  const inkLayers = page.layers.filter((layer) => layer.inkPreset);

  return {
    connectorCount: connectorReview.connectorCount,
    readyConnectorCount: connectorReview.readyCount,
    brokenConnectorCount: connectorReview.brokenCount,
    stampCount: stamps.length,
    inkCount: inkLayers.length,
    stampCounts: countByKind(stamps, "stamp", stampLabels),
    inkCounts: countByKind(inkLayers, "inkPreset", inkLabels),
    rows: [
      ...connectorReview.rows.map((row) => ({
        id: `connector-${row.id}`,
        label: row.layerName,
        detail: `${row.sourceLayerName} -> ${row.targetLayerName}`,
        status: row.status === "ready" ? ("ready" as const) : ("review" as const),
      })),
      ...stamps.map((layer) => ({
        id: `stamp-${layer.id}`,
        label: `${stampLabels[layer.stamp?.kind ?? "question"]} stamp`,
        detail: layer.name,
        status: "ready" as const,
      })),
      ...inkLayers.map((layer) => ({
        id: `ink-${layer.id}`,
        label: `${inkLabels[layer.inkPreset?.kind ?? "marker"]} annotation`,
        detail: `${layer.name} / ${layer.strokeWidth}px`,
        status: "ready" as const,
      })),
    ],
  };
}

function countByKind<
  Property extends "stamp" | "inkPreset",
  Kind extends DesignStampKind | DesignInkPresetKind,
>(
  layers: Array<{ [key in Property]?: { kind: Kind } }>,
  property: Property,
  labels: Record<Kind, string>,
) {
  return (Object.keys(labels) as Kind[])
    .map((kind) => ({
      kind,
      label: labels[kind],
      count: layers.filter((layer) => layer[property]?.kind === kind).length,
    }))
    .filter((item) => item.count > 0);
}
