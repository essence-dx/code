"use client";

import { useEffect, useMemo, useRef } from "react";
import { Edges } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { resolveParticleSettings } from "../../scene/particle-settings";
import type { ParticleSettings, SceneObject } from "../../types";

export function ParticleEmitter({ object, settings, selected = false }: { object: SceneObject; selected?: boolean; settings?: Partial<ParticleSettings> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = resolveParticleSettings(object, settings);
  const positions = useMemo(() => {
    const values = new Float32Array(particles.count * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let index = 0; index < particles.count; index += 1) {
      const distance = particles.spread * (0.22 + (((index * 37) % 100) / 100) * 0.78);
      const angle = index * goldenAngle;
      const vertical = (((index * 53) % 100) / 100 - 0.5) * particles.spread;

      values[index * 3] = Math.cos(angle) * distance * 0.48;
      values[index * 3 + 1] = vertical;
      values[index * 3 + 2] = Math.sin(angle) * distance * 0.48;
    }

    return values;
  }, [particles.count, particles.spread]);
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return nextGeometry;
  }, [positions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || particles.speed <= 0) {
      return;
    }

    pointsRef.current.rotation.y = clock.elapsedTime * particles.speed * 0.24;
    pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * particles.speed * 0.18) * 0.08;
  });

  return (
    <group>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          color={object.material.color}
          depthWrite={false}
          opacity={object.material.opacity}
          size={particles.size}
          sizeAttenuation
          transparent
        />
      </points>
      {selected ? (
        <mesh>
          <sphereGeometry args={[particles.spread * 0.55, 24, 16]} />
          <meshBasicMaterial color="#ffffff" opacity={0.14} toneMapped={false} transparent wireframe />
          <Edges color="#ffffff" scale={1.01} threshold={15} />
        </mesh>
      ) : null}
    </group>
  );
}
