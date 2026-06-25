import { z } from "zod";

export const primitiveKinds = [
  "box",
  "sphere",
  "cylinder",
  "cone",
  "torus",
  "plane",
  "rectangle",
  "ellipse",
  "triangle",
  "star",
  "text",
  "model",
  "image",
  "video",
  "audio",
  "svg",
  "figma",
  "spline",
  "path",
  "particles",
  "pointLight",
  "directionalLight",
  "spotLight",
  "camera",
  "group",
] as const;

export type PrimitiveKind = (typeof primitiveKinds)[number];
export type Vec3 = [number, number, number];

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const transformSchema = z.object({
  position: vec3Schema,
  rotation: vec3Schema,
  scale: vec3Schema,
});

export const lookAtTargetKindSchema = z.enum(["camera", "object"]);

export const lookAtBehaviorSchema = z.object({
  enabled: z.boolean(),
  targetKind: lookAtTargetKindSchema.optional(),
  targetObjectId: z.string().optional(),
});

export const followBehaviorSchema = z.object({
  enabled: z.boolean(),
  targetKind: lookAtTargetKindSchema.optional(),
  targetObjectId: z.string().optional(),
  offset: vec3Schema.optional(),
  smoothing: z.number().min(0).max(1).optional(),
});

export const animationPropertySchema = z.enum(["position", "rotation", "scale", "material.opacity"]);

export const sceneVariableTypeSchema = z.enum(["number", "boolean", "text", "color"]);

export const sceneVariableValueSchema = z.union([z.number(), z.boolean(), z.string()]);

export const sceneVariableSourceSchema = z.enum(["manual", "time", "clock", "timer", "stopwatch", "counter", "random"]);

export const twoDLayerKindSchema = z.enum(["page", "frame", "layer"]);
export const twoDConstraintSchema = z.enum(["start", "center", "end", "stretch"]);
export const twoDLayoutModeSchema = z.enum(["free", "horizontal", "vertical"]);
export const twoDBlendModeSchema = z.enum(["normal", "multiply", "screen", "add", "subtract"]);
export const twoDLayerFilterSchema = z.enum(["none", "blur", "tint", "glass"]);
export const twoDShapeFillFitSchema = z.enum(["contain", "cover", "native"]);
export const twoDPostProcessEffectKindSchema = z.enum(["backdropBlur", "brightness", "contrast", "saturate", "hueRotate", "grayscale"]);

export const twoDPostProcessEffectSchema = z.object({
  id: z.string(),
  kind: twoDPostProcessEffectKindSchema.default("backdropBlur"),
  enabled: z.boolean().default(true),
  amount: z.number().min(-360).max(360).default(1),
  radius: z.number().min(0).max(128).default(24),
});

export const twoDLayerSettingsSchema = z.object({
  kind: twoDLayerKindSchema.default("layer"),
  width: z.number().positive().default(640),
  height: z.number().positive().default(400),
  clipsContent: z.boolean().default(false),
  borderRadius: z.number().min(0).default(0),
  xConstraint: twoDConstraintSchema.default("center"),
  yConstraint: twoDConstraintSchema.default("center"),
  layoutMode: twoDLayoutModeSchema.default("free"),
  padding: z.number().min(0).default(0),
  gap: z.number().min(0).default(0),
  shadowEnabled: z.boolean().default(false),
  shadowColor: z.string().default("#020617"),
  shadowOpacity: z.number().min(0).max(1).default(0.18),
  shadowBlur: z.number().min(0).default(24),
  shadowOffsetX: z.number().default(0),
  shadowOffsetY: z.number().default(16),
  blendMode: twoDBlendModeSchema.default("normal"),
  filterKind: twoDLayerFilterSchema.default("none"),
  filterColor: z.string().default("#38bdf8"),
  filterIntensity: z.number().min(0).max(1).default(0.35),
  filterBlur: z.number().min(0).default(18),
  postProcessEffects: z.array(twoDPostProcessEffectSchema).default([]),
  shapeFillEnabled: z.boolean().default(false),
  shapeFillObjectId: z.string().optional(),
  shapeFillFit: twoDShapeFillFitSchema.default("contain"),
  shapeFillScale: z.number().min(0.05).max(4).default(1),
  shapeFillOffsetX: z.number().default(0),
  shapeFillOffsetY: z.number().default(0),
  shapeFillDepth: z.number().min(-128).max(128).default(12),
});

export const sceneVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: sceneVariableTypeSchema,
  value: sceneVariableValueSchema,
  scope: z.enum(["scene", "local"]).default("scene"),
  source: sceneVariableSourceSchema.default("manual"),
});

export const inputControlTypeSchema = z.enum(["slider", "toggle", "text", "color"]);

