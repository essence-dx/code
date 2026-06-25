import type { GeometrySettings, PrimitiveKind, SceneObject } from "../types";

export const twoDimensionalShapeKinds = ["rectangle", "ellipse", "triangle", "star"] as const;
export const parametricPrimitiveKinds = ["box", "sphere", "cylinder", "cone", "torus", "plane", ...twoDimensionalShapeKinds] as const;

export type TwoDimensionalShapeKind = (typeof twoDimensionalShapeKinds)[number];
export type ParametricPrimitiveKind = (typeof parametricPrimitiveKinds)[number];
export type ResolvedGeometrySettings = Required<GeometrySettings>;

const baseGeometrySettings: ResolvedGeometrySettings = {
  width: 1,
  height: 1,
  depth: 1,
  radius: 0.72,
  radiusTop: 0.62,
  radiusBottom: 0.62,
  tubeRadius: 0.18,
  radialSegments: 32,
  heightSegments: 24,
  tubularSegments: 64,
  extrudeDepth: 0,
};

const defaultGeometryByKind: Record<ParametricPrimitiveKind, Partial<GeometrySettings>> = {
  box: { width: 1, height: 1, depth: 1 },
  sphere: { radius: 0.72, radialSegments: 48, heightSegments: 24 },
  cylinder: { radiusTop: 0.62, radiusBottom: 0.62, height: 1.3, radialSegments: 32 },
  cone: { radius: 0.72, height: 1.35, radialSegments: 32 },
  torus: { radius: 0.58, tubeRadius: 0.18, radialSegments: 20, tubularSegments: 64 },
  plane: { width: 1, height: 0.04, depth: 1 },
  rectangle: { width: 1.8, height: 1.1, extrudeDepth: 0 },
  ellipse: { width: 1.6, height: 1.1, radialSegments: 64, extrudeDepth: 0 },
  triangle: { width: 1.45, height: 1.35, extrudeDepth: 0 },
  star: { radius: 0.82, tubeRadius: 0.36, radialSegments: 5, extrudeDepth: 0 },
};

export function isParametricPrimitiveKind(kind: PrimitiveKind): kind is ParametricPrimitiveKind {
  return parametricPrimitiveKinds.includes(kind as ParametricPrimitiveKind);
}

export function isTwoDimensionalShapeKind(kind: PrimitiveKind): kind is TwoDimensionalShapeKind {
  return twoDimensionalShapeKinds.includes(kind as TwoDimensionalShapeKind);
}

export function resolveGeometry(object: Pick<SceneObject, "kind" | "geometry">): ResolvedGeometrySettings {
  return {
    ...baseGeometrySettings,
    ...(isParametricPrimitiveKind(object.kind) ? defaultGeometryByKind[object.kind] : null),
    ...object.geometry,
  };
}
