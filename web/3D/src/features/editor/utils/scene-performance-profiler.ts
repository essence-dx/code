import { resolveBooleanOperations } from "../scene/boolean-operations";
import { hasClonerAnimationStagger } from "../scene/cloner-settings";
import { resolveSceneSettings } from "../scene/default-document";
import type { SceneDocument, SceneObject } from "../types";
import {
  collectSceneObjectTextureBytes,
  countSceneObjectTextures,
  estimateSceneObjectTriangles,
  getSceneObjectInstanceCount,
  isRenderableSceneObject,
} from "./export-optimization";

export type ScenePerformanceSeverity = "good" | "warning" | "danger";

export interface ScenePerformanceBudgetRow {
  dangerAt: number;
  id: "drawCalls" | "triangles" | "textures" | "interactions" | "postProcessing";
  label: string;
  severity: ScenePerformanceSeverity;
  unit: "count" | "bytes";
  value: number;
  warningAt: number;
}

export interface ScenePerformanceObjectProfile {
  animationTracks: number;
  booleanOperations: number;
  clonerAnimationStagger: boolean;
  drawCalls: number;
  interactionHooks: number;
  objectId: string;
  objectKind: SceneObject["kind"];
  objectName: string;
  physicsEnabled: boolean;
  renderable: boolean;
  textureBytes: number;
  textureCount: number;
  triangles: number;
  variableBindings: number;
}

export interface ScenePerformanceHotSpot {
  category: "draw-call" | "geometry" | "texture" | "interaction";
  detail: string;
  objectId: string;
  objectKind: SceneObject["kind"];
  objectName: string;
  recommendation: string;
  score: number;
  severity: Exclude<ScenePerformanceSeverity, "good">;
}

export interface ScenePerformanceProfile {
  budgetRows: ScenePerformanceBudgetRow[];
  hotSpots: ScenePerformanceHotSpot[];
  metrics: {
    animatedObjects: number;
    drawCalls: number;
    interactionHooks: number;
    physicsBodies: number;
    postProcessingPasses: number;
    renderableObjects: number;
    textureBytes: number;
    textureCount: number;
    triangles: number;
    visibleObjects: number;
  };
  objectProfiles: ScenePerformanceObjectProfile[];
  score: number;
  status: "Healthy" | "Review" | "Heavy";
}

type InteractionKey = keyof NonNullable<SceneObject["interaction"]>;

const interactionKeys: InteractionKey[] = [
  "animationAction",
  "apiAction",
  "cameraAction",
  "collisionTrigger",
  "controlsTrigger",
  "distanceTrigger",
  "dragTrigger",
  "gameControlsTrigger",
  "keyboardTrigger",
  "linkUrl",
  "localStorageAction",
  "mediaAction",
  "networkTrigger",
  "objectInstanceAction",
  "objectVisibilityAction",
  "particleAction",
  "pointerTrigger",
  "propertyToggleAction",
  "resetAction",
  "resizeTrigger",
  "sceneTransitionAction",
  "scrollTrigger",
  "startTrigger",
  "stateChangeTrigger",
  "transitionAction",
  "variableAction",
  "variableChangeTrigger",
  "webhookAction",
];

function getSeverity(value: number, warningAt: number, dangerAt: number): ScenePerformanceSeverity {
  if (value >= dangerAt) {
    return "danger";
  }

  if (value >= warningAt) {
    return "warning";
  }

  return "good";
}

function isEnabledInteractionValue(value: unknown) {
  if (!value) {
    return false;
  }

  if (typeof value === "object" && "enabled" in value) {
    return (value as { enabled?: boolean }).enabled !== false;
  }

  return true;
}

function countObjectInteractionHooks(object: SceneObject) {
  const interaction = object.interaction;

  if (!interaction) {
    return 0;
  }

  return interactionKeys.reduce((count, key) => count + (isEnabledInteractionValue(interaction[key]) ? 1 : 0), 0);
}

function countPostProcessingPasses(document: SceneDocument) {
  const settings = resolveSceneSettings(document.sceneSettings);

  if (!settings.postProcessingEnabled) {
    return 0;
  }

  return Number(settings.bloomEnabled) + Number(settings.depthOfFieldEnabled);
}

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatThousands(value: number) {
  return value > 999 ? `${Math.round(value / 1000)}k` : String(value);
}

