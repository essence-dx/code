import { createHash } from "node:crypto";
import { resolveMaterial } from "@/features/editor/materials/resolve-material";
import { resolveSceneSettings } from "@/features/editor/scene/default-document";
import type { SceneObject, SceneSettings } from "@/features/editor/types";

export type MaterialPostProcessParitySurface = "editor" | "viewer";
export type MaterialPostProcessParityStatus = "blocked" | "ready";

export interface MaterialPostProcessMaterialPreview {
  bumpMapEnabled: boolean;
  bumpScale: number;
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  layerCount: number;
  materialHash: string;
  metalness: number;
  objectId: string;
  objectName: string;
  opacity: number;
  roughness: number;
  roughnessMapEnabled: boolean;
  textureEnabled: boolean;
}

export interface MaterialPostProcessPreviewSnapshot {
  materials: MaterialPostProcessMaterialPreview[];
  postProcess: {
    ambientColor: string;
    ambientIntensity: number;
    bloomEnabled: boolean;
    bloomIntensity: number;
    bloomRadius: number;
    bloomThreshold: number;
    depthOfFieldAperture: number;
    depthOfFieldEnabled: boolean;
    depthOfFieldFocus: number;
    depthOfFieldMaxBlur: number;
    fogEnabled: boolean;
    passCount: number;
    postProcessHash: string;
  };
  snapshotHash: string;
  surface: MaterialPostProcessParitySurface;
}

export interface MaterialPostProcessParityRow {
  bumpMapCount: number;
  materialCount: number;
  mismatchSummary: string;
  postProcessPasses: number;
  roughnessMapCount: number;
  snapshotHash: string;
  status: MaterialPostProcessParityStatus;
  surface: MaterialPostProcessParitySurface;
}

export interface MaterialPostProcessParityReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: MaterialPostProcessParityRow[];
  summary: {
    mismatchCount: number;
    nextAction: string;
    parityHash: string;
    parityScore: number;
    status: MaterialPostProcessParityStatus;
  };
  workspaceId: string;
}

export interface CreateMaterialPostProcessSnapshotInput {
  objects: SceneObject[];
  sceneSettings?: Partial<SceneSettings> | null;
  surface: MaterialPostProcessParitySurface;
}

