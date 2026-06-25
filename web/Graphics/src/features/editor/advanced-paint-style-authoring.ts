import { getContrastReport } from "@/features/editor/color-contrast";
import {
  getLayerFillPaints,
  getLayerStrokePaints,
  getPrimaryFillValue,
} from "@/features/editor/paint-stack";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
  DesignPaint,
  DesignPaintStyle,
} from "@/features/editor/types";

export type AdvancedPaintStyleAuthoringStatus =
  | "blocked"
  | "ready"
  | "review";

export type PaintAuthoringFamily =
  | "conic-gradient"
  | "image-fill"
  | "linear-gradient"
  | "mesh-gradient"
  | "noise-texture"
  | "radial-gradient"
  | "solid"
  | "transparent";

export type AdvancedPaintStyleAuthoringRowCategory =
  | "contrast-preview"
  | "gradient-family"
  | "image-fill-control"
  | "paint-stack"
  | "reusable-preset"
  | "swatch-library";

export type AdvancedPaintStyleAuthoringRow = {
  id: string;
  status: AdvancedPaintStyleAuthoringStatus;
  category: AdvancedPaintStyleAuthoringRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type PaintAuthoringFamilyCoverage = {
  family: PaintAuthoringFamily;
  label: string;
  count: number;
  sample: string;
};

export type PaintContrastPreview = {
  id: string;
  status: AdvancedPaintStyleAuthoringStatus;
  layerId: string;
  layerName: string;
  foreground: string;
  background: string;
  ratio: number;
  label: "AAA" | "AA" | "Low";
};

export type AdvancedPaintStyleAuthoringReport = {
  generatedAt: string;
  status: AdvancedPaintStyleAuthoringStatus;
  score: number;
  layerCount: number;
  paintValueCount: number;
  multipleFillLayerCount: number;
  multipleStrokeLayerCount: number;
  gradientFamilyCount: number;
  swatchCount: number;
  imageFillControlCount: number;
  contrastPreviewCount: number;
  lowContrastPreviewCount: number;
  reusablePresetCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  gradientFamilies: PaintAuthoringFamilyCoverage[];
  contrastPreviews: PaintContrastPreview[];
  rows: AdvancedPaintStyleAuthoringRow[];
};

export const paintAuthoringSwatches = [
  "#ffffff",
  "#f4f4f5",
  "#a1a1aa",
  "#27272a",
  "#18181b",
  "#5eead4",
  "#38bdf8",
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#fb7185",
  "#f97316",
  "#facc15",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
];

export const reusablePaintAuthoringPresets: Array<{
  id: string;
  label: string;
  value: string;
}> = [
  {
    id: "solid-interface-ink",
    label: "Interface ink",
    value: "#18181b",
  },
  {
    id: "linear-launch",
    label: "Launch linear",
    value: "linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)",
  },
  {
    id: "radial-spotlight",
    label: "Spotlight radial",
    value:
      "radial-gradient(circle at 35% 30%, #ffffff 0%, #5eead4 22%, #0f172a 72%, #020617 100%)",
  },
  {
    id: "conic-spectrum",
    label: "Spectrum conic",
    value:
      "conic-gradient(from 160deg at 50% 50%, #38bdf8, #818cf8, #f472b6, #38bdf8)",
  },
  {
    id: "mesh-aurora",
    label: "Aurora mesh",
    value:
      "radial-gradient(circle at 15% 20%, #5eead4 0%, transparent 28%), radial-gradient(circle at 80% 10%, #818cf8 0%, transparent 30%), linear-gradient(135deg, #020617 0%, #18181b 100%)",
  },
  {
    id: "noise-panel",
    label: "Noise panel",
    value:
      "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.24) 1px, transparent 0), linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
  },
  {
    id: "image-cover",
    label: "Image cover",
    value: "url(\"https://images.example.com/cover.png\") center / cover no-repeat",
  },
];

const statusRank: Record<AdvancedPaintStyleAuthoringStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

const familyLabels: Record<PaintAuthoringFamily, string> = {
  "conic-gradient": "Conic gradient",
  "image-fill": "Image fill",
  "linear-gradient": "Linear gradient",
  "mesh-gradient": "Mesh gradient",
  "noise-texture": "Noise texture",
  "radial-gradient": "Radial gradient",
  solid: "Solid",
  transparent: "Transparent",
};

export function getAdvancedPaintStyleAuthoringReport({
  activePage,
  document,
  generatedAt = new Date().toISOString(),
}: {
  activePage: DesignPage;
  document: DesignDocument;
  generatedAt?: string;
}): AdvancedPaintStyleAuthoringReport {
  const layers = document.pages.flatMap((page) => page.layers);
  const paintStyles = Object.values(document.paintStyles ?? {});
  const allPaintValues = [
    ...layers.flatMap(getLayerPaintValues),
    ...paintStyles.map((style) => style.value),
    ...reusablePaintAuthoringPresets.map((preset) => preset.value),
  ];
  const gradientFamilies = getGradientFamilyCoverage(allPaintValues);
  const multipleFillLayerCount = layers.filter(
    (layer) => getLayerFillPaints(layer).length > 1,
  ).length;
  const multipleStrokeLayerCount = layers.filter(
    (layer) => getLayerStrokePaints(layer).length > 1,
  ).length;
  const imageFillControlCount = layers.filter(hasImageFillControls).length;
  const contrastPreviews = getContrastPreviews(document.pages, activePage);
  const lowContrastPreviewCount = contrastPreviews.filter(
    (preview) => preview.status !== "ready",
  ).length;
  const swatches = getReusableSwatches(paintStyles);
  const rows = getRows({
    contrastPreviews,
    gradientFamilies,
    imageFillControlCount,
    multipleFillLayerCount,
    multipleStrokeLayerCount,
    paintStyles,
    paintValueCount: allPaintValues.length,
    swatchCount: swatches.length,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    layerCount: layers.length,
    paintValueCount: allPaintValues.length,
    multipleFillLayerCount,
    multipleStrokeLayerCount,
    gradientFamilyCount: gradientFamilies.length,
    swatchCount: swatches.length,
    imageFillControlCount,
    contrastPreviewCount: contrastPreviews.length,
    lowContrastPreviewCount,
    reusablePresetCount: paintStyles.length,
    readyCount,
    reviewCount,
    blockedCount,
    gradientFamilies,
    contrastPreviews,
    rows,
  };
}

export function getAdvancedPaintStyleAuthoringJson(
  report: AdvancedPaintStyleAuthoringReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdvancedPaintStyleAuthoringCsv(
  report: AdvancedPaintStyleAuthoringReport,
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

export function getAdvancedPaintStyleAuthoringMarkdown(
  report: AdvancedPaintStyleAuthoringReport,
) {
  return [
    "# Advanced Paint Style Authoring",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Paint values: ${report.paintValueCount}`,
    `Paint stack layers: ${report.multipleFillLayerCount} multiple fills / ${report.multipleStrokeLayerCount} multiple strokes`,
    `Gradient families: ${report.gradientFamilyCount}`,
    `Swatches: ${report.swatchCount}`,
    `Image fill controls: ${report.imageFillControlCount}`,
    `Contrast previews: ${report.contrastPreviewCount}`,
    `Reusable paint presets: ${report.reusablePresetCount}`,
    "",
    "This handoff covers multiple fills, multiple strokes, gradient families, swatches, image fill controls, contrast previews, and reusable paint presets.",
    "",
    "## gradient families",
    "",
    ...report.gradientFamilies.map(
      (family) =>
        `- ${family.label}: ${family.count} value${family.count === 1 ? "" : "s"} (${family.sample})`,
    ),
    "",
    "## paint authoring rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Evidence: ${row.evidence}. ${row.recommendation}`,
    ),
  ].join("\n");
}

function getRows({
  contrastPreviews,
  gradientFamilies,
  imageFillControlCount,
  multipleFillLayerCount,
  multipleStrokeLayerCount,
  paintStyles,
  paintValueCount,
  swatchCount,
}: {
  contrastPreviews: PaintContrastPreview[];
  gradientFamilies: PaintAuthoringFamilyCoverage[];
  imageFillControlCount: number;
  multipleFillLayerCount: number;
  multipleStrokeLayerCount: number;
  paintStyles: DesignPaintStyle[];
  paintValueCount: number;
  swatchCount: number;
}): AdvancedPaintStyleAuthoringRow[] {
  const lowContrastCount = contrastPreviews.filter(
    (preview) => preview.status !== "ready",
  ).length;

  const rows: AdvancedPaintStyleAuthoringRow[] = [
    {
      id: "paint-stack:fill",
      status: multipleFillLayerCount > 0 ? "ready" : "review",
      category: "paint-stack",
      label: "Multiple fills",
      detail: `${multipleFillLayerCount} layer${multipleFillLayerCount === 1 ? "" : "s"} use layered fill paint stacks.`,
      evidence: `${paintValueCount} authored paint values`,
      recommendation:
        multipleFillLayerCount > 0
          ? "Keep layered fills in the style handoff evidence."
          : "Author at least one layered fill before calling this parity-ready.",
      metric: multipleFillLayerCount,
    },
    {
      id: "paint-stack:stroke",
      status: multipleStrokeLayerCount > 0 ? "ready" : "review",
      category: "paint-stack",
      label: "Multiple strokes",
      detail: `${multipleStrokeLayerCount} layer${multipleStrokeLayerCount === 1 ? "" : "s"} use authored stroke paint stacks.`,
      evidence: "Stroke stacks preserve visible paint order and primary stroke rendering.",
      recommendation:
        multipleStrokeLayerCount > 0
          ? "Use stroke stacks for keylines, accent borders, and export review."
          : "Add stroke-stack examples to critical component frames.",
      metric: multipleStrokeLayerCount,
    },
    {
      id: "gradient-family:coverage",
      status:
        gradientFamilies.length >= 4
          ? "ready"
          : gradientFamilies.length >= 2
            ? "review"
            : "blocked",
      category: "gradient-family",
      label: "Gradient families",
      detail: `${gradientFamilies.length} gradient families are available across document paints and built-in presets.`,
      evidence: gradientFamilies.map((family) => family.label).join(" | "),
      recommendation:
        "Keep linear, radial, conic, mesh, and noise-like presets available for advanced surfaces.",
      metric: gradientFamilies.length,
    },
    {
      id: "swatch-library:coverage",
      status: swatchCount >= 8 ? "ready" : swatchCount >= 4 ? "review" : "blocked",
      category: "swatch-library",
      label: "Swatches",
      detail: `${swatchCount} swatches are available from the built-in palette and reusable solid paint styles.`,
      evidence: `${paintAuthoringSwatches.length} built-in swatches`,
      recommendation:
        "Keep reusable color swatches close to paint stack authoring controls.",
      metric: swatchCount,
    },
    {
      id: "image-fill-control:coverage",
      status: imageFillControlCount > 0 ? "ready" : "review",
      category: "image-fill-control",
      label: "Image fill controls",
      detail: `${imageFillControlCount} layer${imageFillControlCount === 1 ? "" : "s"} expose image paint, image source, or image fit controls.`,
      evidence: "Image fills support url() values and image layers support cover/contain/fill fit.",
      recommendation:
        imageFillControlCount > 0
          ? "Keep image fill and fit evidence in handoff exports."
          : "Add image fill examples before publishing image-heavy libraries.",
      metric: imageFillControlCount,
    },
    {
      id: "contrast-preview:coverage",
      status:
        contrastPreviews.length === 0
          ? "review"
          : lowContrastCount > 0
            ? "blocked"
            : "ready",
      category: "contrast-preview",
      label: "Contrast previews",
      detail:
        contrastPreviews.length === 0
          ? "No text layers have hex foreground/background pairs for contrast previews."
          : `${contrastPreviews.length} contrast preview${contrastPreviews.length === 1 ? "" : "s"} are available with ${lowContrastCount} low result${lowContrastCount === 1 ? "" : "s"}.`,
      evidence:
        contrastPreviews
          .slice(0, 4)
          .map((preview) => `${preview.layerName}:${preview.ratio.toFixed(2)}:${preview.label}`)
          .join(" | ") || "No contrast pairs",
      recommendation:
        lowContrastCount > 0
          ? "Fix low-contrast text before release."
          : "Keep contrast previews attached to reusable paint presets.",
      metric: contrastPreviews.length,
    },
    {
      id: "reusable-preset:coverage",
      status:
        paintStyles.length >= 3 ? "ready" : paintStyles.length > 0 ? "review" : "blocked",
      category: "reusable-preset",
      label: "Reusable paint presets",
      detail: `${paintStyles.length} reusable paint preset${paintStyles.length === 1 ? "" : "s"} are saved in the document.`,
      evidence:
        paintStyles.map((style) => style.name).join(" | ") ||
        "No document paint styles",
      recommendation:
        paintStyles.length >= 3
          ? "Publish paint presets with the design-system handoff."
          : "Save reusable solid, gradient, and image presets before library publication.",
      metric: paintStyles.length,
    },
  ];

  return rows.sort(sortRows);
}

function getLayerPaintValues(layer: DesignLayer) {
  return [
    ...getLayerFillPaints(layer).map((paint) => paint.value),
    ...getLayerStrokePaints(layer).map((paint) => paint.value),
    layer.textColor,
  ].filter((value): value is string => Boolean(value));
}

function getGradientFamilyCoverage(values: string[]): PaintAuthoringFamilyCoverage[] {
  const familyMap = new Map<PaintAuthoringFamily, string[]>();

  for (const value of values) {
    const family = getPaintFamily(value);

    if (family === "solid" || family === "transparent") {
      continue;
    }

    familyMap.set(family, [...(familyMap.get(family) ?? []), value]);
  }

  return Array.from(familyMap.entries())
    .map(([family, familyValues]) => ({
      family,
      label: familyLabels[family],
      count: familyValues.length,
      sample: familyValues[0] ?? "",
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

function getPaintFamily(value: string): PaintAuthoringFamily {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "transparent") {
    return "transparent";
  }

  if (normalized.startsWith("url(")) {
    return "image-fill";
  }

  if (normalized.includes("1px 1px")) {
    return "noise-texture";
  }

  if (
    normalized.includes("radial-gradient") &&
    normalized.includes("linear-gradient") &&
    normalized.includes("transparent")
  ) {
    return "mesh-gradient";
  }

  if (normalized.startsWith("linear-gradient")) {
    return "linear-gradient";
  }

  if (normalized.startsWith("radial-gradient")) {
    return "radial-gradient";
  }

  if (normalized.startsWith("conic-gradient")) {
    return "conic-gradient";
  }

  return "solid";
}

function getReusableSwatches(paintStyles: DesignPaintStyle[]) {
  const solidStyleSwatches = paintStyles
    .map((style) => style.value)
    .filter(isHexColor);

  return Array.from(new Set([...paintAuthoringSwatches, ...solidStyleSwatches]));
}

function hasImageFillControls(layer: DesignLayer) {
  return (
    layer.type === "image" ||
    Boolean(layer.imageSrc || layer.imageFit) ||
    getLayerFillPaints(layer).some(isImagePaint) ||
    getLayerStrokePaints(layer).some(isImagePaint)
  );
}

function isImagePaint(paint: DesignPaint) {
  return getPaintFamily(paint.value) === "image-fill";
}

function getContrastPreviews(
  pages: DesignPage[],
  activePage: DesignPage,
): PaintContrastPreview[] {
  return pages.flatMap((page) =>
    page.layers
      .filter((layer) => layer.visible && layer.text !== undefined)
      .flatMap((layer) => getContrastPreview(layer, page, activePage)),
  );
}

function getContrastPreview(
  layer: DesignLayer,
  page: DesignPage,
  activePage: DesignPage,
): PaintContrastPreview[] {
  const foreground = layer.textColor;
  const background = getTextLayerBackground(layer, page.background);

  if (!foreground || !isHexColor(foreground) || !isHexColor(background)) {
    return [];
  }

  const contrast = getContrastReport(foreground, background);

  if (!contrast) {
    return [];
  }

  return [
    {
      id: `contrast:${page.id}:${layer.id}`,
      status: contrast.label === "Low" ? "blocked" : "ready",
      layerId: layer.id,
      layerName: page.id === activePage.id ? layer.name : `${page.name} / ${layer.name}`,
      foreground,
      background,
      ratio: contrast.ratio,
      label: contrast.label,
    },
  ];
}

function getTextLayerBackground(layer: DesignLayer, pageBackground: string) {
  const fill = getPrimaryFillValue(layer);

  if (!fill || fill === "transparent") {
    return pageBackground;
  }

  return fill;
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function sortRows(
  first: AdvancedPaintStyleAuthoringRow,
  second: AdvancedPaintStyleAuthoringRow,
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
