"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type * as THREE from "three";
import { InputControlsOverlay } from "@/features/editor/components/runtime/input-controls-overlay";
import { SceneEnvironment } from "@/features/editor/components/viewport/scene-environment";
import { ScenePostProcessing } from "@/features/editor/components/viewport/scene-post-processing";
import { evaluateAnimatedTransform } from "@/features/editor/animation/evaluate-animation";
import { CollisionInteractionRunner } from "@/features/editor/interactions/collision-interaction-runner";
import { ControlsInteractionRunner } from "@/features/editor/interactions/controls-interaction-runner";
import type { ControlsTriggerEvent, RuntimeControlsEvent } from "@/features/editor/interactions/controls-triggers";
import { DistanceInteractionRunner } from "@/features/editor/interactions/distance-interaction-runner";
import { applyAnimationAction, getRuntimeNowSeconds, resolveRuntimeAnimationElapsed, type RuntimeAnimationOverrides, type RuntimeAnimationPlayback } from "@/features/editor/interactions/animation-actions";
import { GameControlsInteractionRunner } from "@/features/editor/interactions/game-controls-interaction-runner";
import { KeyboardInteractionRunner } from "@/features/editor/interactions/keyboard-interaction-runner";
import { MediaActionProvider } from "@/features/editor/interactions/media-actions";
import { NetworkInteractionRunner } from "@/features/editor/interactions/network-interaction-runner";
import { runNetworkActions } from "@/features/editor/interactions/network-actions";
import { ResizeInteractionRunner } from "@/features/editor/interactions/resize-interaction-runner";
import { ScrollInteractionRunner } from "@/features/editor/interactions/scroll-interaction-runner";
import { StartInteractionRunner } from "@/features/editor/interactions/start-interaction-runner";
import { StateChangeInteractionRunner } from "@/features/editor/interactions/state-change-interaction-runner";
import { TriggerAreaInteractionRunner } from "@/features/editor/interactions/trigger-area-interaction-runner";
import { VariableChangeInteractionRunner } from "@/features/editor/interactions/variable-change-interaction-runner";
import { useDynamicVariableRuntime } from "@/features/editor/runtime/use-dynamic-variable-runtime";
import { resolveDynamicVariableValues, type DynamicVariableRuntime } from "@/features/editor/scene/dynamic-variables";
import { applyObjectInstanceAction, type RuntimeObjectInstance } from "@/features/editor/interactions/object-instance-actions";
import { applyObjectVisibilityAction, type RuntimeVisibilityOverrides } from "@/features/editor/interactions/object-visibility-actions";
import { applyParticleAction, type RuntimeParticleOverrides } from "@/features/editor/interactions/particle-actions";
import { applyPropertyToggleAction, type RuntimePropertyOverrides } from "@/features/editor/interactions/property-toggle-actions";
import { applySceneStateTransitions, applySceneStateVisibility, resolveSceneTransition } from "@/features/editor/interactions/scene-transition-actions";
import { applyTransitionAction, getRuntimeNowSeconds as getTransitionNowSeconds, resolveRuntimeTransitionTransform, type RuntimeTransition, type RuntimeTransitionOverrides } from "@/features/editor/interactions/transition-actions";
import { PhysicsRuntimeRunner } from "@/features/editor/runtime/physics-runtime-runner";
import type { RuntimePhysicsTransforms } from "@/features/editor/runtime/physics-runtime-state";
import { resolveSceneSettings } from "@/features/editor/scene/default-document";
import { WebGLRuntimeGuard } from "@/features/editor/components/viewport/webgl-runtime-guard";
import {
  applyVariableAction,
  clearLocalVariableValues,
  persistLocalVariables,
  resetLocalVariablesToBaseline,
  resolveLocalVariableValues,
  setSceneVariableValue,
} from "@/features/editor/scene/scene-variables";
import { buildSceneTree } from "@/features/editor/scene/scene-tree-utils";
import type { AnimationTrack, ObjectInteraction, SceneDocument, SceneObject, SceneVariableValue, Transform } from "@/features/editor/types";
import { useSharedSceneRuntimeApi } from "@/features/viewer/runtime/use-shared-scene-runtime-api";
import { cn } from "@/lib/utils";
import { SharedSceneObject } from "./shared-scene-object";

const emptyAnimationTracks: AnimationTrack[] = [];

function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

