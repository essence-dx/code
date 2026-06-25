"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edges, Text, TransformControls } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import type * as THREE from "three";
import { evaluateAnimatedTransform } from "../../animation/evaluate-animation";
import { getRuntimeNowSeconds, resolveRuntimeAnimationElapsed } from "../../interactions/animation-actions";
import { matchesDragTrigger, resolveDragTriggerCooldownMs } from "../../interactions/drag-triggers";
import { evaluateInteractionCondition } from "../../interactions/interaction-conditions";
import { useMediaActionRegistry } from "../../interactions/media-actions";
import { resolveRuntimeObjectVisible } from "../../interactions/object-visibility-actions";
import { resolveRuntimeParticleSettings } from "../../interactions/particle-actions";
import { matchesPointerTrigger, resolvePointerTriggerCooldownMs } from "../../interactions/pointer-triggers";
import { openInteractionLink } from "../../interactions/object-links";
import { createAnimationTrackMap, resolveRuntimeObjectTransform } from "../../interactions/runtime-transforms";
import { resolveRuntimePropertyObject } from "../../interactions/property-toggle-actions";
import { createClonerInstanceTransforms, getClonerInstanceDelay, hasClonerAnimationStagger } from "../../scene/cloner-settings";
import { resolveTransformConstraints } from "../../scene/object-constraints";
import { invertPivot, resolvePivot } from "../../scene/object-pivot";
import { resolveTwoDLayerSettings } from "../../scene/two-d";
import { getRuntimeNowSeconds as getTransitionNowSeconds, resolveRuntimeTransitionTransform } from "../../interactions/transition-actions";
import type { SceneObjectNode } from "../../scene/scene-tree-utils";
import { interpolateVariables } from "../../scene/scene-variables";
import { resolveVariableBoundObject } from "../../scene/variable-bindings";
import { resolveMeshEditSettings } from "../../scene/mesh-editing";
import { useEditorStore, type EditorMode } from "../../store/editor-store";
import type { AnimationTrack, DragTriggerEvent, MeshSelectionMode, PointerTriggerEvent, SceneObject, SceneVariable, Transform, Vec3 } from "../../types";
import { AudioMarker } from "./audio-marker";
import { FigmaPreviewPlane } from "./figma-preview-plane";
import { ImagePlane } from "./image-plane";
import { ImportedModel } from "./imported-model";
import { MaterialOutline } from "./material-outline";
import { MeshCutPreview } from "./mesh-cut-preview";
import { PathCurve } from "./path-curve";
import { ParticleEmitter } from "./particle-emitter";
import { PrimitiveGeometry } from "./primitive-geometry";
import { MeshSelectionPreview } from "./mesh-selection-preview";
import { SceneMaterial } from "./scene-material";
import { SculptBrushPreview } from "./sculpt-brush-preview";
import { SplinePreviewPlane } from "./spline-preview-plane";
import { SvgVector } from "./svg-vector";
import { addWorldPosition, createTwoDClipPlanes, emptyClippingPlanes, worldOrigin } from "./two-d-clipping";
import { TwoDLayerFilter } from "./two-d-layer-filter";
import { TwoDLayerShadow } from "./two-d-layer-shadow";
import { TwoDShapeFill } from "./two-d-shape-fill";
import { VideoPlane } from "./video-plane";
import { ClonerInstanceGroup } from "./cloner-instance-group";

function isLightKind(kind: string) {
  return kind === "pointLight" || kind === "directionalLight" || kind === "spotLight";
}

function toControlMode(mode: EditorMode) {
  if (mode === "move") {
    return "translate";
  }

  if (mode === "rotate" || mode === "scale") {
    return mode;
  }

  return null;
}

function readObjectTransform(object: THREE.Object3D): Transform {
  return {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: [object.scale.x, object.scale.y, object.scale.z],
  };
}

function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

