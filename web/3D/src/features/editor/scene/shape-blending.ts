import type { SceneObject } from "../types";
import { isTwoDimensionalShapeKind, resolveGeometry, type ResolvedGeometrySettings, type TwoDimensionalShapeKind } from "./primitive-geometry";

export type ShapeBlendPoint = [number, number];

const defaultBlendPointCount = 72;

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function distance(left: ShapeBlendPoint, right: ShapeBlendPoint) {
  return Math.hypot(right[0] - left[0], right[1] - left[1]);
}

function interpolatePoint(left: ShapeBlendPoint, right: ShapeBlendPoint, amount: number): ShapeBlendPoint {
  return [left[0] + (right[0] - left[0]) * amount, left[1] + (right[1] - left[1]) * amount];
}

function createEllipsePoints(geometry: ResolvedGeometrySettings, count: number): ShapeBlendPoint[] {
  const width = geometry.width;
  const height = geometry.height;

  return Array.from({ length: count }, (_entry, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;

    return [Math.cos(angle) * (width / 2), Math.sin(angle) * (height / 2)];
  });
}

function createStarVertices(geometry: ResolvedGeometrySettings): ShapeBlendPoint[] {
  const points = Math.max(3, Math.round(geometry.radialSegments));
  const outerRadius = geometry.radius;
  const innerRadius = Math.min(outerRadius - 0.01, Math.max(0.01, geometry.tubeRadius));

  return Array.from({ length: points * 2 }, (_entry, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;

    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
}

function createBaseVertices(kind: TwoDimensionalShapeKind, geometry: ResolvedGeometrySettings): ShapeBlendPoint[] {
  const width = geometry.width;
  const height = geometry.height;

  if (kind === "rectangle") {
    return [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ];
  }

  if (kind === "triangle") {
    return [
      [0, height / 2],
      [width / 2, -height / 2],
      [-width / 2, -height / 2],
    ];
  }

  if (kind === "star") {
    return createStarVertices(geometry);
  }

  return createEllipsePoints(geometry, defaultBlendPointCount);
}

function resampleClosedPolyline(vertices: ShapeBlendPoint[], count: number) {
  if (vertices.length === count) {
    return vertices;
  }

  const segments = vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length];

    return { from: point, length: distance(point, next), to: next };
  });
  const perimeter = segments.reduce((sum, segment) => sum + segment.length, 0);

  if (perimeter <= 0) {
    return Array.from({ length: count }, () => vertices[0] ?? [0, 0]);
  }

  return Array.from({ length: count }, (_entry, index) => {
    const targetDistance = (index / count) * perimeter;
    let cursor = 0;

    for (const segment of segments) {
      if (targetDistance <= cursor + segment.length || segment === segments.at(-1)) {
        const progress = segment.length > 0 ? (targetDistance - cursor) / segment.length : 0;

        return interpolatePoint(segment.from, segment.to, clampUnit(progress));
      }

      cursor += segment.length;
    }

    return vertices[0] ?? [0, 0];
  });
}

export function canShapeBlendObject(object?: Pick<SceneObject, "kind"> | null): object is Pick<SceneObject, "kind"> & { kind: TwoDimensionalShapeKind } {
  return Boolean(object && isTwoDimensionalShapeKind(object.kind));
}

export function createShapeBlendPoints(object: Pick<SceneObject, "geometry" | "kind">, count = defaultBlendPointCount) {
  if (!canShapeBlendObject(object)) {
    return null;
  }

  const geometry = resolveGeometry(object);
  const vertices = createBaseVertices(object.kind, geometry);

  return resampleClosedPolyline(vertices, count);
}

export function resolveShapeBlendTarget(object: SceneObject, objects: SceneObject[]) {
  const blend = object.shapeBlend;

  if (!blend?.targetObjectId || clampUnit(blend.amount) <= 0 || !canShapeBlendObject(object)) {
    return null;
  }

  const target = objects.find((entry) => entry.id === blend.targetObjectId);

  return target && target.id !== object.id && canShapeBlendObject(target) ? target : null;
}

export function createBlendedShapePoints(object: SceneObject, target: SceneObject) {
  const amount = clampUnit(object.shapeBlend?.amount ?? 0);
  const sourcePoints = createShapeBlendPoints(object, defaultBlendPointCount);
  const targetPoints = createShapeBlendPoints(target, defaultBlendPointCount);

  if (!sourcePoints || !targetPoints) {
    return null;
  }

  return sourcePoints.map((point, index) => interpolatePoint(point, targetPoints[index] ?? point, amount));
}
