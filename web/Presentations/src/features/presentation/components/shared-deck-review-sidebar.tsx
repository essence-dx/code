"use client"

import { useMemo, useState } from "react"
import { AtSign, ClipboardList, MessageSquare, StickyNote } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { mentionLabel, openMentionCount } from "../comment-mentions"
import {
  commentSourceAnchorLabel,
  commentSourceDepthLabel,
  commentSourceReplyLabel,
  commentSourceThreadLabel,
} from "../comment-source-metadata"
import { serializeSharedViewReviewReport } from "../shared-view-review"
import type { Deck } from "../types"

type SharedDeckReviewSidebarProps = {
  allowDownloads?: boolean
  deck: Deck
  exportErrorMessage?: string
  slideIndex: number
  onSlideSelect: (index: number) => void
}

function commentTargetLabel(
  slide: Deck["slides"][number],
  targetElementId: string,
) {
  if (!targetElementId) return "Slide"

  const target = slide.elements.find((element) => element.id === targetElementId)
  if (!target) return "Object"
  if (target.type === "image") return target.alt || "Image"
  if (target.type === "video") return target.alt || "Video"
  if (target.type === "audio") return target.alt || "Audio"
  if (target.type === "chart") return "Chart"
  if (target.type === "table") return "Table"
  if (target.type === "shape") return "Shape"

  return target.content.trim().split(/\r?\n/)[0] || target.type
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

export function SharedDeckReviewSidebar({
  allowDownloads = true,
  deck,
  exportErrorMessage,
  slideIndex,
  onSlideSelect,
}: SharedDeckReviewSidebarProps) {
  const currentSlide = deck.slides[slideIndex]
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")
  const openComments = useMemo(
    () =>
      deck.slides.flatMap((slide, index) =>
        (slide.comments ?? [])
          .filter((comment) => !comment.resolved)
          .map((comment) => ({
            comment,
            slide,
            slideIndex: index,
          })),
      ),
    [deck],
  )
  const mentionCount = useMemo(
    () =>
      openMentionCount(
        deck.slides.flatMap((slide) => slide.comments ?? []),
      ),
    [deck],
  )

  if (!currentSlide) return null

  async function copyReviewReport() {
    if (!navigator.clipboard) {
      setCopyState("error")
      return
    }

    try {
      await navigator.clipboard.writeText(
        serializeSharedViewReviewReport(deck, { allowDownloads }),
      )
      setCopyState("copied")
    } catch {
      setCopyState("error")
    }
  }

  return (
    <aside className="min-h-0 rounded-md border bg-background">
      <Tabs defaultValue="notes" className="h-full gap-0">
        <div className="border-b p-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notes">
              <StickyNote className="size-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="size-3.5" />
              Review
            </TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="notes" id="notes" className="min-h-0">
          <ScrollArea className="h-72 xl:h-[calc(100vh-12rem)]">
            <div className="grid gap-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Slide notes</span>
                <Badge variant="outline">{slideIndex + 1}</Badge>
              </div>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                {currentSlide.notes || "No speaker notes for this slide."}
              </p>
              {exportErrorMessage ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {exportErrorMessage}
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="comments" id="comments" className="min-h-0">
          <ScrollArea className="h-72 xl:h-[calc(100vh-12rem)]">
            <div className="grid gap-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Open comments</span>
                <div className="flex items-center gap-1">
                  {mentionCount ? (
                    <Badge variant="outline">
                      <AtSign className="size-3" />
                      {mentionCount}
                    </Badge>
                  ) : null}
                  <Badge variant={openComments.length ? "secondary" : "outline"}>
                    {openComments.length}
                  </Badge>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => void copyReviewReport()}
                  >
                    <ClipboardList className="size-3.5" />
                    <span className="sr-only">Copy review report</span>
                  </Button>
                </div>
              </div>
              {copyState !== "idle" ? (
                <p className="text-xs text-muted-foreground">
                  {copyState === "copied"
                    ? "Review report copied."
                    : "Could not copy review report."}
                </p>
              ) : null}
              {openComments.map(({ comment, slide, slideIndex }) => (
                <button
                  key={comment.id}
                  type="button"
                  className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted"
                  onClick={() => onSlideSelect(slideIndex)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">
                        {comment.authorName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Slide {slideIndex + 1} -{" "}
                        {formatCommentTime(comment.updatedAt)}
                      </div>
                    </div>
                    <Badge variant="secondary">Open</Badge>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-5">
                    {comment.body}
                  </p>
                  {comment.mentions?.length ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <AtSign className="size-3 text-muted-foreground" />
                      {comment.mentions.map((mention) => (
                        <Badge
                          key={mention}
                          variant="outline"
                          className="text-[11px]"
                        >
                          {mentionLabel(mention)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {comment.source === "pptx" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[11px]">
                        PPTX
                      </Badge>
                      {[
                        commentSourceAnchorLabel(comment),
                        commentSourceThreadLabel(comment),
                        commentSourceReplyLabel(comment),
                        commentSourceDepthLabel(comment),
                      ]
                        .filter(Boolean)
                        .map((label) => (
                          <Badge
                            key={label}
                            variant="outline"
                            className="text-[11px]"
                          >
                            {label}
                          </Badge>
                        ))}
                    </div>
                  ) : null}
                  <span className="truncate text-xs text-muted-foreground">
                    {commentTargetLabel(slide, comment.targetElementId)}
                  </span>
                </button>
              ))}
              {!openComments.length ? (
                <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                  No open review comments.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="outline" id="outline" className="min-h-0">
          <ScrollArea className="h-72 xl:h-[calc(100vh-12rem)]">
            <div className="grid gap-2 p-3">
              {deck.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={cn(
                    "grid gap-1 rounded-md border p-3 text-left transition hover:bg-muted",
                    index === slideIndex && "border-primary bg-muted",
                  )}
                  onClick={() => onSlideSelect(index)}
                >
                  <span className="text-xs font-semibold">
                    {index + 1}. {slide.title || "Untitled slide"}
                  </span>
                  {slide.sectionTitle ? (
                    <span className="text-[11px] text-muted-foreground">
                      {slide.sectionTitle}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
