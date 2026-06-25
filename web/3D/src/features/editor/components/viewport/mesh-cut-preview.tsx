"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { resolveMeshEditSettings } from "../../scene/mesh-editing";
import { createPrimitiveBufferGeometry } from "../../scene/three-primitive-geometry";
import type { MeshCutAxis, SceneObject } from "../../types";

function getPlaneTransform(axis: MeshCutAxis, position: number) {
  if (axis === "x") {
    return { position: [position, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] };
  }

  if (axis === "y") {
    return { position: [0, position, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] };
  }

  return { position: [0, 0, position] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };
}

function getPlaneSize(geometry: THREE.BufferGeometry | null, axis: MeshCutAxis): [number, number] {
  if (!geometry) {
    return [2.6, 2.6];
  }

  geometry.computeBoundingBox();

  if (!geometry.boundingBox) {
    return [2.6, 2.6];
  }

  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const padding = 1.15;

  if (axis === "x") {
    return [Math.max(0.2, size.z * padding), Math.max(0.2, size.y * padding)];
  }

  if (axis === "y") {
    return [Math.max(0.2, size.x * padding), Math.max(0.2, size.z * padding)];
  }

  return [Math.max(0.2, size.x * padding), Math.max(0.2, size.y * padding)];
}

export function MeshCutPreview({ object, objects }: { object: SceneObject; objects: SceneObject[] }) {
  const settings = resolveMeshEditSettings(object);
  const geometry = useMemo(() => (settings.enabled && settings.operation === "loopCut" ? createPrimitiveBufferGeometry(object, objects) : null), [object, objects, settings.enabled, settings.operation]);
  const planeSize = useMemo(() => getPlaneSize(geometry, settings.cutAxis), [geometry, settings.cutAxis]);
  const transform = useMemo(() => getPlaneTransform(settings.cutAxis, settings.cutPosition), [settings.cutAxis, settings.cutPosition]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!settings.enabled || settings.operation !== "loopCut") {
    return null;
  }

  return (
    <group position={transform.position} rotation={transform.rotation}>
      <mesh>
        <planeGeometry args={planeSize} />
        <meshBasicMaterial color="#22d3ee" depthWrite={false} opacity={0.16} side={THREE.DoubleSide} transparent toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={planeSize} />
        <meshBasicMaterial color="#22d3ee" depthWrite={false} opacity={0.72} side={THREE.DoubleSide} toneMapped={false} wireframe />
      </mesh>
    </group>
  );
}
