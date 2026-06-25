"use client";

import { useEffect, useState } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject } from "../../types";

export function ImagePlane({ clippingPlanes = [], object, selected = false }: { clippingPlanes?: THREE.Plane[]; object: SceneObject; selected?: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const sourceDataUrl = object.image?.sourceDataUrl ?? null;

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;

    if (!sourceDataUrl) {
      setTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      sourceDataUrl,
      (nextTexture) => {
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.needsUpdate = true;
        loadedTexture = nextTexture;

        if (!active) {
          nextTexture.dispose();
          return;
        }

        setTexture((currentTexture) => {
          currentTexture?.dispose();
          return nextTexture;
        });
      },
      undefined,
      () => {
        if (active) {
          setTexture((currentTexture) => {
            currentTexture?.dispose();
            return null;
          });
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [sourceDataUrl]);

  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[object.image?.width ?? 2, object.image?.height ?? 2]} />
      <meshBasicMaterial
        clippingPlanes={clippingPlanes.length ? clippingPlanes : undefined}
        color={object.material.color}
        map={texture ?? undefined}
        opacity={object.material.opacity}
        side={THREE.DoubleSide}
        transparent
        wireframe={object.material.wireframe}
      />
      {selected ? <Edges color="#e8fff8" scale={1.02} threshold={15} /> : null}
    </mesh>
  );
}
