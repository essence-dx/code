import * as THREE from "three";
import type { PrimitiveKind, SceneObject, SculptSettings, Vec3 } from "../types";
import { isParametricPrimitiveKind } from "./primitive-geometry";

export const defaultSculptSettings: SculptSettings = {
  brushMode: "inflate",
  center: [0, 0, 0],
  enabled: false,
  falloff: 1.6,
  grabOffset: [0, 0.18, 0],
  radius: 0.8,
  showBrush: true,
  strength: 0.18,
  symmetryX: false,
};

export function canHaveSculpting(kind: PrimitiveKind) {
  return isParametricPrimitiveKind(kind);
}

export function resolveSculptSettings(object: Pick<SceneObject, "sculpt">): SculptSettings {
  return {
    ...defaultSculptSettings,
    ...object.sculpt,
  };
}

export function hasActiveSculpting(object: Pick<SceneObject, "sculpt">) {
  const settings = resolveSculptSettings(object);

  return settings.enabled && Math.abs(settings.strength) > 0;
}

function toVector3(value: Vec3) {
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function brushWeight(position: THREE.Vector3, center: THREE.Vector3, radius: number, falloff: number) {
  const distance = position.distanceTo(center);

  if (distance > radius) {
    return 0;
  }

  return Math.pow(smoothstep(1 - distance / radius), falloff);
}

function mirroredCenter(center: THREE.Vector3) {
  return new THREE.Vector3(-center.x, center.y, center.z);
}

function collectAffectedCentroid(positions: THREE.BufferAttribute, settings: SculptSettings, centers: THREE.Vector3[]) {
  const centroid = new THREE.Vector3();
  const position = new THREE.Vector3();
  let totalWeight = 0;

  for (let index = 0; index < positions.count; index += 1) {
    position.fromBufferAttribute(positions, index);
    const weight = Math.max(...centers.map((center) => brushWeight(position, center, settings.radius, settings.falloff)));

    if (weight <= 0) {
      continue;
    }

    centroid.addScaledVector(position, weight);
    totalWeight += weight;
  }

  return totalWeight > 0 ? centroid.divideScalar(totalWeight) : centers[0].clone();
}

function applyBrushToVertex(position: THREE.Vector3, normal: THREE.Vector3, settings: SculptSettings, centers: THREE.Vector3[], smoothCentroid: THREE.Vector3) {
  const weight = Math.max(...centers.map((center) => brushWeight(position, center, settings.radius, settings.falloff)));

  if (weight <= 0) {
    return;
  }

  const amount = settings.strength * weight;

  if (settings.brushMode === "inflate") {
    position.addScaledVector(normal, amount);
    return;
  }

  if (settings.brushMode === "flatten") {
    const center = centers.reduce((closest, candidate) => (position.distanceTo(candidate) < position.distanceTo(closest) ? candidate : closest), centers[0]);
    const planeNormal = center.lengthSq() > 0.0001 ? center.clone().normalize() : normal.clone().normalize();
    const distanceToPlane = position.clone().sub(center).dot(planeNormal);
    position.addScaledVector(planeNormal, -distanceToPlane * Math.abs(amount));
    return;
  }

  if (settings.brushMode === "grab") {
    position.addScaledVector(toVector3(settings.grabOffset), weight * Math.abs(settings.strength));
    return;
  }

  position.lerp(smoothCentroid, Math.min(1, Math.abs(amount) * 0.35));
}

export function applySculptModifiers(geometry: THREE.BufferGeometry, object: SceneObject) {
  const settings = resolveSculptSettings(object);

  if (!settings.enabled || Math.abs(settings.strength) <= 0) {
    geometry.computeVertexNormals();
    return geometry;
  }

  geometry.computeVertexNormals();

  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");

  if (!positions || !normals) {
    return geometry;
  }

  const center = toVector3(settings.center);
  const centers = settings.symmetryX ? [center, mirroredCenter(center)] : [center];
  const smoothCentroid = collectAffectedCentroid(positions as THREE.BufferAttribute, settings, centers);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    position.fromBufferAttribute(positions, index);
    normal.fromBufferAttribute(normals, index).normalize();

    applyBrushToVertex(position, normal, settings, centers, smoothCentroid);
    positions.setXYZ(index, position.x, position.y, position.z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