function createObjectProfile(document: SceneDocument, object: SceneObject): ScenePerformanceObjectProfile {
  const animationTracks = (document.animationTracks ?? []).filter((track) => track.objectId === object.id && track.keyframes.length > 1).length;
  const booleanOperations = resolveBooleanOperations(object).length;
  const instances = isRenderableSceneObject(object) ? getSceneObjectInstanceCount(object) : 0;
  const triangles = isRenderableSceneObject(object) ? estimateSceneObjectTriangles(object) * instances * Math.max(1, booleanOperations + 1) : 0;
  const interactionHooks = countObjectInteractionHooks(object);

  return {
    animationTracks,
    booleanOperations,
    clonerAnimationStagger: hasClonerAnimationStagger(object),
    drawCalls: instances,
    interactionHooks,
    objectId: object.id,
    objectKind: object.kind,
    objectName: object.name,
    physicsEnabled: object.physics?.enabled === true,
    renderable: isRenderableSceneObject(object),
    textureBytes: collectSceneObjectTextureBytes(object),
    textureCount: countSceneObjectTextures(object),
    triangles,
    variableBindings: object.variableBindings?.length ?? 0,
  };
}

function createBudgetRows(metrics: ScenePerformanceProfile["metrics"]): ScenePerformanceBudgetRow[] {
  return [
    {
      dangerAt: 160,
      id: "drawCalls",
      label: "Draw calls",
      severity: getSeverity(metrics.drawCalls, 80, 160),
      unit: "count",
      value: metrics.drawCalls,
      warningAt: 80,
    },
    {
      dangerAt: 350000,
      id: "triangles",
      label: "Geometry",
      severity: getSeverity(metrics.triangles, 150000, 350000),
      unit: "count",
      value: metrics.triangles,
      warningAt: 150000,
    },
    {
      dangerAt: 24 * 1024 * 1024,
      id: "textures",
      label: "Textures",
      severity: getSeverity(metrics.textureBytes, 10 * 1024 * 1024, 24 * 1024 * 1024),
      unit: "bytes",
      value: metrics.textureBytes,
      warningAt: 10 * 1024 * 1024,
    },
    {
      dangerAt: 40,
      id: "interactions",
      label: "Interactions",
      severity: getSeverity(metrics.interactionHooks, 18, 40),
      unit: "count",
      value: metrics.interactionHooks,
      warningAt: 18,
    },
    {
      dangerAt: 3,
      id: "postProcessing",
      label: "Post effects",
      severity: getSeverity(metrics.postProcessingPasses, 2, 3),
      unit: "count",
      value: metrics.postProcessingPasses,
      warningAt: 2,
    },
  ];
}

function pushHotSpot(hotSpots: ScenePerformanceHotSpot[], hotSpot: ScenePerformanceHotSpot | null) {
  if (hotSpot) {
    hotSpots.push(hotSpot);
  }
}

function profileDrawCallHotSpot(profile: ScenePerformanceObjectProfile): ScenePerformanceHotSpot | null {
  const severity = getSeverity(profile.drawCalls, 12, 32);

  if (severity === "good") {
    return null;
  }

  return {
    category: "draw-call",
    detail: `${profile.drawCalls} estimated draw calls from this object and its clones.`,
    objectId: profile.objectId,
    objectKind: profile.objectKind,
    objectName: profile.objectName,
    recommendation: "Reduce clone count, instance repeated meshes, or merge static repeated objects.",
    score: profile.drawCalls,
    severity,
  };
}

function profileGeometryHotSpot(profile: ScenePerformanceObjectProfile): ScenePerformanceHotSpot | null {
  const severity = getSeverity(profile.triangles, 45000, 120000);

  if (severity === "good") {
    return null;
  }

  return {
    category: "geometry",
    detail: `${formatThousands(profile.triangles)} estimated triangles${profile.booleanOperations > 0 ? ` with ${profile.booleanOperations} boolean operations` : ""}.`,
    objectId: profile.objectId,
    objectKind: profile.objectKind,
    objectName: profile.objectName,
    recommendation: "Lower segment counts, simplify imported meshes, or bake boolean stacks before publishing.",
    score: profile.triangles,
    severity,
  };
}

function profileTextureHotSpot(profile: ScenePerformanceObjectProfile): ScenePerformanceHotSpot | null {
  const severity = getSeverity(profile.textureBytes, 3 * 1024 * 1024, 8 * 1024 * 1024);

  if (severity === "good") {
    return null;
  }

  return {
    category: "texture",
    detail: `${profile.textureCount} texture/media sources using ${formatMegabytes(profile.textureBytes)}.`,
    objectId: profile.objectId,
    objectKind: profile.objectKind,
    objectName: profile.objectName,
    recommendation: "Compress large textures, use WebP/AVIF where possible, and remove unused material layers.",
    score: profile.textureBytes,
    severity,
  };
}

