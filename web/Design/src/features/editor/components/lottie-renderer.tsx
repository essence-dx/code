"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

import type { DesignElement } from "@/features/editor/types";

export function LottieRenderer({
  element,
  baseStyle,
}: {
  element: Extract<DesignElement, { type: "lottie" }>;
  baseStyle: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let destroyed = false;
    let animation: AnimationItem | null = null;
    const target = container;

    async function loadAnimation() {
      try {
        const lottie = (await import("lottie-web")).default;
        const animationData = JSON.parse(element.lottieJson) as unknown;

        if (destroyed) return;

        target.replaceChildren();
        animation = lottie.loadAnimation({
          container: target,
          renderer: "svg",
          loop: element.loop,
          autoplay: element.autoplay,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });
        animation.setSpeed(Math.max(0.1, Math.min(4, element.playbackSpeed)));
      } catch {
        target.replaceChildren();
        target.textContent = "Lottie unavailable";
      }
    }

    void loadAnimation();

    return () => {
      destroyed = true;
      animation?.destroy();
      target.replaceChildren();
    };
  }, [
    element.autoplay,
    element.loop,
    element.lottieJson,
    element.playbackSpeed,
  ]);

  return (
    <div
      style={{
        ...baseStyle,
        display: "grid",
        placeItems: "center",
        background: element.backgroundColor,
        overflow: "hidden",
      }}
      aria-label={element.name}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
