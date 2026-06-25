import type { ClonerSettings, PrimitiveKind, SceneObject, Transform, Vec3 } from "../types";

export const defaultClonerSettings: ClonerSettings = {
  animationDelay: 0,
  count: 5,
  enabled: false,
  gridColumns: 3,
  gridGap: [1.2, 1.2, 1.2],
  gridLayers: 1,
  gridRows: 3,
  mode: "linear",
  offset: [1.2, 0, 0],
  radialAngle: 360,
  radialRadius: 2.4,
  randomPosition: [2, 2, 2],
  randomRotation: [0, Math.PI, 0],
  randomScale: 0.35,
  randomSeed: 1337,
  rotationOffset: [0, 0, 0],
  scaleStep: 0,
  staggerOrder: "forward",
};

const identityTransform: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

export function canHaveCloner(kind: PrimitiveKind) {
  return kind !== "camera" && kind !== "pointLight" && kind !== "directionalLight" && kind !== "spotLight" && kind !== "group" && kind !== "audio";
}

export function resolveClonerSettings(object: Pick<SceneObject, "cloner">): ClonerSettings {
  return {
    ...defaultClonerSettings,
    ...object.cloner,
  };
}

function scaleForIndex(scaleStep: number, index: number): Vec3 {
  const scale = Math.max(0.02, 1 + scaleStep * index);

  return [scale, scale, scale];
}

function multiplyVec3(vector: Vec3, amount: number): Vec3 {
  return [vector[0] * amount, vector[1] * amount, vector[2] * amount];
}

function seededNoise(seed: number, index: number, channel: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233 + channel * 37.719) * 43758.5453;

  return value - Math.floor(value);
}

function signedNoise(seed: number, index: number, channel: number) {
  return seededNoise(seed, index, channel) * 2 - 1;
}

function createLinearTransform(cloner: ClonerSettings, index: number): Transform {
  return {
    position: multiplyVec3(cloner.offset, index),
    rotation: multiplyVec3(cloner.rotationOffset, index),
    scale: scaleForIndex(cloner.scaleStep, index),
  };
}

function createRadialTransform(cloner: ClonerSettings, index: number, count: number): Transform {
  if (index === 0) {
    return identityTransform;
  }

  const angle = ((cloner.radialAngle * Math.PI) / 180 / Math.max(1, count - 1)) * index;

  return {
    position: [Math.cos(angle) * cloner.radialRadius, 0, Math.sin(angle) * cloner.radialRadius],
    rotation: [cloner.rotationOffset[0] * index, cloner.rotationOffset[1] * index - angle, cloner.rotationOffset[2] * index],
    scale: scaleForIndex(cloner.scaleStep, index),
  };
}

function createGridTransform(cloner: ClonerSettings, index: number): Transform {
  const column = index % cloner.gridColumns;
  const row = Math.floor(index / cloner.gridColumns) % cloner.gridRows;
  const layer = Math.floor(index / Math.max(1, cloner.gridColumns * cloner.gridRows)) % cloner.gridLayers;

  return {
    position: [column * cloner.gridGap[0], row * cloner.gridGap[1], layer * cloner.gridGap[2]],
    rotation: multiplyVec3(cloner.rotationOffset, index),
    scale: scaleForIndex(cloner.scaleStep, index),
  };
}

function createRandomTransform(cloner: ClonerSettings, index: number): Transform {
  if (index === 0) {
    return identityTransform;
  }

  const scale = Math.max(0.02, 1 + signedNoise(cloner.randomSeed, index, 6) * cloner.randomScale);

  return {
    position: [
      signedNoise(cloner.randomSeed, index, 0) * cloner.randomPosition[0],
      signedNoise(cloner.randomSeed, index, 1) * cloner.randomPosition[1],
      signedNoise(cloner.randomSeed, index, 2) * cloner.randomPosition[2],
    ],
    rotation: [
      signedNoise(cloner.randomSeed, index, 3) * cloner.randomRotation[0],
      signedNoise(cloner.randomSeed, index, 4) * cloner.randomRotation[1],
      signedNoise(cloner.randomSeed, index, 5) * cloner.randomRotation[2],
    ],
    scale: [scale, scale, scale],
  };
}

export function createClonerInstanceTransforms(object: SceneObject): Transform[] {
  const cloner = resolveClonerSettings(object);

  if (!cloner.enabled || !canHaveCloner(object.kind)) {
    return [identityTransform];
  }

  const count = Math.max(1, Math.min(200, Math.round(cloner.count)));

  return Array.from({ length: count }, (_, index) => {
    if (cloner.mode === "radial") {
      return createRadialTransform(cloner, index, count);
    }

    if (cloner.mode === "grid") {
      return createGridTransform(cloner, index);
    }

    if (cloner.mode === "random") {
      return createRandomTransform(cloner, index);
    }

    return createLinearTransform(cloner, index);
  });
}

export function hasClonerAnimationStagger(object: SceneObject) {
  const cloner = resolveClonerSettings(object);

  return canHaveCloner(object.kind) && cloner.enabled && cloner.animationDelay > 0 && cloner.count > 1;
}

function getCenterOrder(index: number, count: number) {
  const center = (count - 1) / 2;

  return Math.abs(index - center) * 2 + (index < center ? 0 : 1);
}

export function getClonerInstanceDelay(object: SceneObject, index: number, count: number) {
  const cloner = resolveClonerSettings(object);

  if (!hasClonerAnimationStagger(object)) {
    return 0;
  }

  const order =
    cloner.staggerOrder === "reverse"
      ? count - 1 - index
      : cloner.staggerOrder === "center"
        ? getCenterOrder(index, count)
        : cloner.staggerOrder === "random"
          ? Math.floor(seededNoise(cloner.randomSeed, index, 8) * count)
          : index;

  return Math.max(0, order) * cloner.animationDelay;
}

function scaleRatio(animated: number, base: number) {
  return Math.abs(base) < 0.0001 ? animated : animated / base;
}

export function composeClonerAnimatedTransform(cloneTransform: Transform, baseTransform: Transform, animatedTransform: Transform): Transform {
  return {
    position: [
      cloneTransform.position[0] + animatedTransform.position[0] - baseTransform.position[0],
      cloneTransform.position[1] + animatedTransform.position[1] - baseTransform.position[1],
      cloneTransform.position[2] + animatedTransform.position[2] - baseTransform.position[2],
    ],
    rotation: [
      cloneTransform.rotation[0] + animatedTransform.rotation[0] - baseTransform.rotation[0],
      cloneTransform.rotation[1] + animatedTransform.rotation[1] - baseTransform.rotation[1],
      cloneTransform.rotation[2] + animatedTransform.rotation[2] - baseTransform.rotation[2],
    ],
    scale: [
      cloneTransform.scale[0] * scaleRatio(animatedTransform.scale[0], baseTransform.scale[0]),
      cloneTransform.scale[1] * scaleRatio(animatedTransform.scale[1], baseTransform.scale[1]),
      cloneTransform.scale[2] * scaleRatio(animatedTransform.scale[2], baseTransform.scale[2]),
    ],
  };
}
