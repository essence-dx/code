"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Maximize2,
  Minimize2,
  MonitorPlay,
  MonitorUp,
  Moon,
  MousePointer2,
  PenLine,
  RotateCcw,
  StepForward,
  Sun,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { SlideMiniPreview } from "./slide-mini-preview"
import { SlideshowNavigator } from "./slideshow-navigator"
import { SlideshowProgress } from "./slideshow-progress"
import { SlideshowReadinessPanel } from "./slideshow-readiness-panel"
import { SlideshowStage } from "./slideshow-stage"
import {
  type AudienceDisplayState,
  presenterReadinessReport,
} from "../presenter-readiness"
import {
  addTiming,
  formatDuration,
  type InkStroke,
  type InkStrokesBySlide,
  type SlideshowBlankMode,
  type SlideshowMode,
  type StagePoint,
} from "../slideshow-tools"
import {
  AUDIENCE_DISPLAY_CHANNEL,
  AUDIENCE_DISPLAY_PATH,
  type AudienceDisplaySnapshot,
  writeAudienceDisplaySnapshot,
} from "../slideshow-sync"
import { sequencedSlideElements } from "../slideshow-sequence"
import { usePresentationStore } from "../use-presentation-store"

export function SlideshowOverlay() {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const updateSlideLive = usePresentationStore((state) => state.updateSlideLive)
  const [open, setOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [mode, setMode] = useState<SlideshowMode>("none")
  const [blankMode, setBlankMode] = useState<SlideshowBlankMode>("none")
  const [showCaptions, setShowCaptions] = useState(true)
  const [sequenceMode, setSequenceMode] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
  const [laserPoint, setLaserPoint] = useState<StagePoint | null>(null)
  const [inkBySlide, setInkBySlide] = useState<InkStrokesBySlide>({})
  const [activeStroke, setActiveStroke] = useState<InkStroke | null>(null)
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [slideStartedAt, setSlideStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [audienceDisplayStatus, setAudienceDisplayStatus] = useState("")
  const [audienceChannelAvailable, setAudienceChannelAvailable] = useState(true)
  const [fullscreenAvailable, setFullscreenAvailable] = useState(true)
  const audienceChannelRef = useRef<BroadcastChannel | null>(null)
  const slide = deck.slides[slideIndex]
  const nextSlide = deck.slides[slideIndex + 1]
  const slideTargets = deck.slides.map((item) => ({ id: item.id }))
  const slideInk = slide ? (inkBySlide[slide.id] ?? []) : []
  const animationSequenceCount = slide ? sequencedSlideElements(slide).length : 0
  const totalElapsed = runStartedAt ? now - runStartedAt : 0
  const currentElapsed = slideStartedAt ? now - slideStartedAt : 0
  const currentTiming = slide
    ? (slide.rehearsalDurationMs ?? 0) + currentElapsed
    : 0
  const audienceDisplayState: AudienceDisplayState =
    audienceDisplayStatus === "Audience display connected"
      ? "connected"
      : audienceDisplayStatus
        ? "blocked"
        : "not-opened"
  const readinessReport = useMemo(
    () =>
      presenterReadinessReport(deck, {
        audienceChannelAvailable,
        audienceDisplayState,
        blankMode,
        captionsVisible: showCaptions,
        fullscreenAvailable,
      }),
    [
      audienceChannelAvailable,
      audienceDisplayState,
      blankMode,
      deck,
      fullscreenAvailable,
      showCaptions,
    ],
  )

  function openShow() {
    const currentIndex = deck.slides.findIndex(
      (item) => item.id === selectedSlideId,
    )
    const timestamp = Date.now()
    setSlideIndex(Math.max(0, currentIndex))
    setMode("none")
    setBlankMode("none")
    setLaserPoint(null)
    setActiveStroke(null)
    setAnimationStep(0)
    setRunStartedAt(timestamp)
    setSlideStartedAt(timestamp)
    setNow(timestamp)
    setOpen(true)
    void requestFullscreen()
  }

  function closeShow() {
    publishAudienceDisplay(false)
    commitTiming()
    setOpen(false)
    setMode("none")
    setBlankMode("none")
    setLaserPoint(null)
    setActiveStroke(null)
    setAnimationStep(0)
    void exitFullscreen()
  }

  async function requestFullscreen() {
    if (!document.fullscreenEnabled || document.fullscreenElement) return

    try {
      await document.documentElement.requestFullscreen()
    } catch {
      setIsFullscreen(false)
    }
  }

  async function exitFullscreen() {
    if (!document.fullscreenElement) return

    try {
      await document.exitFullscreen()
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void exitFullscreen()
    } else {
      void requestFullscreen()
    }
  }

  function commitTiming() {
    if (!slide?.id || !slideStartedAt) return
    const timestamp = Date.now()
    const rehearsalDurationMs = addTiming(
      { [slide.id]: slide.rehearsalDurationMs ?? 0 },
      slide.id,
      timestamp - slideStartedAt,
    )[slide.id]
    updateSlideLive(slide.id, { rehearsalDurationMs })
    setSlideStartedAt(timestamp)
  }

  function jumpTo(index: number) {
    const targetIndex = Math.max(0, Math.min(deck.slides.length - 1, index))
    if (targetIndex === slideIndex) return

    commitTiming()
    setSlideIndex(targetIndex)
    setLaserPoint(null)
    setActiveStroke(null)
    setBlankMode("none")
    setAnimationStep(0)
    setSlideStartedAt(Date.now())
  }

  function go(direction: -1 | 1) {
    if (sequenceMode && direction === 1 && animationStep < animationSequenceCount) {
      setAnimationStep((current) =>
        Math.min(animationSequenceCount, current + 1),
      )
      return
    }
    if (sequenceMode && direction === -1 && animationStep > 0) {
      setAnimationStep((current) => Math.max(0, current - 1))
      return
    }

    jumpTo(slideIndex + direction)
  }

  function jumpToSlideId(slideId: string) {
    const targetIndex = deck.slides.findIndex((item) => item.id === slideId)
    if (targetIndex >= 0) {
      jumpTo(targetIndex)
    }
  }

  function resetRehearsalTimings() {
    const timestamp = Date.now()
    deck.slides.forEach((item) =>
      updateSlideLive(item.id, { rehearsalDurationMs: 0 }),
    )
    setRunStartedAt(timestamp)
    setSlideStartedAt(timestamp)
    setNow(timestamp)
  }

  function applyRehearsedTiming(slideId: string) {
    const targetSlide = deck.slides.find((item) => item.id === slideId)
    if (!targetSlide?.rehearsalDurationMs) return

    updateSlideLive(targetSlide.id, {
      autoAdvanceAfterMs: targetSlide.rehearsalDurationMs,
    })

    if (targetSlide.id === slide?.id) {
      const timestamp = Date.now()
      setSlideStartedAt(timestamp)
      setNow(timestamp)
    }
  }

  function applyAllRehearsedTimings() {
    let updatedCurrentSlide = false

    deck.slides.forEach((item) => {
      if (!item.rehearsalDurationMs) return

      updateSlideLive(item.id, {
        autoAdvanceAfterMs: item.rehearsalDurationMs,
      })
      updatedCurrentSlide ||= item.id === slide?.id
    })

    if (updatedCurrentSlide) {
      const timestamp = Date.now()
      setSlideStartedAt(timestamp)
      setNow(timestamp)
    }
  }

  function audienceDisplaySnapshot(
    isOpen = open,
  ): AudienceDisplaySnapshot | null {
    if (!slide) return null

    return {
      blankMode,
      deck,
      animationStep: sequenceMode ? animationStep : null,
      open: isOpen,
      sequenceMode,
      showCaptions,
      slideIndex,
      updatedAt: new Date().toISOString(),
    }
  }

  function publishAudienceDisplay(isOpen = open) {
    const snapshot = audienceDisplaySnapshot(isOpen)
    if (!snapshot) return

    writeAudienceDisplaySnapshot(snapshot)
    audienceChannelRef.current?.postMessage(snapshot)
  }

  function openAudienceDisplay() {
    if (!audienceChannelAvailable) {
      setAudienceDisplayStatus("Audience sync unavailable in this browser")
      return
    }

    publishAudienceDisplay(true)
    const audienceWindow = window.open(
      AUDIENCE_DISPLAY_PATH,
      "essence-powerpoint-audience-display",
      "popup,width=1280,height=720",
    )

    if (audienceWindow) {
      audienceWindow.focus()
      setAudienceDisplayStatus("Audience display connected")
      return
    }

    setAudienceDisplayStatus("Allow pop-ups to open audience display")
  }

  useEffect(() => {
    setAudienceChannelAvailable("BroadcastChannel" in window)
    setFullscreenAvailable(Boolean(document.fullscreenEnabled))
    if (!("BroadcastChannel" in window)) return

    audienceChannelRef.current = new BroadcastChannel(AUDIENCE_DISPLAY_CHANNEL)
    return () => {
      audienceChannelRef.current?.close()
      audienceChannelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (open && slide) {
      publishAudienceDisplay(true)
    }
  }, [
    animationStep,
    blankMode,
    deck,
    open,
    sequenceMode,
    showCaptions,
    slide,
    slideIndex,
  ])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeShow()
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        go(1)
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault()
        go(1)
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        go(-1)
      }
      if (event.key === "Home") {
        jumpTo(0)
      }
      if (event.key === "End") {
        jumpTo(deck.slides.length - 1)
      }
      if (event.key.toLowerCase() === "b") {
        event.preventDefault()
        setBlankMode((current) => (current === "black" ? "none" : "black"))
      }
      if (event.key.toLowerCase() === "w") {
        event.preventDefault()
        setBlankMode((current) => (current === "white" ? "none" : "white"))
      }
      if (event.key.toLowerCase() === "c") {
        event.preventDefault()
        setShowCaptions((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [deck.slides.length, open, slideIndex, slide?.id, slideStartedAt])

  useEffect(() => {
    if (!open || !slideStartedAt || !slide?.autoAdvanceAfterMs) return
    if (slideIndex >= deck.slides.length - 1) return
    if (sequenceMode && animationStep < animationSequenceCount) return

    const elapsed = Date.now() - slideStartedAt
    const delay = Math.max(0, slide.autoAdvanceAfterMs - elapsed)
    const timeout = window.setTimeout(() => go(1), delay)
    return () => window.clearTimeout(timeout)
  }, [
    deck.slides.length,
    animationSequenceCount,
    animationStep,
    open,
    sequenceMode,
    slide?.autoAdvanceAfterMs,
    slide?.id,
    slideIndex,
    slideStartedAt,
  ])

  useEffect(() => {
    if (!open) return

    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [open])

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    syncFullscreen()
    document.addEventListener("fullscreenchange", syncFullscreen)
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen)
    }
  }, [])

  function startInk(point: StagePoint) {
    setLaserPoint(null)
    setActiveStroke({
      id: crypto.randomUUID(),
      color: "#f97316",
      width: 0.65,
      points: [point],
    })
  }

  function moveInk(point: StagePoint) {
    setActiveStroke((stroke) =>
      stroke ? { ...stroke, points: [...stroke.points, point] } : stroke,
    )
  }

  function endInk() {
    if (!slide?.id || !activeStroke) return
    setInkBySlide((current) => ({
      ...current,
      [slide.id]: [...(current[slide.id] ?? []), activeStroke],
    }))
    setActiveStroke(null)
  }

  function clearSlideInk() {
    if (!slide?.id) return
    setInkBySlide((current) => ({
      ...current,
      [slide.id]: [],
    }))
    setActiveStroke(null)
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={openShow}>
        <MonitorPlay className="size-4" />
        Present
      </Button>
      {open && slide ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{deck.title}</div>
              <div className="text-xs text-white/55">
                Slide {slideIndex + 1} of {deck.slides.length}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="hidden items-center gap-2 font-mono text-white/70 sm:flex">
                <span>{formatDuration(totalElapsed)}</span>
                <span className="text-white/25">/</span>
                <span>{formatDuration(currentElapsed)}</span>
              </div>
              <Button
                aria-label="Black screen"
                aria-pressed={blankMode === "black"}
                title="Black screen"
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "text-white hover:bg-white/10",
                  blankMode === "black" && "bg-white/15",
                )}
                onClick={() =>
                  setBlankMode((current) =>
                    current === "black" ? "none" : "black",
                  )
                }
              >
                <Moon className="size-4" />
              </Button>
              <Button
                aria-label="White screen"
                aria-pressed={blankMode === "white"}
                title="White screen"
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "text-white hover:bg-white/10",
                  blankMode === "white" && "bg-white/15",
                )}
                onClick={() =>
                  setBlankMode((current) =>
                    current === "white" ? "none" : "white",
                  )
                }
              >
                <Sun className="size-4" />
              </Button>
              <Button
                aria-label="Laser pointer"
                aria-pressed={mode === "laser"}
                title="Laser pointer"
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "text-white hover:bg-white/10",
                  mode === "laser" && "bg-white/15",
                )}
                onClick={() =>
                  setMode((current) => (current === "laser" ? "none" : "laser"))
                }
              >
                <MousePointer2 className="size-4" />
              </Button>
              <Button
                aria-label="Ink"
                aria-pressed={mode === "ink"}
                title="Ink"
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "text-white hover:bg-white/10",
                  mode === "ink" && "bg-white/15",
                )}
                onClick={() =>
                  setMode((current) => (current === "ink" ? "none" : "ink"))
                }
              >
                <PenLine className="size-4" />
              </Button>
              <Button
                aria-label={
                  sequenceMode ? "Disable animation sequence" : "Animation sequence"
                }
                aria-pressed={sequenceMode}
                title={
                  sequenceMode ? "Disable animation sequence" : "Animation sequence"
                }
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "text-white hover:bg-white/10",
                  sequenceMode && "bg-white/15",
                )}
                disabled={!animationSequenceCount && !sequenceMode}
                onClick={() => {
                  setSequenceMode((current) => !current)
                  setAnimationStep(0)
                }}
              >
                <StepForward className="size-4" />
              </Button>
              <Button
                aria-label={showCaptions ? "Hide captions" : "Show captions"}
                aria-pressed={showCaptions}
                title={showCaptions ? "Hide captions" : "Show captions"}
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "text-white hover:bg-white/10",
                  showCaptions && "bg-white/15",
                )}
                onClick={() => setShowCaptions((current) => !current)}
              >
                {showCaptions ? (
                  <Captions className="size-4" />
                ) : (
                  <CaptionsOff className="size-4" />
                )}
              </Button>
              <Button
                aria-label="Clear ink"
                title="Clear ink"
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                disabled={!slideInk.length && !activeStroke}
                onClick={clearSlideInk}
              >
                <Eraser className="size-4" />
              </Button>
              <Button
                aria-label="Reset rehearsal timer"
                title="Reset rehearsal timer"
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                onClick={resetRehearsalTimings}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                aria-label="Open audience display"
                title={audienceDisplayStatus || "Open audience display"}
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                onClick={openAudienceDisplay}
              >
                <MonitorUp className="size-4" />
              </Button>
              <Button
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                aria-pressed={isFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            </div>
            <Button
              aria-label="Close slideshow"
              title="Close slideshow"
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/10"
              onClick={closeShow}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]">
            <div className="flex min-w-0 items-center justify-center p-8">
              <SlideshowStage
                key={slide.id}
                slide={slide}
                assets={deck.assets}
                master={deck.master}
                slideNumber={slideIndex + 1}
                slideCount={deck.slides.length}
                slideTargets={slideTargets}
                mode={mode}
                blankMode={blankMode}
                animationStep={sequenceMode ? animationStep : null}
                showMediaCaptions={showCaptions}
                laserPoint={laserPoint}
                inkStrokes={slideInk}
                activeStroke={activeStroke}
                onLaserMove={setLaserPoint}
                onSlideJump={jumpToSlideId}
                onInkStart={startInk}
                onInkMove={moveInk}
                onInkEnd={endInk}
              />
            </div>
            <aside className="hidden min-h-0 border-l border-white/10 bg-white/[0.03] p-4 lg:block">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                  Next
                </div>
                {nextSlide ? (
                  <div className="mt-3">
                    <SlideMiniPreview
                      slide={nextSlide}
                      assets={deck.assets}
                      master={deck.master}
                      slideNumber={slideIndex + 2}
                      slideCount={deck.slides.length}
                    />
                    <div className="mt-2 truncate text-xs text-white/55">
                      {nextSlide.title}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-5 text-center text-sm text-white/55">
                    End of deck
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                  Slides
                </div>
                <div className="mt-3">
                  <SlideshowNavigator
                    slides={deck.slides}
                    assets={deck.assets}
                    master={deck.master}
                    currentIndex={slideIndex}
                    onJump={jumpTo}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <SlideshowReadinessPanel
                  currentSlideId={slide.id}
                  report={readinessReport}
                  onApplyAllRehearsedTimings={applyAllRehearsedTimings}
                  onApplyRehearsedTiming={applyRehearsedTiming}
                  onJumpToSlide={jumpToSlideId}
                />
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                  Notes
                </div>
                <div className="mt-3 max-h-[34vh] overflow-auto whitespace-pre-wrap pr-1 text-sm leading-6 text-white/75">
                  {slide.notes || "No speaker notes for this slide."}
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
                  Rehearsal
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-white/45">Total</dt>
                    <dd className="font-mono text-white/85">
                      {formatDuration(totalElapsed)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Slide</dt>
                    <dd className="font-mono text-white/85">
                      {formatDuration(currentTiming)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Auto</dt>
                    <dd className="font-mono text-white/85">
                      {slide.autoAdvanceAfterMs
                        ? formatDuration(slide.autoAdvanceAfterMs)
                        : "Manual"}
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
          <div className="flex h-12 shrink-0 items-center justify-center gap-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              disabled={slideIndex === 0}
              onClick={() => go(-1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <SlideshowProgress
              currentIndex={slideIndex}
              slideCount={deck.slides.length}
              onJump={jumpTo}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              disabled={slideIndex === deck.slides.length - 1}
              onClick={() => go(1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