const lookAtTargetPosition = new Vector3();
const followTargetPosition = new Vector3();
const followOffset = new Vector3();
const meshPickPoint = new Vector3();
const meshPickVertexA = new Vector3();
const meshPickVertexB = new Vector3();
const meshPickVertexC = new Vector3();
const meshPickSegmentPoint = new Vector3();
const meshPickSegmentDirection = new Vector3();
const meshPickPointOffset = new Vector3();
const emptyAnimationTracks: AnimationTrack[] = [];
const selectedColor = "#ffffff";
const hoverColor = "#d4d4d8";
const inactiveHelperColor = "#a1a1aa";
const emptyVariables: SceneVariable[] = [];

function distanceToSegment(point: Vector3, start: Vector3, end: Vector3) {
  const segmentLengthSquared = start.distanceToSquared(end);

  if (segmentLengthSquared <= 0.000001) {
    return point.distanceTo(start);
  }

  meshPickSegmentDirection.copy(end).sub(start);
  meshPickPointOffset.copy(point).sub(start);

  const amount = Math.max(0, Math.min(1, meshPickPointOffset.dot(meshPickSegmentDirection) / segmentLengthSquared));
  meshPickSegmentPoint.copy(start).lerp(end, amount);

  return point.distanceTo(meshPickSegmentPoint);
}

function getNearestFaceVertexIndex(point: Vector3, face: THREE.Face, positions: THREE.BufferAttribute) {
  meshPickVertexA.fromBufferAttribute(positions, face.a);
  meshPickVertexB.fromBufferAttribute(positions, face.b);
  meshPickVertexC.fromBufferAttribute(positions, face.c);

  const distances = [
    { distance: point.distanceTo(meshPickVertexA), index: face.a },
    { distance: point.distanceTo(meshPickVertexB), index: face.b },
    { distance: point.distanceTo(meshPickVertexC), index: face.c },
  ];

  return distances.sort((left, right) => left.distance - right.distance)[0]?.index ?? face.a;
}

function getNearestFaceEdgeIndex(point: Vector3, face: THREE.Face, positions: THREE.BufferAttribute) {
  meshPickVertexA.fromBufferAttribute(positions, face.a);
  meshPickVertexB.fromBufferAttribute(positions, face.b);
  meshPickVertexC.fromBufferAttribute(positions, face.c);

  const distances = [
    { distance: distanceToSegment(point, meshPickVertexA, meshPickVertexB), index: face.a },
    { distance: distanceToSegment(point, meshPickVertexB, meshPickVertexC), index: face.b },
    { distance: distanceToSegment(point, meshPickVertexC, meshPickVertexA), index: face.c },
  ];

  return distances.sort((left, right) => left.distance - right.distance)[0]?.index ?? face.a;
}

function getViewportMeshSelectionIndex(event: ThreeEvent<MouseEvent>, mode: MeshSelectionMode) {
  if (mode === "object" || !event.face) {
    return null;
  }

  if (mode === "face") {
    return event.faceIndex ?? null;
  }

  const mesh = event.object as THREE.Mesh<THREE.BufferGeometry>;
  const positions = mesh.geometry?.getAttribute("position");

  if (!positions) {
    return null;
  }

  meshPickPoint.copy(event.point);
  mesh.worldToLocal(meshPickPoint);

  const positionAttribute = positions as THREE.BufferAttribute;

  if (mode === "edge") {
    return getNearestFaceEdgeIndex(meshPickPoint, event.face, positionAttribute);
  }

  return getNearestFaceVertexIndex(meshPickPoint, event.face, positionAttribute);
}

