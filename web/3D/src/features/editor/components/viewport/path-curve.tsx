"use client";

import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import { createPathCurve } from "../../scene/path-curves";
import type { SceneObject } from "../../types";
import { SceneMaterial } from "./scene-material";
import type * as THREE from "three";

export function PathCurve({ clippingPlanes = [], object, selected = false }: { clippingPlanes?: THREE.Plane[]; object: SceneObject; selected?: boolean }) {
  const path = object.path;
  const curve = useMemo(() => createPathCurve(path), [path]);

  return (
    <group>
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[curve, path?.tubularSegments ?? 96, path?.tubeRadius ?? 0.035, path?.radialSegments ?? 8, path?.closed ?? false]} />
        <SceneMaterial clippingPlanes={clippingPlanes} material={object.material} />
        {selected ? <Edges color="#ffffff" scale={1.01} threshold={15} /> : null}
      </mesh>
      {selected
        ? (path?.points ?? []).map((point, index) => (
            <mesh key={index} position={point}>
              <sphereGeometry args={[0.07, 14, 10]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          ))
        : null}
    </group>
  );
}
