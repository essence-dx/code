import { readFileSync } from "node:fs";
import {
  getAdvancedPaintStyleAuthoringCsv,
  getAdvancedPaintStyleAuthoringJson,
  getAdvancedPaintStyleAuthoringMarkdown,
  getAdvancedPaintStyleAuthoringReport,
} from "../src/features/editor/advanced-paint-style-authoring";
import {
  createLayerPaint,
  getLayerStrokePaints,
  getPrimaryStrokeValue,
  getStrokePaintLayerPatch,
} from "../src/features/editor/paint-stack";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T16:00:00.000Z";

const heroLayer: DesignLayer = {
  id: "hero-card",
  type: "frame",
  name: "Hero card",
  x: 64,
  y: 64,
  width: 480,
  height: 320,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)",
  fillPaints: [
    createLayerPaint("linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)", {
      name: "Depth gradient",
    }),
    createLayerPaint("radial-gradient(circle at 30% 25%, #ffffff 0%, transparent 35%)", {
      name: "Highlight wash",
      opacity: 0.48,
      blendMode: "screen",
    }),
  ],
  stroke: "#38bdf8",
  strokePaints: [
    createLayerPaint("#38bdf8", { name: "Outer keyline" }),
    createLayerPaint("linear-gradient(90deg, #38bdf8 0%, #f472b6 100%)", {
      name: "Accent stroke",
      opacity: 0.9,
    }),
  ],
  strokeWidth: 3,
  cornerRadius: 24,
};

const textLayer: DesignLayer = {
  id: "hero-title",
  type: "text",
  name: "Hero title",
  x: 96,
  y: 112,
  width: 340,
  height: 72,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "transparent",
  stroke: "transparent",
  strokeWidth: 0,
  cornerRadius: 0,
  text: "Paint system",
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: 0,
  textAlign: "left",
  textColor: "#ffffff",
};

const imageLayer: DesignLayer = {
  id: "preview-image",
  type: "image",
  name: "Preview image fill",
  x: 96,
  y: 208,
  width: 200,
  height: 120,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "url(\"https://images.example.com/preview.png\") center / cover no-repeat",
  fillPaints: [
    createLayerPaint(
      "url(\"https://images.example.com/preview.png\") center / cover no-repeat",
      { name: "Hero image fill" },
    ),
  ],
  stroke: "#111827",
  strokeWidth: 1,
  cornerRadius: 12,
  imageSrc: "data:image/png;base64,preview",
  imageAlt: "Preview image for paint authoring.",
  imageFit: "contain",
};

const page: DesignPage = {
  id: "page-paint-authoring",
  name: "Paint authoring",
  background: "#0f172a",
  layers: [heroLayer, textLayer, imageLayer],
};

const document: DesignDocument = {
  version: 1,
  activePageId: page.id,
  pages: [page],
  variables: {},
  components: {},
  paintStyles: {
    "paint-brand": {
      id: "paint-brand",
      name: "Brand primary",
      value: "#38bdf8",
      createdAt: now,
      updatedAt: now,
    },
    "paint-gradient": {
      id: "paint-gradient",
      name: "Launch gradient",
      value: "linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)",
      createdAt: now,
      updatedAt: now,
    },
    "paint-image": {
      id: "paint-image",
      name: "Image cover preset",
      value: "url(\"https://images.example.com/preview.png\") center / cover no-repeat",
      createdAt: now,
      updatedAt: now,
    },
  },
  updatedAt: now,
};

const strokePatch = getStrokePaintLayerPatch(heroLayer.strokePaints ?? []);
const patchedLayer = {
  ...heroLayer,
  ...strokePatch,
};

assert(
  getLayerStrokePaints(heroLayer).length === 2,
  "Stroke stack should preserve multiple authored strokes.",
);
assert(
  getPrimaryStrokeValue(patchedLayer) === "#38bdf8",
  "Primary stroke value should be derived from the visible stroke stack.",
);

const report = getAdvancedPaintStyleAuthoringReport({
  activePage: page,
  document,
  generatedAt: now,
});

assert(report.status === "ready", "Advanced paint authoring fixture should be ready.");
assert(report.score >= 95, "Ready paint authoring fixture should keep a high score.");
assert(report.multipleFillLayerCount >= 1, "Multiple fill stacks should be counted.");
assert(report.multipleStrokeLayerCount >= 1, "Multiple stroke stacks should be counted.");
assert(report.gradientFamilyCount >= 4, "Gradient families should cover advanced presets.");
assert(report.swatchCount >= 8, "Swatch evidence should include reusable palette coverage.");
assert(report.imageFillControlCount >= 1, "Image fill controls should be represented.");
assert(report.contrastPreviewCount >= 1, "Contrast previews should be represented.");
assert(report.reusablePresetCount >= 3, "Reusable paint presets should be counted.");
assert(
  report.rows.some((row) => row.category === "paint-stack" && row.status === "ready"),
  "Paint stack rows should be exportable.",
);
assert(
  report.rows.some((row) => row.category === "reusable-preset" && row.status === "ready"),
  "Reusable preset rows should be exportable.",
);

const markdown = getAdvancedPaintStyleAuthoringMarkdown(report);
const csv = getAdvancedPaintStyleAuthoringCsv(report);
const json = JSON.parse(getAdvancedPaintStyleAuthoringJson(report)) as {
  rows: unknown[];
  gradientFamilies: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Advanced Paint Style Authoring"), "Markdown should include a clear title.");
assert(markdown.includes("multiple fills"), "Markdown should mention multiple fills.");
assert(markdown.includes("multiple strokes"), "Markdown should mention multiple strokes.");
assert(markdown.includes("gradient families"), "Markdown should mention gradient families.");
assert(markdown.includes("swatches"), "Markdown should mention swatches.");
assert(markdown.includes("image fill controls"), "Markdown should mention image fill controls.");
assert(markdown.includes("contrast previews"), "Markdown should mention contrast previews.");
assert(markdown.includes("reusable paint presets"), "Markdown should mention reusable paint presets.");
assert(csv.includes("paint-stack"), "CSV should include paint stack rows.");
assert(csv.includes("gradient-family"), "CSV should include gradient family rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve rows.");
assert(json.gradientFamilies.length === report.gradientFamilies.length, "JSON should preserve gradient families.");
assert(
  packageJson.scripts["editor:advanced-paint-style-authoring-smoke"]?.includes(
    "advanced-paint-style-authoring-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Advanced paint style authoring smoke passed: ${report.score} score, ${report.multipleStrokeLayerCount} stroke-stack layer(s).`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
