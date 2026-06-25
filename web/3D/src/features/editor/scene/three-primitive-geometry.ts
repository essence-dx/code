import * as THREE from "three";
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION, type CSGOperation } from "three-bvh-csg";
import type { BooleanOperationKind, SceneObject, Transform } from "../types";
import { resolveBooleanOperations } from "./boolean-operations";
import { applyMeshEditModifiers, getMeshBevelOptions, resolveMeshEditExtrudeDepth, resolveMeshLoopSegments } from "./mesh-editing";
import { createPathCurve } from "./path-curves";
import { isTwoDimensionalShapeKind, resolveGeometry, type ResolvedGeometrySettings } from "./primitive-geometry";
import { applySculptModifiers } from "./sculpting";
import { createBlendedShapePoints, resolveShapeBlendTarget, type ShapeBlendPoint } from "./shape-blending";

export function createShapeFromPoints(points: ShapeBlendPoint[]) {
  const shape = new THREE.Shape();
  const [firstPoint, ...remainingPoints] = points;

  if (!firstPoint) {
    return null;
  }

  shape.moveTo(firstPoint[0], firstPoint[1]);

  for (const point of remainingPoints) {
    shape.lineTo(point[0], point[1]);
  }

  shape.closePath();
  return shape;
}

function createTwoDimensionalShape(object: SceneObject, geometry: ResolvedGeometrySettings, objects: SceneObject[]) {
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
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.closePath();
    return shape;
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

function composeTransformMatrix(transform: Transform) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3(...transform.position);
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...transform.rotation));
  const scale = new THREE.Vector3(...transform.scale);

  return matrix.compose(position, rotation, scale);
}

function createObjectMap(objects: SceneObject[]) {
  return new Map(objects.map((object) => [object.id, object]));
}

function resolveWorldMatrix(object: SceneObject, objectsById: Map<string, SceneObject>, seen = new Set<string>()): THREE.Matrix4 {
  if (!object.parentId || seen.has(object.id)) {
    return composeTransformMatrix(object.transform);
  }

  const parent = objectsById.get(object.parentId);

  if (!parent) {
    return composeTransformMatrix(object.transform);
  }

  seen.add(object.id);
  return resolveWorldMatrix(parent, objectsById, seen).multiply(composeTransformMatrix(object.transform));
}

function resolveCsgOperation(kind: BooleanOperationKind): CSGOperation {
  if (kind === "union") {
    return ADDITION;
  }

  if (kind === "intersect") {
    return INTERSECTION;
  }

  return SUBTRACTION;
}

export function createPrimitiveBufferGeometry(object: SceneObject, objects: SceneObject[] = []) {
  const geometry = resolveGeometry(object);
  let bufferGeometry: THREE.BufferGeometry | null = null;

  switch (object.kind) {
    case "box":
      bufferGeometry = new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth, resolveMeshLoopSegments(object, 1), resolveMeshLoopSegments(object, 1), resolveMeshLoopSegments(object, 1));
      break;
    case "sphere":
      bufferGeometry = new THREE.SphereGeometry(geometry.radius, resolveMeshLoopSegments(object, geometry.radialSegments), resolveMeshLoopSegments(object, geometry.heightSegments));
      break;
    case "cylinder":
      bufferGeometry = new THREE.CylinderGeometry(geometry.radiusTop, geometry.radiusBottom, geometry.height, resolveMeshLoopSegments(object, geometry.radialSegments), resolveMeshLoopSegments(object, geometry.heightSegments));
      break;
    case "cone":
      bufferGeometry = new THREE.ConeGeometry(geometry.radius, geometry.height, resolveMeshLoopSegments(object, geometry.radialSegments), resolveMeshLoopSegments(object, geometry.heightSegments));
      break;
    case "torus":
      bufferGeometry = new THREE.TorusGeometry(geometry.radius, geometry.tubeRadius, resolveMeshLoopSegments(object, geometry.radialSegments), resolveMeshLoopSegments(object, geometry.tubularSegments));
      break;
    case "plane":
      bufferGeometry = new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth, resolveMeshLoopSegments(object, 1), 1, resolveMeshLoopSegments(object, 1));
      break;
    case "rectangle":
    case "ellipse":
    case "triangle":
    case "star": {
      const shape = isTwoDimensionalShapeKind(object.kind) ? createTwoDimensionalShape(object, geometry, objects) : null;

      if (!shape) {
        return null;
      }

      const depth = resolveMeshEditExtrudeDepth(object, geometry.extrudeDepth);
      const bevel = getMeshBevelOptions(object);
      bufferGeometry = depth > 0 ? new THREE.ExtrudeGeometry(shape, { ...bevel, depth, steps: resolveMeshLoopSegments(object, 1) }) : new THREE.ShapeGeometry(shape);
      break;
    }
    default:
      return null;
  }

  return bufferGeometry ? applySculptModifiers(applyMeshEditModifiers(bufferGeometry, object), object) : null;
}

export function createPathBufferGeometry(object: SceneObject) {
  if (!object.path || object.path.points.length < 2) {
    return null;
  }

  const curve = createPathCurve(object.path);
  return new THREE.TubeGeometry(curve, object.path.tubularSegments, object.path.tubeRadius, object.path.radialSegments, object.path.closed);
}

export function createEvaluatedBooleanGeometry(object: SceneObject, objects: SceneObject[]) {
  const operations = resolveBooleanOperations(object);

  if (operations.length === 0) {
    return null;
  }

  const baseGeometry = createPrimitiveBufferGeometry(object, objects);

  if (!baseGeometry) {
    return null;
  }

  const objectsById = createObjectMap(objects);
  const hostWorld = resolveWorldMatrix(object, objectsById);
  const inverseHostWorld = hostWorld.clone().invert();
  const evaluator = new Evaluator();
  let current = new Brush(baseGeometry);

  evaluator.useGroups = false;

  for (const operation of operations) {
    const targetObject = objectsById.get(operation.targetObjectId ?? "");
    const targetGeometry = targetObject ? createPrimitiveBufferGeometry(targetObject, objects) : null;

    if (!targetObject || !targetGeometry) {
      continue;
    }

    const relativeMatrix = inverseHostWorld.clone().multiply(resolveWorldMatrix(targetObject, objectsById));
    targetGeometry.applyMatrix4(relativeMatrix);

    const targetBrush = new Brush(targetGeometry);
    current = evaluator.evaluate(current, targetBrush, resolveCsgOperation(operation.operation));
  }

  const result = current.geometry.clone();
  result.computeVertexNormals();
  return result;
}
