"use client"

type SlideshowProgressProps = {
  currentIndex: number
  slideCount: number
  onJump: (index: number) => void
}

export function SlideshowProgress({
  currentIndex,
  slideCount,
  onJump,
}: SlideshowProgressProps) {
  if (slideCount <= 1) {
    return (
      <div className="w-44 text-center text-xs text-white/45">
        Slide 1 of 1
      </div>
    )
  }

  return (
    <label className="grid w-[min(38vw,360px)] min-w-48 gap-1 text-center text-xs text-white/55">
      <span>
        Slide {currentIndex + 1} of {slideCount}
      </span>
      <input
        aria-label="Jump to slide"
        className="h-2 w-full cursor-pointer accent-white"
        type="range"
        min={1}
        max={slideCount}
        step={1}
        value={currentIndex + 1}
        onChange={(event) => onJump(Number(event.currentTarget.value) - 1)}
      />
    </label>
  )
}