export interface CreateMaterialPostProcessParityReportInput {
  editorSnapshot: MaterialPostProcessPreviewSnapshot;
  generatedAt?: string;
  viewerSnapshot: MaterialPostProcessPreviewSnapshot;
  workspaceId?: string;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function canPreviewMaterial(object: SceneObject) {
  return object.kind !== "camera" && object.kind !== "group" && object.kind !== "audio";
}

function createMaterialPreview(object: SceneObject): MaterialPostProcessMaterialPreview {
  const resolved = resolveMaterial(object.material);
  const preview = {
    bumpMapEnabled: Boolean(resolved.bumpMap),
    bumpScale: round(resolved.bumpScale),
    color: resolved.color,
    emissiveColor: resolved.emissiveColor,
    emissiveIntensity: round(resolved.emissiveIntensity),
    layerCount: object.material.layers?.filter((layer) => layer.enabled !== false).length ?? 0,
    metalness: round(resolved.metalness),
    objectId: object.id,
    objectName: object.name,
    opacity: round(resolved.opacity),
    roughness: round(resolved.roughness),
    roughnessMapEnabled: Boolean(resolved.roughnessMap),
    textureEnabled: Boolean(resolved.textureDataUrl || resolved.image || resolved.video),
  };

  return {
    ...preview,
    materialHash: sha256(preview),
  };
}

function createPostProcessPreview(sceneSettings?: Partial<SceneSettings> | null): MaterialPostProcessPreviewSnapshot["postProcess"] {
  const settings = resolveSceneSettings(sceneSettings);
  const bloomEnabled = settings.postProcessingEnabled && settings.bloomEnabled;
  const depthOfFieldEnabled = settings.postProcessingEnabled && settings.depthOfFieldEnabled;
  const passCount = Number(bloomEnabled) + Number(depthOfFieldEnabled);
  const preview = {
    ambientColor: settings.ambientColor,
    ambientIntensity: round(settings.ambientIntensity),
    bloomEnabled,
    bloomIntensity: round(settings.bloomIntensity),
    bloomRadius: round(settings.bloomRadius),
    bloomThreshold: round(settings.bloomThreshold),
    depthOfFieldAperture: round(settings.depthOfFieldAperture),
    depthOfFieldEnabled,
    depthOfFieldFocus: round(settings.depthOfFieldFocus),
    depthOfFieldMaxBlur: round(settings.depthOfFieldMaxBlur),
    fogEnabled: settings.fogEnabled,
    passCount,
  };

  return {
    ...preview,
    postProcessHash: sha256(preview),
  };
}

export function createMaterialPostProcessSnapshot(input: CreateMaterialPostProcessSnapshotInput): MaterialPostProcessPreviewSnapshot {
  const materials = input.objects
    .filter(canPreviewMaterial)
    .map(createMaterialPreview)
    .sort((first, second) => first.objectName.localeCompare(second.objectName) || first.objectId.localeCompare(second.objectId));
  const postProcess = createPostProcessPreview(input.sceneSettings);
  const base = {
    materials,
    postProcess,
    surface: input.surface,
  };

  return {
    ...base,
    snapshotHash: sha256(base),
  };
}

function mismatchSummary(editor: MaterialPostProcessPreviewSnapshot, viewer: MaterialPostProcessPreviewSnapshot) {
  const mismatches: string[] = [];
  const editorMaterials = new Map(editor.materials.map((material) => [material.objectId, material]));
  const viewerMaterials = new Map(viewer.materials.map((material) => [material.objectId, material]));

  for (const [objectId, editorMaterial] of editorMaterials) {
    const viewerMaterial = viewerMaterials.get(objectId);

    if (!viewerMaterial) {
      mismatches.push(`Viewer missing material preview for ${editorMaterial.objectName}.`);
    } else if (viewerMaterial.materialHash !== editorMaterial.materialHash) {
      mismatches.push(`Material drift for ${editorMaterial.objectName}.`);
    }
  }

  for (const [objectId, viewerMaterial] of viewerMaterials) {
    if (!editorMaterials.has(objectId)) {
      mismatches.push(`Viewer has extra material preview for ${viewerMaterial.objectName}.`);
    }
  }

  if (editor.postProcess.postProcessHash !== viewer.postProcess.postProcessHash) {
    mismatches.push("Post-process or scene lighting drift.");
  }

  return mismatches;
}

function createRow(input: {
  mismatchSummary: string;
  snapshot: MaterialPostProcessPreviewSnapshot;
  status: MaterialPostProcessParityStatus;
}): MaterialPostProcessParityRow {
  return {
    bumpMapCount: input.snapshot.materials.filter((material) => material.bumpMapEnabled).length,
    materialCount: input.snapshot.materials.length,
    mismatchSummary: input.mismatchSummary,
    postProcessPasses: input.snapshot.postProcess.passCount,
    roughnessMapCount: input.snapshot.materials.filter((material) => material.roughnessMapEnabled).length,
    snapshotHash: input.snapshot.snapshotHash,
    status: input.status,
    surface: input.snapshot.surface,
  };
}

function createCsv(rows: MaterialPostProcessParityRow[]) {
  const header = ["surface", "status", "material_count", "bump_maps", "roughness_maps", "postprocess_passes", "mismatch_summary"];
  const body = rows.map((row) =>
    [row.surface, row.status, row.materialCount, row.bumpMapCount, row.roughnessMapCount, row.postProcessPasses, row.mismatchSummary].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createMaterialPostProcessParityReport(input: CreateMaterialPostProcessParityReportInput): MaterialPostProcessParityReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const mismatches = mismatchSummary(input.editorSnapshot, input.viewerSnapshot);
  const status: MaterialPostProcessParityStatus = mismatches.length > 0 ? "blocked" : "ready";
  const rows = [
    createRow({
      mismatchSummary: status === "ready" ? "Editor and viewer material/post-process previews match." : mismatches.join(" "),
      snapshot: input.editorSnapshot,
      status,
    }),
    createRow({
      mismatchSummary: status === "ready" ? "Editor and viewer material/post-process previews match." : mismatches.join(" "),
      snapshot: input.viewerSnapshot,
      status,
    }),
  ];
  const parityHash = sha256({
    editor: input.editorSnapshot.snapshotHash,
    mismatches,
    viewer: input.viewerSnapshot.snapshotHash,
  });
  const summary = {
    mismatchCount: mismatches.length,
    nextAction:
      status === "ready"
        ? "Material and post-process parity previews are ready."
        : "Resolve material and post-process parity mismatches before accepting viewer fidelity.",
    parityHash,
    parityScore: Math.max(0, Math.min(100, 100 - mismatches.length * 25)),
    status,
  };
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      editorSnapshot: input.editorSnapshot,
      generatedAt,
      rows,
      summary,
      viewerSnapshot: input.viewerSnapshot,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-material-postprocess-parity-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
