"use client"

import { useState } from "react"
import {
  ClipboardCopy,
  Download,
  FileImage,
  MousePointer2,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { downloadTextFile } from "../browser-downloads"
import {
  imageSlideImportReportFileName,
  serializeImageSlideImportReportText,
  type ImageSlideImportReport,
  type ImageSlideImportReportItem,
} from "../image-slide-import-review"
import type { DeckAsset, DeckMaster, Slide } from "../types"
import { SlideMiniPreview } from "./slide-mini-preview"

type ImageSlideImportReportDialogProps = {
  assets: DeckAsset[]
  master: DeckMaster
  report: ImageSlideImportReport | null
  slides: Slide[]
  onClearReport: () => void
  onSelectSlideNumber: (slideNumber: number) => string | void
}

function formatImportDate(value: string) {
  return new Date(value).toLocaleString()
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function orientationSummary(report: ImageSlideImportReport) {
  return [
    report.summary.orientationCounts.landscape
      ? `${report.summary.orientationCounts.landscape} landscape`
      : "",
    report.summary.orientationCounts.portrait
      ? `${report.summary.orientationCounts.portrait} portrait`
      : "",
    report.summary.orientationCounts.square
      ? `${report.summary.orientationCounts.square} square`
      : "",
    report.summary.orientationCounts.unknown
      ? `${report.summary.orientationCounts.unknown} unknown`
      : "",
  ]
    .filter(Boolean)
    .join(", ")
}

function reportSlide(slides: Slide[], item: ImageSlideImportReportItem) {
  return slides[item.slideNumber - 1] ?? null
}

export function ImageSlideImportReportDialog({
  assets,
  master,
  report,
  slides,
  onClearReport,
  onSelectSlideNumber,
}: ImageSlideImportReportDialogProps) {
  const [message, setMessage] = useState("")

  async function copyReport() {
    if (!report || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(
        serializeImageSlideImportReportText(report),
      )
      setMessage("Copied report.")
    } catch {
      setMessage("Copy unavailable.")
    }
  }

  function downloadReport() {
    if (!report) return

    downloadTextFile(
      imageSlideImportReportFileName(report),
      serializeImageSlideImportReportText(report),
      "text/plain;charset=utf-8",
    )
    setMessage("Downloaded report.")
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!report}
          />
        }
      >
        <FileImage className="size-4" />
        Image import
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Image slide import report</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">
                  {report
                    ? `Slides ${report.startingSlideNumber}-${report.endingSlideNumber}`
                    : "No image-slide import report"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report
                    ? formatImportDate(report.importedAt)
                    : "Import images as slides to create a report."}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!report}
                  onClick={() => void copyReport()}
                >
                  <ClipboardCopy className="size-4" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!report}
                  onClick={downloadReport}
                >
                  <Download className="size-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!report}
                  onClick={onClearReport}
                >
                  <Trash2 className="size-4" />
                  Clear
                </Button>
              </div>
            </div>
            {message ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {message}
              </div>
            ) : null}
          </div>

          {report ? (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Slides</div>
                  <div className="text-lg font-semibold">
                    {report.summary.totalSlides}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Size</div>
                  <div className="text-lg font-semibold">
                    {formatBytes(report.summary.totalBytes)}
                  </div>
                </div>
                <div className="rounded-md border p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">
                    Orientation
                  </div>
                  <div className="truncate text-sm font-semibold">
                    {orientationSummary(report) || "Unknown"}
                  </div>
                </div>
              </div>

              {report.summary.duplicateNames.length ? (
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">Duplicate file names</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {report.summary.duplicateNames.map((name) => (
                      <Badge key={name} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <ScrollArea className="h-72 rounded-md border">
                <div className="space-y-2 p-2">
                  {report.items.map((item) => {
                    const slide = reportSlide(slides, item)

                    return (
                      <div
                        key={`${item.slideNumber}-${item.alt}`}
                        className="grid gap-2 rounded-md border bg-background p-2 text-sm sm:grid-cols-[7rem_1fr_auto] sm:items-center"
                      >
                        <div className="w-28 max-w-full">
                          {slide ? (
                            <SlideMiniPreview
                              slide={slide}
                              assets={assets}
                              master={master}
                              slideNumber={item.slideNumber}
                              slideCount={slides.length}
                              className="shadow-none"
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center rounded-md border border-dashed bg-muted text-[11px] text-muted-foreground">
                              Missing
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {item.slideNumber}. {item.alt}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.width} x {item.height} - {item.type} -{" "}
                            {formatBytes(item.size)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:justify-end">
                          <Badge variant="outline">{item.orientation}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const selectMessage = onSelectSlideNumber(
                                item.slideNumber,
                              )

                              if (selectMessage) {
                                setMessage(selectMessage)
                              }
                            }}
                          >
                            <MousePointer2 className="size-4" />
                            Open
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No recent image-slide import report.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
