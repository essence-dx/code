import { nanoid } from "nanoid";
import type { CameraSettings, LightSettings, Material, PathSettings, PrimitiveKind, SceneDocument, SceneObject, SceneSettings, TextSettings, Transform } from "../types";
import { defaultTransformConstraints } from "./object-constraints";
import { defaultPivot } from "./object-pivot";
import { defaultParticleSettings } from "./particle-settings";
import { canHavePhysics, defaultPhysicsSettings } from "./physics-settings";
import { isParametricPrimitiveKind, isTwoDimensionalShapeKind, resolveGeometry } from "./primitive-geometry";

const defaultMaterial: Material = {
  color: "#51e0c3",
  opacity: 1,
  roughness: 0.46,
  metalness: 0.08,
  wireframe: false,
  textureDataUrl: null,
  layers: [],
};

const defaultTransform: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

const defaultText: TextSettings = {
  content: "Essence",
  fontSize: 0.72,
  maxWidth: 6,
};

const defaultLight: LightSettings = {
  color: "#ffffff",
  intensity: 2.4,
  distance: 12,
  angle: 0.65,
  penumbra: 0.35,
  castShadow: true,
  shadowRadius: 2.2,
  shadowBias: -0.0004,
};

const defaultCamera: CameraSettings = {
  fov: 48,
  near: 0.1,
  far: 1000,
};

const defaultPath: PathSettings = {
  points: [
    [-1.2, 0, 0],
    [-0.35, 0.55, 0],
    [0.55, -0.35, 0],
    [1.2, 0.25, 0],
  ],
  closed: false,
  curveKind: "smooth",
  tubeRadius: 0.035,
  tubularSegments: 96,
  radialSegments: 8,
};

export const defaultSceneSettings: SceneSettings = {
  backgroundColor: "#10141c",
  ambientColor: "#ffffff",
  ambientIntensity: 0.28,
  fogEnabled: false,
  fogColor: "#10141c",
  fogNear: 10,
  fogFar: 42,
  postProcessingEnabled: false,
  bloomEnabled: false,
  bloomIntensity: 0.35,
  bloomThreshold: 0.78,
  bloomRadius: 0.32,
  depthOfFieldEnabled: false,
  depthOfFieldFocus: 12,
  depthOfFieldAperture: 0.025,
  depthOfFieldMaxBlur: 0.012,
};

export function resolveSceneSettings(settings?: Partial<SceneSettings> | null): SceneSettings {
  return {
    ...defaultSceneSettings,
    ...settings,
  };
}

function isLightKind(kind: PrimitiveKind) {
  return kind === "pointLight" || kind === "directionalLight" || kind === "spotLight";
}

export function createSceneObject(kind: PrimitiveKind, name?: string): SceneObject {
  const offset = kind === "sphere" ? 1.7 : kind === "torus" ? -1.7 : kind === "pointLight" ? 2.2 : kind === "spotLight" ? -2.2 : 0;

  return {
    id: nanoid(),
    parentId: null,
    name: name ?? `${kind[0].toUpperCase()}${kind.slice(1)}`,
    kind,
    visible: true,
    locked: false,
    constraints: defaultTransformConstraints,
    pivot: defaultPivot,
    transform: {
      ...defaultTransform,
      position: [
        offset,
        kind === "plane" ? -0.55 : isTwoDimensionalShapeKind(kind) ? 0.72 : kind === "text" ? 1.25 : kind === "particles" ? 1.15 : isLightKind(kind) ? 2.2 : kind === "camera" ? 2.5 : 0,
        isTwoDimensionalShapeKind(kind) || kind === "text" ? 0.2 : isLightKind(kind) ? 1.8 : kind === "camera" ? 5 : 0,
      ],
      rotation: kind === "camera" ? [-0.42, 0.46, 0.18] : defaultTransform.rotation,
      scale: kind === "plane" ? [4, 1, 4] : [1, 1, 1],
    },
    geometry: isParametricPrimitiveKind(kind) ? resolveGeometry({ kind, geometry: undefined }) : undefined,
    material: {
      ...defaultMaterial,
      color: kind === "sphere" ? "#b38cff" : kind === "plane" ? "#28323a" : isTwoDimensionalShapeKind(kind) ? "#ffcf5c" : kind === "text" ? "#f4fbff" : kind === "particles" ? "#8ee7ff" : defaultMaterial.color,
      opacity: kind === "particles" ? 0.88 : defaultMaterial.opacity,
      roughness: kind === "plane" ? 0.82 : defaultMaterial.roughness,
    },
    text: kind === "text" ? defaultText : undefined,
    camera: kind === "camera" ? defaultCamera : undefined,
    model: undefined,
    image: undefined,
    video: undefined,
    audio: undefined,
    svg: undefined,
    figma: undefined,
    spline: undefined,
    path: kind === "path" ? defaultPath : undefined,
    particles: kind === "particles" ? defaultParticleSettings : undefined,
    physics: canHavePhysics(kind) ? defaultPhysicsSettings : undefined,
    light: isLightKind(kind)
      ? {
          ...defaultLight,
          intensity: kind === "directionalLight" ? 1.4 : defaultLight.intensity,
          distance: kind === "directionalLight" ? 0 : defaultLight.distance,
        }
      : undefined,
  };
}

export function createDefaultDocument(name = "Untitled Scene"): SceneDocument {
  const now = new Date().toISOString();
  const camera = createSceneObject("camera", "Main Camera");

  return {
    id: nanoid(),
    name,
    activeCameraId: camera.id,
    sceneSettings: defaultSceneSettings,
    sceneStates: [],
    inputControls: [],
    components: [],
    materialAssets: [],
    audioAssets: [],
    variables: [],
    animationTracks: [],
    createdAt: now,
    updatedAt: now,
    objects: [
      createSceneObject("box", "Hero Cube"),
      createSceneObject("sphere", "Accent Sphere"),
      camera,
      createSceneObject("directionalLight", "Key Light"),
      createSceneObject("plane", "Ground Plane"),
    ],
  };
}
