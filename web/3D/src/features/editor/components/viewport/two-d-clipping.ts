import * as THREE from "three";
import { resolveTwoDLayerSettings } from "../../scene/two-d";
import type { SceneObject, Vec3 } from "../../types";

const worldUnitsPerPixel = 1 / 160;

export const emptyClippingPlanes: THREE.Plane[] = [];
export const worldOrigin: Vec3 = [0, 0, 0];

export function addWorldPosition(parent: Vec3, local: Vec3): Vec3 {
  return [parent[0] + local[0], parent[1] + local[1], parent[2] + local[2]];
}

export function createTwoDClipPlanes(object: SceneObject, worldPosition: Vec3) {
  const settings = resolveTwoDLayerSettings(object);

  if (!settings?.clipsContent) {
    return emptyClippingPlanes;
  }

  const halfWidth = (settings.width * worldUnitsPerPixel) / 2;
  const halfHeight = (settings.height * worldUnitsPerPixel) / 2;
  const minX = worldPosition[0] - halfWidth;
  const maxX = worldPosition[0] + halfWidth;
  const minY = worldPosition[1] - halfHeight;
  const maxY = worldPosition[1] + halfHeight;

  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -minX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), maxX),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -minY),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), maxY),
  ];
}
