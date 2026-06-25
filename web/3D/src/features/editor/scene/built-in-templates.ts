import { nanoid } from "nanoid";
import type { Material, SceneObject, Vec3 } from "../types";
import { createSceneObject } from "./default-document";

export type BuiltInTemplateCategory = "Product" | "Interface" | "Lighting" | "Showcase" | "Samples";

export type BuiltInSceneTemplate = {
  category: BuiltInTemplateCategory;
  description: string;
  id: string;
  name: string;
  objectCount: number;
};

export const builtInSceneTemplates: BuiltInSceneTemplate[] = [
  {
    category: "Product",
    description: "Layered pedestal, hero object, rim ring, label, and key light.",
    id: "product-podium",
    name: "Product Podium",
    objectCount: 6,
  },
  {
    category: "Interface",
    description: "Stacked glass cards for app mockups, dashboards, or 3D UI scenes.",
    id: "glass-interface-stack",
    name: "Glass Interface Stack",
    objectCount: 7,
  },
  {
    category: "Lighting",
    description: "Three-point studio lights with a soft floor and centered target object.",
    id: "studio-light-rig",
    name: "Studio Light Rig",
    objectCount: 6,
  },
  {
    category: "Showcase",
    description: "Gallery wall with frames, title text, and a ground plane.",
    id: "gallery-wall",
    name: "Gallery Wall",
    objectCount: 8,
  },
  {
    category: "Samples",
    description: "Editable bunny-style reference object for lighting and scale checks.",
    id: "sample-bunny",
    name: "Sample Bunny",
    objectCount: 11,
  },
  {
    category: "Samples",
    description: "Editable teapot-style reference object for material and silhouette tests.",
    id: "sample-teapot",
    name: "Sample Teapot",
    objectCount: 9,
  },
];

function material(overrides: Partial<Material>): Partial<Material> {
  return {
    ...overrides,
    layers: overrides.layers ?? [],
    textureDataUrl: overrides.textureDataUrl ?? null,
  };
}

function setTransform(object: SceneObject, position: Vec3, scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0]) {
  object.transform = {
    ...object.transform,
    position,
    rotation,
    scale,
  };
}

function setMaterial(object: SceneObject, overrides: Partial<Material>) {
  object.material = {
    ...object.material,
    ...material(overrides),
  };
}

function createGroup(name: string) {
  const group = createSceneObject("group", name);
  group.id = nanoid();
  group.transform.position = [0, 0, 0];
  return group;
}

function attach(object: SceneObject, parentId: string) {
  object.parentId = parentId;
  return object;
}

