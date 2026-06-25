import { nanoid } from "nanoid";
import type { SceneObject, TwoDConstraint, TwoDLayerKind, TwoDLayerSettings, TwoDPostProcessEffect, TwoDPostProcessEffectKind, Vec3 } from "../types";
import { createSceneObject } from "./default-document";
import { isParametricPrimitiveKind } from "./primitive-geometry";

const worldUnitsPerPixel = 1 / 160;
export type TwoDUiPrimitiveKind = "button" | "input" | "card";

const defaultTwoDSettingsByKind: Record<TwoDLayerKind, TwoDLayerSettings> = {
  page: {
    kind: "page",
    width: 1440,
    height: 900,
    clipsContent: true,
    borderRadius: 0,
    xConstraint: "center",
    yConstraint: "center",
    layoutMode: "free",
    padding: 32,
    gap: 16,
    shadowEnabled: false,
    shadowColor: "#020617",
    shadowOpacity: 0.16,
    shadowBlur: 32,
    shadowOffsetX: 0,
    shadowOffsetY: 20,
    blendMode: "normal",
    filterKind: "none",
    filterColor: "#38bdf8",
    filterIntensity: 0.35,
    filterBlur: 18,
    postProcessEffects: [],
    shapeFillDepth: 12,
    shapeFillEnabled: false,
    shapeFillFit: "contain",
    shapeFillOffsetX: 0,
    shapeFillOffsetY: 0,
    shapeFillScale: 1,
  },
  frame: {
    kind: "frame",
    width: 640,
    height: 400,
    clipsContent: true,
    borderRadius: 24,
    xConstraint: "center",
    yConstraint: "center",
    layoutMode: "free",
    padding: 24,
    gap: 12,
    shadowEnabled: true,
    shadowColor: "#020617",
    shadowOpacity: 0.18,
    shadowBlur: 24,
    shadowOffsetX: 0,
    shadowOffsetY: 16,
    blendMode: "normal",
    filterKind: "none",
    filterColor: "#38bdf8",
    filterIntensity: 0.35,
    filterBlur: 18,
    postProcessEffects: [],
    shapeFillDepth: 12,
    shapeFillEnabled: false,
    shapeFillFit: "contain",
    shapeFillOffsetX: 0,
    shapeFillOffsetY: 0,
    shapeFillScale: 1,
  },
  layer: {
    kind: "layer",
    width: 240,
    height: 120,
    clipsContent: false,
    borderRadius: 16,
    xConstraint: "center",
    yConstraint: "center",
    layoutMode: "free",
    padding: 0,
    gap: 0,
    shadowEnabled: false,
    shadowColor: "#020617",
    shadowOpacity: 0.18,
    shadowBlur: 16,
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    blendMode: "normal",
    filterKind: "none",
    filterColor: "#38bdf8",
    filterIntensity: 0.35,
    filterBlur: 18,
    postProcessEffects: [],
    shapeFillDepth: 12,
    shapeFillEnabled: false,
    shapeFillFit: "contain",
    shapeFillOffsetX: 0,
    shapeFillOffsetY: 0,
    shapeFillScale: 1,
  },
};

const defaultPostProcessEffectByKind: Record<TwoDPostProcessEffectKind, Omit<TwoDPostProcessEffect, "id" | "kind">> = {
  backdropBlur: { amount: 0.55, enabled: true, radius: 28 },
  brightness: { amount: 1.16, enabled: true, radius: 0 },
  contrast: { amount: 1.12, enabled: true, radius: 0 },
  grayscale: { amount: 0.65, enabled: true, radius: 0 },
  hueRotate: { amount: 24, enabled: true, radius: 0 },
  saturate: { amount: 1.28, enabled: true, radius: 0 },
};

function clampSize(value: number, fallback: number) {
  return Math.min(4096, Math.max(8, Number.isFinite(value) ? value : fallback));
}

function toWorldUnits(pixels: number) {
  return Math.max(0.05, pixels * worldUnitsPerPixel);
}

export function twoDPixelsToWorldUnits(pixels: number) {
  return pixels * worldUnitsPerPixel;
}

function toPixels(worldUnits: number) {
  return Math.max(8, worldUnits / worldUnitsPerPixel);
}

