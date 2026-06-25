"use client"

import { cn } from "@/lib/utils"

import { SlideMiniPreview } from "./slide-mini-preview"
import type { DeckAsset, DeckMaster, Slide } from "../types"

type SlideshowNavigatorProps = {
  slides: Slide[]
  assets: DeckAsset[]
  master: DeckMaster
  currentIndex: number
  onJump: (index: number) => void
}

export function SlideshowNavigator({
  slides,
  assets,
  master,
  currentIndex,
  onJump,
}: SlideshowNavigatorProps) {
  return (
    <div className="grid max-h-[28vh] gap-2 overflow-auto pr-1">
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          aria-current={currentIndex === index ? "true" : undefined}
          aria-label={`Jump to slide ${index + 1}: ${slide.title}`}
          className={cn(
            "grid grid-cols-[64px_1fr] items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] p-1.5 text-left transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            currentIndex === index && "border-white/35 bg-white/[0.12]",
          )}
          onClick={() => onJump(index)}
        >
          <SlideMiniPreview
            slide={slide}
            assets={assets}
            master={master}
            slideNumber={index + 1}
            slideCount={slides.length}
            className="rounded-sm shadow-none"
          />
          <span className="min-w-0">
            <span className="block text-[10px] font-mono text-white/45">
              {index + 1}
            </span>
            {slide.sectionTitle ? (
              <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-white/55">
                {slide.sectionTitle}
              </span>
            ) : null}
            <span className="block truncate text-xs text-white/80">
              {slide.title}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
