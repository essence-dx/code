"use client";

import { useEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import type * as THREE from "three";
import { AudioMarker } from "@/features/editor/components/viewport/audio-marker";
import { FigmaPreviewPlane } from "@/features/editor/components/viewport/figma-preview-plane";
import { ImportedModel } from "@/features/editor/components/viewport/imported-model";
import { getRuntimeNowSeconds, resolveRuntimeAnimationElapsed, type RuntimeAnimationOverrides } from "@/features/editor/interactions/animation-actions";
import { matchesDragTrigger, resolveDragTriggerCooldownMs } from "@/features/editor/interactions/drag-triggers";
import { evaluateInteractionCondition } from "@/features/editor/interactions/interaction-conditions";
import { useMediaActionRegistry } from "@/features/editor/interactions/media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "@/features/editor/interactions/object-visibility-actions";
import { resolveRuntimeParticleSettings, type RuntimeParticleOverrides } from "@/features/editor/interactions/particle-actions";
import { matchesPointerTrigger, resolvePointerTriggerCooldownMs } from "@/features/editor/interactions/pointer-triggers";
import { resolveRuntimePropertyObject, type RuntimePropertyOverrides } from "@/features/editor/interactions/property-toggle-actions";
import { openInteractionLink } from "@/features/editor/interactions/object-links";
import { createAnimationTrackMap, resolveRuntimeObjectTransform } from "@/features/editor/interactions/runtime-transforms";
import type { RuntimePhysicsTransforms } from "@/features/editor/runtime/physics-runtime-state";
import { getRuntimeNowSeconds as getTransitionNowSeconds, resolveRuntimeTransitionTransform, type RuntimeTransitionOverrides } from "@/features/editor/interactions/transition-actions";
import { ImagePlane } from "@/features/editor/components/viewport/image-plane";
import { MaterialOutline } from "@/features/editor/components/viewport/material-outline";
import { PathCurve } from "@/features/editor/components/viewport/path-curve";
import { ParticleEmitter } from "@/features/editor/components/viewport/particle-emitter";
import { PrimitiveGeometry } from "@/features/editor/components/viewport/primitive-geometry";
import { SceneMaterial } from "@/features/editor/components/viewport/scene-material";
import { SplinePreviewPlane } from "@/features/editor/components/viewport/spline-preview-plane";
import { SvgVector } from "@/features/editor/components/viewport/svg-vector";
import { addWorldPosition, createTwoDClipPlanes, emptyClippingPlanes, worldOrigin } from "@/features/editor/components/viewport/two-d-clipping";
import { TwoDLayerFilter } from "@/features/editor/components/viewport/two-d-layer-filter";
import { TwoDLayerShadow } from "@/features/editor/components/viewport/two-d-layer-shadow";
import { TwoDShapeFill } from "@/features/editor/components/viewport/two-d-shape-fill";
import { VideoPlane } from "@/features/editor/components/viewport/video-plane";
import { ClonerInstanceGroup } from "@/features/editor/components/viewport/cloner-instance-group";
import { evaluateAnimatedTransform } from "@/features/editor/animation/evaluate-animation";
import { invertPivot, resolvePivot } from "@/features/editor/scene/object-pivot";
import { createClonerInstanceTransforms, getClonerInstanceDelay, hasClonerAnimationStagger } from "@/features/editor/scene/cloner-settings";
import type { SceneObjectNode } from "@/features/editor/scene/scene-tree-utils";
import { interpolateVariables } from "@/features/editor/scene/scene-variables";
import { resolveTwoDLayerSettings } from "@/features/editor/scene/two-d";
import { resolveVariableBoundObject } from "@/features/editor/scene/variable-bindings";
import type { AnimationTrack, DragTriggerEvent, ObjectInteraction, PointerTriggerEvent, SceneObject, SceneVariable, Transform, Vec3 } from "@/features/editor/types";

function isLightKind(kind: string) {
  return kind === "pointLight" || kind === "directionalLight" || kind === "spotLight";
}

function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

const lookAtTargetPosition = new Vector3();
const followTargetPosition = new Vector3();
const followOffset = new Vector3();

export function SharedSceneObject({
  animationTracks,
  animationOverrides,
  clippingPlanes = emptyClippingPlanes,
  node,
  onInteraction,
  particleOverrides,
  physicsTransforms,
  propertyOverrides,
  runtimeObjects,
  transitionOverrides,
  variables,
  visibilityOverrides,
  worldPosition = worldOrigin,
}: {
  animationTracks: AnimationTrack[];
  animationOverrides: RuntimeAnimationOverrides;
  clippingPlanes?: THREE.Plane[];
  node: SceneObjectNode;
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  particleOverrides: RuntimeParticleOverrides;
  physicsTransforms: RuntimePhysicsTransforms;
  propertyOverrides: RuntimePropertyOverrides;
  runtimeObjects: SceneObject[];
  transitionOverrides: RuntimeTransitionOverrides;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
  worldPosition?: Vec3;
}) {
  const { object, children } = node;
  const objectRef = useRef<THREE.Group>(null);
  const wasRuntimeTransforming = useRef(false);
  const objectTracks = animationTracks.filter((track) => track.objectId === object.id);
  const runtimeAnimation = animationOverrides[object.id];
  const runtimeTransition = transitionOverrides[object.id];
  const runtimeObject = useMemo(() => resolveRuntimePropertyObject(resolveVariableBoundObject(object, variables), propertyOverrides), [object, propertyOverrides, variables]);
  const runtimeTwoDSettings = resolveTwoDLayerSettings(runtimeObject);
  const clonerInstanceTransforms = useMemo(() => createClonerInstanceTransforms(runtimeObject), [runtimeObject]);
  const clonerStaggerEnabled = hasClonerAnimationStagger(runtimeObject) && objectTracks.length > 0;
  const parentObjectTracks = clonerStaggerEnabled ? [] : objectTracks;
  const runtimePhysicsTransform = physicsTransforms[object.id];
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
  const pivotOffset = invertPivot(resolvePivot(object));
  const lightCastShadow = runtimeObject.light?.castShadow ?? true;
  const lightShadowRadius = runtimeObject.light?.shadowRadius ?? 2.2;
  const lightShadowBias = runtimeObject.light?.shadowBias ?? -0.0004;
  const { runMediaAction } = useMediaActionRegistry();
  const runtimeVisible = resolveRuntimeObjectVisible(object, visibilityOverrides);
  const runtimeParticles = resolveRuntimeParticleSettings(object, particleOverrides);
  const runtimeObjectById = useMemo(() => new Map(runtimeObjects.map((entry) => [entry.id, entry])), [runtimeObjects]);
  const tracksByObjectId = useMemo(() => createAnimationTrackMap(animationTracks), [animationTracks]);
  const dragActiveRef = useRef(false);
  const dragOffsetRef = useRef(new Vector3());
  const dragLastTriggerAtRef = useRef(0);
  const dragSuppressClickRef = useRef(false);
  const pointerLastTriggerAtRef = useRef(0);
  const pointerPressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pointerPressIntervalRef.current !== null) {
        window.clearInterval(pointerPressIntervalRef.current);
      }
    };
  }, []);

  useFrame(({ camera, clock }) => {
    if (!objectRef.current) {
      return;
    }

    const followEnabled = object.follow?.enabled === true;
    const lookAtEnabled = object.lookAt?.enabled === true;

    if (runtimePhysicsTransform) {
      applyTransform(objectRef.current, runtimePhysicsTransform);
      wasRuntimeTransforming.current = true;
      return;
    }

    if (parentObjectTracks.length === 0 && !runtimeTransition && !followEnabled && !lookAtEnabled) {
      if (wasRuntimeTransforming.current) {
        applyTransform(objectRef.current, runtimeTransform);
        wasRuntimeTransforming.current = false;
      }
      return;
    }

    const animatedTransform =
      parentObjectTracks.length > 0
        ? evaluateAnimatedTransform(runtimeTransform, parentObjectTracks, resolveRuntimeAnimationElapsed(runtimeAnimation, clock.elapsedTime, getRuntimeNowSeconds()))
        : runtimeTransform;
    applyTransform(objectRef.current, resolveRuntimeTransitionTransform(animatedTransform, runtimeTransition, getTransitionNowSeconds()));
    wasRuntimeTransforming.current = Boolean(runtimeTransition);
    if (followEnabled) {
      const targetObject = object.follow?.targetKind === "object" && object.follow.targetObjectId ? runtimeObjectById.get(object.follow.targetObjectId) : undefined;
      const targetTransform = targetObject ? resolveRuntimeObjectTransform(targetObject, tracksByObjectId, animationOverrides, transitionOverrides, clock.elapsedTime, variables, physicsTransforms) : null;

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
      const targetTransform = targetObject ? resolveRuntimeObjectTransform(targetObject, tracksByObjectId, animationOverrides, transitionOverrides, clock.elapsedTime, variables, physicsTransforms) : null;

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
    onInteraction(interaction);
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
    onInteraction(interaction);
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

    if (runPointerInteraction("up")) {
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
    if (runPointerInteraction("hoverEnter")) {
      event.stopPropagation();
    }
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    stopPointerPressLoop();

    if (runPointerInteraction("hoverExit")) {
      event.stopPropagation();
    }
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();

    if (dragSuppressClickRef.current) {
      dragSuppressClickRef.current = false;
      return;
    }

    if (!evaluateInteractionCondition(object.interaction?.condition, variables)) {
      return;
    }

    runPointerInteraction("click");
  }

  return (
    <group
      ref={objectRef}
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
      <group position={pivotOffset}>
        {clonerInstanceTransforms.map((cloneTransform, index) => (
          <ClonerInstanceGroup
            key={`${object.id}-clone-${index}`}
            animationDelay={getClonerInstanceDelay(runtimeObject, index, clonerInstanceTransforms.length)}
            animationEnabled
            baseTransform={runtimeTransform}
            cloneTransform={cloneTransform}
            runtimeAnimation={runtimeAnimation}
            staggerEnabled={clonerStaggerEnabled}
            tracks={objectTracks}
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
          </>
        ) : object.kind === "text" ? (
          <Text
            anchorX="center"
            anchorY="middle"
            color={runtimeObject.material.color}
            fontSize={runtimeObject.text?.fontSize ?? 0.72}
            maxWidth={runtimeObject.text?.maxWidth ?? 6}
            textAlign="center"
          >
            {interpolateVariables(runtimeObject.text?.content ?? "Text", variables)}
          </Text>
        ) : object.kind === "model" ? (
          <ImportedModel key={object.model?.sourceDataUrl ?? object.id} model={object.model} />
        ) : object.kind === "image" ? (
          <ImagePlane clippingPlanes={clippingPlanes} object={runtimeObject} />
        ) : object.kind === "video" ? (
          <VideoPlane clippingPlanes={clippingPlanes} object={runtimeObject} />
        ) : object.kind === "figma" ? (
          <FigmaPreviewPlane clippingPlanes={clippingPlanes} object={runtimeObject} />
        ) : object.kind === "spline" ? (
          <SplinePreviewPlane clippingPlanes={clippingPlanes} object={runtimeObject} />
        ) : object.kind === "audio" ? (
          <AudioMarker active object={runtimeObject} />
        ) : object.kind === "svg" ? (
          <SvgVector object={runtimeObject} />
        ) : object.kind === "path" ? (
          <PathCurve clippingPlanes={clippingPlanes} object={runtimeObject} />
        ) : object.kind === "particles" ? (
          <ParticleEmitter object={runtimeObject} settings={runtimeParticles} />
        ) : object.kind === "camera" || object.kind === "group" ? null : (
          <>
            <TwoDLayerShadow clippingPlanes={clippingPlanes} object={runtimeObject} />
            <MaterialOutline clippingPlanes={clippingPlanes} material={runtimeObject.material} object={runtimeObject} />
            <mesh castShadow receiveShadow>
              <PrimitiveGeometry object={runtimeObject} objects={runtimeObjects} />
              <SceneMaterial
                animationDelay={clonerStaggerEnabled ? getClonerInstanceDelay(runtimeObject, index, clonerInstanceTransforms.length) : 0}
                animationEnabled
                animationTracks={objectTracks}
                clippingPlanes={clippingPlanes}
                material={runtimeObject.material}
                runtimeAnimation={runtimeAnimation}
                twoDBlendMode={runtimeTwoDSettings?.blendMode}
                twoDPostProcessEffects={runtimeTwoDSettings?.postProcessEffects}
              />
            </mesh>
            <TwoDShapeFill
              animationEnabled
              animationTracks={animationTracks}
              clippingPlanes={childClippingPlanes}
              object={runtimeObject}
              objects={runtimeObjects}
              runtimeAnimationOverrides={animationOverrides}
            />
            <TwoDLayerFilter clippingPlanes={clippingPlanes} object={runtimeObject} />
          </>
        )}
          </ClonerInstanceGroup>
        ))}
        {children.map((child) => (
          <SharedSceneObject
            key={child.object.id}
            animationTracks={animationTracks}
            animationOverrides={animationOverrides}
            clippingPlanes={childClippingPlanes}
            node={child}
            onInteraction={onInteraction}
            particleOverrides={particleOverrides}
            physicsTransforms={physicsTransforms}
            propertyOverrides={propertyOverrides}
            runtimeObjects={runtimeObjects}
            transitionOverrides={transitionOverrides}
            variables={variables}
            visibilityOverrides={visibilityOverrides}
            worldPosition={objectWorldPosition}
          />
        ))}
      </group>
    </group>
  );
}
