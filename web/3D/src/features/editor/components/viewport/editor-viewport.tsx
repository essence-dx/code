"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Grid,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import type * as THREE from "three";
import { evaluateAnimatedTransform } from "../../animation/evaluate-animation";
import { CollisionInteractionRunner } from "../../interactions/collision-interaction-runner";
import { ControlsInteractionRunner } from "../../interactions/controls-interaction-runner";
import type {
  ControlsTriggerEvent,
  RuntimeControlsEvent,
} from "../../interactions/controls-triggers";
import { DistanceInteractionRunner } from "../../interactions/distance-interaction-runner";
import {
  getRuntimeNowSeconds,
  resolveRuntimeAnimationElapsed,
  type RuntimeAnimationPlayback,
} from "../../interactions/animation-actions";
import { GameControlsInteractionRunner } from "../../interactions/game-controls-interaction-runner";
import { KeyboardInteractionRunner } from "../../interactions/keyboard-interaction-runner";
import { MediaActionProvider } from "../../interactions/media-actions";
import { NetworkInteractionRunner } from "../../interactions/network-interaction-runner";
import { ResizeInteractionRunner } from "../../interactions/resize-interaction-runner";
import { ScrollInteractionRunner } from "../../interactions/scroll-interaction-runner";
import { StartInteractionRunner } from "../../interactions/start-interaction-runner";
import { StateChangeInteractionRunner } from "../../interactions/state-change-interaction-runner";
import { TriggerAreaInteractionRunner } from "../../interactions/trigger-area-interaction-runner";
import { VariableChangeInteractionRunner } from "../../interactions/variable-change-interaction-runner";
import {
  getRuntimeNowSeconds as getTransitionNowSeconds,
  resolveRuntimeTransitionTransform,
  type RuntimeTransition,
} from "../../interactions/transition-actions";
import { PhysicsRuntimeRunner } from "../../runtime/physics-runtime-runner";
import { useDynamicVariableRuntime } from "../../runtime/use-dynamic-variable-runtime";
import { buildSceneTree } from "../../scene/scene-tree-utils";
import { resolveSceneSettings } from "../../scene/default-document";
import { useEditorStore } from "../../store/editor-store";
import { CommentPins } from "@/features/projects/components/comment-pins";
import { ProjectPresenceLayer } from "@/features/projects/components/project-presence-layer";
import type { ProjectPresenceCursor } from "@/features/projects/presence-types";
import { InputControlsOverlay } from "../runtime/input-controls-overlay";
import { EditableObject } from "./editable-object";
import { SceneEnvironment } from "./scene-environment";
import { ScenePostProcessing } from "./scene-post-processing";
import { WebGLRuntimeGuard } from "./webgl-runtime-guard";
import type {
  AnimationTrack,
  SceneInputControl,
  SceneObject,
  SceneVariable,
  Transform,
} from "../../types";

const emptyInputControls: SceneInputControl[] = [];
const emptyAnimationTracks: AnimationTrack[] = [];
const emptyVariables: SceneVariable[] = [];

function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

function clampCursor(value: number) {
  return Math.min(1, Math.max(0, value));
}

