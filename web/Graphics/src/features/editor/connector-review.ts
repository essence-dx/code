import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignLayer, DesignPage } from "@/features/editor/types";

export type ConnectorReviewStatus = "ready" | "broken";

export type ConnectorReviewRow = {
  id: string;
  layerId: string;
  layerName: string;
  status: ConnectorReviewStatus;
  sourceLayerName: string;
  targetLayerName: string;
  detail: string;
};

export type ConnectorReviewReport = {
  connectorCount: number;
  readyCount: number;
  brokenCount: number;
  rows: ConnectorReviewRow[];
};

export function getConnectorReview(page: DesignPage): ConnectorReviewReport {
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const rows = page.layers
    .filter((layer) => layer.connector)
    .map((layer) => createConnectorRow(layer, layerById));

  return {
    connectorCount: rows.length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    brokenCount: rows.filter((row) => row.status === "broken").length,
    rows: rows.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "broken" ? -1 : 1;
      }

      return a.layerName.localeCompare(b.layerName);
    }),
  };
}

export function getBrokenConnectorRepairPatches(page: DesignPage): LayerPatch[] {
  const layerIds = new Set(page.layers.map((layer) => layer.id));

  return page.layers
    .filter((layer) => {
      const connector = layer.connector;

      return (
        connector &&
        (!layerIds.has(connector.sourceLayerId) ||
          !layerIds.has(connector.targetLayerId))
      );
    })
    .map((layer) => ({
      layerId: layer.id,
      patch: {
        connector: undefined,
        name: `${layer.name} (unlinked)`,
      },
    }));
}

export function getConnectorReviewCsv(report: ConnectorReviewReport) {
  return [
    ["status", "connector", "source", "target", "detail"],
    ...report.rows.map((row) => [
      row.status,
      row.layerName,
      row.sourceLayerName,
      row.targetLayerName,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

function createConnectorRow(
  layer: DesignLayer,
  layerById: Map<string, DesignLayer>,
): ConnectorReviewRow {
  const connector = layer.connector;

  if (!connector) {
    return {
      id: layer.id,
      layerId: layer.id,
      layerName: layer.name,
      status: "broken",
      sourceLayerName: "Missing source",
      targetLayerName: "Missing target",
      detail: "Layer has no connector metadata.",
    };
  }

  const source = layerById.get(connector.sourceLayerId);
  const target = layerById.get(connector.targetLayerId);
  const status = source && target ? "ready" : "broken";

  return {
    id: layer.id,
    layerId: layer.id,
    layerName: layer.name,
    status,
    sourceLayerName: source?.name ?? `Missing ${connector.sourceLayerId}`,
    targetLayerName: target?.name ?? `Missing ${connector.targetLayerId}`,
    detail:
      status === "ready"
        ? "Connector endpoints exist on this page."
        : "Connector points to a deleted or missing layer; repair or recreate it.",
  };
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
