import { strict as assert } from "node:assert";
import { createSceneObject } from "@/features/editor/scene/default-document";
import {
  createMaterialPostProcessParityReport,
  createMaterialPostProcessSnapshot,
} from "@/features/editor/runtime/material-postprocess-parity";
import type { SceneSettings } from "@/features/editor/types";

const materialObject = createSceneObject("box", "Layered box");
materialObject.material = {
  ...materialObject.material,
  color: "#51e0c3",
  metalness: 0.2,
  roughness: 0.4,
  layers: [
    {
      id: "bump",
      name: "Fine bump",
      kind: "bumpMap",
      enabled: true,
      intensity: 0.75,
      sourceDataUrl: "data:image/png;base64,bump",
      value: 0.3,
    },
    {
      id: "rough",
      name: "Roughness map",
      kind: "roughnessMap",
      enabled: true,
      intensity: 0.65,
      sourceDataUrl: "data:image/png;base64,rough",
    },
    {
      id: "glow",
      name: "Glow",
      kind: "emissive",
      enabled: true,
      color: "#8ee7ff",
      intensity: 0.5,
      value: 1.2,
    },
  ],
};

const sceneSettings: SceneSettings = {
  ambientColor: "#ffffff",
  ambientIntensity: 0.32,
  backgroundColor: "#10141c",
  bloomEnabled: true,
  bloomIntensity: 0.65,
  bloomRadius: 0.4,
  bloomThreshold: 0.72,
  depthOfFieldAperture: 0.02,
  depthOfFieldEnabled: true,
  depthOfFieldFocus: 9,
  depthOfFieldMaxBlur: 0.01,
  fogColor: "#10141c",
  fogEnabled: true,
  fogFar: 44,
  fogNear: 8,
  postProcessingEnabled: true,
};

const editorSnapshot = createMaterialPostProcessSnapshot({
  objects: [materialObject],
  sceneSettings,
  surface: "editor",
});
const viewerSnapshot = createMaterialPostProcessSnapshot({
  objects: [materialObject],
  sceneSettings,
  surface: "viewer",
});

assert.equal(editorSnapshot.materials[0]?.bumpMapEnabled, true);
assert.equal(editorSnapshot.materials[0]?.roughnessMapEnabled, true);
assert.equal(editorSnapshot.postProcess.bloomEnabled, true);

const readyReport = createMaterialPostProcessParityReport({
  editorSnapshot,
  generatedAt: "2026-06-05T12:00:00.000Z",
  viewerSnapshot,
  workspaceId: "Workspace Runtime Fidelity",
});

assert.equal(readyReport.summary.status, "ready");
assert.equal(readyReport.summary.parityScore, 100);
assert.equal(readyReport.summary.mismatchCount, 0);
assert.equal(readyReport.rows.length, 2);
assert.ok(readyReport.summary.parityHash.startsWith("sha256:"));
assert.equal(readyReport.csvFileName, "workspace-runtime-fidelity-material-postprocess-parity-20260605.csv");
assert.match(readyReport.csvContent, /^surface,status,material_count,bump_maps,roughness_maps,postprocess_passes,mismatch_summary/);

const driftedViewerSnapshot = createMaterialPostProcessSnapshot({
  objects: [
    {
      ...materialObject,
      material: {
        ...materialObject.material,
        roughness: 0.9,
        layers: materialObject.material.layers?.filter((layer) => layer.kind !== "bumpMap"),
      },
    },
  ],
  sceneSettings: {
    ...sceneSettings,
    bloomEnabled: false,
  },
  surface: "viewer",
});

const blockedReport = createMaterialPostProcessParityReport({
  editorSnapshot,
  generatedAt: "2026-06-05T12:00:00.000Z",
  viewerSnapshot: driftedViewerSnapshot,
  workspaceId: "Workspace Runtime Fidelity",
});

assert.equal(blockedReport.summary.status, "blocked");
assert.ok(blockedReport.summary.mismatchCount >= 2);
assert.ok(blockedReport.rows.some((row) => row.status === "blocked"));
assert.match(blockedReport.summary.nextAction, /Resolve material and post-process parity mismatches/);

console.log("material post-process parity smoke passed");