function clampPostProcessAmount(kind: TwoDPostProcessEffectKind, value: number) {
  const fallback = defaultPostProcessEffectByKind[kind].amount;
  const amount = Number.isFinite(value) ? value : fallback;

  if (kind === "hueRotate") {
    return Math.min(360, Math.max(-360, amount));
  }

  if (kind === "grayscale") {
    return Math.min(1, Math.max(0, amount));
  }

  return Math.min(4, Math.max(0, amount));
}

export function createTwoDPostProcessEffect(kind: TwoDPostProcessEffectKind): TwoDPostProcessEffect {
  return {
    id: nanoid(),
    kind,
    ...defaultPostProcessEffectByKind[kind],
  };
}

export function resolveTwoDPostProcessEffects(effects: TwoDPostProcessEffect[] = []): TwoDPostProcessEffect[] {
  return effects.map((effect) => {
    const kind = effect.kind ?? "backdropBlur";
    const defaults = defaultPostProcessEffectByKind[kind];

    return {
      id: effect.id || nanoid(),
      kind,
      enabled: effect.enabled ?? defaults.enabled,
      amount: clampPostProcessAmount(kind, effect.amount ?? defaults.amount),
      radius: Math.min(128, Math.max(0, effect.radius ?? defaults.radius)),
    };
  });
}

export function canUseTwoDShapeFillSource(object?: Pick<SceneObject, "kind" | "twoD"> | null) {
  return Boolean(object && !object.twoD && isParametricPrimitiveKind(object.kind));
}

function getWorldSize(settings: TwoDLayerSettings) {
  return {
    height: toWorldUnits(settings.height),
    width: toWorldUnits(settings.width),
  };
}

function getObjectWorldSize(object: Pick<SceneObject, "twoD">) {
  const settings = resolveTwoDLayerSettings(object);

  return settings ? getWorldSize(settings) : null;
}

function alignHorizontal(containerWidth: number, childWidth: number, constraint: TwoDConstraint, padding: number) {
  if (constraint === "start") {
    return -containerWidth / 2 + padding + childWidth / 2;
  }

  if (constraint === "end") {
    return containerWidth / 2 - padding - childWidth / 2;
  }

  return 0;
}

function alignVertical(containerHeight: number, childHeight: number, constraint: TwoDConstraint, padding: number) {
  if (constraint === "start") {
    return containerHeight / 2 - padding - childHeight / 2;
  }

  if (constraint === "end") {
    return -containerHeight / 2 + padding + childHeight / 2;
  }

  return 0;
}

function applyTwoDGeometry(object: SceneObject, settings: TwoDLayerSettings): SceneObject {
  return {
    ...object,
    geometry: {
      ...object.geometry,
      width: toWorldUnits(settings.width),
      height: toWorldUnits(settings.height),
      extrudeDepth: 0,
    },
    twoD: settings,
  };
}

