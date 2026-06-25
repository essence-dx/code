import type { CSSProperties } from "react";

import type { ImageElement } from "@/features/editor/types";

export function getImageFrameStyle(element: ImageElement): CSSProperties {
  return {
    ...getMaskShapeStyle(element),
    position: "relative",
    overflow: "hidden",
  };
}

export function getImageFrameOverlayStyle(
  element: ImageElement,
): CSSProperties {
  if (!element.frameEnabled || (element.frameWidth ?? 0) <= 0) {
    return {
      display: "none",
    };
  }

  return {
    ...getMaskShapeStyle(element),
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    boxShadow: `inset 0 0 0 ${element.frameWidth ?? 0}px ${
      element.frameColor ?? "#ffffff"
    }`,
  };
}

function getMaskShapeStyle(element: ImageElement): CSSProperties {
  const shape = element.maskShape ?? "rectangle";

  if (shape === "circle") {
    return {
      borderRadius: "9999px",
    };
  }

  if (shape === "rounded") {
    return {
      borderRadius: element.maskRadius ?? 24,
    };
  }

  if (shape === "diamond") {
    return {
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    };
  }

  if (shape === "arch") {
    return {
      borderRadius: "9999px 9999px 18px 18px / 72% 72% 18px 18px",
    };
  }

  return {
    borderRadius: element.maskRadius ?? 0,
  };
}
