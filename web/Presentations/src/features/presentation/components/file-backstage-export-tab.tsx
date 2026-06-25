"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileDown,
  FileText,
  Layers2,
  Shapes,
  Save,
} from "lucide-react"

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
import { objectConversionReport } from "../object-conversion-report"
import { pptxExportPreflight } from "../pptx-export-preflight"
import {
  pptxExportPreflightSnapshotFileName,
  serializePptxExportPreflightSnapshot,
} from "../pptx-export-preflight-snapshot"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import {
  sectionExportSummary,
  sectionSlideRangeLabel,
} from "../section-export-summary"
import {
  fileBackstageActionClassName,
  type FileBackstageDialogProps,
} from "./file-backstage-types"
import { ExportRepairLoopPanel } from "./export-repair-loop-panel"

type FileBackstageExportTabProps = Pick<
  FileBackstageDialogProps,
  | "canExportSelectedSlide"
  | "deck"
  | "odpImportReport"
  | "onExportPdf"
  | "onExportPptx"
  | "onExportSlidePng"
  | "onExportSlideSvg"
  | "onSaveDeckAs"
>

export function FileBackstageExportTab({
  canExportSelectedSlide,
  deck,
  odpImportReport,
  onExportPdf,
  onExportPptx,
  onExportSlidePng,
  onExportSlideSvg,
  onSaveDeckAs,
}: FileBackstageExportTabProps) {
  const preflight = useMemo(
    () => pptxExportPreflight(deck, { odpImportReport }),
    [deck, odpImportReport],
  )
  const preflightSnapshot = useMemo(
    () => serializePptxExportPreflightSnapshot(preflight, deck.title),
    [deck.title, preflight],
  )
  const objectReport = useMemo(() => objectConversionReport(deck), [deck])
  const sectionSummary = useMemo(() => sectionExportSummary(deck), [deck])
  const [preflightMessage, setPreflightMessage] = useState("")
  const hasPreflightIssues = preflight.issues.length > 0
  const hasObjectIssues = objectReport.issues.length > 0
  const badgeVariant =
    preflight.status === "attention"
      ? "destructive"
      : preflight.status === "warning"
        ? "secondary"
        : "default"
  const objectBadgeVariant =
    objectReport.status === "attention"
      ? "destructive"
      : objectReport.status === "warning"
        ? "secondary"
        : "default"

  async function copyPreflightSnapshot() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setPreflightMessage("Clipboard is unavailable.")
      return
    }

    await navigator.clipboard.writeText(preflightSnapshot)
    setPreflightMessage("Copied preflight snapshot.")
  }

  function downloadPreflightSnapshot() {
    downloadTextFile(
      pptxExportPreflightSnapshotFileName(deck.title),
      preflightSnapshot,
      "text/plain;charset=utf-8",
    )
    setPreflightMessage("Downloaded preflight snapshot.")
  }

  return (
    <div
      className="grid gap-3"
      data-testid={presentationSmokeTestIds.backstageExportRoot}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Export</CardTitle>
              <CardDescription>
                Download the deck or the selected slide through existing export paths.
              </CardDescription>
            </div>
            <Badge variant={badgeVariant}>
              {preflight.status === "ready"
                ? "Ready"
                : preflight.status === "attention"
                  ? "Needs review"
                  : "Review"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            data-testid={presentationSmokeTestIds.exportPptxButton}
            onClick={onExportPptx}
          >
            <FileDown className="size-4" />
            Export PowerPoint PPTX
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            data-testid={presentationSmokeTestIds.exportPdfButton}
            onClick={onExportPdf}
          >
            <FileDown className="size-4" />
            Export PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            disabled={!canExportSelectedSlide}
            onClick={onExportSlideSvg}
          >
            <FileDown className="size-4" />
            Export selected slide SVG
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            disabled={!canExportSelectedSlide}
            onClick={onExportSlidePng}
          >
            <Download className="size-4" />
            Export selected slide PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onSaveDeckAs}
          >
            <Save className="size-4" />
            Save as deck file
          </Button>
        </CardContent>
      </Card>

      <Card data-testid={presentationSmokeTestIds.exportPreflightPanel}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Section handoff</CardTitle>
              <CardDescription>{sectionSummary.summary}</CardDescription>
            </div>
            <Badge variant={sectionSummary.hasExplicitSections ? "secondary" : "outline"}>
              <Layers2 className="size-3" />
              {sectionSummary.explicitSectionCount} sections
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Grouped slides</div>
              <div className="mt-1 text-lg font-semibold">
                {sectionSummary.groupedSlideCount}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                of {sectionSummary.totalSlideCount} total
              </div>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Notes slides</div>
              <div className="mt-1 text-lg font-semibold">
                {sectionSummary.noteSlideCount}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                included in handout review
              </div>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Open comments</div>
              <div className="mt-1 text-lg font-semibold">
                {sectionSummary.openCommentCount}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                visible in comment handouts
              </div>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Media objects</div>
              <div className="mt-1 text-lg font-semibold">
                {sectionSummary.mediaObjectCount}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                review for PPTX handoff
              </div>
            </div>
          </div>

          {sectionSummary.hasExplicitSections ? (
            <div className="grid gap-2">
              {sectionSummary.sections.slice(0, 5).map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{section.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {section.slideCount} slides, {section.noteSlideCount} with
                      notes, {section.openCommentCount} open comments
                    </div>
                  </div>
                  <Badge variant={section.explicit ? "outline" : "secondary"}>
                    {sectionSlideRangeLabel(section)}
                  </Badge>
                </div>
              ))}
              {sectionSummary.sections.length > 5 ? (
                <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {sectionSummary.sections.length - 5} more section
                  {sectionSummary.sections.length - 5 === 1 ? "" : "s"} in the
                  printable overview.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No named sections in this deck. Export order follows the slide
              sequence.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Object conversion</CardTitle>
              <CardDescription>{objectReport.summary}</CardDescription>
            </div>
            <Badge variant={objectBadgeVariant}>
              <Shapes className="size-3" />
              {objectReport.status === "ready"
                ? "Editable"
                : objectReport.status === "attention"
                  ? "Needs handoff"
                  : "Simplified"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-4">
            {objectReport.metrics.map((metric) => (
              <div key={metric.id} className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="mt-1 text-lg font-semibold leading-snug">
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {metric.detail}
                </div>
              </div>
            ))}
          </div>

          {hasObjectIssues ? (
            <div className="grid gap-2">
              {objectReport.issues.slice(0, 5).map((issue) => (
                <div
                  key={issue.id}
                  className="flex gap-3 rounded-md border bg-background p-3"
                >
                  {issue.severity === "attention" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{issue.label}</div>
                      <Badge
                        variant={
                          issue.severity === "attention"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {issue.count}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {issue.detail}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {issue.slideTitles.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
              {objectReport.issues.length > 5 ? (
                <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {objectReport.issues.length - 5} more object conversion item
                  {objectReport.issues.length - 5 === 1 ? "" : "s"}.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Objects in this deck are expected to stay editable in the current
              PowerPoint export path.
            </div>
          )}
        </CardContent>
      </Card>

      <ExportRepairLoopPanel deck={deck} odpImportReport={odpImportReport} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>PPTX preflight</CardTitle>
              <CardDescription>{preflight.summary}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={presentationSmokeTestIds.exportPreflightCopyButton}
                onClick={copyPreflightSnapshot}
              >
                <Clipboard className="size-4" />
                Copy snapshot
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={
                  presentationSmokeTestIds.exportPreflightDownloadButton
                }
                onClick={downloadPreflightSnapshot}
              >
                <FileText className="size-4" />
                Download snapshot
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {preflightMessage ? (
            <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
              {preflightMessage}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-4">
            {preflight.metrics.map((metric) => (
              <div key={metric.id} className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="mt-1 text-lg font-semibold">{metric.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {metric.detail}
                </div>
              </div>
            ))}
          </div>

          {hasPreflightIssues ? (
            <div className="grid gap-2">
              {preflight.issues.slice(0, 6).map((issue) => (
                <div
                  key={issue.id}
                  className="flex gap-3 rounded-md border bg-background p-3"
                >
                  {issue.severity === "attention" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{issue.label}</div>
                      <Badge
                        variant={
                          issue.severity === "attention"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {issue.count}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {issue.detail}
                    </p>
                    {issue.repairSteps?.length ? (
                      <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        {issue.repairSteps.slice(0, 3).map((step) => (
                          <li key={step} className="flex gap-1">
                            <span aria-hidden="true">-</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {issue.slideTitles.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
              {preflight.issues.length > 6 ? (
                <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {preflight.issues.length - 6} more PPTX preflight item
                  {preflight.issues.length - 6 === 1 ? "" : "s"}.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" />
              The current deck does not use any known lossy PPTX export features.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
