"use client"

import { useMemo, useState, type FormEvent } from "react"
import {
  AtSign,
  CheckCircle2,
  FileCode2,
  ClipboardList,
  MessageSquare,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { authClient } from "@/lib/auth-client"

import { extractCommentMentions, mentionLabel } from "../comment-mentions"
import {
  collaborationReviewExportChoices,
  collaborationReviewExportText,
  type CollaborationReviewExportChoiceId,
} from "../collaboration-review-operations"
import {
  commentSourceAnchorLabel,
  commentSourceDepthLabel,
  commentSourceReplyLabel,
  commentSourceThreadLabel,
} from "../comment-source-metadata"
import { shapeKindLabels, shapeKind } from "../shape-formatting"
import type { PresentationElement, SlideComment } from "../types"
import { usePresentationStore } from "../use-presentation-store"
import { DeckCommentQueue } from "./deck-comment-queue"

function elementLabel(element: PresentationElement | undefined) {
  if (!element) return "Slide"
  if (element.type === "image") return element.alt || "Image"
  if (element.type === "video") return element.alt || "Video"
  if (element.type === "audio") return element.alt || "Audio"
  if (element.type === "shape") return shapeKindLabels[shapeKind(element)]
  if (element.type === "chart") return "Chart"

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

function sortComments(a: SlideComment, b: SlideComment) {
  if (a.resolved !== b.resolved) return a.resolved ? 1 : -1

  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
}

export function ReviewComments() {
  const { data: session } = authClient.useSession()
  const [draft, setDraft] = useState("")
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  )
  const [copiedChoiceLabel, setCopiedChoiceLabel] = useState("")
  const [attachToSelected, setAttachToSelected] = useState(true)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const addSlideComment = usePresentationStore((state) => state.addSlideComment)
  const updateSlideComment = usePresentationStore(
    (state) => state.updateSlideComment,
  )
  const deleteSlideComment = usePresentationStore(
    (state) => state.deleteSlideComment,
  )
  const slide = deck.slides.find((item) => item.id === selectedSlideId)
  const selectedElement = slide?.elements.find(
    (item) => item.id === selectedElementId,
  )
  const sortedComments = useMemo(
    () => [...(slide?.comments ?? [])].sort(sortComments),
    [slide?.comments],
  )
  const draftMentions = useMemo(() => extractCommentMentions(draft), [draft])
  const exportChoices = useMemo(
    () => collaborationReviewExportChoices(deck, { role: "owner" }),
    [deck],
  )
  const openCount = sortedComments.filter((comment) => !comment.resolved).length
  const targetElementId =
    attachToSelected && selectedElement ? selectedElement.id : ""
  const authorName =
    session?.user.name || session?.user.email || "essencefromexistence"

  if (!slide) {
    return null
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!slide || !draft.trim()) return

    addSlideComment(slide.id, {
      body: draft,
      authorName,
      targetElementId,
    })
    setDraft("")
  }

  async function copyReviewExport(choiceId: CollaborationReviewExportChoiceId) {
    if (!navigator.clipboard) {
      setCopyState("error")
      return
    }

    const choice = exportChoices.find((item) => item.id === choiceId)
    if (!choice?.enabled) {
      setCopyState("error")
      return
    }

    try {
      await navigator.clipboard.writeText(
        collaborationReviewExportText(deck, choiceId, { role: "owner" }),
      )
      setCopiedChoiceLabel(choice.label)
      setCopyState("copied")
    } catch {
      setCopyState("error")
    }
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4" />
          Comments
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={openCount ? "secondary" : "outline"}>
            {openCount} open
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Copy review export"
              className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            >
              <ClipboardList className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Review exports</DropdownMenuLabel>
              {exportChoices.map((choice) => (
                <DropdownMenuItem
                  key={choice.id}
                  disabled={!choice.enabled}
                  onClick={() => void copyReviewExport(choice.id)}
                >
                  <FileCode2 className="size-3.5" />
                  <span className="grid min-w-0">
                    <span className="truncate">{choice.label}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {choice.detail}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {copyState !== "idle" ? (
        <p className="text-xs text-muted-foreground">
          {copyState === "copied"
            ? `${copiedChoiceLabel || "Review export"} copied.`
            : "Could not copy review handoff."}
        </p>
      ) : null}

      <form className="grid gap-2" onSubmit={submitComment}>
        <Textarea
          aria-label="New review comment"
          className="min-h-20 resize-none text-sm"
          value={draft}
          placeholder="Add a review comment"
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        {draftMentions.length ? (
          <div className="flex flex-wrap items-center gap-1">
            <AtSign className="size-3 text-muted-foreground" />
            {draftMentions.map((mention) => (
              <Badge key={mention} variant="outline" className="text-[11px]">
                {mentionLabel(mention)}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              size="sm"
              checked={attachToSelected}
              disabled={!selectedElement}
              onCheckedChange={setAttachToSelected}
            />
            Attach to selected object
          </Label>
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      </form>

      <DeckCommentQueue />

      {sortedComments.length ? (
        <div className="max-h-60 space-y-2 overflow-auto rounded-md border bg-muted/20 p-2">
          {sortedComments.map((comment) => {
            const target = slide.elements.find(
              (element) => element.id === comment.targetElementId,
            )
            const mentions = comment.mentions ?? []
            const pptxLabels = [
              commentSourceAnchorLabel(comment),
              commentSourceThreadLabel(comment),
              commentSourceReplyLabel(comment),
              commentSourceDepthLabel(comment),
            ].filter(Boolean)

            return (
              <article
                key={comment.id}
                className="grid gap-2 rounded-md border bg-background p-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">
                      {comment.authorName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatCommentTime(comment.updatedAt)}
                    </div>
                  </div>
                  <Badge variant={comment.resolved ? "outline" : "secondary"}>
                    {comment.resolved ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-5">
                  {comment.body}
                </p>
                {mentions.length ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <AtSign className="size-3 text-muted-foreground" />
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
                ) : null}
                {comment.source === "pptx" ? (
                  <div className="flex flex-wrap items-center gap-1">
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
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {elementLabel(target)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={
                        comment.resolved
                          ? "Reopen comment"
                          : "Resolve comment"
                      }
                      onClick={() =>
                        updateSlideComment(slide.id, comment.id, {
                          resolved: !comment.resolved,
                        })
                      }
                    >
                      <CheckCircle2 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Delete comment"
                      onClick={() => deleteSlideComment(slide.id, comment.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          No comments on this slide.
        </div>
      )}
    </section>
  )
}
