"use client";

import * as THREE from "three";
import { resolveMaterial } from "../../materials/resolve-material";
import type { Material, SceneObject } from "../../types";
import { PrimitiveGeometry } from "./primitive-geometry";

export function MaterialOutline({ clippingPlanes = [], material, object }: { clippingPlanes?: THREE.Plane[]; material: Material; object: SceneObject }) {
  const outline = resolveMaterial(material).outline;

  if (!outline) {
    return null;
  }

  const scale = 1 + outline.width;

  return (
    <mesh renderOrder={-1} scale={[scale, scale, scale]}>
      <PrimitiveGeometry object={object} />
      <meshBasicMaterial
        clippingPlanes={clippingPlanes.length ? clippingPlanes : undefined}
        color={outline.color}
        depthWrite={false}
        opacity={outline.opacity}
        side={THREE.BackSide}
        toneMapped={false}
        transparent={outline.opacity < 1}
      />
    </mesh>
  );
}
