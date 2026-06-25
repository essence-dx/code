"use client";

import * as THREE from "three";
import { resolveTwoDLayerSettings, twoDPixelsToWorldUnits } from "../../scene/two-d";
import type { SceneObject } from "../../types";
import { PrimitiveGeometry } from "./primitive-geometry";

export function TwoDLayerShadow({ clippingPlanes = [], object }: { clippingPlanes?: THREE.Plane[]; object: SceneObject }) {
  const settings = resolveTwoDLayerSettings(object);

  if (!settings?.shadowEnabled || settings.shadowOpacity <= 0) {
    return null;
  }

  const widthWorld = twoDPixelsToWorldUnits(settings.width);
  const heightWorld = twoDPixelsToWorldUnits(settings.height);
  const blurWorld = twoDPixelsToWorldUnits(settings.shadowBlur);
  const scaleX = widthWorld > 0 ? 1 + blurWorld / widthWorld : 1;
  const scaleY = heightWorld > 0 ? 1 + blurWorld / heightWorld : 1;

  return (
    <mesh position={[twoDPixelsToWorldUnits(settings.shadowOffsetX), -twoDPixelsToWorldUnits(settings.shadowOffsetY), -0.012]} scale={[scaleX, scaleY, 1]}>
      <PrimitiveGeometry object={object} />
      <meshBasicMaterial
        clippingPlanes={clippingPlanes.length ? clippingPlanes : undefined}
        color={settings.shadowColor}
        depthWrite={false}
        opacity={settings.shadowOpacity}
        side={THREE.DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
