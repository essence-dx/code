import { fontFamilyOptions } from "@/features/editor/text-options";
import type { DesignPage } from "@/features/editor/types";

export type TextFontInventoryStatus = "ready" | "review";

export type TextFontInventoryLayer = {
  pageId: string;
  pageName: string;
  layerId: string;
  layerName: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
};

export type TextFontInventoryFamily = {
  fontFamily: string;
  label: string;
  status: TextFontInventoryStatus;
  layerCount: number;
  pageCount: number;
  weights: number[];
  sizes: number[];
  layers: TextFontInventoryLayer[];
  note: string;
};

export type TextFontInventoryReport = {
  textLayerCount: number;
  fontFamilyCount: number;
  readyFamilyCount: number;
  reviewFamilyCount: number;
  families: TextFontInventoryFamily[];
};

const fallbackFontFamily = "Inter, Arial, sans-serif";
const knownFontValues = new Map(
  fontFamilyOptions.map((option) => [option.value, option.label]),
);

export function getTextFontInventory(
  pages: DesignPage[],
): TextFontInventoryReport {
  const familyMap = new Map<string, TextFontInventoryLayer[]>();

  for (const page of pages) {
    for (const layer of page.layers) {
      if (layer.text === undefined) {
        continue;
      }

      const fontFamily = layer.fontFamily?.trim() || fallbackFontFamily;
      const familyLayers = familyMap.get(fontFamily) ?? [];

      familyLayers.push({
        pageId: page.id,
        pageName: page.name,
        layerId: layer.id,
        layerName: layer.name,
        fontFamily,
        fontSize: layer.fontSize ?? 16,
        fontWeight: layer.fontWeight ?? 400,
      });
      familyMap.set(fontFamily, familyLayers);
    }
  }

  const families = Array.from(familyMap.entries())
    .map(([fontFamily, layers]) => createFontFamilyReport(fontFamily, layers))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "review" ? -1 : 1;
      }

      return b.layerCount - a.layerCount || a.label.localeCompare(b.label);
    });

  return {
    textLayerCount: families.reduce((count, family) => count + family.layerCount, 0),
    fontFamilyCount: families.length,
    readyFamilyCount: families.filter((family) => family.status === "ready").length,
    reviewFamilyCount: families.filter((family) => family.status === "review")
      .length,
    families,
  };
}

export function getTextFontInventoryCsv(report: TextFontInventoryReport) {
  return [
    [
      "status",
      "fontFamily",
      "label",
      "layerCount",
      "pageCount",
      "weights",
      "sizes",
      "note",
      "layers",
    ],
    ...report.families.map((family) => [
      family.status,
      family.fontFamily,
      family.label,
      family.layerCount,
      family.pageCount,
      family.weights.join(" "),
      family.sizes.join(" "),
      family.note,
      family.layers
        .map((layer) => `${layer.pageName}/${layer.layerName}`)
        .join(" | "),
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getTextFontInventoryMarkdown(report: TextFontInventoryReport) {
  const lines = [
    "# Text Font Inventory",
    "",
    `Text layers: ${report.textLayerCount}`,
    `Font families: ${report.fontFamilyCount}`,
    `Ready families: ${report.readyFamilyCount}`,
    `Review families: ${report.reviewFamilyCount}`,
    "",
    "## Families",
    "",
  ];

  if (report.families.length === 0) {
    lines.push("- No text layers found.");
  }

  for (const family of report.families) {
    lines.push(
      `- ${family.label} (${family.status}) - ${family.layerCount} layers, ${family.pageCount} pages. ${family.note}`,
    );
  }

  return lines.join("\n");
}

function createFontFamilyReport(
  fontFamily: string,
  layers: TextFontInventoryLayer[],
): TextFontInventoryFamily {
  const label = knownFontValues.get(fontFamily) ?? getDisplayFontName(fontFamily);
  const pageIds = new Set(layers.map((layer) => layer.pageId));
  const weights = uniqueSorted(layers.map((layer) => layer.fontWeight));
  const sizes = uniqueSorted(layers.map((layer) => layer.fontSize));
  const known = knownFontValues.has(fontFamily);
  const status = known ? "ready" : "review";

  return {
    fontFamily,
    label,
    status,
    layerCount: layers.length,
    pageCount: pageIds.size,
    weights,
    sizes,
    layers,
    note: known
      ? "Configured in the editor font menu."
      : "Custom or missing from the editor font menu; verify availability before handoff.",
  };
}

function getDisplayFontName(fontFamily: string) {
  return fontFamily.split(",")[0]?.replaceAll("\"", "").trim() || "Unknown font";
}

function uniqueSorted(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
