"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ClipboardCopy,
  Download,
  FileText,
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
  pptxCompatibilityReportFileName,
  serializePptxCompatibilityReportText,
  type PptxCompatibilityReport,
} from "../pptx-compatibility-history"

type PptxCompatibilityReviewDialogProps = {
  activeReport: PptxCompatibilityReport | null
  reports: PptxCompatibilityReport[]
  onClearActiveReport: () => void
  onClearReports: () => void
  onSelectReport: (reportId: string) => void
}

function reportDate(value: string) {
  return new Date(value).toLocaleDateString()
}

function reportSummary(report: PptxCompatibilityReport) {
  const warningLabel = report.warnings.length === 1 ? "warning" : "warnings"

  return `${reportDate(report.importedAt)} - ${
    report.warnings.length
  } ${warningLabel}`
}

export function PptxCompatibilityReviewDialog({
  activeReport,
  reports,
  onClearActiveReport,
  onClearReports,
  onSelectReport,
}: PptxCompatibilityReviewDialogProps) {
  const [message, setMessage] = useState("")
  const warnings = activeReport?.warnings ?? []
  const hasReports = reports.length > 0

  async function copyActiveReport() {
    if (!activeReport || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(
        serializePptxCompatibilityReportText(activeReport),
      )
      setMessage("Copied report.")
    } catch {
      setMessage("Copy unavailable.")
    }
  }

  function downloadActiveReport() {
    if (!activeReport) return

    downloadTextFile(
      pptxCompatibilityReportFileName(activeReport),
      serializePptxCompatibilityReportText(activeReport),
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
            disabled={!hasReports}
          />
        }
      >
        <AlertTriangle className="size-4" />
        PPTX review
        {hasReports ? (
          <Badge variant="secondary" className="ml-1">
            {reports.length}
          </Badge>
        ) : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>PPTX compatibility review</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0 space-y-3">
            <div className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {activeReport
                      ? activeReport.sourceFileName
                      : "No active import report"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeReport
                      ? `${activeReport.deckTitle} - ${reportDate(
                          activeReport.importedAt,
                        )}`
                      : "No active report selected."}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={warnings.length ? "secondary" : "outline"}>
                    {warnings.length} warning
                    {warnings.length === 1 ? "" : "s"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!activeReport}
                    onClick={() => void copyActiveReport()}
                  >
                    <ClipboardCopy className="size-4" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!activeReport}
                    onClick={downloadActiveReport}
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!activeReport}
                    onClick={onClearActiveReport}
                  >
                    Clear active
                  </Button>
                </div>
              </div>
              {message ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {message}
                </div>
              ) : null}
            </div>

            <ScrollArea className="h-80 rounded-md border">
              <div className="space-y-2 p-3">
                {warnings.length ? (
                  warnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="rounded-md border bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{warning.label}</span>
                        <Badge variant="outline">{warning.severity}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {warning.detail}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No active compatibility warnings.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Recent imports</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasReports}
                onClick={onClearReports}
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-80 rounded-md border">
              <div className="space-y-2 p-2">
                {reports.length ? (
                  reports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-md border bg-background p-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-70"
                      disabled={report.id === activeReport?.id}
                      onClick={() => onSelectReport(report.id)}
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {report.sourceFileName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {reportSummary(report)}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No compatibility history.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