export function resolveTwoDLayerSettings(object: Pick<SceneObject, "twoD">): TwoDLayerSettings | null {
  if (!object.twoD) {
    return null;
  }

  return {
    ...defaultTwoDSettingsByKind[object.twoD.kind],
    ...object.twoD,
    width: clampSize(object.twoD.width, defaultTwoDSettingsByKind[object.twoD.kind].width),
    height: clampSize(object.twoD.height, defaultTwoDSettingsByKind[object.twoD.kind].height),
    borderRadius: Math.max(0, object.twoD.borderRadius ?? defaultTwoDSettingsByKind[object.twoD.kind].borderRadius),
    padding: Math.max(0, object.twoD.padding),
    gap: Math.max(0, object.twoD.gap),
    shadowEnabled: object.twoD.shadowEnabled ?? defaultTwoDSettingsByKind[object.twoD.kind].shadowEnabled,
    shadowColor: object.twoD.shadowColor ?? defaultTwoDSettingsByKind[object.twoD.kind].shadowColor,
    shadowOpacity: Math.min(1, Math.max(0, object.twoD.shadowOpacity ?? defaultTwoDSettingsByKind[object.twoD.kind].shadowOpacity)),
    shadowBlur: Math.max(0, object.twoD.shadowBlur ?? defaultTwoDSettingsByKind[object.twoD.kind].shadowBlur),
    shadowOffsetX: object.twoD.shadowOffsetX ?? defaultTwoDSettingsByKind[object.twoD.kind].shadowOffsetX,
    shadowOffsetY: object.twoD.shadowOffsetY ?? defaultTwoDSettingsByKind[object.twoD.kind].shadowOffsetY,
    blendMode: object.twoD.blendMode ?? defaultTwoDSettingsByKind[object.twoD.kind].blendMode,
    filterKind: object.twoD.filterKind ?? defaultTwoDSettingsByKind[object.twoD.kind].filterKind,
    filterColor: object.twoD.filterColor ?? defaultTwoDSettingsByKind[object.twoD.kind].filterColor,
    filterIntensity: Math.min(1, Math.max(0, object.twoD.filterIntensity ?? defaultTwoDSettingsByKind[object.twoD.kind].filterIntensity)),
    filterBlur: Math.max(0, object.twoD.filterBlur ?? defaultTwoDSettingsByKind[object.twoD.kind].filterBlur),
    postProcessEffects: resolveTwoDPostProcessEffects(object.twoD.postProcessEffects ?? defaultTwoDSettingsByKind[object.twoD.kind].postProcessEffects),
    shapeFillDepth: Math.min(128, Math.max(-128, object.twoD.shapeFillDepth ?? defaultTwoDSettingsByKind[object.twoD.kind].shapeFillDepth)),
    shapeFillEnabled: object.twoD.shapeFillEnabled ?? defaultTwoDSettingsByKind[object.twoD.kind].shapeFillEnabled,
    shapeFillFit: object.twoD.shapeFillFit ?? defaultTwoDSettingsByKind[object.twoD.kind].shapeFillFit,
    shapeFillObjectId: object.twoD.shapeFillObjectId,
    shapeFillOffsetX: object.twoD.shapeFillOffsetX ?? defaultTwoDSettingsByKind[object.twoD.kind].shapeFillOffsetX,
    shapeFillOffsetY: object.twoD.shapeFillOffsetY ?? defaultTwoDSettingsByKind[object.twoD.kind].shapeFillOffsetY,
    shapeFillScale: Math.min(4, Math.max(0.05, object.twoD.shapeFillScale ?? defaultTwoDSettingsByKind[object.twoD.kind].shapeFillScale)),
  };
}

export function updateTwoDLayerSettings(object: SceneObject, updates: Partial<TwoDLayerSettings>): SceneObject {
  const current = resolveTwoDLayerSettings(object) ?? defaultTwoDSettingsByKind.layer;
  const nextKind = updates.kind ?? current.kind;
  const nextDefaults = defaultTwoDSettingsByKind[nextKind];
  const nextSettings: TwoDLayerSettings = {
    ...nextDefaults,
    ...current,
    ...updates,
    kind: nextKind,
    width: clampSize(updates.width ?? current.width, nextDefaults.width),
    height: clampSize(updates.height ?? current.height, nextDefaults.height),
    borderRadius: Math.max(0, updates.borderRadius ?? current.borderRadius),
    padding: Math.max(0, updates.padding ?? current.padding),
    gap: Math.max(0, updates.gap ?? current.gap),
    shadowOpacity: Math.min(1, Math.max(0, updates.shadowOpacity ?? current.shadowOpacity)),
    shadowBlur: Math.max(0, updates.shadowBlur ?? current.shadowBlur),
    shadowOffsetX: updates.shadowOffsetX ?? current.shadowOffsetX,
    shadowOffsetY: updates.shadowOffsetY ?? current.shadowOffsetY,
    filterIntensity: Math.min(1, Math.max(0, updates.filterIntensity ?? current.filterIntensity)),
    filterBlur: Math.max(0, updates.filterBlur ?? current.filterBlur),
    postProcessEffects: resolveTwoDPostProcessEffects(updates.postProcessEffects ?? current.postProcessEffects),
    shapeFillDepth: Math.min(128, Math.max(-128, updates.shapeFillDepth ?? current.shapeFillDepth)),
    shapeFillScale: Math.min(4, Math.max(0.05, updates.shapeFillScale ?? current.shapeFillScale)),
  };

  return applyTwoDGeometry(object, nextSettings);
}

