"use client"

import { useRef, type CSSProperties, type PointerEvent } from "react"

import { cn } from "@/lib/utils"

import { SlideMasterOverlay } from "./slide-master-overlay"
import { SlideElementContent } from "./slide-element-content"
import {
  elementAnimationClass,
  elementAnimationDelay,
  elementAnimationDuration,
  elementAnimationMotionX,
  elementAnimationMotionY,
} from "../animation-effects"
import { elementLinkUrl, elementSlideTarget } from "../element-links"
import { visibleElements } from "../element-visibility"
import { fontFamilyStyle } from "../font-pairs"
import {
  buildInkPath,
  pointFromClient,
  type InkStroke,
  type SlideshowBlankMode,
  type SlideshowMode,
  type StagePoint,
} from "../slideshow-tools"
import {
  sequencedSlideElements,
  shouldPlaySequencedElementAnimation,
  shouldShowSequencedElement,
} from "../slideshow-sequence"
import {
  elementEffectiveFontSize,
  elementLineHeight,
  elementTextAlign,
} from "../text-formatting"
import { transitionAnimationClass } from "../transition-effects"
import type { DeckAsset, DeckMaster, Slide } from "../types"

type SlideshowStageProps = {
  allowActions?: boolean
  className?: string
  slide: Slide
  assets?: DeckAsset[]
  master: DeckMaster
  slideNumber: number
  slideCount: number
  slideTargets: Pick<Slide, "id">[]
  mode: SlideshowMode
  blankMode: SlideshowBlankMode
  laserPoint: StagePoint | null
  inkStrokes: InkStroke[]
  activeStroke: InkStroke | null
  animationStep?: number | null
  showMediaCaptions?: boolean
  onLaserMove: (point: StagePoint | null) => void
  onSlideJump: (slideId: string) => void
  onInkStart: (point: StagePoint) => void
  onInkMove: (point: StagePoint) => void
  onInkEnd: () => void
}

export function SlideshowStage({
  allowActions = true,
  className,
  slide,
  assets,
  master,
  slideNumber,
  slideCount,
  slideTargets,
  mode,
  blankMode,
  laserPoint,
  inkStrokes,
  activeStroke,
  animationStep = null,
  showMediaCaptions = true,
  onLaserMove,
  onSlideJump,
  onInkStart,
  onInkMove,
  onInkEnd,
}: SlideshowStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const transition = slide.transition ?? "none"
  const duration = slide.transitionDurationMs ?? 350
  const transitionClass = transitionAnimationClass(transition)
  const elements = visibleElements(slide)
  const sequenceOrder = new Map(
    sequencedSlideElements(slide).map((element, index) => [element.id, index]),
  )

  function eventPoint(event: PointerEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect()
    return rect ? pointFromClient(rect, event.clientX, event.clientY) : null
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const point = eventPoint(event)
    if (!point) return

    if (mode === "laser") {
      onLaserMove(point)
    }
    if (mode === "ink" && event.currentTarget.hasPointerCapture(event.pointerId)) {
      onInkMove(point)
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (mode !== "ink") return
    const point = eventPoint(event)
    if (!point) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    onInkStart(point)
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (mode === "ink" && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      onInkEnd()
    }
  }

  const strokes = activeStroke ? [...inkStrokes, activeStroke] : inkStrokes

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative aspect-video w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-2xl",
        className,
        transitionClass,
        mode === "laser" && "cursor-none",
        mode === "ink" && "cursor-crosshair",
      )}
      style={
        {
          background: slide.background,
          "--slide-transition-duration": `${duration}ms`,
        } as CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onPointerLeave={() => onLaserMove(null)}
    >
      {elements.map((element) => {
        const linkUrl = elementLinkUrl(element)
        const slideTargetId = elementSlideTarget(element, slideTargets)
        const hasAction = allowActions && Boolean(slideTargetId || linkUrl)
        const sequenceIndex = sequenceOrder.get(element.id) ?? -1
        const shouldShow = shouldShowSequencedElement({
          animationStep,
          element,
          sequenceIndex,
        })
        const shouldPlayAnimation = shouldPlaySequencedElementAnimation({
          animationStep,
          element,
          sequenceIndex,
        })

        if (!shouldShow) return null

        return (
          <span
            key={element.id}
            className={cn(
              "absolute flex overflow-hidden text-pretty",
              (element.type === "title" || element.type === "text") &&
                "items-start",
              hasAction && mode === "none" && "cursor-pointer",
            )}
            title={hasAction && mode === "none" ? "Open action" : undefined}
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
              borderRadius: `${element.radius}px`,
              fontFamily: fontFamilyStyle(element.fontFamily),
              fontSize: `${elementEffectiveFontSize(element)}px`,
              fontWeight: element.fontWeight,
              padding:
                element.type === "shape" ||
                element.type === "icon" ||
                element.type === "video" ||
                element.type === "audio" ||
                element.type === "table" ||
                element.type === "chart"
                  ? 0
                  : "6px 8px",
              lineHeight: elementLineHeight(element),
              textAlign: elementTextAlign(element),
              transform: `rotate(${element.rotation ?? 0}deg)`,
              transformOrigin: "center",
            }}
            onClick={(event) => {
              if (!hasAction || mode !== "none") return
              if (event.target instanceof HTMLMediaElement) return

              event.stopPropagation()
              if (slideTargetId) {
                onSlideJump(slideTargetId)
                return
              }

              window.open(linkUrl, "_blank", "noopener,noreferrer")
            }}
          >
            <span
              key={
                shouldPlayAnimation
                  ? `${element.id}-${animationStep ?? "auto"}`
                  : element.id
              }
              className={cn(
                "flex size-full overflow-hidden",
                shouldPlayAnimation && elementAnimationClass(element.animation),
              )}
              style={
                {
                  "--object-animation-duration": `${elementAnimationDuration(
                    element,
                  )}ms`,
                  "--object-animation-delay": `${elementAnimationDelay(
                    element,
                  )}ms`,
                  "--object-animation-motion-x": `${elementAnimationMotionX(
                    element,
                  )}%`,
                  "--object-animation-motion-y": `${elementAnimationMotionY(
                    element,
                  )}%`,
                } as CSSProperties
              }
            >
              <SlideElementContent
                element={element}
                assets={assets}
                autoPlayMedia
                showMediaCaptions={showMediaCaptions}
              />
            </span>
          </span>
        )
      })}
      <SlideMasterOverlay
        master={master}
        slideNumber={slideNumber}
        slideCount={slideCount}
      />
      {strokes.length ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={buildInkPath(stroke.points)}
              fill="none"
              stroke={stroke.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={stroke.width}
            />
          ))}
        </svg>
      ) : null}
      {mode === "laser" && laserPoint ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-30 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-200 bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.9)]"
          style={{
            left: `${laserPoint.x}%`,
            top: `${laserPoint.y}%`,
          }}
        />
      ) : null}
      {blankMode !== "none" ? (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 z-40",
            blankMode === "black" ? "bg-black" : "bg-white",
          )}
        />
      ) : null}
    </div>
  )
}
