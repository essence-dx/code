import type { CSSProperties } from "react"

import type { ImageMask, PresentationElement } from "./types"

export const imageMaskLabels: Record<ImageMask, string> = {
  rectangle: "Rectangle",
  rounded: "Rounded",
  circle: "Circle",
  diamond: "Diamond",
}

export function elementImageMask(element: PresentationElement): ImageMask {
  return element.imageMask ?? "rectangle"
}

function imageMaskClipPath(mask: ImageMask) {
  if (mask === "circle") return "ellipse(50% 50% at 50% 50%)"
  if (mask === "diamond") {
    return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
  }

  return undefined
}

export function imageMaskStyle(
  element: PresentationElement,
  radiusScale = 1,
): CSSProperties {
  const mask = elementImageMask(element)
  const radius = Math.max(0, element.radius * radiusScale)

  if (mask === "circle") {
    return {
      borderRadius: "9999px",
      clipPath: imageMaskClipPath(mask),
    }
  }

  if (mask === "diamond") {
    return {
      borderRadius: 0,
      clipPath: imageMaskClipPath(mask),
    }
  }

  if (mask === "rounded") {
    return {
      borderRadius: `${Math.max(radius, 18 * radiusScale)}px`,
    }
  }

  return {
    borderRadius: `${radius}px`,
  }
}