function createTwoDRectangle(kind: TwoDLayerKind, name: string, parentId: string | null, positionZ: number) {
  const object = createSceneObject("rectangle", name);
  const settings = defaultTwoDSettingsByKind[kind];

  object.parentId = parentId;
  object.physics = undefined;
  object.constraints = {
    ...object.constraints,
    lockPositionZ: true,
    lockRotationX: true,
    lockRotationY: true,
  };
  object.transform = {
    position: [0, 0, positionZ],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
  object.material = {
    ...object.material,
    color: kind === "page" ? "#f8fafc" : "#dbeafe",
    metalness: 0,
    opacity: kind === "page" ? 1 : 0.72,
    roughness: 0.82,
  };

  return applyTwoDGeometry(object, settings);
}

export function createTwoDPage(name = "2D Page") {
  return createTwoDRectangle("page", name, null, -0.04);
}

export function createTwoDFrame(parentId: string | null, name = "2D Frame") {
  return createTwoDRectangle("frame", name, parentId, parentId ? 0.04 : 0.02);
}

function createTwoDText(name: string, content: string, parentId: string, position: Vec3, fontSize: number, maxWidth: number) {
  const object = createSceneObject("text", name);
  object.parentId = parentId;
  object.physics = undefined;
  object.constraints = {
    ...object.constraints,
    lockPositionZ: true,
    lockRotationX: true,
    lockRotationY: true,
  };
  object.transform = {
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
  object.text = { content, fontSize, maxWidth };
  object.material = {
    ...object.material,
    color: "#f8fafc",
    metalness: 0,
    roughness: 0.46,
  };

  return object;
}

function createTwoDLayer(parentId: string | null, name: string, width: number, height: number, borderRadius: number, color: string) {
  const object = updateTwoDLayerSettings(createTwoDRectangle("layer", name, parentId, parentId ? 0.08 : 0.04), {
    borderRadius,
    height,
    width,
  });

  object.material = {
    ...object.material,
    color,
    metalness: 0,
    opacity: 1,
    roughness: 0.68,
  };

  return object;
}

function createTwoDButton(parentId: string | null, name: string) {
  const root = createTwoDLayer(parentId, name, 220, 56, 18, "#2563eb");
  root.twoD = root.twoD ? { ...root.twoD, shadowEnabled: true, shadowBlur: 18, shadowOffsetY: 8, shadowOpacity: 0.22 } : root.twoD;
  const label = createTwoDText(`${name} Label`, "Button", root.id, [-0.38, -0.035, 0.035], 0.2, 1.3);

  return { objects: [root, label], rootObjectId: root.id };
}

function createTwoDInput(parentId: string | null, name: string) {
  const root = createTwoDLayer(parentId, name, 300, 58, 16, "#f8fafc");
  root.material = { ...root.material, color: "#f8fafc", roughness: 0.74 };
  root.twoD = root.twoD ? { ...root.twoD, shadowEnabled: true, shadowBlur: 14, shadowOffsetY: 6, shadowOpacity: 0.12 } : root.twoD;

  const placeholder = createTwoDText(`${name} Placeholder`, "Email address", root.id, [-0.82, -0.035, 0.035], 0.18, 1.8);
  placeholder.material = { ...placeholder.material, color: "#64748b" };

  const caret = createTwoDLayer(root.id, `${name} Caret`, 2, 28, 0, "#2563eb");
  caret.transform.position = [-0.98, 0, 0.03];

  return { objects: [root, placeholder, caret], rootObjectId: root.id };
}

function createTwoDCard(parentId: string | null, name: string) {
  const root = createTwoDLayer(parentId, name, 360, 220, 24, "#111827");
  root.twoD = root.twoD
    ? {
        ...root.twoD,
        clipsContent: true,
        gap: 12,
        layoutMode: "vertical",
        padding: 24,
        shadowEnabled: true,
        shadowBlur: 24,
        shadowOffsetY: 16,
        shadowOpacity: 0.2,
      }
    : root.twoD;

  const title = createTwoDText(`${name} Title`, "Interface Card", root.id, [-0.88, 0.43, 0.035], 0.2, 1.8);
  const body = createTwoDText(`${name} Body`, "Reusable UI layer", root.id, [-0.88, 0.16, 0.035], 0.15, 1.65);
  body.material = { ...body.material, color: "#94a3b8" };

  const accent = createTwoDLayer(root.id, `${name} Accent`, 72, 72, 20, "#51e0c3");
  accent.transform.position = [0.66, 0.18, 0.03];
  accent.material = { ...accent.material, opacity: 0.92 };

  const action = createTwoDLayer(root.id, `${name} Action`, 132, 42, 14, "#2563eb");
  action.transform.position = [-0.58, -0.46, 0.03];
  const actionLabel = createTwoDText(`${name} Action Label`, "Open", action.id, [-0.2, -0.025, 0.035], 0.16, 0.8);

  return { objects: [root, title, body, accent, action, actionLabel], rootObjectId: root.id };
}

export function createTwoDUiPrimitive(kind: TwoDUiPrimitiveKind, parentId: string | null, name: string) {
  if (kind === "button") {
    return createTwoDButton(parentId, name);
  }

  if (kind === "input") {
    return createTwoDInput(parentId, name);
  }

  return createTwoDCard(parentId, name);
}

export function canContainTwoDLayer(object?: Pick<SceneObject, "twoD"> | null) {
  return object?.twoD?.kind === "page" || object?.twoD?.kind === "frame";
}

export function alignTwoDLayerToParent(objects: SceneObject[], objectId: string): SceneObject[] {
  const child = objects.find((object) => object.id === objectId);
  const parent = child?.parentId ? objects.find((object) => object.id === child.parentId) : null;
  const childSettings = child ? resolveTwoDLayerSettings(child) : null;
  const parentSettings = parent ? resolveTwoDLayerSettings(parent) : null;

  if (!child || child.locked || !childSettings || !parentSettings || !canContainTwoDLayer(parent)) {
    return objects;
  }

  const parentSize = getWorldSize(parentSettings);
  const padding = toWorldUnits(parentSettings.padding);
  let nextChild = child;

  if (childSettings.xConstraint === "stretch") {
    nextChild = updateTwoDLayerSettings(nextChild, {
      width: toPixels(Math.max(0.05, parentSize.width - padding * 2)),
    });
  }

  if (childSettings.yConstraint === "stretch") {
    nextChild = updateTwoDLayerSettings(nextChild, {
      height: toPixels(Math.max(0.05, parentSize.height - padding * 2)),
    });
  }

  const childSize = getObjectWorldSize(nextChild);

  if (!childSize) {
    return objects;
  }

  const position: Vec3 = [
    alignHorizontal(parentSize.width, childSize.width, childSettings.xConstraint, padding),
    alignVertical(parentSize.height, childSize.height, childSettings.yConstraint, padding),
    nextChild.transform.position[2],
  ];
  const alignedChild: SceneObject = {
    ...nextChild,
    transform: {
      ...nextChild.transform,
      position,
    },
  };

  return objects.map((object) => (object.id === objectId ? alignedChild : object));
}

export function applyTwoDLayoutToChildren(objects: SceneObject[], containerId: string): SceneObject[] {
  const container = objects.find((object) => object.id === containerId);
  const containerSettings = container ? resolveTwoDLayerSettings(container) : null;

  if (!container || !containerSettings || !canContainTwoDLayer(container) || containerSettings.layoutMode === "free") {
    return objects;
  }

  const parentSize = getWorldSize(containerSettings);
  const padding = toWorldUnits(containerSettings.padding);
  const gap = toWorldUnits(containerSettings.gap);
  const children = objects.filter((object) => object.parentId === containerId && Boolean(object.twoD) && !object.locked);
  const updates = new Map<string, SceneObject>();
  let cursor = containerSettings.layoutMode === "horizontal" ? -parentSize.width / 2 + padding : parentSize.height / 2 - padding;

  for (const child of children) {
    const childSettings = resolveTwoDLayerSettings(child);

    if (!childSettings) {
      continue;
    }

    let nextChild = child;

    if (containerSettings.layoutMode === "horizontal" && childSettings.yConstraint === "stretch") {
      nextChild = updateTwoDLayerSettings(nextChild, {
        height: toPixels(Math.max(0.05, parentSize.height - padding * 2)),
      });
    }

    if (containerSettings.layoutMode === "vertical" && childSettings.xConstraint === "stretch") {
      nextChild = updateTwoDLayerSettings(nextChild, {
        width: toPixels(Math.max(0.05, parentSize.width - padding * 2)),
      });
    }

    const childSize = getObjectWorldSize(nextChild);

    if (!childSize) {
      continue;
    }

    const position: Vec3 =
      containerSettings.layoutMode === "horizontal"
        ? [
            cursor + childSize.width / 2,
            alignVertical(parentSize.height, childSize.height, childSettings.yConstraint, padding),
            nextChild.transform.position[2],
          ]
        : [
            alignHorizontal(parentSize.width, childSize.width, childSettings.xConstraint, padding),
            cursor - childSize.height / 2,
            nextChild.transform.position[2],
          ];

    updates.set(child.id, {
      ...nextChild,
      transform: {
        ...nextChild.transform,
        position,
      },
    });

    cursor += containerSettings.layoutMode === "horizontal" ? childSize.width + gap : -(childSize.height + gap);
  }

  return updates.size ? objects.map((object) => updates.get(object.id) ?? object) : objects;
}
