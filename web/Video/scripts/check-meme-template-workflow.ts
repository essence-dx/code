import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProject } from "../src/lib/editor/factory";
import { createMemeLayers } from "../src/lib/editor/meme";
import { findMemeTemplatePreset, memeTemplatePresets } from "../src/lib/editor/meme-templates";
import { exportPresets, getAspectPreset } from "../src/lib/editor/presets";
import { projectSchema } from "../src/lib/projects/project-sync-schema";

assert.equal(memeTemplatePresets.length >= 4, true);
assert.equal(new Set(memeTemplatePresets.map((preset) => preset.id)).size, memeTemplatePresets.length);
assert.equal(memeTemplatePresets.every((preset) => exportPresets.some((exportPreset) => exportPreset.id === preset.exportPresetId)), true);
assert.equal(memeTemplatePresets.some((preset) => preset.aspectRatio === "9:16" && preset.exportPresetId === "mp4-vertical-1080"), true);
assert.equal(memeTemplatePresets.some((preset) => preset.aspectRatio === "1:1" && preset.exportPresetId === "gif-social-square"), true);

const template = findMemeTemplatePreset("vertical-reaction");
const aspect = getAspectPreset(template.aspectRatio);
const project = createProject("Meme check", template.aspectRatio);
const layers = createMemeLayers({
  project,
  topText: template.topText,
  bottomText: template.bottomText,
  duration: template.duration,
  style: template.style,
  track: 0,
});

project.layers = layers;
project.duration = template.duration;
assert.equal(project.width, aspect.width);
assert.equal(project.height, aspect.height);
assert.equal(layers.length >= 3, true);
assert.equal(layers.filter((layer) => layer.kind === "text").length, 2);
assert.equal(projectSchema.safeParse(project).success, true);

const panel = readFileSync(new URL("../src/features/editor/components/meme-generator-panel.tsx", import.meta.url), "utf8");
assert.match(panel, /memeTemplatePresets/);
assert.match(panel, /setAspectRatio\(template\.aspectRatio\)/);
assert.match(panel, /selectedExportPreset/);
assert.match(panel, /Create meme/);

console.log("Meme template workflow guard passed.");
