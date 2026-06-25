import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { createRenderHandoffPlan } from "../src/lib/render/render-handoff";

const shortProject = createProject("Short browser export", "16:9");
shortProject.duration = 12;
shortProject.layers = [createTextLayer("text", 0)];

const shortPlan = createRenderPlan(shortProject, [], "mp4-1080p", "mp4");
const shortHandoff = createRenderHandoffPlan({ project: shortProject, assets: [], plan: shortPlan, isDesktopRuntime: false });
assert.equal(shortHandoff.status, "browser-ready");
assert.equal(shortHandoff.target, "browser");
assert.equal(shortHandoff.canAttemptInBrowser, true);

const longProject = createProject("Long browser export", "16:9");
longProject.duration = 240;
longProject.layers = [createTextLayer("text", 0)];

const longPlan = createRenderPlan(longProject, [], "mp4-1080p", "mp4");
const longBrowserHandoff = createRenderHandoffPlan({ project: longProject, assets: [], plan: longPlan, isDesktopRuntime: false });
assert.equal(longBrowserHandoff.status, "desktop-recommended");
assert.equal(longBrowserHandoff.target, "desktop");
assert.equal(longBrowserHandoff.reasons.includes("long-project"), true);
assert.equal(longBrowserHandoff.canAttemptInBrowser, true);

const longDesktopHandoff = createRenderHandoffPlan({ project: longProject, assets: [], plan: longPlan, isDesktopRuntime: true });
assert.equal(longDesktopHandoff.status, "desktop-ready");
assert.equal(longDesktopHandoff.target, "desktop");

const veryLongProject = createProject("Very long browser export", "16:9");
veryLongProject.duration = 720;
veryLongProject.layers = [createTextLayer("text", 0)];

const veryLongPlan = createRenderPlan(veryLongProject, [], "mp4-1080p", "mp4");
const veryLongHandoff = createRenderHandoffPlan({ project: veryLongProject, assets: [], plan: veryLongPlan, isDesktopRuntime: false });
assert.equal(veryLongHandoff.status, "desktop-required");
assert.equal(veryLongHandoff.target, "desktop");
assert.equal(veryLongHandoff.reasons.includes("very-long-project"), true);
assert.equal(veryLongHandoff.reasons.includes("browser-frame-budget"), true);
assert.equal(veryLongHandoff.canAttemptInBrowser, false);

const layerHeavyProject = createProject("Layer-heavy browser export", "16:9");
layerHeavyProject.duration = 150;
layerHeavyProject.layers = Array.from({ length: 32 }, (_, index) => createTextLayer("text", index));

const layerHeavyPlan = createRenderPlan(layerHeavyProject, [], "mp4-1080p", "mp4");
const layerHeavyHandoff = createRenderHandoffPlan({ project: layerHeavyProject, assets: [], plan: layerHeavyPlan, isDesktopRuntime: false });
assert.equal(layerHeavyHandoff.status, "desktop-required");
assert.equal(layerHeavyHandoff.reasons.includes("many-layers"), true);
assert.equal(layerHeavyHandoff.reasons.includes("layer-frame-budget"), true);
assert.equal(layerHeavyHandoff.canAttemptInBrowser, false);

const desktopAsset = createDesktopAsset();
const desktopProject = createProject("Desktop file export", "16:9");
desktopProject.layers = [createLayerFromAsset(desktopAsset, 0)];
desktopProject.duration = desktopAsset.duration;

const desktopMediaPlan = createRenderPlan(desktopProject, [desktopAsset], "mp4-1080p", "mp4");
const browserDesktopMediaHandoff = createRenderHandoffPlan({
  project: desktopProject,
  assets: [desktopAsset],
  plan: desktopMediaPlan,
  isDesktopRuntime: false,
});
assert.equal(browserDesktopMediaHandoff.status, "desktop-required");
assert.equal(browserDesktopMediaHandoff.canAttemptInBrowser, false);

const bundlePlan = createRenderPlan(longProject, [], "project-bundle", "json");
const bundleHandoff = createRenderHandoffPlan({ project: longProject, assets: [], plan: bundlePlan, isDesktopRuntime: false });
assert.equal(bundleHandoff.status, "browser-ready");
assert.equal(bundleHandoff.target, "browser");

const unsupportedPlan = createRenderPlan(
  {
    ...desktopProject,
    layers: [{ ...desktopProject.layers[0], kind: "audio" }],
  },
  [{ ...desktopAsset, type: "audio", mimeType: "audio/wav" }],
  "mp4-1080p",
  "mp4",
);
const unsupportedHandoff = createRenderHandoffPlan({ project: desktopProject, assets: [desktopAsset], plan: unsupportedPlan, isDesktopRuntime: true });
assert.equal(unsupportedHandoff.status, "unsupported");
assert.equal(unsupportedHandoff.canAttemptInBrowser, false);

const exportPanel = read("src/features/editor/components/export-panel.tsx");
assert.match(exportPanel, /createRenderHandoffPlan/);
assert.match(exportPanel, /RenderRouteBadge/);
assert.match(exportPanel, /useIsDesktopRuntime/);
assert.match(exportPanel, /Desktop safer/);
assert.match(exportPanel, /Desktop required/);

const desktopReadiness = read("src/lib/desktop/desktop-readiness.ts");
assert.match(desktopReadiness, /render-handoff/);
assert.match(desktopReadiness, /Long or file-backed exports/);

const desktopCapabilities = read("src/lib/product/capabilities/desktop.ts");
assert.match(desktopCapabilities, /render-handoff/);
assert.match(desktopCapabilities, /export-panel route badge/);

console.log("Render handoff workflow checks passed.");

function createDesktopAsset(): MediaAsset {
  return {
    id: "asset_desktop",
    name: "desktop-file.mp4",
    type: "video",
    mimeType: "video/mp4",
    size: 1024,
    duration: 20,
    width: 1920,
    height: 1080,
    storageKey: "desktop-file.mp4",
    source: "tauri-fs",
    createdAt: "2026-05-15T00:00:00.000Z",
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
