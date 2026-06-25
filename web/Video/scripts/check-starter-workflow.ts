import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProject } from "../src/lib/editor/factory";
import { createSocialFormatProjectResize } from "../src/lib/editor/project-variants";
import { exportPresets } from "../src/lib/editor/presets";
import { findSocialFormatPreset, socialFormatPresets } from "../src/lib/editor/social-format-presets";
import { starterWorkflowPresets } from "../src/lib/editor/starter-workflows";
import { editorTemplates } from "../src/lib/editor/templates";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

assert.equal(starterWorkflowPresets.length >= 5, true);
for (const expected of ["gaming-highlight", "podcast-clip", "education-lesson", "marketing-launch", "product-demo"]) {
  assert.equal(starterWorkflowPresets.some((preset) => preset.id === expected), true);
}
assert.equal(starterWorkflowPresets.every((workflow) => socialFormatPresets.some((format) => format.id === workflow.socialFormatId)), true);
assert.equal(starterWorkflowPresets.every((workflow) => exportPresets.some((preset) => preset.id === workflow.exportPresetId)), true);
assert.equal(starterWorkflowPresets.every((workflow) => workflow.templateIds.every((templateId) => editorTemplates.some((template) => template.id === templateId))), true);

const project = createProject("Starter check", "16:9");
const workflow = starterWorkflowPresets.find((preset) => preset.id === "product-demo");
assert.ok(workflow);
const socialFormat = findSocialFormatPreset(workflow.socialFormatId);
const resized = createSocialFormatProjectResize(project, socialFormat);
assert.equal(resized.id, project.id);
assert.equal(resized.socialFormatId, workflow.socialFormatId);
assert.equal(syncedProjectPayloadSchema.safeParse({ project: resized, mediaAssets: [] }).success, true);

const panel = readFileSync(new URL("../src/features/editor/components/starter-workflow-panel.tsx", import.meta.url), "utf8");
assert.match(panel, /starterWorkflowPresets/);
assert.match(panel, /createSocialFormatProjectResize/);
assert.match(panel, /queueExport/);
assert.match(panel, /Start workflow/);

const creationPanel = readFileSync(new URL("../src/features/editor/components/creation-panel.tsx", import.meta.url), "utf8");
assert.match(creationPanel, /StarterWorkflowPanel/);
assert.match(creationPanel, /value="starters"/);

console.log("Starter workflow guard passed.");
