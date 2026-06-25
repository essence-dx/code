import * as THREE from "three";
import type { PathSettings, Vec3 } from "../types";

function toVector(point: Vec3) {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function createLinearCurve(points: Vec3[], closed: boolean) {
  const curve = new THREE.CurvePath<THREE.Vector3>();
  const vectors = points.map(toVector);

  for (let index = 0; index < vectors.length - 1; index += 1) {
    curve.add(new THREE.LineCurve3(vectors[index], vectors[index + 1]));
  }

  if (closed && vectors.length > 2) {
    curve.add(new THREE.LineCurve3(vectors.at(-1)!, vectors[0]));
  }

  return curve;
}

function createBezierCurve(points: Vec3[], closed: boolean) {
  if (points.length < 4) {
    return createLinearCurve(points, closed);
  }

  const curve = new THREE.CurvePath<THREE.Vector3>();
  const vectors = points.map(toVector);
  let index = 0;

  while (index + 3 < vectors.length) {
    curve.add(new THREE.CubicBezierCurve3(vectors[index], vectors[index + 1], vectors[index + 2], vectors[index + 3]));
    index += 3;
  }

  while (index + 1 < vectors.length) {
    curve.add(new THREE.LineCurve3(vectors[index], vectors[index + 1]));
    index += 1;
  }

  if (closed && vectors.length > 2) {
    curve.add(new THREE.LineCurve3(vectors.at(-1)!, vectors[0]));
  }

  return curve;
}

export function createPathCurve(path?: PathSettings | null) {
  const points = path?.points.length ? path.points : ([
    [-1, 0, 0],
    [1, 0, 0],
  ] satisfies Vec3[]);
  const closed = path?.closed ?? false;

  if (path?.curveKind === "linear") {
    return createLinearCurve(points, closed);
  }

  if (path?.curveKind === "bezier") {
    return createBezierCurve(points, closed);
  }

  return new THREE.CatmullRomCurve3(points.map(toVector), closed, "catmullrom", 0.5);
}