function CameraRig({
  activeCamera,
  animationTracks,
  playModeEnabled,
  previewEnabled,
  runtimeAnimation,
  runtimeTransition,
  surfaceMode,
}: {
  activeCamera: SceneObject | undefined;
  animationTracks: AnimationTrack[];
  playModeEnabled: boolean;
  previewEnabled: boolean;
  runtimeAnimation?: RuntimeAnimationPlayback;
  runtimeTransition?: RuntimeTransition;
  surfaceMode: "2d" | "3d";
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const playStartedAt = useRef<number | null>(null);
  const wasAnimating = useRef(false);
  const wasRuntimeTransforming = useRef(false);

  useFrame(({ clock }) => {
    if (!cameraRef.current || !activeCamera) {
      return;
    }

    if (!previewEnabled || !playModeEnabled || animationTracks.length === 0) {
      if (
        wasAnimating.current ||
        wasRuntimeTransforming.current ||
        runtimeTransition
      ) {
        applyTransform(cameraRef.current, activeCamera.transform);
      }

      playStartedAt.current = null;
      wasAnimating.current = false;
      if (runtimeTransition && playModeEnabled) {
        applyTransform(
          cameraRef.current,
          resolveRuntimeTransitionTransform(
            activeCamera.transform,
            runtimeTransition,
            getTransitionNowSeconds(),
          ),
        );
        wasRuntimeTransforming.current = true;
      } else {
        wasRuntimeTransforming.current = false;
      }
      return;
    }

    if (playStartedAt.current === null) {
      playStartedAt.current = clock.elapsedTime;
    }

    wasAnimating.current = true;
    const animatedTransform = evaluateAnimatedTransform(
      activeCamera.transform,
      animationTracks,
      resolveRuntimeAnimationElapsed(
        runtimeAnimation,
        clock.elapsedTime - playStartedAt.current,
        getRuntimeNowSeconds(),
      ),
    );
    applyTransform(
      cameraRef.current,
      resolveRuntimeTransitionTransform(
        animatedTransform,
        runtimeTransition,
        getTransitionNowSeconds(),
      ),
    );
    wasRuntimeTransforming.current = Boolean(runtimeTransition);
  });

  if (previewEnabled && activeCamera?.camera) {
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

  if (surfaceMode === "2d") {
    return (
      <OrthographicCamera
        makeDefault
        far={1000}
        near={-1000}
        position={[0, 0, 12]}
        zoom={72}
      />
    );
  }

  return <PerspectiveCamera makeDefault position={[5, 4, 6]} fov={48} />;
}

type EditorViewportProps = {
  collaborationEnabled?: boolean;
};

export function EditorViewport({
  collaborationEnabled = true,
}: EditorViewportProps) {
  const [controlsEvent, setControlsEvent] =
    useState<RuntimeControlsEvent | null>(null);
  const cursorRef = useRef<ProjectPresenceCursor | null>(null);
  const objects = useEditorStore((state) => state.document.objects);
  const documentId = useEditorStore((state) => state.document.id);
  const activeSceneId = useEditorStore(
    (state) => state.document.activeSceneId ?? state.document.id,
  );
  const animationTracks = useEditorStore(
    (state) => state.document.animationTracks,
  );
  const activeCameraId = useEditorStore(
    (state) => state.document.activeCameraId,
  );
  const runtimeCameraId = useEditorStore((state) => state.runtimeCameraId);
  const runtimeAnimationOverrides = useEditorStore(
    (state) => state.runtimeAnimationOverrides,
  );
  const runtimePhysicsTransforms = useEditorStore(
    (state) => state.runtimePhysicsTransforms,
  );
  const runtimePhysicsResetKey = useEditorStore(
    (state) => state.runtimePhysicsResetKey,
  );
  const runtimeTransitionOverrides = useEditorStore(
    (state) => state.runtimeTransitionOverrides,
  );
  const runtimeObjectInstances = useEditorStore(
    (state) => state.runtimeObjectInstances,
  );
  const runtimeSceneStateId = useEditorStore(
    (state) => state.runtimeSceneStateId,
  );
  const runtimeVisibilityOverrides = useEditorStore(
    (state) => state.runtimeVisibilityOverrides,
  );
  const inputControls = useEditorStore((state) => state.document.inputControls);
  const variables = useEditorStore((state) => state.document.variables);
  const documentSceneSettings = useEditorStore(
    (state) => state.document.sceneSettings,
  );
  const runtimeSceneSettings = useEditorStore(
    (state) => state.runtimeSceneSettings,
  );
  const cameraPreviewEnabled = useEditorStore(
    (state) => state.cameraPreviewEnabled,
  );
  const playModeEnabled = useEditorStore((state) => state.playModeEnabled);
  const mode = useEditorStore((state) => state.mode);
  const surfaceMode = useEditorStore((state) => state.surfaceMode);
  const selectObject = useEditorStore((state) => state.selectObject);
  const hoveredObjectId = useEditorStore((state) => state.hoveredObjectId);
  const hoverObject = useEditorStore((state) => state.hoverObject);
  const recordViewportInteractionEvent = useEditorStore(
    (state) => state.recordViewportInteractionEvent,
  );
  const setRuntimeVariableValue = useEditorStore(
    (state) => state.setRuntimeVariableValue,
  );
  const setRuntimePhysicsTransforms = useEditorStore(
    (state) => state.setRuntimePhysicsTransforms,
  );
  const updateDynamicVariables = useEditorStore(
    (state) => state.updateDynamicVariables,
  );
  const runInteraction = useEditorStore((state) => state.runInteraction);
  const resolvedInputControls = inputControls ?? emptyInputControls;
  const resolvedAnimationTracks = animationTracks ?? emptyAnimationTracks;
  const resolvedVariables = variables ?? emptyVariables;
  const sceneSettings = useMemo(
    () =>
      resolveSceneSettings(
        playModeEnabled && runtimeSceneSettings
          ? runtimeSceneSettings
          : documentSceneSettings,
      ),
    [documentSceneSettings, playModeEnabled, runtimeSceneSettings],
  );
  const renderObjects = playModeEnabled
    ? [...objects, ...runtimeObjectInstances]
    : objects;
  const activeCamera = objects.find(
    (object) =>
      object.id ===
        (playModeEnabled
          ? (runtimeCameraId ?? activeCameraId)
          : activeCameraId) && object.kind === "camera",
  );
  const tree = buildSceneTree(renderObjects);
  const presentationModeEnabled = cameraPreviewEnabled || playModeEnabled;
  const orbitControlsEnabled =
    !cameraPreviewEnabled && (!playModeEnabled || !activeCamera);
  const viewportCursor = playModeEnabled
    ? "default"
    : hoveredObjectId
      ? mode === "move"
        ? "grab"
        : "pointer"
      : mode === "select"
        ? "default"
        : "crosshair";
  const activeCameraTracks = activeCamera
    ? resolvedAnimationTracks.filter(
        (track) => track.objectId === activeCamera.id,
      )
    : emptyAnimationTracks;
  const emitControlsEvent = (event: ControlsTriggerEvent) => {
    setControlsEvent((currentEvent) => ({
      event,
      id: (currentEvent?.id ?? 0) + 1,
    }));
  };
  const recordPointerEvent = (
    type: "pointer-down" | "pointer-leave" | "pointer-move" | "pointer-up",
    event: PointerEvent<HTMLElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointer = {
      button: event.button,
      x: clampCursor((event.clientX - bounds.left) / bounds.width),
      y: clampCursor((event.clientY - bounds.top) / bounds.height),
    };

    recordViewportInteractionEvent({
      at: new Date().toISOString(),
      kind: "pointer",
      pointer,
      type,
    });
  };
  const recordCameraEvent = (
    controlEvent: "orbit-change" | "orbit-end" | "orbit-start",
  ) => {
    recordViewportInteractionEvent({
      at: new Date().toISOString(),
      camera: {
        controlEvent,
        mode: surfaceMode,
      },
      kind: "camera",
      type: "camera-control",
    });
  };
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();

    cursorRef.current = {
      x: clampCursor((event.clientX - bounds.left) / bounds.width),
      y: clampCursor((event.clientY - bounds.top) / bounds.height),
    };

  };
  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    recordPointerEvent("pointer-leave", event);
    hoverObject(null);
  };
  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    recordPointerEvent("pointer-down", event);

    if (!playModeEnabled && event.button === 0 && hoveredObjectId) {
      selectObject(hoveredObjectId);
    }
  };
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      recordViewportInteractionEvent({
        at: new Date().toISOString(),
        key: event.key,
        kind: "keyboard",
        type: "keyboard-down",
      });
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      recordViewportInteractionEvent({
        at: new Date().toISOString(),
        key: event.key,
        kind: "keyboard",
        type: "keyboard-up",
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [recordViewportInteractionEvent]);
  useDynamicVariableRuntime({
    enabled: playModeEnabled,
    onTick: updateDynamicVariables,
    runKey: activeSceneId,
  });

  return (
    <section
      className="relative h-full min-h-0 w-full overflow-hidden"
      data-testid="editor-viewport"
      style={{
        backgroundColor: sceneSettings.backgroundColor,
        cursor: viewportCursor,
      }}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => recordPointerEvent("pointer-up", event)}
    >
      <WebGLRuntimeGuard surfaceLabel="Editor viewport">
        <Canvas
          className="h-full w-full"
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          shadows
          style={{ cursor: viewportCursor }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
          }}
          onPointerMissed={() => {
            recordViewportInteractionEvent({
              at: new Date().toISOString(),
              kind: "pointer",
              type: "pointer-miss",
            });
            hoverObject(null);
            if (!playModeEnabled && !hoveredObjectId) {
              selectObject(null);
            }
          }}
        >
          <MediaActionProvider>
            <CameraRig
              activeCamera={activeCamera}
              animationTracks={activeCameraTracks}
              playModeEnabled={playModeEnabled}
              previewEnabled={presentationModeEnabled}
              runtimeAnimation={
                activeCamera
                  ? runtimeAnimationOverrides[activeCamera.id]
                  : undefined
              }
              runtimeTransition={
                activeCamera
                  ? runtimeTransitionOverrides[activeCamera.id]
                  : undefined
              }
              surfaceMode={surfaceMode}
            />
            <KeyboardInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <GameControlsInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <NetworkInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              sceneId={documentId}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <ControlsInteractionRunner
              controlsEvent={controlsEvent}
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <DistanceInteractionRunner
              animationTracks={resolvedAnimationTracks}
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimePhysicsTransforms={runtimePhysicsTransforms}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <CollisionInteractionRunner
              animationTracks={resolvedAnimationTracks}
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimePhysicsTransforms={runtimePhysicsTransforms}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <TriggerAreaInteractionRunner
              animationTracks={resolvedAnimationTracks}
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimePhysicsTransforms={runtimePhysicsTransforms}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <ResizeInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <ScrollInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <StateChangeInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              runtimeSceneStateId={runtimeSceneStateId}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <VariableChangeInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <StartInteractionRunner
              enabled={playModeEnabled}
              objects={renderObjects}
              onInteraction={runInteraction}
              runKey={documentId}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <PhysicsRuntimeRunner
              animationTracks={resolvedAnimationTracks}
              enabled={playModeEnabled}
              objects={renderObjects}
              onTransformsChange={setRuntimePhysicsTransforms}
              resetKey={runtimePhysicsResetKey}
              runKey={activeSceneId}
              runtimeAnimationOverrides={runtimeAnimationOverrides}
              runtimeTransitionOverrides={runtimeTransitionOverrides}
              variables={resolvedVariables}
              visibilityOverrides={runtimeVisibilityOverrides}
            />
            <SceneEnvironment settings={sceneSettings} />
            <ScenePostProcessing settings={sceneSettings} />
            {!presentationModeEnabled ? (
              <Grid
                args={[24, 24]}
                cellColor="#2f3740"
                cellSize={0.5}
                fadeDistance={18}
                fadeStrength={1}
                sectionColor="#4c5866"
                sectionSize={2}
              />
            ) : null}
            {tree.map((node) => (
              <EditableObject
                key={node.object.id}
                node={node}
                runtimeObjects={renderObjects}
              />
            ))}
            {collaborationEnabled && !playModeEnabled ? <CommentPins /> : null}
            {orbitControlsEnabled ? (
              <OrbitControls
                enableDamping
                enableRotate={surfaceMode !== "2d"}
                makeDefault
                onChange={() => {
                  emitControlsEvent("change");
                }}
                onEnd={() => {
                  emitControlsEvent("end");
                  recordCameraEvent("orbit-end");
                }}
                onStart={() => {
                  emitControlsEvent("start");
                  recordCameraEvent("orbit-start");
                }}
              />
            ) : null}
          </MediaActionProvider>
        </Canvas>
      </WebGLRuntimeGuard>
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
        {playModeEnabled
          ? "Play mode"
          : cameraPreviewEnabled
            ? "Camera preview"
            : surfaceMode === "2d"
              ? "2D canvas"
              : "Orbit or use the transform tools"}
      </div>
      {collaborationEnabled ? (
        <ProjectPresenceLayer cursorRef={cursorRef} />
      ) : null}
      {playModeEnabled ? (
        <InputControlsOverlay
          inputControls={resolvedInputControls}
          variables={resolvedVariables}
          onVariableChange={setRuntimeVariableValue}
        />
      ) : null}
    </section>
  );
}
