"use client";

import { useEffect, useRef, useState } from "react";
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMediaActionRegistry } from "../../interactions/media-actions";
import type { SceneObject } from "../../types";

export function AudioMarker({ active = false, object, selected = false }: { active?: boolean; object: SceneObject; selected?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = object.audio;
  const { registerMediaTarget } = useMediaActionRegistry();

  useEffect(() => {
    if (!audio?.sourceDataUrl) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    const element = new Audio(audio.sourceDataUrl);
    element.loop = audio.loop;
    element.muted = audio.muted;
    element.volume = audio.volume;
    audioRef.current = element;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);
    element.addEventListener("ended", handlePause);
    const unregister = registerMediaTarget(object.id, {
      pause: () => element.pause(),
      play: () => {
        if (active) {
          void element.play().catch(() => undefined);
        }
      },
      restart: () => {
        if (active) {
          element.currentTime = 0;
          void element.play().catch(() => undefined);
        }
      },
      toggle: () => {
        if (!active) {
          return;
        }

        if (element.paused) {
          void element.play().catch(() => undefined);
        } else {
          element.pause();
        }
      },
    });

    if (active && audio.autoplay) {
      void element.play().catch(() => undefined);
    }

    return () => {
      element.pause();
      unregister();
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
      element.removeEventListener("ended", handlePause);
      if (audioRef.current === element) {
        audioRef.current = null;
      }
    };
  }, [active, audio?.autoplay, audio?.loop, audio?.muted, audio?.sourceDataUrl, audio?.volume, object.id, registerMediaTarget]);

  useEffect(() => {
    const element = audioRef.current;

    if (!element || active) {
      return;
    }

    element.pause();
    element.currentTime = 0;
  }, [active]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!active) {
      return;
    }

    event.stopPropagation();
    const element = audioRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }

  return (
    <group onClick={handleClick}>
      <mesh>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial color={playing ? "#38bdf8" : object.material.color} emissive={playing ? "#075985" : "#000000"} roughness={0.38} />
        {selected ? <Edges color="#e8fff8" scale={1.16} threshold={15} /> : null}
      </mesh>
      <mesh position={[0.24, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.28, 24]} />
        <meshStandardMaterial color={playing ? "#7dd3fc" : object.material.color} roughness={0.5} />
      </mesh>
    </group>
  );
}
