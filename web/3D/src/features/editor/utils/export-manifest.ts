import { analyzeExportOptimization } from "./export-optimization";
import { primitiveKinds, type Material, type PrimitiveKind, type SceneDocument, type SceneObject } from "../types";

export interface ExportManifestAsset {
  bytes: number;
  fileName?: string;
  format?: string;
  id: string;
  name: string;
  sceneId?: string;
  source: "object" | "material" | "audio-library";
  type: "audio" | "figma" | "image" | "material-texture" | "model" | "svg" | "video";
}

export interface ExportManifestReadiness {
  notes: string[];
  status: "partial" | "ready" | "review";
  unsupportedObjectKinds: PrimitiveKind[];
}

export type ExportReadinessFormat = "glb" | "json" | "stl" | "usdz" | "web";
export type ExportFormatSupportLevel = "native" | "preserved" | "simplified" | "unsupported";

export interface ExportManifestObjectSupport {
  id: string;
  kind: PrimitiveKind;
  name: string;
  notes: string[];
  sceneId: string;
  support: Record<ExportReadinessFormat, ExportFormatSupportLevel>;
  visible: boolean;
}

export interface ExportManifest {
  assets: ExportManifestAsset[];
  capabilities: {
    animation: boolean;
    booleans: boolean;
    cloners: boolean;
    components: boolean;
    interactions: boolean;
    meshEditing: boolean;
    multiScene: boolean;
    physics: boolean;
    sculpting: boolean;
    twoD: boolean;
    variables: boolean;
  };
  generatedAt: string;
  objectKinds: Record<PrimitiveKind, number>;
  objects: ExportManifestObjectSupport[];
  optimization: ReturnType<typeof analyzeExportOptimization>;
  readiness: Record<ExportReadinessFormat, ExportManifestReadiness>;
  schemaVersion: 1;
  scene: {
    activeSceneId?: string;
    createdAt: string;
    id: string;
    name: string;
    updatedAt: string;
  };
  scenes: Array<{
    id: string;
    name: string;
    objectCount: number;
    visibleObjectCount: number;
  }>;
  summary: {
    animationTrackCount: number;
    assetCount: number;
    audioAssetCount: number;
    componentCount: number;
    materialAssetCount: number;
    objectCount: number;
    sceneCount: number;
    variableCount: number;
    visibleObjectCount: number;
  };
  supportedExports: string[];
  supportedImports: string[];
}

const glbUnsupportedKinds = new Set<PrimitiveKind>(["audio", "figma", "model", "particles", "video"]);
const stlUnsupportedKinds = new Set<PrimitiveKind>(["audio", "camera", "figma", "image", "model", "particles", "pointLight", "directionalLight", "spotLight", "svg", "text", "video"]);
const usdzUnsupportedKinds = new Set<PrimitiveKind>(["audio", "figma", "model", "particles", "video"]);

function estimateDataUrlBytes(sourceDataUrl?: string | null) {
  if (!sourceDataUrl) {
    return 0;
  }

  const commaIndex = sourceDataUrl.indexOf(",");
  const payload = commaIndex >= 0 ? sourceDataUrl.slice(commaIndex + 1) : sourceDataUrl;

  if (sourceDataUrl.includes(";base64,")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }

  return payload.length;
}

function getSceneEntries(document: SceneDocument) {
  if (document.scenes?.length) {
    return document.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      objects: scene.objects,
    }));
  }

  return [
    {
      id: document.id,
      name: document.name,
      objects: document.objects,
    },
  ];
}

function getObjectAssets(object: SceneObject, sceneId: string): ExportManifestAsset[] {
  const assets: ExportManifestAsset[] = [];

  if (object.model?.sourceDataUrl) {
    assets.push({
      bytes: estimateDataUrlBytes(object.model.sourceDataUrl),
      fileName: object.model.fileName,
      format: object.model.format ?? "gltf",
      id: `${object.id}:model`,
      name: object.name,
      sceneId,
      source: "object",
      type: "model",
    });
  }

  if (object.image?.sourceDataUrl) {
    assets.push({
      bytes: estimateDataUrlBytes(object.image.sourceDataUrl),
      fileName: object.image.fileName,
      id: `${object.id}:image`,
      name: object.name,
      sceneId,
      source: "object",
      type: "image",
    });
  }

  if (object.video?.sourceDataUrl) {
    assets.push({
      bytes: estimateDataUrlBytes(object.video.sourceDataUrl),
      fileName: object.video.fileName,
      id: `${object.id}:video`,
      name: object.name,
      sceneId,
      source: "object",
      type: "video",
    });
  }

  if (object.audio?.sourceDataUrl) {
    assets.push({
      bytes: estimateDataUrlBytes(object.audio.sourceDataUrl),
      fileName: object.audio.fileName,
      id: `${object.id}:audio`,
      name: object.name,
      sceneId,
      source: "object",
      type: "audio",
    });
  }

  if (object.svg?.sourceDataUrl) {
    assets.push({
      bytes: estimateDataUrlBytes(object.svg.sourceDataUrl),
      fileName: object.svg.fileName,
      id: `${object.id}:svg`,
      name: object.name,
      sceneId,
      source: "object",
      type: "svg",
    });
  }

  if (object.figma?.url) {
    assets.push({
      bytes: 0,
      format: "figma-url",
      id: `${object.id}:figma`,
      name: object.figma.name,
      sceneId,
      source: "object",
      type: "figma",
    });
  }

  assets.push(...getMaterialTextureAssets(object.id, object.name, object.material, sceneId));

  return assets;
}

