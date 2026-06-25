"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Clone, Splat, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { LoopOnce, LoopRepeat, Mesh, type Group, type Object3D } from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { ModelSettings } from "../../types";
import {
  enableThreeResourceCache,
  getCachedObjectUrl,
} from "./resource-cache";

enableThreeResourceCache();

function ModelPlaceholder({ failed = false, selected = false }: { failed?: boolean; selected?: boolean }) {
  return (
    <mesh>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshBasicMaterial color={failed ? "#f87171" : selected ? "#ffffff" : "#a1a1aa"} wireframe toneMapped={false} />
    </mesh>
  );
}

class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useFetchableModelUrl(sourceDataUrl: string) {
  return useMemo(() => {
    if (!sourceDataUrl.startsWith("data:")) {
      return sourceDataUrl;
    }

    try {
      return getCachedObjectUrl(sourceDataUrl);
    } catch {
      return null;
    }
  }, [sourceDataUrl]);
}

function getMorphTargetIndex(mesh: Mesh, model?: ModelSettings) {
  const influences = mesh.morphTargetInfluences;

  if (!influences?.length) {
    return null;
  }

  const targetName = model?.morphTargetName?.trim();

  if (targetName && mesh.morphTargetDictionary && typeof mesh.morphTargetDictionary[targetName] === "number") {
    return mesh.morphTargetDictionary[targetName];
  }

  return Math.min(influences.length - 1, Math.max(0, model?.morphTargetIndex ?? 0));
}

function applyMorphTargets(root: Object3D | null, model: ModelSettings | undefined, weight: number) {
  if (!root) {
    return;
  }

  root.traverse((node) => {
    if (!(node instanceof Mesh) || !node.morphTargetInfluences?.length) {
      return;
    }

    const targetIndex = getMorphTargetIndex(node, model);

    if (targetIndex === null) {
      return;
    }

    node.morphTargetInfluences.fill(0);
    node.morphTargetInfluences[targetIndex] = weight;
  });
}

function GltfModelClone({ model, sourceDataUrl }: { model?: ModelSettings; sourceDataUrl: string }) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(sourceDataUrl);
  const { actions } = useAnimations(gltf.animations, groupRef);
  const animationAutoPlay = model?.animationAutoPlay ?? true;
  const animationLoop = model?.animationLoop ?? true;
  const animationSpeed = model?.animationSpeed ?? 1;
  const morphTargetAutoPlay = model?.morphTargetAutoPlay ?? false;
  const morphTargetSpeed = model?.morphTargetSpeed ?? 1;
  const morphTargetWeight = model?.morphTargetWeight ?? 0;
  const fallbackClipName = gltf.animations[0]?.name;
  const clipName = model?.animationClipName && actions[model.animationClipName] ? model.animationClipName : fallbackClipName;

  useEffect(() => {
    Object.values(actions).forEach((action) => action?.stop());

    if (!animationAutoPlay || !clipName) {
      return;
    }

    const action = actions[clipName];

    if (!action) {
      return;
    }

    action.setEffectiveTimeScale(animationSpeed);
    Object.assign(action, { clampWhenFinished: !animationLoop });
    action.setLoop(animationLoop ? LoopRepeat : LoopOnce, animationLoop ? Infinity : 1);
    action.reset().fadeIn(0.08).play();

    return () => {
      action.fadeOut(0.08);
      action.stop();
    };
  }, [actions, animationAutoPlay, animationLoop, animationSpeed, clipName]);

  useFrame(({ clock }) => {
    const animatedWeight = morphTargetAutoPlay ? ((Math.sin(clock.elapsedTime * Math.PI * morphTargetSpeed) + 1) / 2) * morphTargetWeight : morphTargetWeight;

    applyMorphTargets(groupRef.current, model, animatedWeight);
  });

  return (
    <group ref={groupRef}>
      <Clone deep object={gltf.scene} />
    </group>
  );
}

function ObjModelClone({ sourceDataUrl }: { sourceDataUrl: string }) {
  const object = useLoader(OBJLoader, sourceDataUrl);

  return <Clone deep object={object} />;
}

function StlModelClone({ color, sourceDataUrl }: { color: string; sourceDataUrl: string }) {
  const geometry = useLoader(STLLoader, sourceDataUrl);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.72} metalness={0.04} />
    </mesh>
  );
}

function GaussianSplatModel({ model, selected, sourceDataUrl }: { model?: ModelSettings; selected?: boolean; sourceDataUrl: string }) {
  const sourceUrl = useFetchableModelUrl(sourceDataUrl);

  if (!sourceUrl) {
    return <ModelPlaceholder selected={selected} />;
  }

  return (
    <Splat
      alphaHash={model?.splatAlphaHash ?? false}
      alphaTest={model?.splatAlphaTest ?? 0}
      scale={model?.splatPointScale ?? 1}
      src={sourceUrl}
      toneMapped={model?.splatToneMapped ?? false}
    />
  );
}

export function ImportedModel({ materialColor = "#a1a1aa", model, selected = false, sourceDataUrl }: { materialColor?: string; model?: ModelSettings; selected?: boolean; sourceDataUrl?: string }) {
  const source = model?.sourceDataUrl ?? sourceDataUrl;
  const format = model?.format ?? "gltf";

  if (!source) {
    return <ModelPlaceholder selected={selected} />;
  }

  return (
    <ModelErrorBoundary fallback={<ModelPlaceholder failed selected={selected} />}>
      <Suspense fallback={<ModelPlaceholder selected={selected} />}>
        {format === "obj" ? (
          <ObjModelClone sourceDataUrl={source} />
        ) : format === "stl" ? (
          <StlModelClone color={materialColor} sourceDataUrl={source} />
        ) : format === "splat" ? (
          <GaussianSplatModel model={model} selected={selected} sourceDataUrl={source} />
        ) : (
          <GltfModelClone model={model} sourceDataUrl={source} />
        )}
      </Suspense>
    </ModelErrorBoundary>
  );
}