function createProductPodium() {
  const group = createGroup("Product Podium");
  const base = attach(createSceneObject("cylinder", "Stepped Base"), group.id);
  base.geometry = { height: 0.34, radialSegments: 72, radiusBottom: 1.55, radiusTop: 1.35 };
  setTransform(base, [0, 0.04, 0]);
  setMaterial(base, { color: "#263241", metalness: 0.06, roughness: 0.68 });

  const plinth = attach(createSceneObject("cylinder", "Display Plinth"), group.id);
  plinth.geometry = { height: 0.56, radialSegments: 72, radiusBottom: 0.88, radiusTop: 0.98 };
  setTransform(plinth, [0, 0.48, 0]);
  setMaterial(plinth, { color: "#f7fbff", metalness: 0.02, roughness: 0.38 });

  const ring = attach(createSceneObject("torus", "Accent Ring"), group.id);
  ring.geometry = { radialSegments: 96, radius: 1.12, tubeRadius: 0.025, tubularSegments: 128 };
  setTransform(ring, [0, 0.79, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  setMaterial(ring, { color: "#51e0c3", metalness: 0.42, roughness: 0.22 });

  const hero = attach(createSceneObject("sphere", "Hero Object"), group.id);
  hero.geometry = { heightSegments: 48, radialSegments: 64, radius: 0.46 };
  setTransform(hero, [0, 1.34, 0]);
  setMaterial(hero, { color: "#b38cff", metalness: 0.16, roughness: 0.24 });

  const label = attach(createSceneObject("text", "Product Label"), group.id);
  label.text = { content: "Essence", fontSize: 0.24, maxWidth: 2.4 };
  setTransform(label, [0, 0.86, 1.17], [1, 1, 1], [-0.18, 0, 0]);
  setMaterial(label, { color: "#f8fafc", roughness: 0.2 });

  const light = attach(createSceneObject("spotLight", "Product Key Light"), group.id);
  light.light = { angle: 0.56, castShadow: true, color: "#ffffff", distance: 12, intensity: 3.2, penumbra: 0.55, shadowBias: -0.0004, shadowRadius: 2.5 };
  setTransform(light, [-2.5, 3.4, 3.2], [1, 1, 1], [-0.72, -0.48, -0.18]);

  return [group, base, plinth, ring, hero, label, light];
}

function createGlassInterfaceStack() {
  const group = createGroup("Glass Interface Stack");
  const objects: SceneObject[] = [group];
  const cards: Array<{ color: string; name: string; position: Vec3; scale: Vec3 }> = [
    { name: "Primary Panel", position: [-0.2, 1.25, 0], scale: [2.4, 1.28, 1], color: "#dff7ff" },
    { name: "Secondary Panel", position: [0.52, 0.78, -0.18], scale: [1.5, 0.78, 1], color: "#f1e8ff" },
    { name: "Metric Panel", position: [-0.74, 0.52, 0.18], scale: [1.12, 0.58, 1], color: "#e4fff5" },
  ];

  for (const card of cards) {
    const panel = attach(createSceneObject("rectangle", card.name), group.id);
    panel.geometry = { extrudeDepth: 0.035, height: 1, width: 1 };
    setTransform(panel, card.position, card.scale, [0, -0.08, 0]);
    setMaterial(panel, {
      color: card.color,
      metalness: 0,
      opacity: 0.72,
      roughness: 0.12,
      layers: [{ enabled: true, id: nanoid(), intensity: 0.6, kind: "glass", name: "Soft Glass", value: 0.42 }],
    });
    objects.push(panel);
  }

  const title = attach(createSceneObject("text", "Interface Title"), group.id);
  title.text = { content: "Dashboard", fontSize: 0.24, maxWidth: 2.2 };
  setTransform(title, [-0.76, 1.44, 0.08], [1, 1, 1], [0, -0.08, 0]);
  setMaterial(title, { color: "#172033", roughness: 0.25 });
  objects.push(title);

  for (let index = 0; index < 3; index += 1) {
    const dot = attach(createSceneObject("sphere", `Status Dot ${index + 1}`), group.id);
    dot.geometry = { heightSegments: 16, radialSegments: 24, radius: 0.05 };
    setTransform(dot, [-0.9 + index * 0.18, 1.18, 0.12]);
    setMaterial(dot, { color: index === 0 ? "#51e0c3" : index === 1 ? "#ffcf5c" : "#b38cff", roughness: 0.18 });
    objects.push(dot);
  }

  return objects;
}

function createStudioLightRig() {
  const group = createGroup("Studio Light Rig");
  const subject = attach(createSceneObject("torus", "Studio Subject"), group.id);
  subject.geometry = { radialSegments: 96, radius: 0.72, tubeRadius: 0.18, tubularSegments: 128 };
  setTransform(subject, [0, 1.12, 0], [1, 1, 1], [0.28, 0.58, 0.12]);
  setMaterial(subject, { color: "#51e0c3", metalness: 0.18, roughness: 0.26 });

  const floor = attach(createSceneObject("plane", "Soft Studio Floor"), group.id);
  floor.geometry = { depth: 0.04, height: 4, width: 4 };
  setTransform(floor, [0, -0.04, 0]);
  setMaterial(floor, { color: "#1d2530", metalness: 0, roughness: 0.86 });

  const key = attach(createSceneObject("spotLight", "Key Light"), group.id);
  key.light = { angle: 0.52, castShadow: true, color: "#ffffff", distance: 14, intensity: 3.4, penumbra: 0.48, shadowBias: -0.0005, shadowRadius: 3.2 };
  setTransform(key, [-2.3, 3.2, 2.8], [1, 1, 1], [-0.78, -0.45, -0.22]);

  const fill = attach(createSceneObject("pointLight", "Fill Light"), group.id);
  fill.light = { angle: 0.65, castShadow: false, color: "#9bdcff", distance: 8, intensity: 1.25, penumbra: 0.5 };
  setTransform(fill, [2.4, 2, 1.5]);

  const rim = attach(createSceneObject("pointLight", "Rim Light"), group.id);
  rim.light = { angle: 0.65, castShadow: false, color: "#b38cff", distance: 8, intensity: 1.8, penumbra: 0.5 };
  setTransform(rim, [0, 2.3, -2.2]);

  return [group, subject, floor, key, fill, rim];
}

function createGalleryWall() {
  const group = createGroup("Gallery Wall");
  const wall = attach(createSceneObject("plane", "Gallery Wall Surface"), group.id);
  wall.geometry = { depth: 0.04, height: 2.7, width: 4.2 };
  setTransform(wall, [0, 1.25, -0.12], [1, 1, 1]);
  setMaterial(wall, { color: "#f4f7fb", roughness: 0.74 });

  const floor = attach(createSceneObject("plane", "Gallery Floor"), group.id);
  floor.geometry = { depth: 0.04, height: 4.8, width: 4.8 };
  setTransform(floor, [0, -0.08, 1.1]);
  setMaterial(floor, { color: "#202833", roughness: 0.8 });

  const positions: Vec3[] = [
    [-1.2, 1.44, 0],
    [0, 1.44, 0],
    [1.2, 1.44, 0],
    [-0.6, 0.72, 0.04],
    [0.6, 0.72, 0.04],
  ];
  const objects: SceneObject[] = [group, wall, floor];

  positions.forEach((position, index) => {
    const frame = attach(createSceneObject("rectangle", `Gallery Frame ${index + 1}`), group.id);
    frame.geometry = { extrudeDepth: 0.05, height: 0.5, width: 0.78 };
    setTransform(frame, position, [1, 1, 1]);
    setMaterial(frame, {
      color: index % 2 === 0 ? "#51e0c3" : "#b38cff",
      metalness: 0.02,
      roughness: 0.48,
      layers: [{ color: "#111827", enabled: true, id: nanoid(), intensity: 0.5, kind: "outline", name: "Frame Edge", value: 0.025 }],
    });
    objects.push(frame);
  });

  const title = attach(createSceneObject("text", "Gallery Title"), group.id);
  title.text = { content: "Showcase", fontSize: 0.28, maxWidth: 2.2 };
  setTransform(title, [-1.6, 2.35, 0.03]);
  setMaterial(title, { color: "#172033", roughness: 0.25 });
  objects.push(title);

  return objects;
}

function createSampleBunny() {
  const group = createGroup("Sample Bunny");
  const body = attach(createSceneObject("sphere", "Bunny Body"), group.id);
  body.geometry = { heightSegments: 32, radialSegments: 48, radius: 0.55 };
  setTransform(body, [0, 0.62, 0], [1, 1.15, 0.86]);
  setMaterial(body, { color: "#eef6ff", metalness: 0.02, roughness: 0.42 });

  const head = attach(createSceneObject("sphere", "Bunny Head"), group.id);
  head.geometry = { heightSegments: 32, radialSegments: 48, radius: 0.36 };
  setTransform(head, [0.42, 1.2, 0.02], [1, 0.94, 0.92], [0, 0, -0.08]);
  setMaterial(head, { color: "#f7fbff", metalness: 0.02, roughness: 0.38 });

  const objects: SceneObject[] = [group, body, head];

  [
    { name: "Left Ear", position: [0.24, 1.68, 0], rotation: [0, 0.1, -0.24] as Vec3 },
    { name: "Right Ear", position: [0.54, 1.67, 0], rotation: [0, -0.08, 0.18] as Vec3 },
  ].forEach((ear) => {
    const object = attach(createSceneObject("sphere", ear.name), group.id);
    object.geometry = { heightSegments: 24, radialSegments: 32, radius: 0.18 };
    setTransform(object, ear.position as Vec3, [0.5, 1.85, 0.32], ear.rotation);
    setMaterial(object, { color: "#f7fbff", metalness: 0.02, roughness: 0.42 });
    objects.push(object);
  });

  [
    { name: "Front Paw A", position: [0.18, 0.16, 0.34] as Vec3 },
    { name: "Front Paw B", position: [0.58, 0.16, 0.26] as Vec3 },
    { name: "Back Paw A", position: [-0.42, 0.12, 0.32] as Vec3 },
    { name: "Back Paw B", position: [-0.26, 0.12, -0.35] as Vec3 },
  ].forEach((paw) => {
    const object = attach(createSceneObject("sphere", paw.name), group.id);
    object.geometry = { heightSegments: 18, radialSegments: 28, radius: 0.16 };
    setTransform(object, paw.position, [1.25, 0.46, 0.76]);
    setMaterial(object, { color: "#edf7ff", metalness: 0.02, roughness: 0.48 });
    objects.push(object);
  });

  const tail = attach(createSceneObject("sphere", "Bunny Tail"), group.id);
  tail.geometry = { heightSegments: 18, radialSegments: 28, radius: 0.18 };
  setTransform(tail, [-0.52, 0.74, -0.08]);
  setMaterial(tail, { color: "#ffffff", metalness: 0.02, roughness: 0.5 });
  objects.push(tail);

  const eye = attach(createSceneObject("sphere", "Bunny Eye"), group.id);
  eye.geometry = { heightSegments: 12, radialSegments: 16, radius: 0.035 };
  setTransform(eye, [0.72, 1.25, 0.19]);
  setMaterial(eye, { color: "#0f172a", metalness: 0, roughness: 0.2 });
  objects.push(eye);

  return objects;
}

function createSampleTeapot() {
  const group = createGroup("Sample Teapot");
  const body = attach(createSceneObject("sphere", "Teapot Body"), group.id);
  body.geometry = { heightSegments: 40, radialSegments: 64, radius: 0.64 };
  setTransform(body, [0, 0.82, 0], [1.22, 0.86, 1.02]);
  setMaterial(body, { color: "#51e0c3", metalness: 0.18, roughness: 0.24 });

  const lid = attach(createSceneObject("cylinder", "Teapot Lid"), group.id);
  lid.geometry = { height: 0.18, radialSegments: 72, radiusBottom: 0.46, radiusTop: 0.34 };
  setTransform(lid, [0, 1.38, 0]);
  setMaterial(lid, { color: "#8ee7ff", metalness: 0.16, roughness: 0.26 });

  const knob = attach(createSceneObject("sphere", "Teapot Knob"), group.id);
  knob.geometry = { heightSegments: 20, radialSegments: 32, radius: 0.13 };
  setTransform(knob, [0, 1.56, 0], [1, 0.82, 1]);
  setMaterial(knob, { color: "#f8fafc", metalness: 0.12, roughness: 0.28 });

  const base = attach(createSceneObject("cylinder", "Teapot Foot"), group.id);
  base.geometry = { height: 0.16, radialSegments: 72, radiusBottom: 0.56, radiusTop: 0.44 };
  setTransform(base, [0, 0.2, 0]);
  setMaterial(base, { color: "#2dd4bf", metalness: 0.24, roughness: 0.3 });

  const spout = attach(createSceneObject("cone", "Teapot Spout"), group.id);
  spout.geometry = { height: 0.9, radialSegments: 32, radiusBottom: 0.18, radiusTop: 0.05 };
  setTransform(spout, [0.88, 0.9, 0], [1, 1, 1], [0, 0, -Math.PI / 2.8]);
  setMaterial(spout, { color: "#51e0c3", metalness: 0.18, roughness: 0.24 });

  const handle = attach(createSceneObject("torus", "Teapot Handle"), group.id);
  handle.geometry = { radialSegments: 64, radius: 0.42, tubeRadius: 0.055, tubularSegments: 96 };
  setTransform(handle, [-0.76, 0.88, 0], [0.72, 1.05, 1], [0, Math.PI / 2, 0]);
  setMaterial(handle, { color: "#51e0c3", metalness: 0.18, roughness: 0.24 });

  const shadow = attach(createSceneObject("torus", "Silhouette Test Ring"), group.id);
  shadow.geometry = { radialSegments: 96, radius: 0.88, tubeRadius: 0.018, tubularSegments: 128 };
  setTransform(shadow, [0, 0.08, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  setMaterial(shadow, { color: "#111827", metalness: 0, roughness: 0.72 });

  const light = attach(createSceneObject("pointLight", "Sample Accent Light"), group.id);
  light.light = { angle: 0.65, castShadow: false, color: "#b38cff", distance: 7, intensity: 1.4, penumbra: 0.35 };
  setTransform(light, [1.6, 2.2, 1.8]);

  return [group, body, lid, knob, base, spout, handle, shadow, light];
}

export function createBuiltInTemplateObjects(templateId: string): { objects: SceneObject[]; rootObjectId: string } | null {
  const objects =
    templateId === "product-podium"
      ? createProductPodium()
      : templateId === "glass-interface-stack"
        ? createGlassInterfaceStack()
        : templateId === "studio-light-rig"
          ? createStudioLightRig()
          : templateId === "gallery-wall"
            ? createGalleryWall()
            : templateId === "sample-bunny"
              ? createSampleBunny()
              : templateId === "sample-teapot"
                ? createSampleTeapot()
                : null;

  if (!objects?.length) {
    return null;
  }

  return {
    objects,
    rootObjectId: objects[0].id,
  };
}
