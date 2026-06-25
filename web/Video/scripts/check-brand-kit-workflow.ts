import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brandColorsForTemplate, normalizeBrandKitSettings } from "../src/lib/editor/brand-kit";
import { PROJECT_FORMAT_VERSION, type BrandTypographyPreset, type EditorProject, type MediaAsset } from "../src/lib/editor/types";
import { projectSchema } from "../src/lib/projects/project-sync-schema";

const now = "2026-05-15T00:00:00.000Z";

const logoAsset: MediaAsset = {
  id: "asset_logo",
  name: "Studio logo.png",
  type: "image",
  mimeType: "image/png",
  size: 120_000,
  duration: 5,
  width: 512,
  height: 256,
  storageKey: "logos/studio-logo.png",
  source: "browser-indexeddb",
  createdAt: now,
};

const typographyPreset: BrandTypographyPreset = {
  id: "type_brand",
  name: "Launch brand",
  headingFontFamily: "Geist",
  bodyFontFamily: "Inter",
  captionFontFamily: "Geist",
  headingWeight: 800,
  bodyWeight: 500,
  captionWeight: 700,
  createdAt: now,
  updatedAt: now,
};

const brandKit = normalizeBrandKitSettings(
  {
    logoAssetIds: ["asset_logo", "asset_missing"],
    fontAssets: [
      {
        id: "font_brand",
        name: "Launch Sans.woff2",
        family: "EssenceFont_LaunchSans",
        mimeType: "font/woff2",
        size: 80_000,
        storageKey: "font_brand",
        source: "browser-indexeddb",
        createdAt: now,
      },
    ],
    defaultLogoAssetId: "asset_logo",
    defaultFontAssetId: "font_brand",
    defaultPrimaryColor: "#38BDF8",
    defaultSecondaryColor: "#0f172a",
    defaultTypographyPresetId: "type_brand",
    enforceColors: true,
    enforceTypography: true,
    enforceLogo: true,
  },
  { mediaAssets: [logoAsset], typographyPresets: [typographyPreset] },
);

assert.deepEqual(brandKit.logoAssetIds, ["asset_logo"]);
assert.equal(brandKit.fontAssets[0]?.family, "EssenceFont_LaunchSans");
assert.equal(brandKit.defaultFontAssetId, "font_brand");
assert.equal(brandKit.defaultPrimaryColor, "#38bdf8");
assert.equal(brandKit.defaultSecondaryColor, "#0f172a");
assert.equal(brandKit.defaultTypographyPresetId, "type_brand");
assert.equal(brandKit.enforceColors, true);

const orderedColors = brandColorsForTemplate(["#f97316", "#38bdf8", "#14b8a6"], brandKit);
assert.deepEqual(orderedColors.slice(0, 3), ["#38bdf8", "#0f172a", "#f97316"]);

const project: EditorProject = {
  formatVersion: PROJECT_FORMAT_VERSION,
  id: "project_brand_kit_check",
  title: "Brand kit check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 30,
  fps: 30,
  background: "#111827",
  layers: [],
  markers: [],
  mediaCollections: [],
  layerStylePresets: [],
  audioMixPresets: [],
  brandTypographyPresets: [typographyPreset],
  brandKit,
  updatedAt: now,
};

assert.equal(projectSchema.safeParse(project).success, true);
assert.equal(projectSchema.safeParse({ ...project, brandKit: { ...brandKit, defaultPrimaryColor: "blue" } }).success, false);

const brandKitPanel = readFileSync(new URL("../src/features/editor/components/brand-kit-panel.tsx", import.meta.url), "utf8");
assert.match(brandKitPanel, /BrandKitPanel/);
assert.match(brandKitPanel, /Switch/);
assert.match(brandKitPanel, /placeLogo/);
assert.match(brandKitPanel, /applyBrandKitToSelected/);

const typographyPanel = readFileSync(new URL("../src/features/editor/components/brand-typography-panel.tsx", import.meta.url), "utf8");
assert.match(typographyPanel, /Upload font/);
assert.match(typographyPanel, /saveBrowserBrandFont/);

const presetSlice = readFileSync(new URL("../src/features/editor/state/editor-preset-brand-slice.ts", import.meta.url), "utf8");
assert.match(presetSlice, /updateBrandKitSettings/);
assert.match(presetSlice, /addBrandLogoAsset/);
assert.match(presetSlice, /addBrandFontAsset/);
assert.match(presetSlice, /brandKitStylePatch/);

const templateSlice = readFileSync(new URL("../src/features/editor/state/editor-template-slice.ts", import.meta.url), "utf8");
assert.match(templateSlice, /brandColorsForTemplate/);

const creationPanel = readFileSync(new URL("../src/features/editor/components/creation-panel.tsx", import.meta.url), "utf8");
assert.match(creationPanel, /BrandKitPanel/);

console.log("Brand kit workflow checks passed.");
