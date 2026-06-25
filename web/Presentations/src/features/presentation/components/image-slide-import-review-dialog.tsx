"use client"

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  imageSlideImportSummary,
  type ImageSlideImportItem,
} from "../image-slide-import-review"

type ImageSlideImportReviewDialogProps = {
  items: ImageSlideImportItem[]
  open: boolean
  onConfirm: () => void
  onMoveItem: (itemId: string, direction: -1 | 1) => void
  onOpenChange: (open: boolean) => void
  onRemoveItem: (itemId: string) => void
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function orientationSummary(summary: ReturnType<typeof imageSlideImportSummary>) {
  return [
    summary.orientationCounts.landscape
      ? `${summary.orientationCounts.landscape} landscape`
      : "",
    summary.orientationCounts.portrait
      ? `${summary.orientationCounts.portrait} portrait`
      : "",
    summary.orientationCounts.square
      ? `${summary.orientationCounts.square} square`
      : "",
    summary.orientationCounts.unknown
      ? `${summary.orientationCounts.unknown} unknown`
      : "",
  ]
    .filter(Boolean)
    .join(", ")
}

function dimensionsLabel(item: ImageSlideImportItem) {
  if (!item.width || !item.height) return "Size unavailable"

  return `${item.width} x ${item.height}`
}

export function ImageSlideImportReviewDialog({
  items,
  open,
  onConfirm,
  onMoveItem,
  onOpenChange,
  onRemoveItem,
}: ImageSlideImportReviewDialogProps) {
  const summary = imageSlideImportSummary(items)
  const fileTypeLabel = summary.fileTypes.length
    ? summary.fileTypes.join(", ")
    : "Images"
  const orientationLabel = orientationSummary(summary) || "Orientation unknown"
  const hasDuplicateNames = summary.duplicateNames.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import image slides</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{summary.totalSlides} slides</Badge>
              <Badge variant="outline">{formatBytes(summary.totalBytes)}</Badge>
              <Badge variant="outline" className="max-w-72 truncate">
                {orientationLabel}
              </Badge>
              <Badge variant="outline" className="max-w-72 truncate">
                {fileTypeLabel}
              </Badge>
              {hasDuplicateNames ? (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="size-3" />
                  {summary.duplicateNames.length} duplicate
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!items.length}
                onClick={onConfirm}
              >
                <ImagePlus className="size-4" />
                Insert slides
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96 rounded-md border">
            <div className="space-y-2 p-2">
              {items.length ? (
                items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-md border bg-background p-2"
                  >
                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded border bg-muted">
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {index + 1}. {item.alt}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {item.type || "image"} - {formatBytes(item.size)} -{" "}
                        {dimensionsLabel(item)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[11px]">
                          {item.orientation}
                        </Badge>
                        {summary.duplicateNames.includes(
                          item.alt.trim().toLowerCase(),
                        ) ? (
                          <Badge variant="outline" className="gap-1 text-[11px]">
                            <AlertTriangle className="size-3" />
                            Duplicate name
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={index === 0}
                        aria-label={`Move ${item.alt} earlier`}
                        onClick={() => onMoveItem(item.id, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={index === items.length - 1}
                        aria-label={`Move ${item.alt} later`}
                        onClick={() => onMoveItem(item.id, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Remove ${item.alt}`}
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No image slides selected.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
