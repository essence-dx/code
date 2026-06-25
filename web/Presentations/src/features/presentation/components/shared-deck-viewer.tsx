"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { downloadBlob } from "../browser-downloads"
import { deckPdfFileName, exportDeckToPdfBlob } from "../pdf-export"
import { exportDeckToPptx } from "../pptx-export"
import { sharedViewReviewSnapshot } from "../shared-view-review"
import type { Deck } from "../types"
import { SlideMiniPreview } from "./slide-mini-preview"
import { SlideshowStage } from "./slideshow-stage"
import { SharedDeckReviewSidebar } from "./shared-deck-review-sidebar"

type SharedDeckViewerProps = {
  allowDownloads?: boolean
  deck: Deck
}

type ExportState = "idle" | "working" | "error"

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function SharedDeckViewer({
  allowDownloads = true,
  deck,
}: SharedDeckViewerProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [exportState, setExportState] = useState<ExportState>("idle")
  const [exportMessage, setExportMessage] = useState("")
  const currentSlide = deck.slides[slideIndex]
  const slideCount = deck.slides.length
  const canGoBack = slideIndex > 0
  const canGoForward = slideIndex < slideCount - 1
  const updatedAt = useMemo(() => formatUpdatedAt(deck.updatedAt), [deck])
  const reviewSnapshot = useMemo(
    () => sharedViewReviewSnapshot(deck, { allowDownloads }),
    [allowDownloads, deck],
  )

  async function exportPptx() {
    if (!allowDownloads) return

    setExportState("working")
    setExportMessage("")
    try {
      await exportDeckToPptx(deck)
      setExportState("idle")
    } catch (error) {
      setExportState("error")
      setExportMessage(
        error instanceof Error
          ? error.message
          : "Could not export this deck as a PowerPoint file.",
      )
    }
  }

  async function exportPdf() {
    if (!allowDownloads) return

    setExportState("working")
    setExportMessage("")
    try {
      downloadBlob(deckPdfFileName(deck), await exportDeckToPdfBlob(deck))
      setExportState("idle")
    } catch (error) {
      setExportState("error")
      setExportMessage(
        error instanceof Error
          ? error.message
          : "Could not export this deck as a PDF.",
      )
    }
  }

  if (!currentSlide) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="grid max-w-md gap-2 text-center">
          <h1 className="text-xl font-semibold">{deck.title}</h1>
          <p className="text-sm text-muted-foreground">No slides to show.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-rows-[auto_1fr] gap-4 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold md:text-xl">{deck.title}</h1>
              <Badge variant="secondary">View only</Badge>
              {!allowDownloads ? (
                <Badge variant="outline">Downloads off</Badge>
              ) : null}
              {reviewSnapshot.openCommentCount ? (
                <Badge variant="outline">
                  {reviewSnapshot.openCommentCount} open{" "}
                  {reviewSnapshot.openCommentCount === 1 ? "comment" : "comments"}
                </Badge>
              ) : null}
              {reviewSnapshot.mentionCount ? (
                <Badge variant="outline">
                  {reviewSnapshot.mentionCount}{" "}
                  {reviewSnapshot.mentionCount === 1 ? "mention" : "mentions"}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {slideCount} slides - Updated {updatedAt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allowDownloads ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportState === "working"}
                  onClick={() => void exportPdf()}
                >
                  <FileText className="size-4" />
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportState === "working"}
                  onClick={() => void exportPptx()}
                >
                  <FileDown className="size-4" />
                  PPTX
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!canGoBack}
              onClick={() => setSlideIndex((index) => Math.max(0, index - 1))}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous slide</span>
            </Button>
            <Badge variant="outline">
              {slideIndex + 1} / {slideCount}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!canGoForward}
              onClick={() =>
                setSlideIndex((index) => Math.min(slideCount - 1, index + 1))
              }
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next slide</span>
            </Button>
          </div>
        </header>
        <div className="grid min-h-0 gap-4 xl:grid-cols-[220px_1fr_300px]">
          <ScrollArea className="min-h-28 rounded-md border lg:h-[calc(100vh-8rem)]">
            <div className="flex gap-3 p-3 lg:grid">
              {deck.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={cn(
                    "grid w-40 shrink-0 gap-2 rounded-md border p-2 text-left transition hover:bg-muted lg:w-full",
                    index === slideIndex && "border-primary bg-muted",
                  )}
                  onClick={() => setSlideIndex(index)}
                >
                  <SlideMiniPreview
                    slide={slide}
                    assets={deck.assets}
                    master={deck.master}
                    slideNumber={index + 1}
                    slideCount={slideCount}
                  />
                  <span className="line-clamp-2 text-xs font-medium">
                    {index + 1}. {slide.title}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <section className="grid min-h-0 place-items-center rounded-md border bg-muted/30 p-3 md:p-5">
            <SlideshowStage
              slide={currentSlide}
              assets={deck.assets}
              master={deck.master}
              slideNumber={slideIndex + 1}
              slideCount={slideCount}
              slideTargets={deck.slides}
              mode="none"
              blankMode="none"
              laserPoint={null}
              inkStrokes={[]}
              activeStroke={null}
              onLaserMove={() => undefined}
              onSlideJump={(slideId) => {
                const targetIndex = deck.slides.findIndex(
                  (slide) => slide.id === slideId,
                )
                if (targetIndex >= 0) {
                  setSlideIndex(targetIndex)
                }
              }}
              onInkStart={() => undefined}
              onInkMove={() => undefined}
              onInkEnd={() => undefined}
            />
          </section>
          <SharedDeckReviewSidebar
            allowDownloads={allowDownloads}
            deck={deck}
            exportErrorMessage={
              exportState === "error" ? exportMessage : undefined
            }
            slideIndex={slideIndex}
            onSlideSelect={setSlideIndex}
          />
        </div>
      </div>
    </main>
  )
}
