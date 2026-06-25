"use client";

import { resolveSculptSettings } from "../../scene/sculpting";
import type { SceneObject } from "../../types";

export function SculptBrushPreview({ object }: { object: SceneObject }) {
  const sculpt = resolveSculptSettings(object);

  if (!sculpt.enabled || !sculpt.showBrush) {
    return null;
  }

  return (
    <group>
      <mesh position={sculpt.center}>
        <sphereGeometry args={[sculpt.radius, 32, 16]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.12} transparent wireframe toneMapped={false} />
      </mesh>
      {sculpt.symmetryX ? (
        <mesh position={[-sculpt.center[0], sculpt.center[1], sculpt.center[2]]}>
          <sphereGeometry args={[sculpt.radius, 32, 16]} />
          <meshBasicMaterial color="#a78bfa" opacity={0.1} transparent wireframe toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}
