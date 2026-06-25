import { strict as assert } from "node:assert";
import { defaultClonerSettings } from "@/features/editor/scene/cloner-settings";
import { createDefaultDocument, createSceneObject, defaultSceneSettings } from "@/features/editor/scene/default-document";
import { defaultPhysicsSettings } from "@/features/editor/scene/physics-settings";
import type { SceneDocument, Vec3 } from "@/features/editor/types";
import { profileScenePerformance } from "@/features/editor/utils/scene-performance-profiler";

function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

const denseHero = createSceneObject("sphere", "Dense interactive hero");

denseHero.cloner = {
  ...defaultClonerSettings,
  count: 36,
  enabled: true,
};
denseHero.geometry = {
  ...denseHero.geometry,
  heightSegments: 64,
  radialSegments: 96,
};
denseHero.interaction = {
  apiAction: {
    enabled: true,
    method: "POST",
    url: "https://example.com/hook",
  },
  dragTrigger: {
    enabled: true,
    event: "drag",
  },
  keyboardTrigger: {
    event: "press",
    key: "Space",
  },
  pointerTrigger: {
    enabled: true,
    event: "click",
  },
  scrollTrigger: {
    enabled: true,
  },
};
denseHero.material = {
  ...denseHero.material,
  textureDataUrl: `data:image/png;base64,${"A".repeat(6 * 1024 * 1024)}`,
};
denseHero.physics = {
  ...defaultPhysicsSettings,
  enabled: true,
};
denseHero.variableBindings = [
  {
    id: "opacity-binding",
    property: "material.opacity",
    variableId: "hero-opacity",
  },
];

const baseDocument = createDefaultDocument("Profiler Smoke");
const document: SceneDocument = {
  ...baseDocument,
  animationTracks: [
    {
      easing: "easeInOut" as const,
      id: "dense-position-track",
      keyframes: [
        { id: "start", time: 0, value: vec3(0, 0, 0) },
        { id: "end", time: 2, value: vec3(1, 1, 0) },
      ],
      loop: true,
      objectId: denseHero.id,
      property: "position" as const,
    },
    {
      easing: "linear" as const,
      id: "dense-scale-track",
      keyframes: [
        { id: "scale-start", time: 0, value: vec3(1, 1, 1) },
        { id: "scale-end", time: 2, value: vec3(1.1, 1.1, 1.1) },
      ],
      loop: true,
      objectId: denseHero.id,
      property: "scale" as const,
    },
  ],
  objects: [denseHero],
  sceneSettings: {
    ...defaultSceneSettings,
    bloomEnabled: true,
    depthOfFieldEnabled: true,
    postProcessingEnabled: true,
  },
};

const profile = profileScenePerformance(document);
const categories = new Set(profile.hotSpots.map((hotSpot) => hotSpot.category));

assert.equal(profile.status, "Heavy");
assert.ok(profile.score < 100);
assert.ok(profile.metrics.drawCalls >= 36);
assert.ok(profile.metrics.triangles > 350000);
assert.ok(profile.metrics.textureBytes > 3 * 1024 * 1024);
assert.ok(categories.has("draw-call"));
assert.ok(categories.has("geometry"));
assert.ok(categories.has("interaction"));
assert.ok(categories.has("texture"));
assert.equal(profile.objectProfiles[0]?.interactionHooks, 5);
assert.equal(profile.budgetRows.find((row) => row.id === "postProcessing")?.value, 2);

console.log("scene performance profiler smoke passed");
