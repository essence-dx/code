import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MeshCutAxis, MeshEditSettings, MeshModifierPreset, MeshSelectionMode, MeshSelectionSet, PrimitiveKind, SceneObject, Vec3 } from "../types";
import { isParametricPrimitiveKind, isTwoDimensionalShapeKind, resolveGeometry } from "./primitive-geometry";

export const defaultMeshEditSettings: MeshEditSettings = {
  bevel: 0,
  bevelSegments: 2,
  bridgeRadius: 0.08,
  bridgeSegments: 12,
  bridgeTargetIndex: 1,
  cutAxis: "y",
  cutDepth: 0.08,
  cutPosition: 0,
  cutWidth: 0.12,
  enabled: false,
  extrude: 0,
  inset: 0,
  loopCuts: 0,
  operation: "none",
  selectionFalloff: 0.35,
  selectionIndex: 0,
  selectionMode: "object",
  selectionOffset: [0, 0, 0],
  selectionSpan: 1,
  selectionSets: [],
  modifierPresets: [],
  showTopology: true,
};

export function getUniqueMeshEntryName(entries: ReadonlyArray<{ name: string }>, baseName: string) {
  const names = new Set(entries.map((entry) => entry.name.trim()).filter(Boolean));
  const trimmedBase = baseName.trim() || "Mesh Entry";
  let name = trimmedBase;
  let suffix = 2;

  while (names.has(name)) {
    name = `${trimmedBase} ${suffix}`;
    suffix += 1;
  }

  return name;
}

export function captureMeshSelectionSet(settings: MeshEditSettings, entry: { id: string; name: string; now?: string }): MeshSelectionSet {
  return {
    id: entry.id,
    name: entry.name.trim() || "Selection Set",
    selectionFalloff: settings.selectionFalloff,
    selectionIndex: settings.selectionIndex,
    selectionMode: settings.selectionMode === "object" ? "vertex" : settings.selectionMode,
    selectionOffset: [...settings.selectionOffset],
    selectionSpan: settings.selectionSpan,
    createdAt: entry.now,
    updatedAt: entry.now,
  };
}

export function applyMeshSelectionSet(settings: MeshEditSettings, selectionSet: MeshSelectionSet): Partial<MeshEditSettings> {
  return {
    enabled: true,
    selectionFalloff: selectionSet.selectionFalloff,
    selectionIndex: selectionSet.selectionIndex,
    selectionMode: selectionSet.selectionMode,
    selectionOffset: [...selectionSet.selectionOffset],
    selectionSpan: selectionSet.selectionSpan,
  };
}

export function captureMeshModifierPreset(settings: MeshEditSettings, entry: { id: string; name: string; now?: string }): MeshModifierPreset {
  return {
    id: entry.id,
    name: entry.name.trim() || "Modifier Preset",
    bevel: settings.bevel,
    bevelSegments: settings.bevelSegments,
    bridgeRadius: settings.bridgeRadius,
    bridgeSegments: settings.bridgeSegments,
    bridgeTargetIndex: settings.bridgeTargetIndex,
    cutAxis: settings.cutAxis,
    cutDepth: settings.cutDepth,
    cutPosition: settings.cutPosition,
    cutWidth: settings.cutWidth,
    extrude: settings.extrude,
    inset: settings.inset,
    loopCuts: settings.loopCuts,
    operation: settings.operation,
    createdAt: entry.now,
    updatedAt: entry.now,
  };
}

export function applyMeshModifierPreset(settings: MeshEditSettings, preset: MeshModifierPreset): Partial<MeshEditSettings> {
  return {
    bevel: preset.bevel,
    bevelSegments: preset.bevelSegments,
    bridgeRadius: preset.bridgeRadius,
    bridgeSegments: preset.bridgeSegments,
    bridgeTargetIndex: preset.bridgeTargetIndex,
    cutAxis: preset.cutAxis,
    cutDepth: preset.cutDepth,
    cutPosition: preset.cutPosition,
    cutWidth: preset.cutWidth,
    enabled: preset.operation !== "none" || settings.enabled,
    extrude: preset.extrude,
    inset: preset.inset,
    loopCuts: preset.loopCuts,
    operation: preset.operation,
  };
}

export function canHaveMeshEditing(kind: PrimitiveKind) {
  return isParametricPrimitiveKind(kind);
}

