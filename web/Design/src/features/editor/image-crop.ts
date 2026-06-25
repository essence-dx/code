import type { CSSProperties } from "react";

import type { ImageElement } from "@/features/editor/types";

export function getImageCropStyle(element: ImageElement): CSSProperties {
  if (!element.cropEnabled) {
    return {
      width: "100%",
      height: "100%",
      objectFit: element.objectFit,
      display: "block",
    };
  }

  return {
    position: "absolute",
    width: `${element.cropScale ?? 100}%`,
    height: `${element.cropScale ?? 100}%`,
    left: `${50 + (element.cropX ?? 0)}%`,
    top: `${50 + (element.cropY ?? 0)}%`,
    transform: "translate(-50%, -50%)",
    objectFit: element.objectFit,
    display: "block",
  };
}
