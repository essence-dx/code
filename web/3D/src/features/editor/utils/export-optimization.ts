import { resolveBooleanOperations } from "../scene/boolean-operations";
import { resolveClonerSettings } from "../scene/cloner-settings";
import { resolveGeometry } from "../scene/primitive-geometry";
import type { MaterialLayer, SceneDocument, SceneObject } from "../types";

export interface ExportOptimizationIssue {
  id: string;
  label: string;
  severity: "warning" | "danger";
}

export interface ExportOptimizationReport {
  drawCalls: number;
  estimatedFileBytes: number;
  importedModels: number;
  issues: ExportOptimizationIssue[];
  renderableObjects: number;
  textureBytes: number;
  textureCount: number;
  triangles: number;
}

export const renderableSceneObjectKinds = new Set<SceneObject["kind"]>([
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
  "svg",
  "figma",
  "path",
  "particles",
]);

function estimateDataUrlBytes(sourceDataUrl?: string | null) {
  if (!sourceDataUrl) {
    return 0;
  }

  const payload = sourceDataUrl.slice(sourceDataUrl.indexOf(",") + 1);

  if (sourceDataUrl.includes(";base64,")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;

    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }

  return payload.length;
}

function materialTextureSources(object: SceneObject) {
  return [object.material.textureDataUrl, ...(object.material.layers ?? []).map((layer: MaterialLayer) => layer.sourceDataUrl)].filter(Boolean);
}

export function getSceneObjectInstanceCount(object: SceneObject) {
  const cloner = resolveClonerSettings(object);

  return cloner.enabled ? cloner.count : 1;
}

export function estimateSceneObjectTriangles(object: SceneObject) {
  if (object.kind === "model") {
    return 10000;
  }

  if (object.kind === "text" || object.kind === "image" || object.kind === "video" || object.kind === "svg" || object.kind === "figma") {
    return 2;
  }

  if (object.kind === "particles") {
    return Math.max(1, object.particles?.count ?? 120) * 2;
  }

  if (object.kind === "path") {
    return Math.max(1, (object.path?.tubularSegments ?? 48) * (object.path?.radialSegments ?? 8) * 2);
  }

  const geometry = resolveGeometry(object);

  switch (object.kind) {
    case "box":
    case "plane":
      return 12;
    case "sphere":
      return geometry.radialSegments * geometry.heightSegments * 2;
    case "cylinder":
      return geometry.radialSegments * geometry.heightSegments * 2 + geometry.radialSegments * 2;
    case "cone":
      return geometry.radialSegments * geometry.heightSegments + geometry.radialSegments;
    case "torus":
      return geometry.radialSegments * geometry.tubularSegments * 2;
    case "rectangle":
    case "ellipse":
    case "triangle":
    case "star":
      return geometry.extrudeDepth > 0 ? Math.max(12, geometry.radialSegments * 4) : Math.max(2, geometry.radialSegments * 2);
    default:
      return 0;
  }
}

export function collectSceneObjectTextureBytes(object: SceneObject) {
  const directAssetBytes =
    estimateDataUrlBytes(object.model?.sourceDataUrl) +
    estimateDataUrlBytes(object.image?.sourceDataUrl) +
    estimateDataUrlBytes(object.video?.sourceDataUrl) +
    estimateDataUrlBytes(object.svg?.sourceDataUrl);
  const materialBytes = materialTextureSources(object).reduce((total, source) => total + estimateDataUrlBytes(source), 0);

  return directAssetBytes + materialBytes;
}

export function countSceneObjectTextures(object: SceneObject) {
  const directAssetCount = [object.model?.sourceDataUrl, object.image?.sourceDataUrl, object.video?.sourceDataUrl, object.svg?.sourceDataUrl].filter(Boolean).length;
  const materialCount = materialTextureSources(object).length;

  return directAssetCount + materialCount;
}

export function isRenderableSceneObject(object: SceneObject) {
  return renderableSceneObjectKinds.has(object.kind);
}

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function analyzeExportOptimization(document: SceneDocument): ExportOptimizationReport {
  const visibleObjects = document.objects.filter((object) => object.visible);
  let drawCalls = 0;
  let importedModels = 0;
  let renderableObjects = 0;
  let textureBytes = 0;
  let textureCount = 0;
  let triangles = 0;
  let booleanOperations = 0;

  for (const object of visibleObjects) {
    if (!isRenderableSceneObject(object)) {
      continue;
    }

    const instances = getSceneObjectInstanceCount(object);

    renderableObjects += instances;
    drawCalls += instances;
    booleanOperations += resolveBooleanOperations(object).length;
    triangles += estimateSceneObjectTriangles(object) * instances * Math.max(1, resolveBooleanOperations(object).length + 1);
    importedModels += object.kind === "model" ? 1 : 0;

    const objectTextureBytes = collectSceneObjectTextureBytes(object);

    if (objectTextureBytes > 0) {
      textureBytes += objectTextureBytes;
      textureCount += countSceneObjectTextures(object);
    }
  }

  const estimatedFileBytes = new TextEncoder().encode(JSON.stringify(document)).byteLength + textureBytes;
  const issues: ExportOptimizationIssue[] = [];

  if (drawCalls > 160) {
    issues.push({ id: "draw-calls", label: `${drawCalls} estimated draw calls; merge repeated objects or use cloners before web export.`, severity: "danger" });
  } else if (drawCalls > 80) {
    issues.push({ id: "draw-calls", label: `${drawCalls} estimated draw calls; watch mobile performance.`, severity: "warning" });
  }

  if (triangles > 350000) {
    issues.push({ id: "triangles", label: `${Math.round(triangles / 1000)}k estimated triangles; simplify dense meshes before GLB/USDZ export.`, severity: "danger" });
  } else if (triangles > 150000) {
    issues.push({ id: "triangles", label: `${Math.round(triangles / 1000)}k estimated triangles; consider reducing primitive segments.`, severity: "warning" });
  }

  if (textureBytes > 24 * 1024 * 1024) {
    issues.push({ id: "textures", label: `${formatMegabytes(textureBytes)} of embedded texture/media payload; compress assets before publishing.`, severity: "danger" });
  } else if (textureBytes > 10 * 1024 * 1024) {
    issues.push({ id: "textures", label: `${formatMegabytes(textureBytes)} of embedded texture/media payload; export may feel heavy on slower networks.`, severity: "warning" });
  }

  if (importedModels > 0) {
    issues.push({ id: "models", label: "Imported model geometry is estimated; verify final GLB size after export.", severity: "warning" });
  }

  if (booleanOperations > 0) {
    issues.push({ id: "booleans", label: `${booleanOperations} boolean ${booleanOperations === 1 ? "operation" : "operations"} will be evaluated into export geometry.`, severity: "warning" });
  }

  return {
    drawCalls,
    estimatedFileBytes,
    importedModels,
    issues,
    renderableObjects,
    textureBytes,
    textureCount,
    triangles,
  };
}
