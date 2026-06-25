"use client";

import { useEffect, useMemo } from "react";
import { resolveMeshEditSettings, resolveMeshSelectionPreview } from "../../scene/mesh-editing";
import { createPrimitiveBufferGeometry } from "../../scene/three-primitive-geometry";
import type { SceneObject } from "../../types";

export function MeshSelectionPreview({ object, objects }: { object: SceneObject; objects: SceneObject[] }) {
  const settings = resolveMeshEditSettings(object);
  const geometry = useMemo(() => (settings.enabled && settings.selectionMode !== "object" ? createPrimitiveBufferGeometry(object, objects) : null), [object, objects, settings.enabled, settings.selectionMode]);
  const preview = useMemo(() => (geometry ? resolveMeshSelectionPreview(geometry, settings) : null), [geometry, settings]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!preview) {
    return null;
  }

  const size = settings.selectionMode === "vertex" ? 0.065 : settings.selectionMode === "edge" ? 0.085 : 0.11;

  return (
    <group>
      <mesh position={preview.center}>
        <sphereGeometry args={[size, 16, 8]} />
        <meshBasicMaterial color="#fbbf24" opacity={0.85} transparent toneMapped={false} />
      </mesh>
      {preview.targetCenter ? (
        <mesh position={preview.targetCenter}>
          <sphereGeometry args={[size, 16, 8]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.8} transparent toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}