function ViewerCamera({
  activeCamera,
  animationTracks,
  runtimeAnimation,
  runtimeTransition,
}: {
  activeCamera: SceneObject | undefined;
  animationTracks: AnimationTrack[];
  runtimeAnimation?: RuntimeAnimationPlayback;
  runtimeTransition?: RuntimeTransition;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const wasRuntimeTransforming = useRef(false);

  useFrame(({ clock }) => {
    if (!cameraRef.current || !activeCamera) {
      return;
    }

    if (animationTracks.length === 0 && !runtimeTransition) {
      if (wasRuntimeTransforming.current) {
        applyTransform(cameraRef.current, activeCamera.transform);
        wasRuntimeTransforming.current = false;
      }
      return;
    }

    const animatedTransform =
      animationTracks.length > 0
        ? evaluateAnimatedTransform(activeCamera.transform, animationTracks, resolveRuntimeAnimationElapsed(runtimeAnimation, clock.elapsedTime, getRuntimeNowSeconds()))
        : activeCamera.transform;
    applyTransform(cameraRef.current, resolveRuntimeTransitionTransform(animatedTransform, runtimeTransition, getTransitionNowSeconds()));
    wasRuntimeTransforming.current = Boolean(runtimeTransition);
  });

  if (activeCamera?.camera) {
    return (
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        far={activeCamera.camera.far}
        fov={activeCamera.camera.fov}
        near={activeCamera.camera.near}
        position={activeCamera.transform.position}
        rotation={activeCamera.transform.rotation}
      />
    );
  }

  return <PerspectiveCamera makeDefault position={[5, 4, 6]} fov={48} />;
}

interface SharedSceneViewerProps {
  className?: string;
  controlsEnabled?: boolean;
  document: SceneDocument;
  showGrid?: boolean;
  transparentBackground?: boolean;
}

export function SharedSceneViewer({ className, controlsEnabled = true, document, showGrid = true, transparentBackground = false }: SharedSceneViewerProps) {
  const runtimeSceneId = document.activeSceneId ?? document.id;
  const [baselineVariables, setBaselineVariables] = useState(() => resolveLocalVariableValues(runtimeSceneId, document.variables ?? []));
  const [controlsEvent, setControlsEvent] = useState<RuntimeControlsEvent | null>(null);
  const [variables, setVariables] = useState(() => resolveLocalVariableValues(runtimeSceneId, document.variables ?? []));
  const [runtimeCameraId, setRuntimeCameraId] = useState<string | null>(null);
  const [runtimeAnimationOverrides, setRuntimeAnimationOverrides] = useState<RuntimeAnimationOverrides>({});
  const [runtimeAnimationStartedAt, setRuntimeAnimationStartedAt] = useState(() => getRuntimeNowSeconds());
  const [runtimeObjectInstances, setRuntimeObjectInstances] = useState<RuntimeObjectInstance[]>([]);
  const [runtimeSceneStateId, setRuntimeSceneStateId] = useState<string | null>(null);
  const [runtimeVisibilityOverrides, setRuntimeVisibilityOverrides] = useState<RuntimeVisibilityOverrides>({});
  const [runtimePropertyOverrides, setRuntimePropertyOverrides] = useState<RuntimePropertyOverrides>({});
  const [runtimeParticleOverrides, setRuntimeParticleOverrides] = useState<RuntimeParticleOverrides>({});
  const [runtimePhysicsTransforms, setRuntimePhysicsTransforms] = useState<RuntimePhysicsTransforms>({});
  const [runtimePhysicsResetKey, setRuntimePhysicsResetKey] = useState(0);
  const [runtimeTransitionOverrides, setRuntimeTransitionOverrides] = useState<RuntimeTransitionOverrides>({});
  const [runtimeSceneSettings, setRuntimeSceneSettings] = useState(() => resolveSceneSettings(document.sceneSettings));
  const renderObjects = useMemo(() => [...document.objects, ...runtimeObjectInstances], [document.objects, runtimeObjectInstances]);
  const tree = buildSceneTree(renderObjects);
  const animationTracks = useMemo(() => document.animationTracks ?? emptyAnimationTracks, [document.animationTracks]);
  const activeCamera = document.objects.find((object) => object.id === (runtimeCameraId ?? document.activeCameraId) && object.kind === "camera");
  const activeCameraTracks = activeCamera ? animationTracks.filter((track) => track.objectId === activeCamera.id) : [];
  const sceneSettings = resolveSceneSettings(runtimeSceneSettings ?? document.sceneSettings);
  const updateDynamicVariables = useCallback((runtime: DynamicVariableRuntime) => {
    setVariables((currentVariables) => resolveDynamicVariableValues(currentVariables, runtime));
  }, []);
  const emitControlsEvent = useCallback((event: ControlsTriggerEvent) => {
    setControlsEvent((currentEvent) => ({
      event,
      id: (currentEvent?.id ?? 0) + 1,
    }));
  }, []);

  const resetRuntime = useCallback(() => {
    const nextVariables = resolveLocalVariableValues(runtimeSceneId, document.variables ?? []);

    setBaselineVariables(nextVariables);
    setRuntimeCameraId(null);
    setRuntimeAnimationOverrides({});
    setRuntimeAnimationStartedAt(getRuntimeNowSeconds());
    setRuntimeObjectInstances([]);
    setRuntimeSceneStateId(null);
    setRuntimeParticleOverrides({});
    setRuntimePropertyOverrides({});
    setRuntimePhysicsTransforms({});
    setRuntimePhysicsResetKey((currentKey) => currentKey + 1);
    setRuntimeTransitionOverrides({});
    setRuntimeVisibilityOverrides({});
    setRuntimeSceneSettings(resolveSceneSettings(document.sceneSettings));
    setVariables(nextVariables);
  }, [document.sceneSettings, document.variables, runtimeSceneId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(resetRuntime, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resetRuntime]);
  useDynamicVariableRuntime({
    enabled: true,
    onTick: updateDynamicVariables,
    runKey: runtimeSceneId,
  });

  const handleInteraction = useCallback((interaction?: ObjectInteraction | null) => {
    runNetworkActions(interaction, variables, {
      sceneId: runtimeSceneId,
      sceneName: document.name,
    });

    const now = getRuntimeNowSeconds();
    const resetEnabled = interaction?.resetAction?.enabled === true;
    const clearLocalVariables = interaction?.localStorageAction?.clearLocalVariables === true;
    const targetCameraId = interaction?.cameraAction?.targetCameraId;
    const sceneTransition = resolveSceneTransition(interaction?.sceneTransitionAction, document.sceneStates ?? [], document.objects);

    if (resetEnabled) {
      setRuntimeCameraId(null);
      setRuntimeSceneStateId(null);
      setRuntimeSceneSettings(resolveSceneSettings(document.sceneSettings));
      setRuntimePhysicsTransforms({});
      setRuntimePhysicsResetKey((currentKey) => currentKey + 1);
    }

    if (sceneTransition) {
      setRuntimeCameraId(sceneTransition.runtimeCameraId);
      setRuntimeSceneStateId(sceneTransition.sceneState.id);
      setRuntimeSceneSettings(sceneTransition.runtimeSceneSettings ?? resolveSceneSettings(document.sceneSettings));
    }

    if (targetCameraId && document.objects.some((object) => object.id === targetCameraId && object.kind === "camera")) {
      setRuntimeCameraId(targetCameraId);
    }

    setRuntimeVisibilityOverrides((currentOverrides) => {
      const baseOverrides = resetEnabled ? {} : currentOverrides;
      const objectVisibilityOverrides = applyObjectVisibilityAction(interaction?.objectVisibilityAction, document.objects, baseOverrides);

      return sceneTransition ? applySceneStateVisibility(sceneTransition.sceneState, document.objects, objectVisibilityOverrides) : objectVisibilityOverrides;
    });

    setRuntimePropertyOverrides((currentOverrides) => {
      const baseOverrides = resetEnabled ? {} : currentOverrides;

      return applyPropertyToggleAction(interaction?.propertyToggleAction, document.objects, baseOverrides);
    });

    setRuntimeParticleOverrides((currentOverrides) => {
      const baseOverrides = resetEnabled ? {} : currentOverrides;

      return applyParticleAction(interaction?.particleAction, document.objects, baseOverrides);
    });

    setRuntimeObjectInstances((currentInstances) => {
      const baseInstances = resetEnabled ? [] : currentInstances;

      return applyObjectInstanceAction(interaction?.objectInstanceAction, document.objects, baseInstances);
    });

    if (resetEnabled) {
      setRuntimeAnimationStartedAt(now);
    }

    setRuntimeAnimationOverrides((currentOverrides) => {
      const nextStartedAt = resetEnabled ? now : runtimeAnimationStartedAt;
      const baseOverrides = resetEnabled ? {} : currentOverrides;

      return applyAnimationAction(interaction?.animationAction, document.objects, animationTracks, baseOverrides, now, nextStartedAt);
    });

    setRuntimeTransitionOverrides((currentOverrides) => {
      const baseOverrides = resetEnabled ? {} : currentOverrides;
      const objectTransitionOverrides = applyTransitionAction(interaction?.transitionAction, document.objects, baseOverrides, getTransitionNowSeconds());

      return sceneTransition
        ? applySceneStateTransitions(sceneTransition.sceneState, document.objects, objectTransitionOverrides, getTransitionNowSeconds(), sceneTransition.duration)
        : objectTransitionOverrides;
    });

    setVariables((currentVariables) => {
      const sourceVariables = resetEnabled ? structuredClone(baselineVariables) : currentVariables;
      const variables = clearLocalVariables ? resetLocalVariablesToBaseline(sourceVariables, baselineVariables) : sourceVariables;
      const nextVariables = applyVariableAction(variables, interaction?.variableAction);

      if (clearLocalVariables) {
        clearLocalVariableValues(runtimeSceneId, baselineVariables);
      } else if (resetEnabled || nextVariables !== currentVariables) {
        persistLocalVariables(runtimeSceneId, nextVariables);
      }

      return nextVariables;
    });
  }, [animationTracks, baselineVariables, document.name, document.objects, document.sceneSettings, document.sceneStates, runtimeAnimationStartedAt, runtimeSceneId, variables]);

  const handleInputControlChange = useCallback((variableId: string, value: SceneVariableValue) => {
    setVariables((currentVariables) => {
      const nextVariables = setSceneVariableValue(currentVariables, variableId, value);

      if (nextVariables !== currentVariables) {
        persistLocalVariables(runtimeSceneId, nextVariables);
      }

      return nextVariables;
    });
  }, [runtimeSceneId]);

  const runObjectInteraction = useCallback(
    (objectId: string) => {
      const object = renderObjects.find((entry) => entry.id === objectId);

      if (!object) {
        return false;
      }

      handleInteraction(object.interaction);

      return true;
    },
    [handleInteraction, renderObjects],
  );

  useSharedSceneRuntimeApi({
    activeCameraId: activeCamera?.id ?? null,
    document,
    resetRuntime,
    runObjectInteraction,
    runtimeSceneStateId,
    runtimeVisibilityOverrides,
    setRuntimeCameraId,
    setRuntimeVisibilityOverrides,
    setVariables,
    variables,
  });

  return (
    <div
      className={cn("relative h-[min(78dvh,760px)] min-h-[420px] overflow-hidden rounded-md border border-border", className)}
      style={{ backgroundColor: transparentBackground ? "transparent" : sceneSettings.backgroundColor }}
    >
      <WebGLRuntimeGuard surfaceLabel="Shared scene viewer">
        <Canvas
          dpr={[1, 2]}
          gl={{ alpha: transparentBackground, antialias: true }}
          shadows
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
            if (transparentBackground) {
              gl.setClearAlpha(0);
            }
          }}
        >
          <MediaActionProvider>
            <ViewerCamera
              activeCamera={activeCamera}
              animationTracks={activeCameraTracks}
              runtimeAnimation={activeCamera ? runtimeAnimationOverrides[activeCamera.id] : undefined}
              runtimeTransition={activeCamera ? runtimeTransitionOverrides[activeCamera.id] : undefined}
            />
            <KeyboardInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <GameControlsInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <NetworkInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              sceneId={runtimeSceneId}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <ControlsInteractionRunner
              controlsEvent={controlsEvent}
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <DistanceInteractionRunner
              animationTracks={animationTracks}
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimePhysicsTransforms={runtimePhysicsTransforms}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <CollisionInteractionRunner
              animationTracks={animationTracks}
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimePhysicsTransforms={runtimePhysicsTransforms}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <TriggerAreaInteractionRunner
              animationTracks={animationTracks}
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimePhysicsTransforms={runtimePhysicsTransforms}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <ResizeInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <ScrollInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <StateChangeInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              runtimeSceneStateId={runtimeSceneStateId}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <VariableChangeInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <StartInteractionRunner
              enabled
              objects={renderObjects}
              onInteraction={handleInteraction}
              runKey={runtimeSceneId}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <PhysicsRuntimeRunner
              animationTracks={animationTracks}
              enabled
              objects={renderObjects}
              onTransformsChange={setRuntimePhysicsTransforms}
              resetKey={runtimePhysicsResetKey}
              runKey={runtimeSceneId}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={variables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <SceneEnvironment settings={sceneSettings} transparentBackground={transparentBackground} />
            <ScenePostProcessing settings={sceneSettings} />
            {showGrid ? <Grid args={[24, 24]} cellColor="#2f3740" cellSize={0.5} fadeDistance={18} fadeStrength={1} sectionColor="#4c5866" sectionSize={2} /> : null}
            {tree.map((node) => (
              <SharedSceneObject
                key={node.object.id}
                animationTracks={animationTracks}
                animationOverrides={runtimeAnimationOverrides}
                node={node}
                onInteraction={handleInteraction}
                particleOverrides={runtimeParticleOverrides}
                physicsTransforms={runtimePhysicsTransforms}
                propertyOverrides={runtimePropertyOverrides}
                runtimeObjects={renderObjects}
                transitionOverrides={runtimeTransitionOverrides}
                variables={variables}
                visibilityOverrides={runtimeVisibilityOverrides}
              />
            ))}
            {controlsEnabled ? (
              <OrbitControls
                enableDamping
                makeDefault
                onChange={() => emitControlsEvent("change")}
                onEnd={() => emitControlsEvent("end")}
                onStart={() => emitControlsEvent("start")}
              />
            ) : null}
          </MediaActionProvider>
        </Canvas>
      </WebGLRuntimeGuard>
      <InputControlsOverlay inputControls={document.inputControls ?? []} variables={variables} onVariableChange={handleInputControlChange} />
    </div>
  );
}
