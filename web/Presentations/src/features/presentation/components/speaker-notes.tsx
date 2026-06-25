"use client"

import { Textarea } from "@/components/ui/textarea"

import { usePresentationStore } from "../use-presentation-store"

export function SpeakerNotes() {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const updateSlide = usePresentationStore((state) => state.updateSlide)
  const slide = deck.slides.find((item) => item.id === selectedSlideId)

  if (!slide) {
    return null
  }

  return (
    <section
      role="region"
      aria-label="Speaker notes panel"
      className="h-32 shrink-0 border-t bg-background p-3"
    >
      <Textarea
        aria-label="Speaker notes"
        className="h-full min-h-0 resize-none border-transparent bg-muted/40 text-sm shadow-none"
        value={slide.notes}
        placeholder="Speaker notes"
        onChange={(event) =>
          updateSlide(slide.id, { notes: event.currentTarget.value })
        }
      />
    </section>
  )
}
