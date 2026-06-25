"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { hasActiveMeshEdit } from "../../scene/mesh-editing";
import { hasActiveSculpting } from "../../scene/sculpting";
import { createEvaluatedBooleanGeometry, createPrimitiveBufferGeometry, createShapeFromPoints } from "../../scene/three-primitive-geometry";
import { resolveTwoDLayerSettings, twoDPixelsToWorldUnits } from "../../scene/two-d";
import { isTwoDimensionalShapeKind, resolveGeometry, type ResolvedGeometrySettings } from "../../scene/primitive-geometry";
import { createBlendedShapePoints, resolveShapeBlendTarget } from "../../scene/shape-blending";
import type { SceneObject } from "../../types";

function createRoundedRectangleShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const safeRadius = Math.min(radius, halfWidth, halfHeight);

  if (safeRadius <= 0) {
    shape.moveTo(-halfWidth, -halfHeight);
    shape.lineTo(halfWidth, -halfHeight);
    shape.lineTo(halfWidth, halfHeight);
    shape.lineTo(-halfWidth, halfHeight);
  } else {
    shape.moveTo(-halfWidth + safeRadius, -halfHeight);
    shape.lineTo(halfWidth - safeRadius, -halfHeight);
    shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + safeRadius);
    shape.lineTo(halfWidth, halfHeight - safeRadius);
    shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - safeRadius, halfHeight);
    shape.lineTo(-halfWidth + safeRadius, halfHeight);
    shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - safeRadius);
    shape.lineTo(-halfWidth, -halfHeight + safeRadius);
    shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + safeRadius, -halfHeight);
  }

  shape.closePath();
  return shape;
}

function createTwoDimensionalShape(object: SceneObject, geometry: ResolvedGeometrySettings, borderRadius: number, objects: SceneObject[]) {
  const shapeBlendTarget = resolveShapeBlendTarget(object, objects);

  if (shapeBlendTarget) {
    const points = createBlendedShapePoints(object, shapeBlendTarget);

    if (points) {
      return createShapeFromPoints(points);
    }
  }

  const shape = new THREE.Shape();
  const width = geometry.width;
  const height = geometry.height;

  if (object.kind === "rectangle") {
    return createRoundedRectangleShape(width, height, twoDPixelsToWorldUnits(borderRadius));
  }

  if (object.kind === "ellipse") {
    shape.absellipse(0, 0, width / 2, height / 2, 0, Math.PI * 2, false, 0);
    return shape;
  }

  if (object.kind === "triangle") {
    shape.moveTo(0, height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(-width / 2, -height / 2);
    shape.closePath();
    return shape;
  }

  if (object.kind === "star") {
    const points = Math.max(3, Math.round(geometry.radialSegments));
    const outerRadius = geometry.radius;
    const innerRadius = Math.min(outerRadius - 0.01, Math.max(0.01, geometry.tubeRadius));

    for (let index = 0; index < points * 2; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (index * Math.PI) / points;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (index === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    shape.closePath();
    return shape;
  }

  return null;
}

export function PrimitiveGeometry({ object, objects = [] }: { object: SceneObject; objects?: SceneObject[] }) {
  const geometry = resolveGeometry(object);
  const booleanGeometry = useMemo(() => createEvaluatedBooleanGeometry(object, objects), [object, objects]);
  const modifiedGeometry = useMemo(() => (hasActiveMeshEdit(object) || hasActiveSculpting(object) ? createPrimitiveBufferGeometry(object, objects) : null), [object, objects]);
  const twoDBorderRadius = resolveTwoDLayerSettings(object)?.borderRadius ?? 0;
  const twoDimensionalShape = useMemo(
    () => createTwoDimensionalShape(object, geometry, twoDBorderRadius, objects),
    [geometry.height, geometry.radius, geometry.radialSegments, geometry.tubeRadius, geometry.width, object, objects, twoDBorderRadius],
  );

  useEffect(() => {
    return () => {
      booleanGeometry?.dispose();
    };
  }, [booleanGeometry]);

  useEffect(() => {
    return () => {
      modifiedGeometry?.dispose();
    };
  }, [modifiedGeometry]);

  if (booleanGeometry) {
    return <primitive attach="geometry" object={booleanGeometry} />;
  }

  if (modifiedGeometry) {
    return <primitive attach="geometry" object={modifiedGeometry} />;
  }

  switch (object.kind) {
    case "sphere":
      return <sphereGeometry args={[geometry.radius, geometry.radialSegments, geometry.heightSegments]} />;
    case "cylinder":
      return <cylinderGeometry args={[geometry.radiusTop, geometry.radiusBottom, geometry.height, geometry.radialSegments, geometry.heightSegments]} />;
    case "cone":
      return <coneGeometry args={[geometry.radius, geometry.height, geometry.radialSegments, geometry.heightSegments]} />;
    case "torus":
      return <torusGeometry args={[geometry.radius, geometry.tubeRadius, geometry.radialSegments, geometry.tubularSegments]} />;
    case "plane":
      return <boxGeometry args={[geometry.width, geometry.height, geometry.depth]} />;
    case "rectangle":
    case "ellipse":
    case "triangle":
    case "star":
      return isTwoDimensionalShapeKind(object.kind) && twoDimensionalShape ? (
        geometry.extrudeDepth > 0 ? (
          <extrudeGeometry args={[twoDimensionalShape, { bevelEnabled: false, depth: geometry.extrudeDepth, steps: 1 }]} />
        ) : (
          <shapeGeometry args={[twoDimensionalShape]} />
        )
      ) : null;
    case "box":
      return <boxGeometry args={[geometry.width, geometry.height, geometry.depth]} />;
    default:
      return null;
  }
}
