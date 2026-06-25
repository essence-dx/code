import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProjectBundleBlob } from "../src/lib/projects/project-bundle-export";
import { createProject } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";

const now = "2026-05-14T00:00:00.000Z";
const project = createProject("Bundle Export Project");
const mediaAsset: MediaAsset = {
  id: "asset-export",
  name: "clip.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1200,
  duration: 5,
  storageKey: "asset-export",
  source: "browser-indexeddb",
  objectUrl: "blob:asset-export",
  createdAt: now,
};

const bundleBlob = createProjectBundleBlob(project, [mediaAsset]);
assert.equal(bundleBlob.type.startsWith("application/json"), true);
const bundle = JSON.parse(await bundleBlob.text());
assert.equal(bundle.project.title, "Bundle Export Project");
assert.equal(bundle.mediaAssets[0].id, "asset-export");
assert.equal("objectUrl" in bundle.mediaAssets[0], false);

const helper = readFileSync("src/lib/projects/project-bundle-export.ts", "utf8");
assert.match(helper, /saveProjectBundle/);
assert.match(helper, /projectBundleFilename/);
assert.match(helper, /saveRenderedBlob/);
assert.match(helper, /sanitizeMediaAssets/);

const renderer = readFileSync("src/lib/render/browser-renderer.ts", "utf8");
assert.match(renderer, /saveProjectBundle\(project, assets\)/);

const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
assert.match(localLibraryHook, /saveProjectBundle/);
assert.match(localLibraryHook, /exportProjectBundleFromLibrary/);
assert.match(localLibraryHook, /bulkExportSelectedProjectBundles/);
assert.match(localLibraryHook, /Project bundle could not be exported/);
assert.match(localLibraryHook, /Selected project bundles could not be exported/);
assert.match(localLibraryCard, /aria-label=\{`Export \$\{item\.title\} bundle`\}/);

const bulkBar = readFileSync("src/features/dashboard/components/project-bulk-actions-bar.tsx", "utf8");
assert.match(bulkBar, /onExportBundles/);
assert.match(bulkBar, /Export bundles/);

console.log("Dashboard bundle export workflow checks passed.");