function profileInteractionHotSpot(profile: ScenePerformanceObjectProfile): ScenePerformanceHotSpot | null {
  const interactionLoad =
    profile.interactionHooks +
    profile.animationTracks +
    profile.variableBindings +
    Number(profile.physicsEnabled) +
    Number(profile.clonerAnimationStagger);
  const severity = getSeverity(interactionLoad, 4, 8);

  if (severity === "good") {
    return null;
  }

  return {
    category: "interaction",
    detail: `${interactionLoad} runtime hooks from interactions, animation tracks, bindings, or physics.`,
    objectId: profile.objectId,
    objectKind: profile.objectKind,
    objectName: profile.objectName,
    recommendation: "Group related triggers, remove unused actions, and keep physics only on objects that need runtime collision.",
    score: interactionLoad,
    severity,
  };
}

function createHotSpots(objectProfiles: ScenePerformanceObjectProfile[]) {
  const hotSpots: ScenePerformanceHotSpot[] = [];

  for (const profile of objectProfiles) {
    pushHotSpot(hotSpots, profileDrawCallHotSpot(profile));
    pushHotSpot(hotSpots, profileGeometryHotSpot(profile));
    pushHotSpot(hotSpots, profileTextureHotSpot(profile));
    pushHotSpot(hotSpots, profileInteractionHotSpot(profile));
  }

  return hotSpots.sort((a, b) => {
    const severityDelta = Number(b.severity === "danger") - Number(a.severity === "danger");

    return severityDelta || b.score - a.score || a.objectName.localeCompare(b.objectName);
  });
}

function getProfileStatus(budgetRows: ScenePerformanceBudgetRow[], hotSpots: ScenePerformanceHotSpot[]): ScenePerformanceProfile["status"] {
  if (budgetRows.some((row) => row.severity === "danger") || hotSpots.some((hotSpot) => hotSpot.severity === "danger")) {
    return "Heavy";
  }

  if (budgetRows.some((row) => row.severity === "warning") || hotSpots.length > 0) {
    return "Review";
  }

  return "Healthy";
}

function getProfileScore(budgetRows: ScenePerformanceBudgetRow[], hotSpots: ScenePerformanceHotSpot[]) {
  const budgetPenalty = budgetRows.reduce((total, row) => total + (row.severity === "danger" ? 18 : row.severity === "warning" ? 8 : 0), 0);
  const hotSpotPenalty = hotSpots.reduce((total, hotSpot) => total + (hotSpot.severity === "danger" ? 4 : 2), 0);

  return Math.max(0, Math.min(100, 100 - budgetPenalty - hotSpotPenalty));
}

export function profileScenePerformance(document: SceneDocument): ScenePerformanceProfile {
  const visibleObjects = document.objects.filter((object) => object.visible);
  const objectProfiles = visibleObjects.map((object) => createObjectProfile(document, object));
  const metrics = objectProfiles.reduce(
    (totals, profile) => ({
      animatedObjects: totals.animatedObjects + Number(profile.animationTracks > 0),
      drawCalls: totals.drawCalls + profile.drawCalls,
      interactionHooks: totals.interactionHooks + profile.interactionHooks + profile.animationTracks + profile.variableBindings + Number(profile.physicsEnabled),
      physicsBodies: totals.physicsBodies + Number(profile.physicsEnabled),
      postProcessingPasses: totals.postProcessingPasses,
      renderableObjects: totals.renderableObjects + Number(profile.renderable),
      textureBytes: totals.textureBytes + profile.textureBytes,
      textureCount: totals.textureCount + profile.textureCount,
      triangles: totals.triangles + profile.triangles,
      visibleObjects: totals.visibleObjects,
    }),
    {
      animatedObjects: 0,
      drawCalls: 0,
      interactionHooks: 0,
      physicsBodies: 0,
      postProcessingPasses: countPostProcessingPasses(document),
      renderableObjects: 0,
      textureBytes: 0,
      textureCount: 0,
      triangles: 0,
      visibleObjects: visibleObjects.length,
    },
  );
  const budgetRows = createBudgetRows(metrics);
  const hotSpots = createHotSpots(objectProfiles);

  return {
    budgetRows,
    hotSpots,
    metrics,
    objectProfiles,
    score: getProfileScore(budgetRows, hotSpots),
    status: getProfileStatus(budgetRows, hotSpots),
  };
}
