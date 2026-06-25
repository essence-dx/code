"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { evaluateAnimatedTransform } from "../../animation/evaluate-animation";
import { isTransformAnimationProperty } from "../../animation/animation-registry";
import { getRuntimeNowSeconds, resolveRuntimeAnimationElapsed, type RuntimeAnimationPlayback } from "../../interactions/animation-actions";
import { composeClonerAnimatedTransform } from "../../scene/cloner-settings";
import type { AnimationTrack, Transform } from "../../types";

function applyTransform(object: THREE.Object3D, transform: Transform) {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

export function ClonerInstanceGroup({
  animationDelay = 0,
  animationEnabled,
  baseTransform,
  children,
  cloneTransform,
  runtimeAnimation,
  staggerEnabled,
  tracks,
}: {
  animationDelay?: number;
  animationEnabled: boolean;
  baseTransform: Transform;
  children: ReactNode;
  cloneTransform: Transform;
  runtimeAnimation?: RuntimeAnimationPlayback;
  staggerEnabled: boolean;
  tracks: AnimationTrack[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const playStartedAtRef = useRef<number | null>(null);
  const wasAnimatingRef = useRef(false);
  const hasTransformTracks = tracks.some((track) => isTransformAnimationProperty(track.property));

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    if (!animationEnabled || !staggerEnabled || !hasTransformTracks) {
      if (wasAnimatingRef.current) {
        applyTransform(groupRef.current, cloneTransform);
      }

      playStartedAtRef.current = null;
      wasAnimatingRef.current = false;
      return;
    }

    if (playStartedAtRef.current === null) {
      playStartedAtRef.current = clock.elapsedTime;
    }

    const elapsed = Math.max(0, resolveRuntimeAnimationElapsed(runtimeAnimation, clock.elapsedTime - playStartedAtRef.current, getRuntimeNowSeconds()) - animationDelay);
    const animatedTransform = evaluateAnimatedTransform(baseTransform, tracks, elapsed);

    applyTransform(groupRef.current, composeClonerAnimatedTransform(cloneTransform, baseTransform, animatedTransform));
    wasAnimatingRef.current = true;
  });

  return (
    <group ref={groupRef} position={cloneTransform.position} rotation={cloneTransform.rotation} scale={cloneTransform.scale}>
      {children}
    </group>
  );
}