export function resolveMeshEditSettings(object: Pick<SceneObject, "meshEdit">): MeshEditSettings {
  return {
    ...defaultMeshEditSettings,
    ...object.meshEdit,
  };
}

export function hasActiveMeshEdit(object: Pick<SceneObject, "meshEdit">) {
  const settings = resolveMeshEditSettings(object);

  return settings.enabled && (settings.operation !== "none" || settings.extrude !== 0 || settings.inset > 0 || settings.bevel > 0 || settings.loopCuts > 0 || hasSelectionOffset(settings));
}

export function resolveMeshLoopSegments(object: SceneObject, baseSegments: number) {
  const settings = resolveMeshEditSettings(object);

  return settings.enabled ? Math.max(baseSegments, baseSegments + settings.loopCuts) : baseSegments;
}

export function resolveMeshEditExtrudeDepth(object: SceneObject, baseDepth: number) {
  const settings = resolveMeshEditSettings(object);

  if (!settings.enabled || settings.operation !== "extrude") {
    return baseDepth;
  }

  return Math.max(0, baseDepth + settings.extrude);
}

export function getMeshBevelOptions(object: SceneObject) {
  const settings = resolveMeshEditSettings(object);

  if (!settings.enabled || settings.bevel <= 0) {
    return { bevelEnabled: false, bevelSegments: 0, bevelSize: 0 };
  }

  return {
    bevelEnabled: true,
    bevelSegments: settings.bevelSegments,
    bevelSize: settings.bevel,
  };
}

