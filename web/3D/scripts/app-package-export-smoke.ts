import { strict as assert } from "node:assert";
import { APP_PACKAGE_PRESETS, createAppPackageZip, getAppPackageFiles, type AppPackageOptions } from "../src/features/projects/app-package-export";
import { appPackageManifestPath, validateAppPackageFiles } from "../src/features/projects/app-package-validation";
import { defaultShareSettings } from "../src/features/projects/share-settings";
import { getAbsoluteUrl, getEmbedPath, getPublicSceneApiPath, getSharePath } from "../src/features/projects/share-links";

const origin = "https://essence.example";
const shareId = "multi-scene-share";
const activeSceneId = "scene-product";
const scenes = [
  {
    id: "scene-landing",
    name: "Landing Scene",
    objectCount: 6,
    updatedAt: "2026-05-15T01:00:00.000Z",
  },
  {
    id: activeSceneId,
    name: "Product Scene",
    objectCount: 11,
    updatedAt: "2026-05-15T02:00:00.000Z",
  },
];

const options: AppPackageOptions = {
  activeSceneId,
  embedUrl: getAbsoluteUrl(origin, getEmbedPath(shareId, activeSceneId)),
  sceneApiUrl: getAbsoluteUrl(origin, getPublicSceneApiPath(shareId, activeSceneId)),
  sceneName: "Product Scene",
  scenes,
  shareSettings: defaultShareSettings,
  shareUrl: getAbsoluteUrl(origin, getSharePath(shareId, activeSceneId)),
};

for (const preset of APP_PACKAGE_PRESETS) {
  const files = getAppPackageFiles(preset.id, options);
  const validation = validateAppPackageFiles(preset.id, options, files);
  const manifest = files.find((file) => file.path === appPackageManifestPath);

  assert.equal(validation.valid, true, `${preset.id}: ${validation.issues.map((issue) => issue.detail).join("; ")}`);
  assert.ok(manifest, `${preset.id} should include package scene manifest`);
  assert.match(manifest?.content ?? "", /"activeSceneId": "scene-product"/);
  assert.ok(files.some((file) => file.path === "src/App.tsx" && file.content.includes("?scene=scene-product")));
}

const zip = createAppPackageZip(getAppPackageFiles("web", options));

assert.equal(zip.subarray(0, 2).toString("utf8"), "PK");

const invalidOptions: AppPackageOptions = {
  ...options,
  sceneApiUrl: getAbsoluteUrl(origin, getPublicSceneApiPath(shareId)),
};
const invalidValidation = validateAppPackageFiles("web", invalidOptions, getAppPackageFiles("web", invalidOptions));

assert.equal(invalidValidation.valid, false);
assert.ok(invalidValidation.issues.some((issue) => issue.code === "missing-scene-query"));

const missingManifestFiles = getAppPackageFiles("web", options).filter((file) => file.path !== appPackageManifestPath);
const missingManifestValidation = validateAppPackageFiles("web", options, missingManifestFiles);

assert.equal(missingManifestValidation.valid, false);
assert.ok(missingManifestValidation.issues.some((issue) => issue.code === "missing-file" && issue.filePath === appPackageManifestPath));

console.log("app package export smoke passed");