function getMaterialTextureAssets(id: string, name: string, material: Material, sceneId?: string): ExportManifestAsset[] {
  const assets: ExportManifestAsset[] = [];

  if (material.textureDataUrl) {
    assets.push({
      bytes: estimateDataUrlBytes(material.textureDataUrl),
      id: `${id}:material-texture`,
      name: `${name} material texture`,
      sceneId,
      source: "material",
      type: "material-texture",
    });
  }

  for (const layer of material.layers ?? []) {
    if (!layer.sourceDataUrl) {
      continue;
    }

    assets.push({
      bytes: estimateDataUrlBytes(layer.sourceDataUrl),
      fileName: layer.fileName,
      format: layer.kind,
      id: `${id}:material-layer:${layer.id}`,
      name: `${name} ${layer.name}`,
      sceneId,
      source: "material",
      type: "material-texture",
    });
  }

  return assets;
}

function collectUnsupportedKinds(objects: SceneObject[], unsupportedKinds: Set<PrimitiveKind>) {
  return [...new Set(objects.filter((object) => object.visible !== false && unsupportedKinds.has(object.kind)).map((object) => object.kind))].sort();
}

function createReadiness(unsupportedObjectKinds: PrimitiveKind[], notes: string[], hasDangerIssue = false): ExportManifestReadiness {
  return {
    notes,
    status: hasDangerIssue ? "review" : unsupportedObjectKinds.length > 0 ? "partial" : "ready",
    unsupportedObjectKinds,
  };
}

function getFormatSupport(object: SceneObject, format: ExportReadinessFormat): ExportFormatSupportLevel {
  if (format === "json") {
    return "preserved";
  }

  if (format === "web") {
    return "native";
  }

  if (format === "glb") {
    if (glbUnsupportedKinds.has(object.kind)) {
      return "unsupported";
    }

    return object.kind === "text" || object.kind === "image" || object.kind === "svg" ? "simplified" : "native";
  }

  if (format === "usdz") {
    if (usdzUnsupportedKinds.has(object.kind)) {
      return "unsupported";
    }

    return object.kind === "text" || object.kind === "image" || object.kind === "svg" ? "simplified" : "native";
  }

  if (stlUnsupportedKinds.has(object.kind)) {
    return "unsupported";
  }

  return "native";
}

function getObjectSupportNotes(object: SceneObject, support: Record<ExportReadinessFormat, ExportFormatSupportLevel>) {
  const notes: string[] = [];

  if (support.glb === "unsupported" || support.usdz === "unsupported") {
    notes.push("Runtime, media, external model, or point-cloud content is preserved in JSON/Web but not emitted as mesh data in every 3D interchange export.");
  }

  if (support.stl === "unsupported") {
    notes.push("STL is geometry-only and omits this object type.");
  }

  if (object.interaction) {
    notes.push("Interactions are preserved in JSON/Web exports and omitted from geometry-only formats.");
  }

  if (object.physics?.enabled) {
    notes.push("Physics settings are preserved in JSON/Web exports and omitted from geometry-only formats.");
  }

  return notes;
}

function createObjectSupport(object: SceneObject, sceneId: string): ExportManifestObjectSupport {
  const support: Record<ExportReadinessFormat, ExportFormatSupportLevel> = {
    glb: getFormatSupport(object, "glb"),
    json: getFormatSupport(object, "json"),
    stl: getFormatSupport(object, "stl"),
    usdz: getFormatSupport(object, "usdz"),
    web: getFormatSupport(object, "web"),
  };

  return {
    id: object.id,
    kind: object.kind,
    name: object.name,
    notes: getObjectSupportNotes(object, support),
    sceneId,
    support,
    visible: object.visible !== false,
  };
}