function toVector3(value: Vec3) {
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function hasSelectionOffset(settings: MeshEditSettings) {
  return settings.selectionMode !== "object" && settings.selectionOffset.some((value) => Math.abs(value) > 0.0001);
}

function normalizeSelectionIndex(index: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return Math.abs(Math.round(index)) % count;
}

function normalizeSelectionSpan(span: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return Math.min(count, Math.max(1, Math.round(span)));
}

function pushUniqueIndex(indices: number[], seen: Set<number>, index: number) {
  if (seen.has(index)) {
    return;
  }

  seen.add(index);
  indices.push(index);
}

function getSelectedAttributeIndices(mode: MeshSelectionMode, positions: THREE.BufferAttribute, selectionIndex: number, selectionSpan = 1) {
  if (mode === "object" || positions.count <= 0) {
    return [];
  }

  const indices: number[] = [];
  const seen = new Set<number>();

  if (mode === "vertex") {
    const span = normalizeSelectionSpan(selectionSpan, positions.count);

    for (let offset = 0; offset < span; offset += 1) {
      pushUniqueIndex(indices, seen, normalizeSelectionIndex(selectionIndex + offset, positions.count));
    }

    return indices;
  }

  if (mode === "edge") {
    const start = normalizeSelectionIndex(selectionIndex, positions.count);
    const span = normalizeSelectionSpan(selectionSpan, positions.count);

    for (let offset = 0; offset < span; offset += 1) {
      const edgeStart = (start + offset) % positions.count;
      pushUniqueIndex(indices, seen, edgeStart);
      pushUniqueIndex(indices, seen, (edgeStart + 1) % positions.count);
    }

    return indices;
  }

  const faceCount = Math.max(1, Math.floor(positions.count / 3));
  const span = normalizeSelectionSpan(selectionSpan, faceCount);

  for (let offset = 0; offset < span; offset += 1) {
    const start = normalizeSelectionIndex(selectionIndex + offset, faceCount) * 3;

    pushUniqueIndex(indices, seen, start);
    pushUniqueIndex(indices, seen, Math.min(start + 1, positions.count - 1));
    pushUniqueIndex(indices, seen, Math.min(start + 2, positions.count - 1));
  }

  return indices;
}

function getSelectionIndicesForSettings(settings: MeshEditSettings, positions: THREE.BufferAttribute, selectionIndex = settings.selectionIndex) {
  return getSelectedAttributeIndices(settings.selectionMode, positions, selectionIndex, settings.selectionSpan);
}

function getSelectionCenter(positions: THREE.BufferAttribute, indices: number[]) {
  const center = new THREE.Vector3();

  if (indices.length === 0) {
    return center;
  }

  for (const index of indices) {
    center.setX(center.x + positions.getX(index));
    center.setY(center.y + positions.getY(index));
    center.setZ(center.z + positions.getZ(index));
  }

  return center.divideScalar(indices.length);
}

function smoothSelectionWeight(distance: number, falloff: number) {
  if (falloff <= 0) {
    return 0;
  }

  if (distance >= falloff) {
    return 0;
  }

  const value = 1 - distance / falloff;
  return value * value * (3 - 2 * value);
}

function resolveSelectionWeight(vertex: THREE.Vector3, index: number, selectedIndices: Set<number>, center: THREE.Vector3, falloff: number) {
  if (selectedIndices.has(index)) {
    return 1;
  }

  return smoothSelectionWeight(vertex.distanceTo(center), falloff);
}

export function resolveMeshSelectionPreview(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  const positions = geometry.getAttribute("position");

  if (!positions || settings.selectionMode === "object") {
    return null;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const indices = getSelectionIndicesForSettings(settings, positionAttribute);

  if (indices.length === 0) {
    return null;
  }

  const targetIndices = settings.operation === "bridge" ? getSelectionIndicesForSettings(settings, positionAttribute, settings.bridgeTargetIndex) : [];

  return {
    center: getSelectionCenter(positionAttribute, indices),
    count: indices.length,
    targetCenter: targetIndices.length ? getSelectionCenter(positionAttribute, targetIndices) : null,
    targetCount: targetIndices.length,
  };
}

function applySelectionOffset(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  if (!hasSelectionOffset(settings)) {
    return;
  }

  const positions = geometry.getAttribute("position");

  if (!positions) {
    return;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const selectedIndices = getSelectionIndicesForSettings(settings, positionAttribute);

  if (selectedIndices.length === 0) {
    return;
  }

  const selectedIndexSet = new Set(selectedIndices);
  const center = getSelectionCenter(positionAttribute, selectedIndices);
  const offset = toVector3(settings.selectionOffset);
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positionAttribute.count; index += 1) {
    vertex.fromBufferAttribute(positionAttribute, index);
    const weight = selectedIndexSet.has(index) ? 1 : smoothSelectionWeight(vertex.distanceTo(center), settings.selectionFalloff);

    if (weight <= 0) {
      continue;
    }

    vertex.addScaledVector(offset, weight);
    positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
}

function applySelectionInset(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  if (settings.selectionMode === "object" || settings.inset <= 0) {
    return false;
  }

  const positions = geometry.getAttribute("position");

  if (!positions) {
    return false;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const selectedIndices = getSelectionIndicesForSettings(settings, positionAttribute);

  if (selectedIndices.length === 0) {
    return false;
  }

  const selectedIndexSet = new Set(selectedIndices);
  const center = getSelectionCenter(positionAttribute, selectedIndices);
  const strength = Math.min(0.95, Math.max(0, settings.inset));
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positionAttribute.count; index += 1) {
    vertex.fromBufferAttribute(positionAttribute, index);

    const weight = resolveSelectionWeight(vertex, index, selectedIndexSet, center, settings.selectionFalloff);

    if (weight <= 0) {
      continue;
    }

    vertex.lerp(center, strength * weight);
    positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
  return true;
}

function applySelectionNormalOffset(geometry: THREE.BufferGeometry, settings: MeshEditSettings, distance: number) {
  if (settings.selectionMode === "object" || Math.abs(distance) <= 0.0001) {
    return false;
  }

  const positions = geometry.getAttribute("position");

  if (!positions) {
    return false;
  }

  geometry.computeVertexNormals();

  const normals = geometry.getAttribute("normal");

  if (!normals) {
    return false;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const normalAttribute = normals as THREE.BufferAttribute;
  const selectedIndices = getSelectionIndicesForSettings(settings, positionAttribute);

  if (selectedIndices.length === 0) {
    return false;
  }

  const selectedIndexSet = new Set(selectedIndices);
  const center = getSelectionCenter(positionAttribute, selectedIndices);
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < positionAttribute.count; index += 1) {
    vertex.fromBufferAttribute(positionAttribute, index);

    const weight = resolveSelectionWeight(vertex, index, selectedIndexSet, center, settings.selectionFalloff);

    if (weight <= 0) {
      continue;
    }

    normal.fromBufferAttribute(normalAttribute, index).normalize();
    vertex.addScaledVector(normal, distance * weight);
    positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
  return true;
}

function appendPosition(values: number[], position: THREE.Vector3) {
  values.push(position.x, position.y, position.z);
}

function appendUv(values: number[] | null, uvAttribute: THREE.BufferAttribute | null, sourceIndex: number) {
  if (!values || !uvAttribute) {
    return;
  }

  values.push(uvAttribute.getX(sourceIndex), uvAttribute.getY(sourceIndex));
}

function appendBevelVertex(positions: number[], uvs: number[] | null, uvAttribute: THREE.BufferAttribute | null, position: THREE.Vector3, sourceIndex: number) {
  appendPosition(positions, position);
  appendUv(uvs, uvAttribute, sourceIndex);
}

function appendBevelWall(
  positions: number[],
  uvs: number[] | null,
  uvAttribute: THREE.BufferAttribute | null,
  oldA: THREE.Vector3,
  oldB: THREE.Vector3,
  newA: THREE.Vector3,
  newB: THREE.Vector3,
  sourceA: number,
  sourceB: number,
) {
  appendBevelVertex(positions, uvs, uvAttribute, oldA, sourceA);
  appendBevelVertex(positions, uvs, uvAttribute, oldB, sourceB);
  appendBevelVertex(positions, uvs, uvAttribute, newB, sourceB);
  appendBevelVertex(positions, uvs, uvAttribute, oldA, sourceA);
  appendBevelVertex(positions, uvs, uvAttribute, newB, sourceB);
  appendBevelVertex(positions, uvs, uvAttribute, newA, sourceA);
}

function createSelectionBevelGeometry(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  if (settings.selectionMode === "object" || settings.bevel <= 0) {
    return geometry;
  }

  const editableGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = editableGeometry.getAttribute("position");

  if (!positions) {
    return editableGeometry;
  }

  editableGeometry.computeVertexNormals();

  const normals = editableGeometry.getAttribute("normal");

  if (!normals) {
    return editableGeometry;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const normalAttribute = normals as THREE.BufferAttribute;
  const selectedIndices = getSelectionIndicesForSettings(settings, positionAttribute);

  if (selectedIndices.length === 0) {
    return editableGeometry;
  }

  const center = getSelectionCenter(positionAttribute, selectedIndices);
  const oldVertices = selectedIndices.map((index) => new THREE.Vector3().fromBufferAttribute(positionAttribute, index));
  const newVertices = oldVertices.map((vertex, localIndex) => {
    const sourceIndex = selectedIndices[localIndex] ?? 0;
    const normal = new THREE.Vector3().fromBufferAttribute(normalAttribute, sourceIndex).normalize();
    const insetStrength = Math.min(0.75, Math.max(0.05, settings.bevel));

    return vertex.clone().lerp(center, insetStrength).addScaledVector(normal, -settings.bevel * 0.5);
  });
  const nextPositions = Array.from(positionAttribute.array as ArrayLike<number>);
  const uvAttribute = editableGeometry.getAttribute("uv") as THREE.BufferAttribute | undefined;
  const nextUvs = uvAttribute ? Array.from(uvAttribute.array as ArrayLike<number>) : null;

  for (let index = 0; index < selectedIndices.length; index += 1) {
    const sourceIndex = selectedIndices[index] ?? 0;
    const vertex = newVertices[index];

    if (!vertex) {
      continue;
    }

    nextPositions[sourceIndex * 3] = vertex.x;
    nextPositions[sourceIndex * 3 + 1] = vertex.y;
    nextPositions[sourceIndex * 3 + 2] = vertex.z;
  }

  if (selectedIndices.length === 2) {
    const [oldA, oldB] = oldVertices;
    const [newA, newB] = newVertices;
    const [sourceA, sourceB] = selectedIndices;

    if (oldA && oldB && newA && newB && sourceA !== undefined && sourceB !== undefined) {
      appendBevelWall(nextPositions, nextUvs, uvAttribute ?? null, oldA, oldB, newA, newB, sourceA, sourceB);
    }
  }

  if (selectedIndices.length >= 3) {
    for (let index = 0; index < selectedIndices.length; index += 1) {
      const nextIndex = (index + 1) % selectedIndices.length;
      const sourceA = selectedIndices[index];
      const sourceB = selectedIndices[nextIndex];
      const oldA = oldVertices[index];
      const oldB = oldVertices[nextIndex];
      const newA = newVertices[index];
      const newB = newVertices[nextIndex];

      if (sourceA !== undefined && sourceB !== undefined && oldA && oldB && newA && newB) {
        appendBevelWall(nextPositions, nextUvs, uvAttribute ?? null, oldA, oldB, newA, newB, sourceA, sourceB);
      }
    }
  }

  const beveledGeometry = new THREE.BufferGeometry();
  beveledGeometry.setAttribute("position", new THREE.Float32BufferAttribute(nextPositions, 3));

  if (nextUvs) {
    beveledGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(nextUvs, 2));
  }

  beveledGeometry.computeVertexNormals();
  beveledGeometry.computeBoundingBox();
  beveledGeometry.computeBoundingSphere();

  if (editableGeometry !== geometry) {
    editableGeometry.dispose();
  }

  geometry.dispose();
  return beveledGeometry;
}

function getAxisValue(vector: THREE.Vector3, axis: MeshCutAxis) {
  if (axis === "x") {
    return vector.x;
  }

  if (axis === "z") {
    return vector.z;
  }

  return vector.y;
}

type LoopCutVertex = {
  position: THREE.Vector3;
  uv: THREE.Vector2 | null;
};

function readLoopCutVertex(positions: THREE.BufferAttribute, uvs: THREE.BufferAttribute | null, index: number): LoopCutVertex {
  return {
    position: new THREE.Vector3().fromBufferAttribute(positions, index),
    uv: uvs ? new THREE.Vector2().fromBufferAttribute(uvs, index) : null,
  };
}

function interpolateLoopCutVertex(start: LoopCutVertex, end: LoopCutVertex, amount: number): LoopCutVertex {
  return {
    position: start.position.clone().lerp(end.position, amount),
    uv: start.uv && end.uv ? start.uv.clone().lerp(end.uv, amount) : null,
  };
}

function appendLoopCutVertex(positions: number[], uvs: number[] | null, vertex: LoopCutVertex) {
  appendPosition(positions, vertex.position);

  if (uvs && vertex.uv) {
    uvs.push(vertex.uv.x, vertex.uv.y);
  }
}

function appendLoopCutPolygon(positions: number[], uvs: number[] | null, vertices: LoopCutVertex[]) {
  if (vertices.length < 3) {
    return;
  }

  for (let index = 1; index < vertices.length - 1; index += 1) {
    const first = vertices[0];
    const second = vertices[index];
    const third = vertices[index + 1];

    if (first && second && third) {
      appendLoopCutVertex(positions, uvs, first);
      appendLoopCutVertex(positions, uvs, second);
      appendLoopCutVertex(positions, uvs, third);
    }
  }
}

function splitLoopCutTriangle(vertices: LoopCutVertex[], axis: MeshCutAxis, cutPosition: number) {
  const epsilon = 0.00001;
  const values = vertices.map((vertex) => getAxisValue(vertex.position, axis) - cutPosition);
  const hasPositive = values.some((value) => value > epsilon);
  const hasNegative = values.some((value) => value < -epsilon);

  if (!hasPositive || !hasNegative) {
    return [vertices];
  }

  const positivePolygon: LoopCutVertex[] = [];
  const negativePolygon: LoopCutVertex[] = [];

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const nextIndex = (index + 1) % vertices.length;
    const next = vertices[nextIndex];
    const currentValue = values[index] ?? 0;
    const nextValue = values[nextIndex] ?? 0;

    if (!current || !next) {
      continue;
    }

    if (currentValue >= -epsilon) {
      positivePolygon.push(current);
    }

    if (currentValue <= epsilon) {
      negativePolygon.push(current);
    }

    if ((currentValue > epsilon && nextValue < -epsilon) || (currentValue < -epsilon && nextValue > epsilon)) {
      const amount = Math.abs(currentValue) / (Math.abs(currentValue) + Math.abs(nextValue));
      const cutVertex = interpolateLoopCutVertex(current, next, amount);

      positivePolygon.push(cutVertex);
      negativePolygon.push(cutVertex);
    }
  }

  return [positivePolygon, negativePolygon].filter((polygon) => polygon.length >= 3);
}

function createLoopCutTopologyGeometry(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  if (!settings.enabled || settings.operation !== "loopCut") {
    return geometry;
  }

  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.getAttribute("position");

  if (!positions) {
    return source;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const uvAttribute = (source.getAttribute("uv") as THREE.BufferAttribute | undefined) ?? null;
  const nextPositions: number[] = [];
  const nextUvs: number[] | null = uvAttribute ? [] : null;
  let didSplit = false;

  for (let index = 0; index < positionAttribute.count; index += 3) {
    const vertices = [
      readLoopCutVertex(positionAttribute, uvAttribute, index),
      readLoopCutVertex(positionAttribute, uvAttribute, index + 1),
      readLoopCutVertex(positionAttribute, uvAttribute, index + 2),
    ];
    const splitPolygons = splitLoopCutTriangle(vertices, settings.cutAxis, settings.cutPosition);

    didSplit ||= splitPolygons.length > 1;

    for (const polygon of splitPolygons) {
      appendLoopCutPolygon(nextPositions, nextUvs, polygon);
    }
  }

  if (!didSplit) {
    if (source !== geometry) {
      source.dispose();
    }

    return geometry;
  }

  const cutGeometry = new THREE.BufferGeometry();
  cutGeometry.setAttribute("position", new THREE.Float32BufferAttribute(nextPositions, 3));

  if (nextUvs) {
    cutGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(nextUvs, 2));
  }

  cutGeometry.computeVertexNormals();
  cutGeometry.computeBoundingBox();
  cutGeometry.computeBoundingSphere();

  if (source !== geometry) {
    source.dispose();
  }

  geometry.dispose();
  return cutGeometry;
}

function applyCutGroove(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  if (!settings.enabled || settings.operation !== "loopCut" || Math.abs(settings.cutDepth) <= 0.0001) {
    return;
  }

  const positions = geometry.getAttribute("position");

  if (!positions) {
    return;
  }

  geometry.computeVertexNormals();

  const normals = geometry.getAttribute("normal");

  if (!normals) {
    return;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const normalAttribute = normals as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const halfWidth = Math.max(0.005, settings.cutWidth / 2);

  for (let index = 0; index < positionAttribute.count; index += 1) {
    vertex.fromBufferAttribute(positionAttribute, index);

    const distance = Math.abs(getAxisValue(vertex, settings.cutAxis) - settings.cutPosition);

    if (distance > halfWidth) {
      continue;
    }

    const linearWeight = 1 - distance / halfWidth;
    const weight = linearWeight * linearWeight * (3 - 2 * linearWeight);

    normal.fromBufferAttribute(normalAttribute, index).normalize();
    vertex.addScaledVector(normal, -settings.cutDepth * weight);
    positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
}

function pruneAttributesToCommonSet(geometries: THREE.BufferGeometry[]) {
  const commonNames = geometries.reduce<Set<string> | null>((common, geometry) => {
    const names = new Set(Object.keys(geometry.attributes));

    if (!common) {
      return names;
    }

    return new Set([...common].filter((name) => names.has(name)));
  }, null);

  for (const geometry of geometries) {
    for (const name of Object.keys(geometry.attributes)) {
      if (!commonNames?.has(name)) {
        geometry.deleteAttribute(name);
      }
    }
  }
}

function createBridgeGeometry(geometry: THREE.BufferGeometry, settings: MeshEditSettings) {
  if (!settings.enabled || settings.operation !== "bridge" || settings.selectionMode === "object") {
    return geometry;
  }

  const positions = geometry.getAttribute("position");

  if (!positions) {
    return geometry;
  }

  const positionAttribute = positions as THREE.BufferAttribute;
  const startIndices = getSelectionIndicesForSettings(settings, positionAttribute);
  const endIndices = getSelectionIndicesForSettings(settings, positionAttribute, settings.bridgeTargetIndex);

  if (startIndices.length === 0 || endIndices.length === 0) {
    return geometry;
  }

  const start = getSelectionCenter(positionAttribute, startIndices);
  const end = getSelectionCenter(positionAttribute, endIndices);

  if (start.distanceTo(end) < 0.001) {
    return geometry;
  }

  const curve = new THREE.LineCurve3(start, end);
  const bridge = new THREE.TubeGeometry(curve, 1, settings.bridgeRadius, settings.bridgeSegments, false);
  const source = geometry.toNonIndexed();
  const bridgeGeometry = bridge.toNonIndexed();
  const mergeSources = [source, bridgeGeometry];

  pruneAttributesToCommonSet(mergeSources);

  const merged = mergeGeometries(mergeSources, false);

  source.dispose();
  bridge.dispose();
  bridgeGeometry.dispose();

  if (!merged) {
    return geometry;
  }

  geometry.dispose();
  merged.computeVertexNormals();

  return merged;
}

export function applyMeshEditModifiers(geometry: THREE.BufferGeometry, object: SceneObject) {
  const settings = resolveMeshEditSettings(object);

  if (!settings.enabled) {
    geometry.computeVertexNormals();
    return geometry;
  }

  if (settings.selectionMode !== "object" && geometry.index) {
    const editableGeometry = geometry.toNonIndexed();
    geometry.dispose();
    geometry = editableGeometry;
  }

  if (settings.inset > 0) {
    const scale = Math.max(0.05, 1 - settings.inset);

    if (!applySelectionInset(geometry, settings)) {
      geometry.scale(scale, isTwoDimensionalShapeKind(object.kind) ? scale : 1, scale);
    }
  }

  if (settings.operation === "extrude" && settings.extrude !== 0 && !isTwoDimensionalShapeKind(object.kind)) {
    const selectedExtrudeApplied = applySelectionNormalOffset(geometry, settings, settings.extrude);

    if (!selectedExtrudeApplied) {
      geometry.computeVertexNormals();

      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");

      if (positions && normals) {
        for (let index = 0; index < positions.count; index += 1) {
          positions.setXYZ(
            index,
            positions.getX(index) + normals.getX(index) * settings.extrude,
            positions.getY(index) + normals.getY(index) * settings.extrude,
            positions.getZ(index) + normals.getZ(index) * settings.extrude,
          );
        }

        positions.needsUpdate = true;
      }
    }
  }

  applySelectionOffset(geometry, settings);
  geometry = createSelectionBevelGeometry(geometry, settings);
  geometry = createLoopCutTopologyGeometry(geometry, settings);
  applyCutGroove(geometry, settings);

  geometry = createBridgeGeometry(geometry, settings);

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export function estimateMeshTopology(object: SceneObject) {
  if (!canHaveMeshEditing(object.kind)) {
    return { faces: 0, vertices: 0 };
  }

  const geometry = resolveGeometry(object);
  const settings = resolveMeshEditSettings(object);
  const loopCuts = settings.enabled ? settings.loopCuts : 0;

  if (object.kind === "box" || object.kind === "plane") {
    const segments = 1 + loopCuts;
    return { faces: segments * segments * 12, vertices: (segments + 1) * (segments + 1) * 6 };
  }

  if (object.kind === "sphere") {
    const radialSegments = resolveMeshLoopSegments(object, geometry.radialSegments);
    const heightSegments = resolveMeshLoopSegments(object, geometry.heightSegments);
    return { faces: radialSegments * heightSegments * 2, vertices: (radialSegments + 1) * (heightSegments + 1) };
  }

  if (object.kind === "cylinder" || object.kind === "cone") {
    const radialSegments = resolveMeshLoopSegments(object, geometry.radialSegments);
    const heightSegments = resolveMeshLoopSegments(object, geometry.heightSegments);
    return { faces: radialSegments * Math.max(1, heightSegments) * 2 + radialSegments * 2, vertices: (radialSegments + 1) * (heightSegments + 1) };
  }

  if (object.kind === "torus") {
    const radialSegments = resolveMeshLoopSegments(object, geometry.radialSegments);
    const tubularSegments = resolveMeshLoopSegments(object, geometry.tubularSegments);
    return { faces: radialSegments * tubularSegments * 2, vertices: (radialSegments + 1) * (tubularSegments + 1) };
  }

  const shapeSegments = object.kind === "star" ? Math.max(3, geometry.radialSegments) * 2 : Math.max(3, geometry.radialSegments);
  const depthSegments = Math.max(1, 1 + loopCuts);

  return {
    faces: shapeSegments * depthSegments * (geometry.extrudeDepth > 0 || settings.extrude > 0 ? 4 : 2),
    vertices: shapeSegments * (depthSegments + 1),
  };
}
