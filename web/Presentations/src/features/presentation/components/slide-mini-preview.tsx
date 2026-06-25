"use client"

import { cn } from "@/lib/utils"

import { SlideMasterOverlay } from "./slide-master-overlay"
import { SlideElementContent } from "./slide-element-content"
import { visibleElements } from "../element-visibility"
import { fontFamilyStyle } from "../font-pairs"
import {
  elementEffectiveFontSize,
  elementLineHeight,
  elementTextAlign,
} from "../text-formatting"
import type { DeckAsset, DeckMaster, Slide } from "../types"

type SlideMiniPreviewProps = {
  slide: Slide
  assets?: DeckAsset[]
  master?: DeckMaster
  slideNumber?: number
  slideCount?: number
  className?: string
}

export function SlideMiniPreview({
  slide,
  assets,
  master,
  slideNumber = 1,
  slideCount = 1,
  className,
}: SlideMiniPreviewProps) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-md border border-white/10 bg-white shadow-lg",
        className,
      )}
      style={{ background: slide.background }}
    >
      {visibleElements(slide).map((element) => (
        <span
          key={element.id}
          className={cn(
            "absolute flex overflow-hidden text-pretty",
            (element.type === "title" || element.type === "text") &&
              "items-start",
          )}
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            color: element.color,
            background:
              element.type === "image" ||
              element.type === "icon" ||
              element.type === "video" ||
              element.type === "audio" ||
              element.type === "shape" ||
              element.type === "chart"
                ? "transparent"
                : element.background,
            borderRadius: `${Math.max(0, element.radius * 0.35)}px`,
            fontFamily: fontFamilyStyle(element.fontFamily),
            fontSize: `${Math.max(
              5,
              elementEffectiveFontSize(element) * 0.28,
            )}px`,
            fontWeight: element.fontWeight,
            padding:
              element.type === "shape" ||
              element.type === "icon" ||
              element.type === "video" ||
              element.type === "audio" ||
              element.type === "table" ||
              element.type === "chart"
                ? 0
                : "2px 3px",
            lineHeight: elementLineHeight(element),
            textAlign: elementTextAlign(element),
            transform: `rotate(${element.rotation ?? 0}deg)`,
            transformOrigin: "center",
          }}
        >
          <SlideElementContent
            element={element}
            assets={assets}
            mediaControls={false}
            radiusScale={0.35}
          />
        </span>
      ))}
      {master ? (
        <SlideMasterOverlay
          master={master}
          slideNumber={slideNumber}
          slideCount={slideCount}
          scale={0.28}
        />
      ) : null}
    </div>
  )
}
