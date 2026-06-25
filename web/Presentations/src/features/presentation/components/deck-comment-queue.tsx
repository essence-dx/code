"use client"

import { useMemo } from "react"
import {
  AtSign,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  MessageSquare,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { mentionLabel, openMentionCount } from "../comment-mentions"
import {
  commentSourceDepthLabel,
  commentSourceReplyLabel,
  commentSourceThreadLabel,
} from "../comment-source-metadata"
import { shapeKind, shapeKindLabels } from "../shape-formatting"
import type { Deck, PresentationElement, SlideComment } from "../types"
import { usePresentationStore } from "../use-presentation-store"

type CommentQueueItem = {
  comment: SlideComment
  key: string
  slide: Deck["slides"][number]
  slideIndex: number
  target: PresentationElement | undefined
}

function targetLabel(element: PresentationElement | undefined) {
  if (!element) return "Slide"
  if (element.type === "image") return element.alt || "Image"
  if (element.type === "video") return element.alt || "Video"
  if (element.type === "audio") return element.alt || "Audio"
  if (element.type === "shape") return shapeKindLabels[shapeKind(element)]
  if (element.type === "chart") return "Chart"
  if (element.type === "table") return "Table"

  return element.content.trim().split(/\r?\n/)[0] || element.type
}

function formatCommentTime(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return ""

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp)
}

function openCommentQueue(deck: Deck): CommentQueueItem[] {
  return deck.slides.flatMap((slide, slideIndex) =>
    (slide.comments ?? [])
      .filter((comment) => !comment.resolved)
      .map((comment) => ({
        comment,
        key: `${slide.id}-${comment.id}`,
        slide,
        slideIndex,
        target: slide.elements.find(
          (element) => element.id === comment.targetElementId,
        ),
      })),
  )
}

export function DeckCommentQueue() {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectElement = usePresentationStore((state) => state.selectElement)
  const queue = useMemo(() => openCommentQueue(deck), [deck])
  const mentionCount = useMemo(
    () => openMentionCount(queue.map((item) => item.comment)),
    [queue],
  )
  const activeIndex = queue.findIndex((item) => {
    if (item.slide.id !== selectedSlideId) return false
    if (!item.comment.targetElementId) return !selectedElementId

    return item.comment.targetElementId === selectedElementId
  })

  function goToItem(item: CommentQueueItem) {
    selectSlide(item.slide.id)
    selectElement(item.comment.targetElementId || null)
  }

  function goToOffset(offset: -1 | 1) {
    if (!queue.length) return

    const startIndex = activeIndex >= 0 ? activeIndex : 0
    const nextIndex = (startIndex + offset + queue.length) % queue.length
    goToItem(queue[nextIndex])
  }

  return (
    <section className="grid gap-2 rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <ListChecks className="size-3.5" />
          Deck review queue
        </div>
        <div className="flex items-center gap-1">
          {mentionCount ? (
            <Badge variant="outline">
              <AtSign className="size-3" />
              {mentionCount}
            </Badge>
          ) : null}
          <Badge variant={queue.length ? "secondary" : "outline"}>
            {queue.length} open
          </Badge>
        </div>
      </div>

      {queue.length ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToOffset(-1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToOffset(1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="max-h-44 space-y-2 overflow-auto">
            {queue.map((item, index) => {
              const active = index === activeIndex
              const mentions = item.comment.mentions ?? []
              const pptxLabels = [
                commentSourceThreadLabel(item.comment),
                commentSourceReplyLabel(item.comment),
                commentSourceDepthLabel(item.comment),
              ].filter(Boolean)

              return (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    "grid w-full gap-2 rounded-md border bg-background p-2 text-left text-sm transition hover:bg-muted",
                    active && "border-primary bg-muted",
                  )}
                  onClick={() => goToItem(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">
                        Slide {item.slideIndex + 1}:{" "}
                        {item.slide.title || "Untitled slide"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.comment.authorName} -{" "}
                        {formatCommentTime(item.comment.updatedAt)}
                      </div>
                    </div>
                    <Badge variant={active ? "secondary" : "outline"}>
                      <MessageSquare className="size-3" />
                      Open
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {item.comment.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-[11px]">
                      {targetLabel(item.target)}
                    </Badge>
                    {item.comment.source === "pptx" ? (
                      <>
                        <Badge variant="outline" className="text-[11px]">
                          PPTX
                        </Badge>
                        {pptxLabels.map((label) => (
                          <Badge
                            key={label}
                            variant="outline"
                            className="text-[11px]"
                          >
                            {label}
                          </Badge>
                        ))}
                      </>
                    ) : null}
                    {mentions.map((mention) => (
                      <Badge
                        key={mention}
                        variant="outline"
                        className="text-[11px]"
                      >
                        {mentionLabel(mention)}
                      </Badge>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No open comments across this deck.
        </div>
      )}
    </section>
  )
}
