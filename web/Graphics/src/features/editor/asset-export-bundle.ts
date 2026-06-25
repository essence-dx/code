import {
  getLayerAssetReport,
  getLayerHandoffCode,
  getLayerSvgAssetCode,
} from "@/features/editor/layer-codegen";
import type {
  DesignComment,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type AssetExportPresetId = "svg" | "retina" | "handoff";

export type AssetExportPreset = {
  id: AssetExportPresetId;
  label: string;
  formats: Array<"svg" | "png">;
  scales: Array<1 | 2 | 3>;
};

export const assetExportPresets: AssetExportPreset[] = [
  {
    id: "svg",
    label: "SVG",
    formats: ["svg"],
    scales: [1],
  },
  {
    id: "retina",
    label: "Retina",
    formats: ["svg", "png"],
    scales: [1, 2, 3],
  },
  {
    id: "handoff",
    label: "Inspect",
    formats: ["svg", "png"],
    scales: [1, 2],
  },
];

export function createLayerAssetBundle({
  layer,
  layers,
  pages,
  variables,
  comments,
  presetId,
}: {
  layer: DesignLayer;
  layers: DesignLayer[];
  pages: DesignPage[];
  variables: Record<string, string>;
  comments: DesignComment[];
  presetId: AssetExportPresetId;
}) {
  const preset =
    assetExportPresets.find((item) => item.id === presetId) ??
    assetExportPresets[0];
  const slug = getAssetSlug(layer);
  const handoffJson = getLayerHandoffCode(
    layer,
    variables,
    comments,
    layers,
    pages,
  );
  const assetReport = getLayerAssetReport(layer);

  return {
    type: "essence.layer-asset-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    preset,
    layer: {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      width: layer.width,
      height: layer.height,
      readyForDev: Boolean(layer.readyForDev),
    },
    review: {
      exportable: assetReport.exportable,
      kind: assetReport.kind,
      recommendedFormat: assetReport.recommendedFormat,
      notes: assetReport.notes,
    },
    files: preset.formats.flatMap((format) =>
      preset.scales.map((scale) => ({
        filename: `${slug}${scale > 1 ? `@${scale}x` : ""}.${format}`,
        format,
        scale,
        content: format === "svg" ? getLayerSvgAssetCode(layer) : null,
      })),
    ),
    handoff: JSON.parse(handoffJson) as unknown,
  };
}

export function getAssetSlug(layer: DesignLayer) {
  return (
    layer.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "design-layer"
  );
}
