"use client";

import { Environment } from "@react-three/drei";
import type { SceneSettings } from "../../types";

export function SceneEnvironment({ settings, transparentBackground = false }: { settings: SceneSettings; transparentBackground?: boolean }) {
  const fogNear = Math.min(settings.fogNear, settings.fogFar - 0.1);
  const fogFar = Math.max(settings.fogFar, fogNear + 0.1);

  return (
    <>
      {transparentBackground ? null : <color attach="background" args={[settings.backgroundColor]} />}
      {settings.fogEnabled ? <fog attach="fog" args={[settings.fogColor, fogNear, fogFar]} /> : null}
      <ambientLight color={settings.ambientColor} intensity={settings.ambientIntensity} />
      <Environment preset="city" />
    </>
  );
}
