"use client";

import { useEffect, useState } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { useMediaActionRegistry } from "../../interactions/media-actions";
import type { SceneObject } from "../../types";

export function VideoPlane({ clippingPlanes = [], object, selected = false }: { clippingPlanes?: THREE.Plane[]; object: SceneObject; selected?: boolean }) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  const { registerMediaTarget } = useMediaActionRegistry();
  const sourceDataUrl = object.video?.sourceDataUrl ?? null;
  const loop = object.video?.loop ?? true;
  const muted = object.video?.muted ?? true;

  useEffect(() => {
    if (!sourceDataUrl) {
      setTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      return;
    }

    const video = document.createElement("video");
    video.src = sourceDataUrl;
    video.loop = loop;
    video.muted = muted;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    const unregister = registerMediaTarget(object.id, {
      pause: () => video.pause(),
      play: () => {
        void video.play().catch(() => undefined);
      },
      restart: () => {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      },
      toggle: () => {
        if (video.paused) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
    });

    const nextTexture = new THREE.VideoTexture(video);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.needsUpdate = true;

    setTexture((currentTexture) => {
      currentTexture?.dispose();
      return nextTexture;
    });
    void video.play().catch(() => undefined);

    return () => {
      video.pause();
      unregister();
      video.removeAttribute("src");
      video.load();
      nextTexture.dispose();
    };
  }, [loop, muted, object.id, registerMediaTarget, sourceDataUrl]);

  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[object.video?.width ?? 2, object.video?.height ?? 2]} />
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
