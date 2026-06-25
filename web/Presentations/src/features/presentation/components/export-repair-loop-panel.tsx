"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Clipboard, FileText, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { downloadTextFile } from "../browser-downloads"
import {
  importExportRepairLoopFileName,
  importExportRepairLoopReport,
  serializeImportExportRepairLoopReport,
  type ImportExportRepairLoopStatus,
} from "../import-export-repair-loop"
import type { OdpImportPreflightReport } from "../odp-import-preflight"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import type { Deck } from "../types"

type ExportRepairLoopPanelProps = {
  deck: Deck
  odpImportReport?: OdpImportPreflightReport | null
}

function badgeVariant(status: ImportExportRepairLoopStatus) {
  if (status === "attention") return "destructive"
  if (status === "warning") return "secondary"

  return "default"
}

function statusLabel(status: ImportExportRepairLoopStatus) {
  if (status === "attention") return "Needs repair"
  if (status === "warning") return "Review"

  return "Ready"
}

export function ExportRepairLoopPanel({
  deck,
  odpImportReport,
}: ExportRepairLoopPanelProps) {
  const repairLoop = useMemo(
    () => importExportRepairLoopReport(deck, { odpImportReport }),
    [deck, odpImportReport],
  )
  const repairLoopSnapshot = useMemo(
    () => serializeImportExportRepairLoopReport(repairLoop),
    [repairLoop],
  )
  const [message, setMessage] = useState("")
  const hasRepairActions = repairLoop.repairActionCount > 0

  async function copyRepairLoopSnapshot() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setMessage("Clipboard is unavailable.")
      return
    }

    await navigator.clipboard.writeText(repairLoopSnapshot)
    setMessage("Copied repair loop.")
  }

  function downloadRepairLoopSnapshot() {
    downloadTextFile(
      importExportRepairLoopFileName(deck.title),
      repairLoopSnapshot,
      "text/plain;charset=utf-8",
    )
    setMessage("Downloaded repair loop.")
  }

  return (
    <Card data-testid={presentationSmokeTestIds.exportRepairLoopPanel}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Import/export repair loop</CardTitle>
            <CardDescription>{repairLoop.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={badgeVariant(repairLoop.status)}>
              <Wrench className="size-3" />
              {statusLabel(repairLoop.status)}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid={presentationSmokeTestIds.exportRepairLoopCopyButton}
              onClick={copyRepairLoopSnapshot}
            >
              <Clipboard className="size-4" />
              Copy loop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid={presentationSmokeTestIds.exportRepairLoopDownloadButton}
              onClick={downloadRepairLoopSnapshot}
            >
              <FileText className="size-4" />
              Download loop
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {message ? (
          <div
            aria-live="polite"
            className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground"
          >
            {message}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          {repairLoop.metrics.map((metric) => (
            <div key={metric.id} className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="mt-1 text-lg font-semibold">{metric.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {metric.detail}
              </div>
            </div>
          ))}
        </div>

        {hasRepairActions ? (
          <div className="grid gap-2">
            {repairLoop.actions.slice(0, 6).map((action) => (
              <div
                key={action.id}
                className="flex gap-3 rounded-md border bg-background p-3"
                data-testid={presentationSmokeTestIds.exportRepairLoopAction}
              >
                {action.status === "ready" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle
                    className={
                      action.status === "attention"
                        ? "mt-0.5 size-4 shrink-0 text-destructive"
                        : "mt-0.5 size-4 shrink-0 text-amber-600"
                    }
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{action.label}</div>
                    <Badge variant={badgeVariant(action.status)}>
                      {action.count || statusLabel(action.status)}
                    </Badge>
                    <Badge variant="outline">{action.nextCommand}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {action.detail}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {action.ownerAction}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {action.exportImpact}
                  </p>
                  {action.slideTitles.length ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {action.slideTitles.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {repairLoop.actions.length > 6 ? (
              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {repairLoop.actions.length - 6} more repair loop step
                {repairLoop.actions.length - 6 === 1 ? "" : "s"}.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Linked chart data, imported table presets, and PPTX preflight are ready
            for the current export.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