export function createExportManifest(document: SceneDocument): ExportManifest {
  const sceneEntries = getSceneEntries(document);
  const allObjects = sceneEntries.flatMap((scene) => scene.objects);
  const objectKinds = Object.fromEntries(primitiveKinds.map((kind) => [kind, 0])) as Record<PrimitiveKind, number>;

  for (const object of allObjects) {
    objectKinds[object.kind] += 1;
  }

  const objectAssets = sceneEntries.flatMap((scene) => scene.objects.flatMap((object) => getObjectAssets(object, scene.id)));
  const objectSupport = sceneEntries.flatMap((scene) => scene.objects.map((object) => createObjectSupport(object, scene.id)));
  const materialAssets = (document.materialAssets ?? []).flatMap((asset) => getMaterialTextureAssets(asset.id, asset.name, asset.material, "library"));
  const audioAssets = (document.audioAssets ?? []).map<ExportManifestAsset>((asset) => ({
    bytes: estimateDataUrlBytes(asset.audio.sourceDataUrl),
    fileName: asset.audio.fileName,
    id: `${asset.id}:audio-library`,
    name: asset.name,
    source: "audio-library",
    type: "audio",
  }));
  const assets = [...objectAssets, ...materialAssets, ...audioAssets];
  const optimization = analyzeExportOptimization(document);
  const visibleObjects = allObjects.filter((object) => object.visible !== false);
  const hasDangerIssue = optimization.issues.some((issue) => issue.severity === "danger");
  const glbUnsupportedObjectKinds = collectUnsupportedKinds(visibleObjects, glbUnsupportedKinds);
  const stlUnsupportedObjectKinds = collectUnsupportedKinds(visibleObjects, stlUnsupportedKinds);
  const usdzUnsupportedObjectKinds = collectUnsupportedKinds(visibleObjects, usdzUnsupportedKinds);

  return {
    assets,
    capabilities: {
      animation: (document.animationTracks?.length ?? 0) > 0,
      booleans: allObjects.some((object) => (object.booleans?.length ?? 0) > 0),
      cloners: allObjects.some((object) => object.cloner?.enabled),
      components: (document.components?.length ?? 0) > 0,
      interactions: allObjects.some((object) => Boolean(object.interaction)),
      meshEditing: allObjects.some((object) => object.meshEdit?.enabled),
      multiScene: sceneEntries.length > 1,
      physics: allObjects.some((object) => object.physics?.enabled),
      sculpting: allObjects.some((object) => object.sculpt?.enabled),
      twoD: allObjects.some((object) => Boolean(object.twoD)),
      variables: (document.variables?.length ?? 0) > 0,
    },
    generatedAt: new Date().toISOString(),
    objectKinds,
    objects: objectSupport,
    optimization,
    readiness: {
      glb: createReadiness(glbUnsupportedObjectKinds, glbUnsupportedObjectKinds.length ? ["Some runtime or externally loaded object types are preserved in JSON but omitted or simplified in generated GLB."] : []),
      json: createReadiness([], ["Scene JSON preserves the complete Essence Spline document."]),
      stl: createReadiness(stlUnsupportedObjectKinds, stlUnsupportedObjectKinds.length ? ["STL is geometry-only; non-mesh, media, light, camera, and runtime objects are not represented."] : []),
      usdz: createReadiness(usdzUnsupportedObjectKinds, usdzUnsupportedObjectKinds.length ? ["Some runtime or externally loaded object types are preserved in JSON but omitted or simplified in generated USDZ."] : []),
      web: createReadiness([], hasDangerIssue ? ["Optimization report contains danger-level issues; review before publishing."] : ["Web export supports the complete scene document."], hasDangerIssue),
    },
    schemaVersion: 1,
    scene: {
      activeSceneId: document.activeSceneId,
      createdAt: document.createdAt,
      id: document.id,
      name: document.name,
      updatedAt: document.updatedAt,
    },
    scenes: sceneEntries.map((scene) => ({
      id: scene.id,
      name: scene.name,
      objectCount: scene.objects.length,
      visibleObjectCount: scene.objects.filter((object) => object.visible !== false).length,
    })),
    summary: {
      animationTrackCount: document.animationTracks?.length ?? 0,
      assetCount: assets.length,
      audioAssetCount: document.audioAssets?.length ?? 0,
      componentCount: document.components?.length ?? 0,
      materialAssetCount: document.materialAssets?.length ?? 0,
      objectCount: allObjects.length,
      sceneCount: sceneEntries.length,
      variableCount: document.variables?.length ?? 0,
      visibleObjectCount: visibleObjects.length,
    },
    supportedExports: ["json", "png", "png-sequence", "webm", "glb", "stl", "usdz", "export-manifest"],
    supportedImports: ["json", "essencescene", "glb", "gltf", "obj", "stl", "splat", "svg", "png", "jpg", "webp", "mp4", "webm", "mp3", "wav", "figma-url"],
  };
}

export function getExportReadinessNotice(document: SceneDocument, format: ExportReadinessFormat) {
  const readiness = createExportManifest(document).readiness[format];

  if (readiness.status === "ready") {
    return null;
  }

  const label = format.toUpperCase();
  const unsupported = readiness.unsupportedObjectKinds.length > 0 ? ` Unsupported: ${readiness.unsupportedObjectKinds.join(", ")}.` : "";
  const note = readiness.notes[0] ? ` ${readiness.notes[0]}` : "";

  return `${label} export is ${readiness.status}.${unsupported}${note}`;
}
