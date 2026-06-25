"use client"

import { useMemo } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

import { IconButton } from "./icon-button"
import {
  scanDeckAccessibility,
  summarizeAccessibility,
} from "../accessibility-checker"
import {
  deckScaleLabel,
  deckScaleMetrics,
  formatBytes,
  historyMetrics,
} from "../deck-performance"
import { largeDeckSafeguardReport } from "../large-deck-windowing"
import { openMentionCount } from "../comment-mentions"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import { scanDeckProofing, summarizeProofing } from "../proofing-checker"
import { usePresentationStore } from "../use-presentation-store"

export function StatusBar() {
  const deck = usePresentationStore((state) => state.deck)
  const history = usePresentationStore((state) => state.history)
  const future = usePresentationStore((state) => state.future)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedSlideIds = usePresentationStore((state) => state.selectedSlideIds)
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const zoom = usePresentationStore((state) => state.zoom)
  const setZoom = usePresentationStore((state) => state.setZoom)
  const slideIndex = deck.slides.findIndex((slide) => slide.id === selectedSlideId)
  const openComments = deck.slides.reduce(
    (total, slide) =>
      total + (slide.comments ?? []).filter((comment) => !comment.resolved).length,
    0,
  )
  const openMentions = openMentionCount(
    deck.slides.flatMap((slide) => slide.comments ?? []),
  )
  const accessibility = summarizeAccessibility(scanDeckAccessibility(deck))
  const proofing = summarizeProofing(scanDeckProofing(deck))
  const deckScale = useMemo(() => deckScaleMetrics(deck), [deck])
  const largeDeckSafeguards = useMemo(
    () =>
      largeDeckSafeguardReport(deck, {
        selectedElementIds,
        selectedSlideId,
      }),
    [deck, selectedElementIds, selectedSlideId],
  )
  const undoMetrics = useMemo(
    () => historyMetrics([...history, ...future]),
    [future, history],
  )
  const largeDeckWindowLabel = `Window ${largeDeckSafeguards.slideWindow.range.visibleCount}/${largeDeckSafeguards.slideWindow.range.totalCount}`

  return (
    <footer
      role="contentinfo"
      aria-label="Presentation status"
      className="flex h-8 shrink-0 items-center justify-between border-t bg-background px-3 text-xs text-muted-foreground"
      data-testid={presentationSmokeTestIds.statusBar}
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          Slide {slideIndex + 1} of {deck.slides.length}
        </Badge>
        {selectedSlideIds.length > 1 ? (
          <Badge variant="secondary">
            {selectedSlideIds.length} slides selected
          </Badge>
        ) : null}
        {selectedElementIds.length ? (
          <Badge variant="secondary">
            {selectedElementIds.length} objects selected
          </Badge>
        ) : null}
        <Badge variant={openComments ? "secondary" : "outline"}>
          {openComments} comments
        </Badge>
        {openMentions ? (
          <Badge variant="secondary">{openMentions} mentions</Badge>
        ) : null}
        <Badge variant={accessibility.errors ? "destructive" : "outline"}>
          {accessibility.total} a11y
        </Badge>
        <Badge variant={proofing.errors ? "secondary" : "outline"}>
          {proofing.total} proof
        </Badge>
        <Badge
          variant={deckScale.rating === "ready" ? "outline" : "secondary"}
          title={`${deckScale.maxElementsOnSlide} objects and ${deckScale.maxAnimatedElementsOnSlide} animations on the busiest slide`}
        >
          {deckScale.elements} objects
        </Badge>
        {deckScale.animatedElements ? (
          <Badge
            variant={deckScale.rating === "ready" ? "outline" : "secondary"}
          >
            {deckScale.animatedElements} animations
          </Badge>
        ) : null}
        <Badge variant={deckScale.rating === "heavy" ? "secondary" : "outline"}>
          <span data-testid={presentationSmokeTestIds.statusDeckScaleBadge}>
            {deckScaleLabel(deckScale.rating)}
          </span>
        </Badge>
        <Badge
          data-testid={presentationSmokeTestIds.statusLargeDeckWindowBadge}
          variant={
            largeDeckSafeguards.status === "ready" ? "outline" : "secondary"
          }
          title={largeDeckSafeguards.summary}
        >
          {largeDeckWindowLabel}
        </Badge>
        <Badge variant="outline">{formatBytes(deckScale.estimatedBytes)}</Badge>
        <Badge
          data-testid={presentationSmokeTestIds.statusUndoBudgetBadge}
          variant={
            undoMetrics.estimatedBytes > undoMetrics.maxBytes * 0.8
              ? "secondary"
              : "outline"
          }
        >
          Undo {undoMetrics.entries}/{undoMetrics.maxEntries} /{" "}
          {formatBytes(undoMetrics.estimatedBytes)}
        </Badge>
        <span>Saved locally</span>
      </div>
      <div className="flex items-center gap-2">
        <IconButton
          label="Zoom out"
          icon={Minus}
          onClick={() => setZoom(zoom - 5)}
        />
        <Slider
          aria-label="Zoom"
          className="w-24"
          min={45}
          max={140}
          step={5}
          value={[zoom]}
          onValueChange={(value) =>
            setZoom(Array.isArray(value) ? (value[0] ?? zoom) : value)
          }
        />
        <span className="w-10 text-center tabular-nums">{zoom}%</span>
        <IconButton
          label="Reset zoom"
          icon={RotateCcw}
          onClick={() => setZoom(88)}
        />
        <IconButton
          label="Zoom in"
          icon={Plus}
          onClick={() => setZoom(zoom + 5)}
        />
      </div>
    </footer>
  )
}
