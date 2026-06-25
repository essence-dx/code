"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { type RuntimeAnimationOverrides } from "../../interactions/animation-actions";
import { resolveGeometry } from "../../scene/primitive-geometry";
import { canUseTwoDShapeFillSource, resolveTwoDLayerSettings, twoDPixelsToWorldUnits } from "../../scene/two-d";
import type { AnimationTrack, SceneObject } from "../../types";
import { PrimitiveGeometry } from "./primitive-geometry";
import { SceneMaterial } from "./scene-material";

function sourceFootprint(source: SceneObject) {
  const geometry = resolveGeometry(source);

  if (source.kind === "sphere") {
    return { height: geometry.radius * 2, width: geometry.radius * 2 };
  }

  if (source.kind === "cylinder" || source.kind === "cone") {
    return { height: geometry.height, width: Math.max(geometry.radius, geometry.radiusTop, geometry.radiusBottom) * 2 };
  }

  if (source.kind === "torus") {
    const diameter = (geometry.radius + geometry.tubeRadius) * 2;
    return { height: diameter, width: diameter };
  }

  if (source.kind === "star") {
    return { height: geometry.radius * 2, width: geometry.radius * 2 };
  }

  return {
    height: Math.max(geometry.height, geometry.radius * 2),
    width: Math.max(geometry.width, geometry.radius * 2),
  };
}

function resolveFillScale(layerWidth: number, layerHeight: number, sourceWidth: number, sourceHeight: number, fit: "contain" | "cover" | "native") {
  if (fit === "native") {
    return 1;
  }

  const xScale = sourceWidth > 0 ? layerWidth / sourceWidth : 1;
  const yScale = sourceHeight > 0 ? layerHeight / sourceHeight : 1;

  return fit === "cover" ? Math.max(xScale, yScale) : Math.min(xScale, yScale);
}

export function TwoDShapeFill({
  animationEnabled = false,
  animationTracks = [],
  clippingPlanes = [],
  object,
  objects,
  runtimeAnimationOverrides = {},
}: {
  animationEnabled?: boolean;
  animationTracks?: AnimationTrack[];
  clippingPlanes?: THREE.Plane[];
  object: SceneObject;
  objects: SceneObject[];
  runtimeAnimationOverrides?: RuntimeAnimationOverrides;
}) {
  const settings = resolveTwoDLayerSettings(object);
  const source = settings?.shapeFillObjectId ? objects.find((entry) => entry.id === settings.shapeFillObjectId) : undefined;
  const sourceTracks = useMemo(() => (source ? animationTracks.filter((track) => track.objectId === source.id) : []), [animationTracks, source]);

  if (!settings?.shapeFillEnabled || !source || !canUseTwoDShapeFillSource(source)) {
    return null;
  }

  const layerWidth = twoDPixelsToWorldUnits(settings.width);
  const layerHeight = twoDPixelsToWorldUnits(settings.height);
  const footprint = sourceFootprint(source);
  const sourceWidth = footprint.width * Math.abs(source.transform.scale[0]);
  const sourceHeight = footprint.height * Math.abs(source.transform.scale[1]);
  const fitScale = resolveFillScale(layerWidth, layerHeight, sourceWidth, sourceHeight, settings.shapeFillFit) * settings.shapeFillScale;
  const scale: [number, number, number] = [source.transform.scale[0] * fitScale, source.transform.scale[1] * fitScale, source.transform.scale[2] * fitScale];
  const position: [number, number, number] = [
    twoDPixelsToWorldUnits(settings.shapeFillOffsetX),
    -twoDPixelsToWorldUnits(settings.shapeFillOffsetY),
    0.018 + twoDPixelsToWorldUnits(settings.shapeFillDepth),
  ];

  return (
    <group position={position} rotation={source.transform.rotation} scale={scale}>
      <mesh castShadow receiveShadow>
        <PrimitiveGeometry object={source} objects={objects} />
        <SceneMaterial
          animationEnabled={animationEnabled}
          animationTracks={sourceTracks}
          clippingPlanes={clippingPlanes}
          material={source.material}
          runtimeAnimation={runtimeAnimationOverrides[source.id]}
        />
      </mesh>
    </group>
  );
}
