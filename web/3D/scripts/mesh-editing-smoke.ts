import { strict as assert } from "node:assert";
import * as THREE from "three";
import { createSceneObject } from "../src/features/editor/scene/default-document";
import {
  applyMeshEditModifiers,
  applyMeshModifierPreset,
  applyMeshSelectionSet,
  captureMeshModifierPreset,
  captureMeshSelectionSet,
  resolveMeshEditSettings,
  resolveMeshSelectionPreview,
} from "../src/features/editor/scene/mesh-editing";
import { sceneObjectSchema } from "../src/features/editor/types";

function createGeometry() {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        1, 1, 0,
        2, 1, 0,
        1, 2, 0,
      ],
      3,
    ),
  );

  return geometry;
}

const object = createSceneObject("box", "Mesh Span Smoke");

object.meshEdit = {
  bevel: 0,
  bevelSegments: 2,
  bridgeRadius: 0.08,
  bridgeSegments: 12,
  bridgeTargetIndex: 1,
  cutAxis: "y",
  cutDepth: 0.08,
  cutPosition: 0,
  cutWidth: 0.12,
  enabled: true,
  extrude: 0,
  inset: 0,
  loopCuts: 0,
  operation: "none",
  selectionFalloff: 0,
  selectionIndex: 1,
  selectionMode: "vertex",
  selectionOffset: [0.5, 0, 0],
  selectionSpan: 3,
  selectionSets: [],
  modifierPresets: [],
  showTopology: true,
};

const resolvedSettings = resolveMeshEditSettings(object);
const selectionSet = captureMeshSelectionSet(resolvedSettings, {
  id: "set-primary",
  name: "Primary selection",
  now: "2026-05-15T00:00:00.000Z",
});

assert.deepEqual(applyMeshSelectionSet(resolvedSettings, selectionSet), {
  enabled: true,
  selectionFalloff: 0,
  selectionIndex: 1,
  selectionMode: "vertex",
  selectionOffset: [0.5, 0, 0],
  selectionSpan: 3,
});

const modifierPreset = captureMeshModifierPreset(
  {
    ...resolvedSettings,
    bevel: 0.18,
    bevelSegments: 4,
    extrude: 0.42,
    operation: "extrude",
  },
  {
    id: "preset-extrude",
    name: "Raised edge",
    now: "2026-05-15T00:00:00.000Z",
  },
);

assert.deepEqual(applyMeshModifierPreset(resolvedSettings, modifierPreset), {
  bevel: 0.18,
  bevelSegments: 4,
  bridgeRadius: 0.08,
  bridgeSegments: 12,
  bridgeTargetIndex: 1,
  cutAxis: "y",
  cutDepth: 0.08,
  cutPosition: 0,
  cutWidth: 0.12,
  enabled: true,
  extrude: 0.42,
  inset: 0,
  loopCuts: 0,
  operation: "extrude",
});

const parsedObject = sceneObjectSchema.parse({
  ...object,
  meshEdit: {
    ...object.meshEdit,
    modifierPresets: [modifierPreset],
    selectionSets: [selectionSet],
  },
});

assert.equal(parsedObject.meshEdit?.selectionSets?.[0]?.name, "Primary selection");
assert.equal(parsedObject.meshEdit?.modifierPresets?.[0]?.name, "Raised edge");

const preview = resolveMeshSelectionPreview(createGeometry(), object.meshEdit);

assert.equal(preview?.count, 3);

const geometry = applyMeshEditModifiers(createGeometry(), object);
const positions = geometry.getAttribute("position");

assert.ok(positions);
assert.equal(positions.getX(0), 0);
assert.equal(positions.getX(1), 1.5);
assert.equal(positions.getX(2), 0.5);
assert.equal(positions.getX(3), 1.5);
assert.equal(positions.getX(4), 2);
assert.equal(positions.getX(5), 1);

geometry.dispose();

console.log("mesh editing smoke passed");
