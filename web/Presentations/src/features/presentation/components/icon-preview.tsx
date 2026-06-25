"use client"

import {
  iconDefinition,
  iconStrokeWidth,
} from "../icon-library"
import type { PresentationElement } from "../types"

type IconPreviewProps = {
  element: PresentationElement
}

export function IconPreview({ element }: IconPreviewProps) {
  const definition = iconDefinition(element.iconName)

  return (
    <span
      className="flex size-full items-center justify-center overflow-hidden rounded-[inherit]"
      style={{ background: element.background }}
    >
      <svg
        aria-label={element.alt || definition.label}
        className="size-full"
        fill="none"
        role="img"
        stroke={element.color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={iconStrokeWidth(element)}
        viewBox="0 0 24 24"
      >
        {definition.paths.map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </span>
  )
}
