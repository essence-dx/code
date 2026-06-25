import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROJECT_FORMAT_VERSION, type EditorProject, type LayerStyle } from "../src/lib/editor/types";
import { editorTemplates } from "../src/lib/editor/templates";
import { projectSchema } from "../src/lib/projects/project-sync-schema";

const now = "2026-05-14T00:00:00.000Z";
const style: LayerStyle = {
  fill: "#ffffff",
  stroke: "transparent",
  background: "#00000088",
  fontFamily: "Geist",
  fontSize: 42,
  fontWeight: 700,
  radius: 8,
  opacity: 1,
  blur: 0,
};

const project: EditorProject = {
  formatVersion: PROJECT_FORMAT_VERSION,
  id: "project_asset_brand_check",
  title: "Asset brand check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 30,
  fps: 30,
  background: "#111827",
  layers: [],
  markers: [],
  mediaCollections: [{ id: "collection_a", name: "Launch shots", assetIds: ["asset_a", "asset_b"], createdAt: now, updatedAt: now }],
  layerStylePresets: [{ id: "style_a", name: "Headline style", style, createdAt: now, updatedAt: now }],
  brandTypographyPresets: [
    {
      id: "typography_a",
      name: "Creator pair",
      headingFontFamily: "Geist",
      bodyFontFamily: "Inter",
      captionFontFamily: "Geist",
      headingWeight: 800,
      bodyWeight: 500,
      captionWeight: 700,
      createdAt: now,
      updatedAt: now,
    },
  ],
  updatedAt: now,
};

assert.equal(projectSchema.safeParse(project).success, true);
assert.equal(
  projectSchema.safeParse({ ...project, mediaCollections: [{ ...project.mediaCollections?.[0], name: "" }] }).success,
  false,
);
assert.equal(
  projectSchema.safeParse({ ...project, brandTypographyPresets: [{ ...project.brandTypographyPresets?.[0], headingWeight: 0 }] }).success,
  false,
);

const templateCategories = new Set<string>(editorTemplates.map((template) => template.category));
for (const category of ["social", "ad", "explainer", "meme", "thumbnail", "banner", "caption", "intro", "outro", "layout"]) {
  assert.equal(templateCategories.has(category), true, `${category} template category should be represented.`);
}
assert.equal(editorTemplates.length >= 10, true);

const brandColors = ["#123456", "#abcdef", "#f97316", "#020617", "#f8fafc"];
const lowerThird = editorTemplates.find((template) => template.id === "lower-third");
const intro = editorTemplates.find((template) => template.id === "intro-title");
const outro = editorTemplates.find((template) => template.id === "outro-cta");
assert.ok(lowerThird);
assert.ok(intro);
assert.ok(outro);
assert.equal(lowerThird.createLayers(0, { brandColors }).some((layer) => layer.style.background === "#020617cc"), true);
assert.equal(intro.createLayers(0, { brandColors }).some((layer) => layer.style.fill === "#f8fafc"), true);
assert.equal(outro.createLayers(0, { brandColors }).some((layer) => layer.style.background === "#f97316"), true);

const mediaBin = readFileSync(new URL("../src/features/editor/components/media-bin.tsx", import.meta.url), "utf8");
assert.match(mediaBin, /createMediaCollection/);
assert.match(mediaBin, /toggleMediaAssetCollection/);
assert.match(mediaBin, /reconnectMissingMediaBatch/);

const creationPanel = readFileSync(new URL("../src/features/editor/components/creation-panel.tsx", import.meta.url), "utf8");
assert.match(creationPanel, /templateCategoryFilters/);
assert.match(creationPanel, /templateQuery/);
assert.match(creationPanel, /outro/);
assert.match(creationPanel, /matchesTemplateQuery/);
assert.match(creationPanel, /BrandKitPanel/);
assert.match(creationPanel, /BrandTypographyPanel/);

const templateSlice = readFileSync(new URL("../src/features/editor/state/editor-template-slice.ts", import.meta.url), "utf8");
assert.match(templateSlice, /brandColors/);
assert.match(templateSlice, /brandColorsForTemplate/);

const inspectorMotionEffectsSection = readFileSync(new URL("../src/features/editor/components/inspector-motion-effects-section.tsx", import.meta.url), "utf8");
assert.match(inspectorMotionEffectsSection, /LayerStylePresetsPanel/);

console.log("Asset library and brand workflow checks passed.");
