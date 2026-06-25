"use client"

import { useEffect, useMemo, useState } from "react"
import { MonitorPlay } from "lucide-react"

import {
  AUDIENCE_DISPLAY_CHANNEL,
  AUDIENCE_DISPLAY_STORAGE_KEY,
  isAudienceDisplaySnapshot,
  readAudienceDisplaySnapshot,
  type AudienceDisplaySnapshot,
} from "../slideshow-sync"
import { SlideshowStage } from "./slideshow-stage"

const noop = () => {}

export function AudienceDisplayPage() {
  const [snapshot, setSnapshot] = useState<AudienceDisplaySnapshot | null>(null)

  useEffect(() => {
    setSnapshot(readAudienceDisplaySnapshot())

    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel(AUDIENCE_DISPLAY_CHANNEL)
        : null

    function updateFromPayload(value: unknown) {
      if (isAudienceDisplaySnapshot(value)) {
        setSnapshot(value)
      }
    }

    function updateFromStorage(event: StorageEvent) {
      if (event.key !== AUDIENCE_DISPLAY_STORAGE_KEY || !event.newValue) return

      try {
        updateFromPayload(JSON.parse(event.newValue) as unknown)
      } catch {
        setSnapshot(null)
      }
    }

    if (channel) {
      channel.onmessage = (event) => updateFromPayload(event.data)
    }
    window.addEventListener("storage", updateFromStorage)

    return () => {
      channel?.close()
      window.removeEventListener("storage", updateFromStorage)
    }
  }, [])

  const slide = snapshot?.deck.slides[snapshot.slideIndex]
  const slideTargets = useMemo(
    () => snapshot?.deck.slides.map((item) => ({ id: item.id })) ?? [],
    [snapshot?.deck.slides],
  )

  if (!snapshot?.open || !slide) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="text-center">
          <MonitorPlay className="mx-auto size-10 text-white/45" />
          <h1 className="mt-4 text-lg font-semibold">Audience display</h1>
          <p className="mt-2 max-w-sm text-sm text-white/55">
            Start presenting from the editor to show the live slide here.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <SlideshowStage
        allowActions={false}
        animationStep={
          snapshot.sequenceMode ? (snapshot.animationStep ?? 0) : null
        }
        assets={snapshot.deck.assets}
        blankMode={snapshot.blankMode}
        className="max-h-screen max-w-none rounded-none shadow-none"
        activeStroke={null}
        inkStrokes={[]}
        laserPoint={null}
        master={snapshot.deck.master}
        mode="none"
        showMediaCaptions={snapshot.showCaptions ?? true}
        slide={slide}
        slideCount={snapshot.deck.slides.length}
        slideNumber={snapshot.slideIndex + 1}
        slideTargets={slideTargets}
        onInkEnd={noop}
        onInkMove={noop}
        onInkStart={noop}
        onLaserMove={noop}
        onSlideJump={noop}
      />
    </main>
  )
}