export const sceneInputControlSchema = z.object({
  id: z.string(),
  label: z.string(),
  variableId: z.string().optional(),
  type: inputControlTypeSchema.default("text"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().min(0.0001).optional(),
});

export const objectPropertyBindingTargetValues = [
  "transform.position.x",
  "transform.position.y",
  "transform.position.z",
  "transform.rotation.x",
  "transform.rotation.y",
  "transform.rotation.z",
  "transform.scale.x",
  "transform.scale.y",
  "transform.scale.z",
  "material.color",
  "material.opacity",
  "material.roughness",
  "material.metalness",
  "text.content",
  "text.fontSize",
  "text.maxWidth",
  "light.color",
  "light.intensity",
  "light.distance",
  "light.angle",
  "light.penumbra",
] as const;

export const objectPropertyBindingTargetSchema = z.enum(objectPropertyBindingTargetValues);

export const objectPropertyBindingSchema = z.object({
  id: z.string(),
  property: objectPropertyBindingTargetSchema,
  variableId: z.string().optional(),
  expression: z.string().max(160).optional(),
});

export const variableActionOperationSchema = z.enum(["set", "increment", "decrement", "multiply", "toggle", "cycle"]);

export const variableActionSchema = z.object({
  variableId: z.string().optional(),
  operation: variableActionOperationSchema.default("set"),
  value: sceneVariableValueSchema.optional(),
  expression: z.string().max(160).optional(),
});

export const variableChangeTriggerSchema = z.object({
  enabled: z.boolean(),
  variableId: z.string().optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const stateChangeTriggerSchema = z.object({
  enabled: z.boolean(),
  targetStateId: z.string().optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const distanceTriggerModeSchema = z.enum(["enter", "inside", "exit"]);

export const distanceTriggerSchema = z.object({
  enabled: z.boolean(),
  mode: distanceTriggerModeSchema.optional(),
  threshold: z.number().min(0.01).max(500).optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const triggerAreaModeSchema = z.enum(["enter", "inside", "exit"]);

export const triggerAreaSchema = z.object({
  enabled: z.boolean(),
  mode: triggerAreaModeSchema.optional(),
  radius: z.number().min(0.01).max(500).optional(),
  targetObjectId: z.string().optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const collisionTriggerModeSchema = z.enum(["enter", "inside", "exit"]);

export const collisionTriggerSchema = z.object({
  enabled: z.boolean(),
  mode: collisionTriggerModeSchema.optional(),
  targetObjectId: z.string().optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const controlsTriggerEventSchema = z.enum(["start", "change", "end"]);

export const controlsTriggerSchema = z.object({
  enabled: z.boolean(),
  event: controlsTriggerEventSchema.optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const gameControlsDirectionSchema = z.enum(["any", "up", "down", "left", "right", "primary", "secondary"]);

export const gameControlsTriggerSchema = z.object({
  enabled: z.boolean(),
  direction: gameControlsDirectionSchema.optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
  deadzone: z.number().min(0).max(1).optional(),
});

export const pointerTriggerEventSchema = z.enum(["click", "down", "up", "press", "hoverEnter", "hoverExit"]);

export const pointerTriggerSchema = z.object({
  enabled: z.boolean(),
  event: pointerTriggerEventSchema.optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const dragTriggerEventSchema = z.enum(["start", "drag", "drop"]);

export const dragTriggerSchema = z.object({
  enabled: z.boolean(),
  event: dragTriggerEventSchema.optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const cameraActionSchema = z.object({
  targetCameraId: z.string().optional(),
});

export const resetActionSchema = z.object({
  enabled: z.boolean().default(false),
});

export const localStorageActionSchema = z.object({
  clearLocalVariables: z.boolean().default(false),
});

export const mediaActionOperationSchema = z.enum(["play", "pause", "toggle", "restart"]);

export const mediaActionSchema = z.object({
  targetObjectId: z.string().optional(),
  operation: mediaActionOperationSchema.default("toggle"),
});

export const apiActionMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const apiActionSchema = z.object({
  enabled: z.boolean().default(false),
  method: apiActionMethodSchema.default("POST"),
  url: z.string().optional(),
  body: z.string().optional(),
});

export const webhookActionSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().optional(),
  eventName: z.string().optional(),
  includeVariables: z.boolean().default(true),
});

export const networkTriggerEventSchema = z.enum(["apiUpdated", "webhookCalled"]);

export const networkTriggerSchema = z.object({
  enabled: z.boolean(),
  event: networkTriggerEventSchema.optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const objectVisibilityActionOperationSchema = z.enum(["show", "hide", "toggle"]);

export const objectVisibilityActionSchema = z.object({
  targetObjectId: z.string().optional(),
  operation: objectVisibilityActionOperationSchema.default("toggle"),
});

export const propertyToggleTargetSchema = z.enum(["material.wireframe", "light.castShadow", "video.loop", "video.muted", "audio.autoplay", "audio.loop", "audio.muted"]);

export const propertyToggleActionSchema = z.object({
  targetObjectId: z.string().optional(),
  property: propertyToggleTargetSchema.default("material.wireframe"),
});

export const particleActionOperationSchema = z.enum(["toggle", "start", "stop", "set"]);

export const particleActionSchema = z.object({
  targetObjectId: z.string().optional(),
  operation: particleActionOperationSchema.default("toggle"),
  count: z.number().int().min(1).max(2000).optional(),
  spread: z.number().min(0.1).max(24).optional(),
  speed: z.number().min(0).max(8).optional(),
  size: z.number().min(0.01).max(1).optional(),
});

export const objectInstanceActionOperationSchema = z.enum(["create", "destroy", "toggle"]);

export const objectInstanceActionSchema = z.object({
  sourceObjectId: z.string().optional(),
  operation: objectInstanceActionOperationSchema.default("create"),
  offset: vec3Schema.optional(),
  maxInstances: z.number().int().min(1).max(50).optional(),
});

export const animationActionOperationSchema = z.enum(["toggle", "start", "pause", "restart"]);

export const animationActionSchema = z.object({
  targetObjectId: z.string().optional(),
  operation: animationActionOperationSchema.default("toggle"),
});

export const transitionActionSchema = z.object({
  targetObjectId: z.string().optional(),
  duration: z.number().min(0).max(30).optional(),
  position: vec3Schema.optional(),
  rotation: vec3Schema.optional(),
  scale: vec3Schema.optional(),
});

export const sceneTransitionActionSchema = z.object({
  targetStateId: z.string().optional(),
  duration: z.number().min(0).max(30).optional(),
});

export const interactionConditionOperatorSchema = z.enum(["equals", "notEquals", "greaterThan", "lessThan", "greaterOrEqual", "lessOrEqual"]);

export const interactionConditionSchema = z.object({
  variableId: z.string().optional(),
  operator: interactionConditionOperatorSchema.default("equals"),
  value: sceneVariableValueSchema.optional(),
});

export const keyboardTriggerEventSchema = z.enum(["down", "up", "press"]);

export const keyboardTriggerSchema = z.object({
  key: z.string().min(1).max(32),
  event: keyboardTriggerEventSchema.optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const scrollTriggerDirectionSchema = z.enum(["any", "up", "down"]);

export const scrollTriggerSchema = z.object({
  enabled: z.boolean(),
  direction: scrollTriggerDirectionSchema.optional(),
  minDelta: z.number().min(0).max(1000).optional(),
  cooldownMs: z.number().int().min(0).max(5000).optional(),
});

export const startTriggerSchema = z.object({
  enabled: z.boolean(),
});

export const resizeTriggerSchema = z.object({
  enabled: z.boolean(),
});

export const animationKeyframeValueSchema = z.union([vec3Schema, z.number()]);

export const animationKeyframeSchema = z.object({
  id: z.string(),
  time: z.number().min(0).max(120),
  value: animationKeyframeValueSchema,
});

export const animationEasingSchema = z.enum(["linear", "easeIn", "easeOut", "easeInOut"]);

export const animationTrackSchema = z.object({
  id: z.string(),
  objectId: z.string(),
  property: animationPropertySchema,
  easing: animationEasingSchema.default("linear"),
  loop: z.boolean(),
  keyframes: z.array(animationKeyframeSchema),
});

export const transformConstraintsSchema = z.object({
  lockPositionX: z.boolean().optional(),
  lockPositionY: z.boolean().optional(),
  lockPositionZ: z.boolean().optional(),
  lockRotationX: z.boolean().optional(),
  lockRotationY: z.boolean().optional(),
  lockRotationZ: z.boolean().optional(),
  lockScaleX: z.boolean().optional(),
  lockScaleY: z.boolean().optional(),
  lockScaleZ: z.boolean().optional(),
});

export const clonerModeSchema = z.enum(["linear", "radial", "grid", "random"]);
export const clonerStaggerOrderSchema = z.enum(["forward", "reverse", "center", "random"]);
export const booleanOperationKindSchema = z.enum(["union", "subtract", "intersect"]);

export const booleanOperationSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(true),
  operation: booleanOperationKindSchema.default("subtract"),
  targetObjectId: z.string().optional(),
});

export const shapeBlendSchema = z.object({
  targetObjectId: z.string().optional(),
  amount: z.number().min(0).max(1).default(0),
});

export const clonerSettingsSchema = z.object({
  animationDelay: z.number().min(0).max(10).default(0),
  enabled: z.boolean().default(false),
  mode: clonerModeSchema.default("linear"),
  staggerOrder: clonerStaggerOrderSchema.default("forward"),
  count: z.number().int().min(1).max(200).default(5),
  offset: vec3Schema.default([1.2, 0, 0]),
  rotationOffset: vec3Schema.default([0, 0, 0]),
  scaleStep: z.number().min(-0.95).max(4).default(0),
  radialRadius: z.number().min(0).max(48).default(2.4),
  radialAngle: z.number().min(-360).max(360).default(360),
  gridColumns: z.number().int().min(1).max(32).default(3),
  gridRows: z.number().int().min(1).max(32).default(3),
  gridLayers: z.number().int().min(1).max(16).default(1),
  gridGap: vec3Schema.default([1.2, 1.2, 1.2]),
  randomSeed: z.number().int().min(1).max(999999).default(1337),
  randomPosition: vec3Schema.default([2, 2, 2]),
  randomRotation: vec3Schema.default([0, Math.PI, 0]),
  randomScale: z.number().min(0).max(2).default(0.35),
});

export const meshSelectionModeSchema = z.enum(["object", "vertex", "edge", "face"]);
export const meshEditOperationSchema = z.enum(["none", "extrude", "inset", "bevel", "loopCut", "bridge"]);
export const meshCutAxisSchema = z.enum(["x", "y", "z"]);

export const meshSelectionSetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  selectionFalloff: z.number().min(0).max(8).default(0.35),
  selectionIndex: z.number().int().min(0).max(4096).default(0),
  selectionMode: meshSelectionModeSchema.default("vertex"),
  selectionOffset: vec3Schema.default([0, 0, 0]),
  selectionSpan: z.number().int().min(1).max(128).default(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const meshModifierPresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  bevel: z.number().min(0).max(2).default(0),
  bevelSegments: z.number().int().min(1).max(12).default(2),
  bridgeRadius: z.number().min(0.01).max(2).default(0.08),
  bridgeSegments: z.number().int().min(3).max(32).default(12),
  bridgeTargetIndex: z.number().int().min(0).max(4096).default(1),
  cutAxis: meshCutAxisSchema.default("y"),
  cutDepth: z.number().min(-2).max(2).default(0.08),
  cutPosition: z.number().min(-12).max(12).default(0),
  cutWidth: z.number().min(0.01).max(4).default(0.12),
  extrude: z.number().min(-2).max(2).default(0),
  inset: z.number().min(0).max(0.95).default(0),
  loopCuts: z.number().int().min(0).max(12).default(0),
  operation: meshEditOperationSchema.default("none"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const meshEditSettingsSchema = z.object({
  bevel: z.number().min(0).max(2).default(0),
  bevelSegments: z.number().int().min(1).max(12).default(2),
  bridgeRadius: z.number().min(0.01).max(2).default(0.08),
  bridgeSegments: z.number().int().min(3).max(32).default(12),
  bridgeTargetIndex: z.number().int().min(0).max(4096).default(1),
  cutAxis: meshCutAxisSchema.default("y"),
  cutDepth: z.number().min(-2).max(2).default(0.08),
  cutPosition: z.number().min(-12).max(12).default(0),
  cutWidth: z.number().min(0.01).max(4).default(0.12),
  enabled: z.boolean().default(false),
  extrude: z.number().min(-2).max(2).default(0),
  inset: z.number().min(0).max(0.95).default(0),
  loopCuts: z.number().int().min(0).max(12).default(0),
  operation: meshEditOperationSchema.default("none"),
  selectionFalloff: z.number().min(0).max(8).default(0.35),
  selectionIndex: z.number().int().min(0).max(4096).default(0),
  selectionMode: meshSelectionModeSchema.default("object"),
  selectionOffset: vec3Schema.default([0, 0, 0]),
  selectionSpan: z.number().int().min(1).max(128).default(1),
  selectionSets: z.array(meshSelectionSetSchema).default([]),
  modifierPresets: z.array(meshModifierPresetSchema).default([]),
  showTopology: z.boolean().default(true),
});

export const sculptBrushModeSchema = z.enum(["smooth", "inflate", "flatten", "grab"]);

export const sculptSettingsSchema = z.object({
  brushMode: sculptBrushModeSchema.default("inflate"),
  center: vec3Schema.default([0, 0, 0]),
  enabled: z.boolean().default(false),
  falloff: z.number().min(0.25).max(4).default(1.6),
  grabOffset: vec3Schema.default([0, 0.18, 0]),
  radius: z.number().min(0.05).max(12).default(0.8),
  showBrush: z.boolean().default(true),
  strength: z.number().min(-2).max(2).default(0.18),
  symmetryX: z.boolean().default(false),
});

export const materialLayerKindSchema = z.enum([
  "color",
  "gradient",
  "image",
  "video",
  "noise",
  "pattern",
  "normal",
  "bumpMap",
  "roughnessMap",
  "mask",
  "displace",
  "outline",
  "matcap",
  "lighting",
  "depth",
  "rainbow",
  "fresnel",
  "toon",
  "glass",
  "opacity",
  "roughness",
  "metalness",
  "emissive",
]);

export const materialLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: materialLayerKindSchema,
  enabled: z.boolean().default(true),
  color: z.string().optional(),
  fileName: z.string().optional(),
  secondaryColor: z.string().optional(),
  sourceDataUrl: z.string().optional(),
  value: z.number().min(0).max(2).optional(),
  angle: z.number().min(0).max(360).optional(),
  intensity: z.number().min(0).max(1).default(1),
});

export const materialSchema = z.object({
  color: z.string(),
  opacity: z.number().min(0).max(1),
  roughness: z.number().min(0).max(1),
  metalness: z.number().min(0).max(1),
  wireframe: z.boolean(),
  textureDataUrl: z.string().nullable().optional(),
  layers: z.array(materialLayerSchema).optional(),
});

export const sceneMaterialAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  material: materialSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const geometrySettingsSchema = z.object({
  width: z.number().min(0.01).max(100).optional(),
  height: z.number().min(0.01).max(100).optional(),
  depth: z.number().min(0.01).max(100).optional(),
  radius: z.number().min(0.01).max(100).optional(),
  radiusTop: z.number().min(0.01).max(100).optional(),
  radiusBottom: z.number().min(0.01).max(100).optional(),
  tubeRadius: z.number().min(0.01).max(100).optional(),
  radialSegments: z.number().int().min(3).max(128).optional(),
  heightSegments: z.number().int().min(1).max(128).optional(),
  tubularSegments: z.number().int().min(3).max(256).optional(),
  extrudeDepth: z.number().min(0).max(100).optional(),
});

export const textSettingsSchema = z.object({
  content: z.string(),
  fontSize: z.number().min(0.1).max(8),
  maxWidth: z.number().min(0.5).max(24),
});

export const lightSettingsSchema = z.object({
  color: z.string(),
  intensity: z.number().min(0).max(20),
  distance: z.number().min(0).max(100),
  angle: z.number().min(0.05).max(Math.PI / 2),
  penumbra: z.number().min(0).max(1),
  castShadow: z.boolean().optional(),
  shadowRadius: z.number().min(0).max(12).optional(),
  shadowBias: z.number().min(-0.01).max(0.01).optional(),
});

export const cameraSettingsSchema = z.object({
  fov: z.number().min(10).max(120),
  near: z.number().min(0.01).max(10),
  far: z.number().min(10).max(5000),
});

export const modelImportDiagnosticsSchema = z.object({
  complexity: z.enum(["low", "medium", "high", "extreme"]),
  estimatedTriangleCount: z.number().int().min(0),
  estimatedVertexCount: z.number().int().min(0),
  scaleToMeters: z.number().min(0).max(1000),
  sourceBytes: z.number().int().min(0),
  sourceFormat: z.enum(["gltf", "obj", "stl", "splat"]),
  sourceUnit: z.enum(["unknown", "millimeter", "centimeter", "meter", "inch", "foot"]),
  warnings: z.array(z.string()).default([]),
});

export const modelSettingsSchema = z.object({
  fileName: z.string(),
  sourceDataUrl: z.string(),
  format: z.enum(["gltf", "obj", "stl", "splat"]).optional(),
  animationAutoPlay: z.boolean().default(true),
  animationClipName: z.string().optional(),
  animationLoop: z.boolean().default(true),
  animationSpeed: z.number().min(0).max(4).default(1),
  morphTargetAutoPlay: z.boolean().default(false),
  morphTargetIndex: z.number().int().min(0).max(128).default(0),
  morphTargetName: z.string().max(80).optional(),
  morphTargetSpeed: z.number().min(0).max(4).default(1),
  morphTargetWeight: z.number().min(0).max(1).default(0),
  splatAlphaHash: z.boolean().default(false),
  splatAlphaTest: z.number().min(0).max(1).default(0),
  splatPointScale: z.number().min(0.1).max(4).default(1),
  splatToneMapped: z.boolean().default(false),
  importDiagnostics: modelImportDiagnosticsSchema.optional(),
});

export const imageSettingsSchema = z.object({
  fileName: z.string(),
  sourceDataUrl: z.string(),
  width: z.number().min(0.05).max(48),
  height: z.number().min(0.05).max(48),
});

export const videoSettingsSchema = z.object({
  fileName: z.string(),
  sourceDataUrl: z.string(),
  width: z.number().min(0.05).max(48),
  height: z.number().min(0.05).max(48),
  loop: z.boolean(),
  muted: z.boolean(),
});

export const audioSettingsSchema = z.object({
  fileName: z.string(),
  sourceDataUrl: z.string(),
  autoplay: z.boolean(),
  loop: z.boolean(),
  muted: z.boolean(),
  volume: z.number().min(0).max(1),
});

export const sceneAudioAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  audio: audioSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const svgSettingsSchema = z.object({
  fileName: z.string(),
  sourceDataUrl: z.string(),
  width: z.number().min(0.05).max(48),
  height: z.number().min(0.05).max(48),
  viewBoxMinX: z.number(),
  viewBoxMinY: z.number(),
  viewBoxWidth: z.number().min(0.01),
  viewBoxHeight: z.number().min(0.01),
});

export const figmaSettingsSchema = z.object({
  name: z.string(),
  url: z.string(),
  embedUrl: z.string(),
  fileKey: z.string().optional(),
  nodeId: z.string().optional(),
  width: z.number().min(0.5).max(48),
  height: z.number().min(0.5).max(48),
});

export const splineSourceKindSchema = z.enum(["public-url", "splinecode"]);
export const splineRenderModeSchema = z.enum(["iframe", "spline-viewer"]);

export const splineSettingsSchema = z.object({
  name: z.string(),
  sourceUrl: z.string(),
  runtimeUrl: z.string(),
  embedUrl: z.string(),
  sourceKind: splineSourceKindSchema,
  renderMode: splineRenderModeSchema,
  width: z.number().min(0.5).max(48),
  height: z.number().min(0.5).max(48),
  warnings: z.array(z.string()).default([]),
});

export const pathSettingsSchema = z.object({
  points: z.array(vec3Schema).min(2).max(24),
  closed: z.boolean(),
  curveKind: z.enum(["smooth", "linear", "bezier"]).default("smooth"),
  tubeRadius: z.number().min(0.005).max(2),
  tubularSegments: z.number().int().min(2).max(256),
  radialSegments: z.number().int().min(3).max(32),
});

export const particleSettingsSchema = z.object({
  count: z.number().int().min(1).max(2000),
  spread: z.number().min(0.1).max(24),
  speed: z.number().min(0).max(8),
  size: z.number().min(0.01).max(1),
});

export const physicsColliderKindSchema = z.enum(["box", "sphere", "capsule", "mesh"]);
export const physicsBodyTypeSchema = z.enum(["dynamic", "static", "trigger"]);

export const physicsSettingsSchema = z.object({
  bodyType: physicsBodyTypeSchema.default("dynamic"),
  enabled: z.boolean().default(false),
  collider: physicsColliderKindSchema.default("box"),
  mass: z.number().min(0).max(1000).default(1),
  friction: z.number().min(0).max(1).default(0.4),
  restitution: z.number().min(0).max(1).default(0.2),
  damping: z.number().min(0).max(1).default(0.02),
  gravity: z.boolean().default(true),
});

export const sceneSettingsSchema = z.object({
  backgroundColor: z.string(),
  ambientColor: z.string(),
  ambientIntensity: z.number().min(0).max(5),
  fogEnabled: z.boolean(),
  fogColor: z.string(),
  fogNear: z.number().min(0).max(500),
  fogFar: z.number().min(1).max(5000),
  postProcessingEnabled: z.boolean().default(false),
  bloomEnabled: z.boolean().default(false),
  bloomIntensity: z.number().min(0).max(5).default(0.35),
  bloomThreshold: z.number().min(0).max(1).default(0.78),
  bloomRadius: z.number().min(0).max(2).default(0.32),
  depthOfFieldEnabled: z.boolean().default(false),
  depthOfFieldFocus: z.number().min(0.1).max(500).default(12),
  depthOfFieldAperture: z.number().min(0).max(0.2).default(0.025),
  depthOfFieldMaxBlur: z.number().min(0).max(0.08).default(0.012),
});

export const sceneStateObjectSchema = z.object({
  objectId: z.string(),
  visible: z.boolean(),
  transform: transformSchema,
});

export const sceneStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  activeCameraId: z.string().nullable().optional(),
  sceneSettings: sceneSettingsSchema.optional(),
  objects: z.array(sceneStateObjectSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const objectInteractionSchema = z.object({
  condition: interactionConditionSchema.optional(),
  collisionTrigger: collisionTriggerSchema.optional(),
  controlsTrigger: controlsTriggerSchema.optional(),
  distanceTrigger: distanceTriggerSchema.optional(),
  dragTrigger: dragTriggerSchema.optional(),
  gameControlsTrigger: gameControlsTriggerSchema.optional(),
  keyboardTrigger: keyboardTriggerSchema.optional(),
  pointerTrigger: pointerTriggerSchema.optional(),
  resizeTrigger: resizeTriggerSchema.optional(),
  scrollTrigger: scrollTriggerSchema.optional(),
  startTrigger: startTriggerSchema.optional(),
  stateChangeTrigger: stateChangeTriggerSchema.optional(),
  triggerArea: triggerAreaSchema.optional(),
  variableChangeTrigger: variableChangeTriggerSchema.optional(),
  linkUrl: z.string().optional(),
  variableAction: variableActionSchema.optional(),
  cameraAction: cameraActionSchema.optional(),
  resetAction: resetActionSchema.optional(),
  localStorageAction: localStorageActionSchema.optional(),
  mediaAction: mediaActionSchema.optional(),
  apiAction: apiActionSchema.optional(),
  webhookAction: webhookActionSchema.optional(),
  networkTrigger: networkTriggerSchema.optional(),
  objectVisibilityAction: objectVisibilityActionSchema.optional(),
  propertyToggleAction: propertyToggleActionSchema.optional(),
  particleAction: particleActionSchema.optional(),
  objectInstanceAction: objectInstanceActionSchema.optional(),
  animationAction: animationActionSchema.optional(),
  transitionAction: transitionActionSchema.optional(),
  sceneTransitionAction: sceneTransitionActionSchema.optional(),
});

export const sceneObjectSchema = z.object({
  id: z.string(),
  componentId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  name: z.string(),
  kind: z.enum(primitiveKinds),
  visible: z.boolean(),
  locked: z.boolean(),
  constraints: transformConstraintsSchema.optional(),
  booleans: z.array(booleanOperationSchema).optional(),
  shapeBlend: shapeBlendSchema.optional(),
  cloner: clonerSettingsSchema.optional(),
  meshEdit: meshEditSettingsSchema.optional(),
  sculpt: sculptSettingsSchema.optional(),
  follow: followBehaviorSchema.optional(),
  lookAt: lookAtBehaviorSchema.optional(),
  pivot: vec3Schema.optional(),
  transform: transformSchema,
  geometry: geometrySettingsSchema.optional(),
  material: materialSchema,
  twoD: twoDLayerSettingsSchema.optional(),
  variableBindings: z.array(objectPropertyBindingSchema).optional(),
  text: textSettingsSchema.optional(),
  light: lightSettingsSchema.optional(),
  camera: cameraSettingsSchema.optional(),
  model: modelSettingsSchema.optional(),
  image: imageSettingsSchema.optional(),
  video: videoSettingsSchema.optional(),
  audio: audioSettingsSchema.optional(),
  svg: svgSettingsSchema.optional(),
  figma: figmaSettingsSchema.optional(),
  spline: splineSettingsSchema.optional(),
  path: pathSettingsSchema.optional(),
  particles: particleSettingsSchema.optional(),
  physics: physicsSettingsSchema.optional(),
  interaction: objectInteractionSchema.optional(),
});

export const sceneComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  rootObjectId: z.string(),
  objects: z.array(sceneObjectSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sceneFileSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  activeCameraId: z.string().nullable().optional(),
  sceneSettings: sceneSettingsSchema.optional(),
  sceneStates: z.array(sceneStateSchema).optional(),
  inputControls: z.array(sceneInputControlSchema).optional(),
  variables: z.array(sceneVariableSchema).optional(),
  animationTracks: z.array(animationTrackSchema).optional(),
  objects: z.array(sceneObjectSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sceneDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  activeSceneId: z.string().optional(),
  activeCameraId: z.string().nullable().optional(),
  sceneSettings: sceneSettingsSchema.optional(),
  sceneStates: z.array(sceneStateSchema).optional(),
  inputControls: z.array(sceneInputControlSchema).optional(),
  components: z.array(sceneComponentSchema).optional(),
  materialAssets: z.array(sceneMaterialAssetSchema).optional(),
  audioAssets: z.array(sceneAudioAssetSchema).optional(),
  scenes: z.array(sceneFileSceneSchema).optional(),
  variables: z.array(sceneVariableSchema).optional(),
  animationTracks: z.array(animationTrackSchema).optional(),
  objects: z.array(sceneObjectSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Transform = z.infer<typeof transformSchema>;
export type LookAtTargetKind = z.infer<typeof lookAtTargetKindSchema>;
export type LookAtBehavior = z.infer<typeof lookAtBehaviorSchema>;
export type FollowBehavior = z.infer<typeof followBehaviorSchema>;
export type AnimationProperty = z.infer<typeof animationPropertySchema>;
export type AnimationKeyframeValue = z.infer<typeof animationKeyframeValueSchema>;
export type SceneVariableType = z.infer<typeof sceneVariableTypeSchema>;
export type SceneVariableValue = z.infer<typeof sceneVariableValueSchema>;
export type SceneVariableSource = z.infer<typeof sceneVariableSourceSchema>;
export type SceneVariable = z.infer<typeof sceneVariableSchema>;
export type TwoDLayerKind = z.infer<typeof twoDLayerKindSchema>;
export type TwoDConstraint = z.infer<typeof twoDConstraintSchema>;
export type TwoDLayoutMode = z.infer<typeof twoDLayoutModeSchema>;
export type TwoDBlendMode = z.infer<typeof twoDBlendModeSchema>;
export type TwoDLayerFilter = z.infer<typeof twoDLayerFilterSchema>;
export type TwoDShapeFillFit = z.infer<typeof twoDShapeFillFitSchema>;
export type TwoDPostProcessEffectKind = z.infer<typeof twoDPostProcessEffectKindSchema>;
export type TwoDPostProcessEffect = z.infer<typeof twoDPostProcessEffectSchema>;
export type TwoDLayerSettings = z.infer<typeof twoDLayerSettingsSchema>;
export type InputControlType = z.infer<typeof inputControlTypeSchema>;
export type SceneInputControl = z.infer<typeof sceneInputControlSchema>;
export type ObjectPropertyBindingTarget = z.infer<typeof objectPropertyBindingTargetSchema>;
export type ObjectPropertyBinding = z.infer<typeof objectPropertyBindingSchema>;
export type VariableActionOperation = z.infer<typeof variableActionOperationSchema>;
export type VariableAction = z.infer<typeof variableActionSchema>;
export type VariableChangeTrigger = z.infer<typeof variableChangeTriggerSchema>;
export type StateChangeTrigger = z.infer<typeof stateChangeTriggerSchema>;
export type DistanceTriggerMode = z.infer<typeof distanceTriggerModeSchema>;
export type DistanceTrigger = z.infer<typeof distanceTriggerSchema>;
export type TriggerAreaMode = z.infer<typeof triggerAreaModeSchema>;
export type TriggerArea = z.infer<typeof triggerAreaSchema>;
export type CollisionTriggerMode = z.infer<typeof collisionTriggerModeSchema>;
export type CollisionTrigger = z.infer<typeof collisionTriggerSchema>;
export type ControlsTriggerEvent = z.infer<typeof controlsTriggerEventSchema>;
export type ControlsTrigger = z.infer<typeof controlsTriggerSchema>;
export type GameControlsDirection = z.infer<typeof gameControlsDirectionSchema>;
export type GameControlsTrigger = z.infer<typeof gameControlsTriggerSchema>;
export type PointerTriggerEvent = z.infer<typeof pointerTriggerEventSchema>;
export type PointerTrigger = z.infer<typeof pointerTriggerSchema>;
export type DragTriggerEvent = z.infer<typeof dragTriggerEventSchema>;
export type DragTrigger = z.infer<typeof dragTriggerSchema>;
export type CameraAction = z.infer<typeof cameraActionSchema>;
export type ResetAction = z.infer<typeof resetActionSchema>;
export type LocalStorageAction = z.infer<typeof localStorageActionSchema>;
export type MediaActionOperation = z.infer<typeof mediaActionOperationSchema>;
export type MediaAction = z.infer<typeof mediaActionSchema>;
export type ApiActionMethod = z.infer<typeof apiActionMethodSchema>;
export type ApiAction = z.infer<typeof apiActionSchema>;
export type WebhookAction = z.infer<typeof webhookActionSchema>;
export type NetworkTriggerEvent = z.infer<typeof networkTriggerEventSchema>;
export type NetworkTrigger = z.infer<typeof networkTriggerSchema>;
export type ObjectVisibilityActionOperation = z.infer<typeof objectVisibilityActionOperationSchema>;
export type ObjectVisibilityAction = z.infer<typeof objectVisibilityActionSchema>;
export type PropertyToggleTarget = z.infer<typeof propertyToggleTargetSchema>;
export type PropertyToggleAction = z.infer<typeof propertyToggleActionSchema>;
export type ParticleActionOperation = z.infer<typeof particleActionOperationSchema>;
export type ParticleAction = z.infer<typeof particleActionSchema>;
export type ObjectInstanceActionOperation = z.infer<typeof objectInstanceActionOperationSchema>;
export type ObjectInstanceAction = z.infer<typeof objectInstanceActionSchema>;
export type AnimationActionOperation = z.infer<typeof animationActionOperationSchema>;
export type AnimationAction = z.infer<typeof animationActionSchema>;
export type TransitionAction = z.infer<typeof transitionActionSchema>;
export type SceneTransitionAction = z.infer<typeof sceneTransitionActionSchema>;
export type InteractionConditionOperator = z.infer<typeof interactionConditionOperatorSchema>;
export type InteractionCondition = z.infer<typeof interactionConditionSchema>;
export type KeyboardTriggerEvent = z.infer<typeof keyboardTriggerEventSchema>;
export type KeyboardTrigger = z.infer<typeof keyboardTriggerSchema>;
export type ResizeTrigger = z.infer<typeof resizeTriggerSchema>;
export type ScrollTriggerDirection = z.infer<typeof scrollTriggerDirectionSchema>;
export type ScrollTrigger = z.infer<typeof scrollTriggerSchema>;
export type StartTrigger = z.infer<typeof startTriggerSchema>;
export type AnimationKeyframe = z.infer<typeof animationKeyframeSchema>;
export type AnimationEasing = z.infer<typeof animationEasingSchema>;
export type AnimationTrack = z.infer<typeof animationTrackSchema>;
export type TransformConstraints = z.infer<typeof transformConstraintsSchema>;
export type BooleanOperationKind = z.infer<typeof booleanOperationKindSchema>;
export type BooleanOperation = z.infer<typeof booleanOperationSchema>;
export type ShapeBlend = z.infer<typeof shapeBlendSchema>;
export type ClonerMode = z.infer<typeof clonerModeSchema>;
export type ClonerStaggerOrder = z.infer<typeof clonerStaggerOrderSchema>;
export type ClonerSettings = z.infer<typeof clonerSettingsSchema>;
export type MeshCutAxis = z.infer<typeof meshCutAxisSchema>;
export type MeshEditOperation = z.infer<typeof meshEditOperationSchema>;
export type MeshEditSettings = z.infer<typeof meshEditSettingsSchema>;
export type MeshModifierPreset = z.infer<typeof meshModifierPresetSchema>;
export type MeshSelectionSet = z.infer<typeof meshSelectionSetSchema>;
export type MeshSelectionMode = z.infer<typeof meshSelectionModeSchema>;
export type SculptBrushMode = z.infer<typeof sculptBrushModeSchema>;
export type SculptSettings = z.infer<typeof sculptSettingsSchema>;
export type MaterialLayerKind = z.infer<typeof materialLayerKindSchema>;
export type MaterialLayer = z.infer<typeof materialLayerSchema>;
export type Material = z.infer<typeof materialSchema>;
export type SceneMaterialAsset = z.infer<typeof sceneMaterialAssetSchema>;
export type GeometrySettings = z.infer<typeof geometrySettingsSchema>;
export type TextSettings = z.infer<typeof textSettingsSchema>;
export type LightSettings = z.infer<typeof lightSettingsSchema>;
export type CameraSettings = z.infer<typeof cameraSettingsSchema>;
export type ModelImportDiagnostics = z.infer<typeof modelImportDiagnosticsSchema>;
export type ModelSettings = z.infer<typeof modelSettingsSchema>;
export type ImageSettings = z.infer<typeof imageSettingsSchema>;
export type VideoSettings = z.infer<typeof videoSettingsSchema>;
export type AudioSettings = z.infer<typeof audioSettingsSchema>;
export type SceneAudioAsset = z.infer<typeof sceneAudioAssetSchema>;
export type SvgSettings = z.infer<typeof svgSettingsSchema>;
export type FigmaSettings = z.infer<typeof figmaSettingsSchema>;
export type SplineSettings = z.infer<typeof splineSettingsSchema>;
export type PathSettings = z.infer<typeof pathSettingsSchema>;
export type ParticleSettings = z.infer<typeof particleSettingsSchema>;
export type PhysicsColliderKind = z.infer<typeof physicsColliderKindSchema>;
export type PhysicsBodyType = z.infer<typeof physicsBodyTypeSchema>;
export type PhysicsSettings = z.infer<typeof physicsSettingsSchema>;
export type ObjectInteraction = z.infer<typeof objectInteractionSchema>;
export type SceneSettings = z.infer<typeof sceneSettingsSchema>;
export type SceneStateObject = z.infer<typeof sceneStateObjectSchema>;
export type SceneState = z.infer<typeof sceneStateSchema>;
export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type SceneComponent = z.infer<typeof sceneComponentSchema>;
export type SceneFileScene = z.infer<typeof sceneFileSceneSchema>;
export type SceneDocument = z.infer<typeof sceneDocumentSchema>;