export function EditableObject({
  clippingPlanes = emptyClippingPlanes,
  node,
  runtimeObjects,
  worldPosition = worldOrigin,
}: {
  clippingPlanes?: THREE.Plane[];
  node: SceneObjectNode;
  runtimeObjects: SceneObject[];
  worldPosition?: Vec3;
}) {
  const { object, children } = node;
  const objectRef = useRef<THREE.Group>(null);
  const playStartedAt = useRef<number | null>(null);
  const wasAnimating = useRef(false);
  const wasRuntimeTransforming = useRef(false);
  const [sceneObject, setSceneObject] = useState<THREE.Group | null>(null);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const mode = useEditorStore((state) => state.mode);
  const cameraPreviewEnabled = useEditorStore((state) => state.cameraPreviewEnabled);
  const playModeEnabled = useEditorStore((state) => state.playModeEnabled);
  const runtimeAnimation = useEditorStore((state) => state.runtimeAnimationOverrides[object.id]);
  const runtimeAnimationOverrides = useEditorStore((state) => state.runtimeAnimationOverrides);
  const runtimeVisibilityOverrides = useEditorStore((state) => state.runtimeVisibilityOverrides);
  const runtimeParticleOverrides = useEditorStore((state) => state.runtimeParticleOverrides);
  const runtimeTransition = useEditorStore((state) => state.runtimeTransitionOverrides[object.id]);
  const runtimeTransitionOverrides = useEditorStore((state) => state.runtimeTransitionOverrides);
  const runtimePhysicsTransforms = useEditorStore((state) => state.runtimePhysicsTransforms);
  const documentAnimationTracks = useEditorStore((state) => state.document.animationTracks);
  const documentVariables = useEditorStore((state) => state.document.variables);
  const allAnimationTracks = documentAnimationTracks ?? emptyAnimationTracks;
  const animationTracks = allAnimationTracks.filter((track) => track.objectId === object.id);
  const variables = documentVariables ?? emptyVariables;
  const runtimeVisible = resolveRuntimeObjectVisible(object, runtimeVisibilityOverrides);
  const runtimeParticles = useMemo(() => resolveRuntimeParticleSettings(object, runtimeParticleOverrides), [object, runtimeParticleOverrides]);
  const runtimePropertyOverrides = useEditorStore((state) => state.runtimePropertyOverrides);
  const runtimeObject = useMemo(
    () => (playModeEnabled ? resolveRuntimePropertyObject(resolveVariableBoundObject(object, variables), runtimePropertyOverrides) : object),
    [object, playModeEnabled, runtimePropertyOverrides, variables],
  );
  const runtimeTwoDSettings = resolveTwoDLayerSettings(runtimeObject);
  const clonerInstanceTransforms = useMemo(() => createClonerInstanceTransforms(runtimeObject), [runtimeObject]);
  const clonerStaggerEnabled = playModeEnabled && hasClonerAnimationStagger(runtimeObject) && animationTracks.length > 0;
  const parentAnimationTracks = clonerStaggerEnabled ? [] : animationTracks;
  const runtimePhysicsTransform = playModeEnabled ? runtimePhysicsTransforms[object.id] : undefined;
  const runtimeTransform = runtimePhysicsTransform ?? runtimeObject.transform;
  const objectWorldPosition = useMemo(
    () => addWorldPosition(worldPosition, runtimeTransform.position),
    [runtimeTransform.position, worldPosition],
  );
  const objectClipPlanes = useMemo(() => createTwoDClipPlanes(runtimeObject, objectWorldPosition), [objectWorldPosition, runtimeObject]);
  const childClippingPlanes = useMemo(
    () => (objectClipPlanes.length ? [...clippingPlanes, ...objectClipPlanes] : clippingPlanes),
    [clippingPlanes, objectClipPlanes],
  );
  const runInteraction = useEditorStore((state) => state.runInteraction);
  const { runMediaAction } = useMediaActionRegistry();
  const selectObject = useEditorStore((state) => state.selectObject);
  const updateObject = useEditorStore((state) => state.updateObject);
  const beginViewportTransform = useEditorStore((state) => state.beginViewportTransform);
  const applyViewportTransform = useEditorStore((state) => state.applyViewportTransform);
  const selected = !playModeEnabled && selectedObjectId === object.id;
  const controlMode = selected && !object.locked && !cameraPreviewEnabled ? toControlMode(mode) : null;
  const pivotOffset = invertPivot(resolvePivot(object));
  const lightCastShadow = runtimeObject.light?.castShadow ?? true;
  const lightShadowRadius = runtimeObject.light?.shadowRadius ?? 2.2;
  const lightShadowBias = runtimeObject.light?.shadowBias ?? -0.0004;
  const constraints = resolveTransformConstraints(object.constraints);
  const showX = mode === "move" ? !constraints.lockPositionX : mode === "rotate" ? !constraints.lockRotationX : mode === "scale" ? !constraints.lockScaleX : true;
  const showY = mode === "move" ? !constraints.lockPositionY : mode === "rotate" ? !constraints.lockRotationY : mode === "scale" ? !constraints.lockScaleY : true;
  const showZ = mode === "move" ? !constraints.lockPositionZ : mode === "rotate" ? !constraints.lockRotationZ : mode === "scale" ? !constraints.lockScaleZ : true;
  const runtimeObjectById = useMemo(() => new Map(runtimeObjects.map((entry) => [entry.id, entry])), [runtimeObjects]);
  const tracksByObjectId = useMemo(() => createAnimationTrackMap(allAnimationTracks), [allAnimationTracks]);
  const dragActiveRef = useRef(false);
  const dragOffsetRef = useRef(new Vector3());
  const dragLastTriggerAtRef = useRef(0);
  const dragSuppressClickRef = useRef(false);
  const pointerLastTriggerAtRef = useRef(0);
  const pointerPressIntervalRef = useRef<number | null>(null);
  const pendingViewportTransformRef = useRef<Transform | null>(null);
  const viewportTransformFrameRef = useRef<number | null>(null);
  const hoveredObjectId = useEditorStore((state) => state.hoveredObjectId);
  const hoverObject = useEditorStore((state) => state.hoverObject);
  const highlighted = selected || (!playModeEnabled && hoveredObjectId === object.id);

  useEffect(() => {
    return () => {
      if (pointerPressIntervalRef.current !== null) {
        window.clearInterval(pointerPressIntervalRef.current);
      }
      if (viewportTransformFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportTransformFrameRef.current);
      }
    };
  }, []);

  useFrame(({ camera, clock }) => {
    if (!objectRef.current) {
      return;
    }

    const followEnabled = playModeEnabled && object.follow?.enabled === true;
    const lookAtEnabled = playModeEnabled && object.lookAt?.enabled === true;

    if (runtimePhysicsTransform) {
      applyTransform(objectRef.current, runtimePhysicsTransform);
      wasAnimating.current = false;
      wasRuntimeTransforming.current = true;
      return;
    }

    if (!playModeEnabled || (parentAnimationTracks.length === 0 && !followEnabled && !lookAtEnabled)) {
      if (wasAnimating.current || wasRuntimeTransforming.current || runtimeTransition) {
        applyTransform(objectRef.current, runtimeTransform);
      }

      playStartedAt.current = null;
      wasAnimating.current = false;
      if (runtimeTransition && playModeEnabled) {
        applyTransform(objectRef.current, resolveRuntimeTransitionTransform(runtimeTransform, runtimeTransition, getTransitionNowSeconds()));
        wasRuntimeTransforming.current = true;
      } else {
        wasRuntimeTransforming.current = false;
      }
      if (followEnabled || lookAtEnabled) {
        const targetObject =
          object.follow?.targetKind === "object" && object.follow.targetObjectId ? runtimeObjectById.get(object.follow.targetObjectId) : undefined;
        const targetTransform = targetObject
          ? resolveRuntimeObjectTransform(targetObject, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, clock.elapsedTime, variables, runtimePhysicsTransforms)
          : null;

        if (followEnabled) {
          if (targetTransform) {
            followTargetPosition.set(...targetTransform.position);
          } else {
            followTargetPosition.copy(camera.position);
          }

          followOffset.set(...(object.follow?.offset ?? [0, 0, 0]));
          followTargetPosition.add(followOffset);
          if ((object.follow?.smoothing ?? 1) >= 1) {
            objectRef.current.position.copy(followTargetPosition);
          } else {
            objectRef.current.position.lerp(followTargetPosition, object.follow?.smoothing ?? 1);
          }
        }

        if (lookAtEnabled) {
          lookAtTargetPosition.copy(camera.position);
          objectRef.current.lookAt(lookAtTargetPosition);
        }
      }
      return;
    }

    if (playStartedAt.current === null) {
      playStartedAt.current = clock.elapsedTime;
    }

    wasAnimating.current = true;
    const animatedTransform = evaluateAnimatedTransform(runtimeTransform, parentAnimationTracks, resolveRuntimeAnimationElapsed(runtimeAnimation, clock.elapsedTime - playStartedAt.current, getRuntimeNowSeconds()));
    applyTransform(objectRef.current, resolveRuntimeTransitionTransform(animatedTransform, runtimeTransition, getTransitionNowSeconds()));
    wasRuntimeTransforming.current = Boolean(runtimeTransition);
    if (followEnabled) {
      const targetObject = object.follow?.targetKind === "object" && object.follow.targetObjectId ? runtimeObjectById.get(object.follow.targetObjectId) : undefined;
      const targetTransform = targetObject
        ? resolveRuntimeObjectTransform(targetObject, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, clock.elapsedTime - playStartedAt.current, variables, runtimePhysicsTransforms)
        : null;

      if (targetTransform) {
        followTargetPosition.set(...targetTransform.position);
      } else {
        followTargetPosition.copy(camera.position);
      }

      followOffset.set(...(object.follow?.offset ?? [0, 0, 0]));
      followTargetPosition.add(followOffset);
      if ((object.follow?.smoothing ?? 1) >= 1) {
        objectRef.current.position.copy(followTargetPosition);
      } else {
        objectRef.current.position.lerp(followTargetPosition, object.follow?.smoothing ?? 1);
      }
    }
    if (lookAtEnabled) {
      const targetObject = object.lookAt?.targetKind === "object" && object.lookAt.targetObjectId ? runtimeObjectById.get(object.lookAt.targetObjectId) : undefined;
      const targetTransform = targetObject
        ? resolveRuntimeObjectTransform(targetObject, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, clock.elapsedTime - playStartedAt.current, variables, runtimePhysicsTransforms)
        : null;

      if (targetTransform) {
        lookAtTargetPosition.set(...targetTransform.position);
      } else {
        lookAtTargetPosition.copy(camera.position);
      }

      objectRef.current.lookAt(lookAtTargetPosition);
    }
  });

  function runDragInteraction(eventName: DragTriggerEvent) {
    const interaction = object.interaction;
    const trigger = interaction?.dragTrigger;

    if (!matchesDragTrigger(trigger, eventName) || !evaluateInteractionCondition(interaction?.condition, variables)) {
      return;
    }

    const now = window.performance.now();

    if (now - dragLastTriggerAtRef.current < resolveDragTriggerCooldownMs(trigger)) {
      return;
    }

    dragLastTriggerAtRef.current = now;
    runInteraction(interaction);
    runMediaAction(interaction?.mediaAction);
    openInteractionLink(interaction?.linkUrl);
  }

  function runPointerInteraction(eventName: PointerTriggerEvent) {
    const interaction = object.interaction;
    const trigger = interaction?.pointerTrigger;

    if (!matchesPointerTrigger(trigger, eventName) || !evaluateInteractionCondition(interaction?.condition, variables)) {
      return false;
    }

    const now = window.performance.now();

    if (now - pointerLastTriggerAtRef.current < resolvePointerTriggerCooldownMs(trigger)) {
      return false;
    }

    pointerLastTriggerAtRef.current = now;
    runInteraction(interaction);
    runMediaAction(interaction?.mediaAction);
    openInteractionLink(interaction?.linkUrl);

    return true;
  }

  function stopPointerPressLoop() {
    if (pointerPressIntervalRef.current !== null) {
      window.clearInterval(pointerPressIntervalRef.current);
      pointerPressIntervalRef.current = null;
    }
  }

  function startPointerPressLoop() {
    const trigger = object.interaction?.pointerTrigger;

    if (!matchesPointerTrigger(trigger, "press")) {
      return false;
    }

    stopPointerPressLoop();
    runPointerInteraction("press");
    pointerPressIntervalRef.current = window.setInterval(() => runPointerInteraction("press"), Math.max(16, resolvePointerTriggerCooldownMs(trigger)));

    return true;
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!playModeEnabled) {
      return;
    }

    const pointerHandled = runPointerInteraction("down");
    const pressHandled = startPointerPressLoop();
    const dragEnabled = object.interaction?.dragTrigger?.enabled === true && Boolean(objectRef.current);

    if (pointerHandled || pressHandled || dragEnabled) {
      event.stopPropagation();
    }

    if (dragEnabled && objectRef.current) {
      dragActiveRef.current = true;
      dragSuppressClickRef.current = true;
      dragOffsetRef.current.copy(objectRef.current.position).sub(event.point);
      runDragInteraction("start");
    }
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragActiveRef.current || !objectRef.current) {
      return;
    }

    event.stopPropagation();
    objectRef.current.position.copy(event.point).add(dragOffsetRef.current);
    runDragInteraction("drag");
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    stopPointerPressLoop();

    if (playModeEnabled && runPointerInteraction("up")) {
      event.stopPropagation();
    }

    if (!dragActiveRef.current) {
      return;
    }

    event.stopPropagation();
    dragActiveRef.current = false;
    runDragInteraction("drop");
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    if (playModeEnabled && runPointerInteraction("hoverEnter")) {
      event.stopPropagation();
      return;
    }

    if (!playModeEnabled && !object.locked && runtimeVisible) {
      event.stopPropagation();
      hoverObject(object.id);
    }
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    stopPointerPressLoop();

    if (playModeEnabled && runPointerInteraction("hoverExit")) {
      event.stopPropagation();
      return;
    }

    if (!playModeEnabled && hoveredObjectId === object.id) {
      hoverObject(null);
    }
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();

    if (playModeEnabled) {
      if (dragSuppressClickRef.current) {
        dragSuppressClickRef.current = false;
        return;
      }

      if (!evaluateInteractionCondition(object.interaction?.condition, variables)) {
        return;
      }

      runPointerInteraction("click");
      return;
    }

    if (!object.locked) {
      const meshSelectionMode = object.meshEdit?.selectionMode ?? "object";
      const meshSelectionIndex = selected && object.meshEdit?.enabled === true ? getViewportMeshSelectionIndex(event, meshSelectionMode) : null;

      if (meshSelectionIndex !== null) {
        updateObject(object.id, (entry) => ({
          ...entry,
          meshEdit: {
            ...resolveMeshEditSettings(entry),
            enabled: true,
            selectionIndex: meshSelectionIndex,
            selectionMode: meshSelectionMode,
          },
        }));
        return;
      }

      selectObject(object.id);
    }
  }

  const setObjectRef = useCallback((nextObject: THREE.Group | null) => {
    objectRef.current = nextObject;
    setSceneObject(nextObject);
  }, []);
  const scheduleViewportTransform = useCallback(() => {
    if (!objectRef.current) {
      return;
    }

    pendingViewportTransformRef.current = readObjectTransform(objectRef.current);

    if (viewportTransformFrameRef.current !== null) {
      return;
    }

    viewportTransformFrameRef.current = window.requestAnimationFrame(() => {
      viewportTransformFrameRef.current = null;
      const nextTransform = pendingViewportTransformRef.current;
      pendingViewportTransformRef.current = null;

      if (nextTransform) {
        applyViewportTransform(object.id, nextTransform);
      }
    });
  }, [applyViewportTransform, object.id]);
  const flushViewportTransform = useCallback(() => {
    if (viewportTransformFrameRef.current !== null) {
      window.cancelAnimationFrame(viewportTransformFrameRef.current);
      viewportTransformFrameRef.current = null;
    }

    pendingViewportTransformRef.current = null;

    if (objectRef.current) {
      applyViewportTransform(object.id, readObjectTransform(objectRef.current));
    }
  }, [applyViewportTransform, object.id]);

  return (
    <>
      <group
        ref={setObjectRef}
        position={runtimeTransform.position}
        rotation={runtimeTransform.rotation}
        scale={runtimeTransform.scale}
        visible={runtimeVisible}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
        onPointerUp={handlePointerUp}
      >
        {selected && !cameraPreviewEnabled && !playModeEnabled ? (
          <mesh>
            <sphereGeometry args={[0.08, 16, 10]} />
            <meshBasicMaterial color={selectedColor} toneMapped={false} />
          </mesh>
        ) : null}
        <group position={pivotOffset}>
          {clonerInstanceTransforms.map((cloneTransform, index) => (
            <ClonerInstanceGroup
              key={`${object.id}-clone-${index}`}
              animationDelay={getClonerInstanceDelay(runtimeObject, index, clonerInstanceTransforms.length)}
              animationEnabled={playModeEnabled}
              baseTransform={runtimeTransform}
              cloneTransform={cloneTransform}
              runtimeAnimation={runtimeAnimation}
              staggerEnabled={clonerStaggerEnabled}
              tracks={animationTracks}
            >
              {isLightKind(object.kind) ? (
            <>
              {object.kind === "pointLight" ? (
                <pointLight
                  castShadow={lightCastShadow}
                  color={runtimeObject.light?.color ?? "#ffffff"}
                  distance={runtimeObject.light?.distance ?? 12}
                  intensity={runtimeObject.light?.intensity ?? 2.4}
                  shadow-bias={lightShadowBias}
                  shadow-mapSize={[1024, 1024]}
                  shadow-radius={lightShadowRadius}
                />
              ) : null}
              {object.kind === "directionalLight" ? (
                <directionalLight
                  castShadow={lightCastShadow}
                  color={runtimeObject.light?.color ?? "#ffffff"}
                  intensity={runtimeObject.light?.intensity ?? 1.4}
                  shadow-bias={lightShadowBias}
                  shadow-mapSize={[1024, 1024]}
                  shadow-radius={lightShadowRadius}
                />
              ) : null}
              {object.kind === "spotLight" ? (
                <spotLight
                  castShadow={lightCastShadow}
                  angle={runtimeObject.light?.angle ?? 0.65}
                  color={runtimeObject.light?.color ?? "#ffffff"}
                  distance={runtimeObject.light?.distance ?? 12}
                  intensity={runtimeObject.light?.intensity ?? 2.4}
                  penumbra={runtimeObject.light?.penumbra ?? 0.35}
                  shadow-bias={lightShadowBias}
                  shadow-mapSize={[1024, 1024]}
                  shadow-radius={lightShadowRadius}
                />
              ) : null}
              {!cameraPreviewEnabled && !playModeEnabled ? (
                <mesh>
                  {object.kind === "directionalLight" ? <octahedronGeometry args={[0.18, 0]} /> : <sphereGeometry args={[0.16, 20, 12]} />}
                  <meshBasicMaterial color={runtimeObject.light?.color ?? "#ffffff"} toneMapped={false} />
                  {highlighted ? <Edges color={selected ? selectedColor : hoverColor} scale={selected ? 1.18 : 1.1} threshold={15} /> : null}
                </mesh>
              ) : null}
            </>
          ) : object.kind === "camera" ? (
            !cameraPreviewEnabled && !playModeEnabled ? (
              <group>
                <mesh>
                  <boxGeometry args={[0.36, 0.24, 0.18]} />
                  <meshBasicMaterial color={selected ? selectedColor : inactiveHelperColor} toneMapped={false} />
                  {highlighted ? <Edges color={selected ? selectedColor : hoverColor} scale={selected ? 1.12 : 1.08} threshold={15} /> : null}
                </mesh>
                <mesh position={[0, 0, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.16, 0.28, 4]} />
                  <meshBasicMaterial color={inactiveHelperColor} wireframe toneMapped={false} />
                </mesh>
              </group>
            ) : null
          ) : object.kind === "text" ? (
            <>
              <Text
                anchorX="center"
                anchorY="middle"
                color={runtimeObject.material.color}
                fontSize={runtimeObject.text?.fontSize ?? 0.72}
                maxWidth={runtimeObject.text?.maxWidth ?? 6}
                outlineColor={highlighted ? (selected ? selectedColor : hoverColor) : undefined}
                outlineWidth={highlighted ? (selected ? 0.01 : 0.006) : 0}
                textAlign="center"
              >
                {interpolateVariables(runtimeObject.text?.content ?? "Text", variables)}
              </Text>
            </>
          ) : object.kind === "model" ? (
            <>
              <ImportedModel key={object.id} materialColor={runtimeObject.material.color} model={object.model} selected={highlighted} />
              {highlighted && !cameraPreviewEnabled ? (
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshBasicMaterial color={selected ? selectedColor : hoverColor} opacity={selected ? 0.38 : 0.22} transparent wireframe toneMapped={false} />
                </mesh>
              ) : null}
            </>
          ) : object.kind === "image" ? (
            <ImagePlane clippingPlanes={clippingPlanes} object={runtimeObject} selected={highlighted} />
          ) : object.kind === "video" ? (
            <VideoPlane clippingPlanes={clippingPlanes} object={runtimeObject} selected={highlighted} />
          ) : object.kind === "figma" ? (
            <FigmaPreviewPlane clippingPlanes={clippingPlanes} object={runtimeObject} selected={highlighted} />
          ) : object.kind === "spline" ? (
            <SplinePreviewPlane clippingPlanes={clippingPlanes} object={runtimeObject} selected={highlighted} />
          ) : object.kind === "audio" ? (
            <AudioMarker active={playModeEnabled} object={runtimeObject} selected={highlighted} />
          ) : object.kind === "svg" ? (
            <SvgVector object={runtimeObject} selected={highlighted} />
          ) : object.kind === "path" ? (
            <PathCurve clippingPlanes={clippingPlanes} object={runtimeObject} selected={highlighted} />
          ) : object.kind === "particles" ? (
            <ParticleEmitter object={runtimeObject} selected={highlighted} settings={runtimeParticles} />
          ) : object.kind === "group" ? null : (
            <>
              <TwoDLayerShadow clippingPlanes={clippingPlanes} object={runtimeObject} />
              <MaterialOutline clippingPlanes={clippingPlanes} material={runtimeObject.material} object={runtimeObject} />
              <mesh castShadow receiveShadow>
                <PrimitiveGeometry object={runtimeObject} objects={runtimeObjects} />
                <SceneMaterial
                  animationDelay={clonerStaggerEnabled ? getClonerInstanceDelay(runtimeObject, index, clonerInstanceTransforms.length) : 0}
                  animationEnabled={playModeEnabled}
                  animationTracks={animationTracks}
                  clippingPlanes={clippingPlanes}
                  material={runtimeObject.material}
                  runtimeAnimation={runtimeAnimation}
                  twoDBlendMode={runtimeTwoDSettings?.blendMode}
                  twoDPostProcessEffects={runtimeTwoDSettings?.postProcessEffects}
                />
                {highlighted || (runtimeObject.meshEdit?.enabled && runtimeObject.meshEdit.showTopology) ? (
                  <Edges color={selected ? selectedColor : hoverColor} scale={selected ? 1.02 : 1.015} threshold={runtimeObject.meshEdit?.enabled && runtimeObject.meshEdit.showTopology ? 1 : 15} />
                ) : null}
              </mesh>
              <TwoDShapeFill
                animationEnabled={playModeEnabled}
                animationTracks={allAnimationTracks}
                clippingPlanes={childClippingPlanes}
                object={runtimeObject}
                objects={runtimeObjects}
                runtimeAnimationOverrides={runtimeAnimationOverrides}
              />
              <TwoDLayerFilter clippingPlanes={clippingPlanes} object={runtimeObject} />
              <MeshCutPreview object={runtimeObject} objects={runtimeObjects} />
              <MeshSelectionPreview object={runtimeObject} objects={runtimeObjects} />
              <SculptBrushPreview object={runtimeObject} />
            </>
          )}
          {object.kind === "group" && !cameraPreviewEnabled && !playModeEnabled ? (
            <mesh>
              <boxGeometry args={[0.28, 0.28, 0.28]} />
              <meshBasicMaterial color={highlighted ? (selected ? selectedColor : hoverColor) : inactiveHelperColor} wireframe toneMapped={false} />
            </mesh>
          ) : null}
            </ClonerInstanceGroup>
          ))}
          {children.map((child) => (
            <EditableObject key={child.object.id} clippingPlanes={childClippingPlanes} node={child} runtimeObjects={runtimeObjects} worldPosition={objectWorldPosition} />
          ))}
        </group>
      </group>
      {controlMode ? (
        <TransformControls
          object={sceneObject ?? undefined}
          mode={controlMode}
          showX={showX}
          showY={showY}
          showZ={showZ}
          size={0.78}
          onMouseDown={() => beginViewportTransform(object.id)}
          onMouseUp={flushViewportTransform}
          onObjectChange={scheduleViewportTransform}
        />
      ) : null}
    </>
  );
}
