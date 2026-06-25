"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  FileCheck2,
  FileText,
  HardDrive,
  ShieldAlert,
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

import {
  fileBackstageReadinessReport,
  type FileBackstageReadinessCheck,
  type FileBackstageReadinessState,
} from "../file-backstage-readiness"
import type { OdpImportPreflightReport } from "../odp-import-preflight"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import type { PptxCompatibilityReport } from "../pptx-compatibility-history"
import {
  fileBackstageActionClassName,
  pptxBackstageReportLabel,
  type FileBackstageDialogProps,
} from "./file-backstage-types"

type FileBackstageInfoTabProps = Pick<
  FileBackstageDialogProps,
  | "cloudDecks"
  | "cloudSignedIn"
  | "currentFileStatus"
  | "deck"
  | "imageSlideImportReport"
  | "odpImportReport"
  | "pptxWarningReports"
  | "pptxWarnings"
  | "recoverySnapshots"
  | "onClearImageSlideImportReport"
  | "onClearOdpImportReport"
  | "onClearPptxWarningHistory"
  | "onClearPptxWarnings"
  | "onOpenPptxWarningReport"
> & {
  archivedReports: PptxCompatibilityReport[]
  deckSize: number
  openComments: number
}

function readinessBadgeVariant(state: FileBackstageReadinessState) {
  if (state === "attention") return "destructive"
  if (state === "warning") return "outline"

  return "secondary"
}

function readinessIcon(state: FileBackstageReadinessState) {
  if (state === "attention") return ShieldAlert
  if (state === "warning") return AlertTriangle

  return CheckCircle2
}

function ReadinessCheckRow({ check }: { check: FileBackstageReadinessCheck }) {
  const Icon = readinessIcon(check.state)

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-medium">{check.label}</div>
          <Badge variant={readinessBadgeVariant(check.state)}>
            {check.state}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
      </div>
    </div>
  )
}

export function FileBackstageInfoTab({
  archivedReports,
  cloudDecks,
  cloudSignedIn,
  currentFileStatus,
  deck,
  deckSize,
  imageSlideImportReport,
  odpImportReport,
  openComments,
  pptxWarningReports,
  pptxWarnings,
  recoverySnapshots,
  onClearImageSlideImportReport,
  onClearOdpImportReport,
  onClearPptxWarningHistory,
  onClearPptxWarnings,
  onOpenPptxWarningReport,
}: FileBackstageInfoTabProps) {
  const readinessReport = useMemo(
    () =>
      fileBackstageReadinessReport({
        cloudDecks,
        cloudSignedIn,
        currentFileStatus,
        deck,
        deckSizeBytes: deckSize,
        imageSlideImportReport,
        openCommentCount: openComments,
        pptxWarningReports,
        pptxWarnings,
        recoverySnapshots,
      }),
    [
      cloudDecks,
      cloudSignedIn,
      currentFileStatus,
      deck,
      deckSize,
      imageSlideImportReport,
      openComments,
      pptxWarningReports,
      pptxWarnings,
      recoverySnapshots,
    ],
  )

  return (
    <div
      className="grid gap-3"
      data-testid={presentationSmokeTestIds.backstageInfoRoot}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <CardTitle>Document readiness</CardTitle>
              <CardDescription>
                Deck size, assets, permissions, recovery, compatibility, and export
                handoff.
              </CardDescription>
            </div>
            <Badge variant={readinessBadgeVariant(readinessReport.status)}>
              <FileCheck2 className="size-3" />
              {readinessReport.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {readinessReport.metrics.map((metric) => (
              <div key={metric.id} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  {metric.label}
                </div>
                <div className="mt-1 text-lg font-semibold">{metric.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {metric.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <HardDrive className="size-4" />
                File and assets
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {readinessReport.readyCount} ready,{" "}
                {readinessReport.warningCount} warning,{" "}
                {readinessReport.attentionCount} attention.
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Cloud className="size-4" />
                Permissions
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {cloudSignedIn
                  ? "Signed in for cloud save, share, and collaboration checks."
                  : "Local-only until a user signs in."}
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <FileCheck2 className="size-4" />
                Export handoff
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {readinessReport.status === "ready"
                  ? "No readiness blockers detected."
                  : "Review warning rows before final export."}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            {readinessReport.checks.map((check) => (
              <ReadinessCheckRow key={check.id} check={check} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compatibility and import reports</CardTitle>
          <CardDescription>
            Review the latest import reports before exporting or sharing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {pptxWarnings.length ? (
            <div className="grid gap-2">
              {pptxWarnings.slice(0, 4).map((warning) => (
                <div
                  key={warning.id}
                  className="grid gap-1 rounded-md border p-2 text-sm"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4" />
                    {warning.label}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {warning.detail}
                  </p>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={onClearPptxWarnings}
              >
                Clear active warnings
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No active PPTX compatibility warnings.
            </div>
          )}

          {archivedReports.length ? (
            <div className="grid gap-2">
              {archivedReports.slice(0, 4).map((report) => (
                <Button
                  key={report.id}
                  type="button"
                  variant="ghost"
                  className={fileBackstageActionClassName}
                  onClick={() => onOpenPptxWarningReport(report.id)}
                >
                  <FileText className="size-4" />
                  {pptxBackstageReportLabel(report)}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={onClearPptxWarningHistory}
              >
                Clear compatibility history
              </Button>
            </div>
          ) : null}

          {imageSlideImportReport ? (
            <div className="grid gap-2 rounded-md border p-3 text-sm">
              <div className="font-medium">Last image-slide import</div>
              <div className="text-muted-foreground">
                Slides {imageSlideImportReport.startingSlideNumber}-
                {imageSlideImportReport.endingSlideNumber} -{" "}
                {imageSlideImportReport.summary.totalSlides} inserted
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onClearImageSlideImportReport}
              >
                Clear image import report
              </Button>
            </div>
          ) : null}

          {odpImportReport ? (
            <OdpImportReportSummary
              report={odpImportReport}
              onClearOdpImportReport={onClearOdpImportReport}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function OdpImportReportSummary({
  report,
  onClearOdpImportReport,
}: {
  report: OdpImportPreflightReport
  onClearOdpImportReport: () => void
}) {
  const importedAt = new Date(report.importedAt)

  return (
    <div className="grid gap-3 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">Last ODP preflight</div>
          <div className="text-muted-foreground">
            {report.sourceFileName} - {importedAt.toLocaleDateString()}
          </div>
        </div>
        <Badge variant="destructive">{report.status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{report.summary}</p>
      <div className="grid gap-2 sm:grid-cols-4">
        {report.metrics.map((metric) => (
          <div key={metric.id} className="rounded-md border bg-muted/20 p-2">
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="text-base font-semibold">{metric.value}</div>
            <div className="text-xs text-muted-foreground">{metric.detail}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        {report.issues.slice(0, 4).map((issue) => (
          <div key={issue.id} className="rounded-md border bg-muted/20 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{issue.label}</span>
              <Badge
                variant={issue.severity === "attention" ? "destructive" : "outline"}
              >
                {issue.count}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={onClearOdpImportReport}>
        Clear ODP preflight
      </Button>
    </div>
  )
}
