import { strict as assert } from "node:assert";
import { createSceneObject } from "@/features/editor/scene/default-document";
import { applyModelImportRepairAction, createModelImportRepairPlan } from "@/features/editor/utils/model-import-repair";

const importedModel = createSceneObject("model", "CAD housing");

importedModel.model = {
  animationAutoPlay: true,
  animationLoop: true,
  animationSpeed: 1.8,
  fileName: "housing-mm.obj",
  format: "obj",
  importDiagnostics: {
    complexity: "extreme",
    estimatedTriangleCount: 420000,
    estimatedVertexCount: 220000,
    scaleToMeters: 0.001,
    sourceBytes: 32 * 1024 * 1024,
    sourceFormat: "obj",
    sourceUnit: "millimeter",
    warnings: ["This exchange format often references external textures or sidecar files."],
  },
  morphTargetAutoPlay: true,
  morphTargetIndex: 0,
  morphTargetSpeed: 1,
  morphTargetWeight: 0,
  splatAlphaHash: false,
  splatAlphaTest: 0,
  splatPointScale: 1,
  splatToneMapped: false,
  sourceDataUrl: "data:model/obj;base64,AAAA",
};

const plan = createModelImportRepairPlan(importedModel);
const availableActionIds = new Set(plan.availableActions.map((action) => action.id));

assert.ok(availableActionIds.has("unit-scale"));
assert.ok(availableActionIds.has("orient-z-up"));
assert.ok(availableActionIds.has("fallback-material"));
assert.ok(availableActionIds.has("heavy-runtime"));
assert.equal(availableActionIds.has("animation-clips"), false);

const scaled = applyModelImportRepairAction(importedModel, "unit-scale");
assert.equal(scaled.transform.scale[0], 0.001);

const oriented = applyModelImportRepairAction(importedModel, "orient-z-up");
assert.equal(oriented.transform.rotation[0], -Math.PI / 2);

const materialRepaired = applyModelImportRepairAction(importedModel, "fallback-material");
assert.equal(materialRepaired.material.textureDataUrl, null);
assert.equal(materialRepaired.material.color, "#cbd5e1");

const relaxed = applyModelImportRepairAction(importedModel, "heavy-runtime");
assert.equal(relaxed.model?.animationAutoPlay, false);
assert.equal(relaxed.model?.morphTargetAutoPlay, false);

const gltfModel = {
  ...importedModel,
  model: {
    ...importedModel.model!,
    animationClipName: "Walk",
    animationLoop: false,
    animationSpeed: 2.5,
    format: "gltf" as const,
  },
};
const clipPlan = createModelImportRepairPlan(gltfModel);
assert.ok(clipPlan.availableActions.some((action) => action.id === "animation-clips"));

const normalizedClip = applyModelImportRepairAction(gltfModel, "animation-clips");
assert.equal(normalizedClip.model?.animationClipName, undefined);
assert.equal(normalizedClip.model?.animationLoop, true);
assert.equal(normalizedClip.model?.animationSpeed, 1);

console.log("model import repair smoke passed");
