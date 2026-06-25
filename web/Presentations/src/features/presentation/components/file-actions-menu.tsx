"use client"

import {
  AlertTriangle,
  Download,
  FileDown,
  FileImage,
  FileInput,
  FileText,
  FileUp,
  FolderOpen,
  History,
  ImagePlus,
  Link2,
  Save,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { LocalDeckFileStatus } from "../local-deck-file-state"
import type { LocalDeckRecoverySnapshot } from "../local-deck-recovery"
import type { ImageSlideImportReport } from "../image-slide-import-review"
import type { OdpImportPreflightReport } from "../odp-import-preflight"
import type { PptxCompatibilityWarning } from "../pptx-compatibility"
import type { PptxCompatibilityReport } from "../pptx-compatibility-history"
import type { RecentLocalDeckFile } from "../recent-local-deck-files"

type FileActionsMenuProps = {
  canExportSelectedSlide: boolean
  currentDeckId: string
  currentFileStatus: LocalDeckFileStatus
  imageSlideImportReport: ImageSlideImportReport | null
  odpImportReport: OdpImportPreflightReport | null
  pptxWarningReportId?: string
  pptxWarningReports: PptxCompatibilityReport[]
  pptxWarningSource?: string
  pptxWarnings: PptxCompatibilityWarning[]
  recentDecks: RecentLocalDeckFile[]
  recoverySnapshots: LocalDeckRecoverySnapshot[]
  onClearCurrentRecoverySnapshots: () => void
  onClearImageSlideImportReport: () => void
  onClearOdpImportReport: () => void
  onClearPptxWarningHistory: () => void
  onClearPptxWarnings: () => void
  onClearRecentDecks: () => void
  onClearRecoverySnapshots: () => void
  onExportPdf: () => void
  onExportPptx: () => void
  onExportSlidePng: () => void
  onExportSlideSvg: () => void
  onImportImageSlides: () => void
  onImportGoogleSlides: () => void
  onImportOutline: () => void
  onImportPptx: () => void
  onOpenDeck: () => void
  onOpenPptxWarningReport: (reportId: string) => void
  onOpenRecentDeck: (recentId: string) => void
  onOpenRecoverySnapshot: (snapshotId: string) => void
  onSaveDeck: () => void
  onSaveDeckAs: () => void
}

function recentLabel(recent: RecentLocalDeckFile) {
  const openedAt = new Date(recent.lastOpenedAt)

  return `${recent.name} - ${openedAt.toLocaleDateString()}`
}

function recoveryLabel(snapshot: LocalDeckRecoverySnapshot) {
  const capturedAt = new Date(snapshot.capturedAt)

  return `${snapshot.title} - ${capturedAt.toLocaleDateString()}`
}

function pptxReportLabel(report: PptxCompatibilityReport) {
  const importedAt = new Date(report.importedAt)
  const warningLabel = report.warnings.length === 1 ? "warning" : "warnings"

  return `${report.sourceFileName} - ${importedAt.toLocaleDateString()} (${report.warnings.length} ${warningLabel})`
}

function imageSlideImportReportLabel(report: ImageSlideImportReport) {
  const importedAt = new Date(report.importedAt)

  return `Slides ${report.startingSlideNumber}-${report.endingSlideNumber} - ${importedAt.toLocaleDateString()}`
}

function odpImportReportLabel(report: OdpImportPreflightReport) {
  const importedAt = new Date(report.importedAt)
  const slideMetric = report.metrics.find((metric) => metric.id === "slides")
  const slideLabel = slideMetric ? `${slideMetric.value} slides` : "ODP package"

  return `${report.sourceFileName} - ${importedAt.toLocaleDateString()} (${slideLabel})`
}

export function FileActionsMenu({
  canExportSelectedSlide,
  currentDeckId,
  currentFileStatus,
  imageSlideImportReport,
  odpImportReport,
  pptxWarningReportId,
  pptxWarningReports,
  pptxWarningSource,
  pptxWarnings,
  recentDecks,
  recoverySnapshots,
  onClearCurrentRecoverySnapshots,
  onClearImageSlideImportReport,
  onClearOdpImportReport,
  onClearPptxWarningHistory,
  onClearPptxWarnings,
  onClearRecentDecks,
  onClearRecoverySnapshots,
  onExportPdf,
  onExportPptx,
  onExportSlidePng,
  onExportSlideSvg,
  onImportImageSlides,
  onImportGoogleSlides,
  onImportOutline,
  onImportPptx,
  onOpenDeck,
  onOpenPptxWarningReport,
  onOpenRecentDeck,
  onOpenRecoverySnapshot,
  onSaveDeck,
  onSaveDeckAs,
}: FileActionsMenuProps) {
  const currentRecoverySnapshots = recoverySnapshots.filter(
    (snapshot) => snapshot.deckId === currentDeckId,
  )
  const olderRecoverySnapshots = recoverySnapshots.filter(
    (snapshot) => snapshot.deckId !== currentDeckId,
  )
  const visibleOlderRecoverySnapshots = olderRecoverySnapshots.slice(0, 4)
  const hiddenOlderSnapshotCount =
    olderRecoverySnapshots.length - visibleOlderRecoverySnapshots.length
  const archivedPptxWarningReports = pptxWarningReports.filter(
    (report) => report.id !== pptxWarningReportId,
  )
  const visibleArchivedPptxWarningReports =
    archivedPptxWarningReports.slice(0, 4)
  const hiddenArchivedPptxWarningCount =
    archivedPptxWarningReports.length -
    visibleArchivedPptxWarningReports.length
  const hasPptxReviewState =
    pptxWarnings.length > 0 || pptxWarningReports.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <FolderOpen className="size-4" />
        File
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Local file</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <Save className="size-4" />
          <span className="grid min-w-0">
            <span className="truncate">{currentFileStatus.label}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {currentFileStatus.fileName}
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenDeck}>
          <FileInput className="size-4" />
          Open deck
          <DropdownMenuShortcut>Ctrl O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSaveDeck}>
          <Save className="size-4" />
          Save
          <DropdownMenuShortcut>Ctrl S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSaveDeckAs}>
          <Download className="size-4" />
          Save as deck file
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onImportOutline}>
          <FileText className="size-4" />
          Import outline
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportPptx}>
          <FileUp className="size-4" />
          Import PPTX or ODP
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportGoogleSlides}>
          <Link2 className="size-4" />
          Import public Google Slides link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportImageSlides}>
          <ImagePlus className="size-4" />
          Import image slides
        </DropdownMenuItem>
        {imageSlideImportReport ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Last image import</DropdownMenuLabel>
            <DropdownMenuItem disabled>
              <FileImage className="size-4" />
              <span className="grid min-w-0">
                <span className="truncate">
                  {imageSlideImportReportLabel(imageSlideImportReport)}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {imageSlideImportReport.summary.totalSlides} slide
                  {imageSlideImportReport.summary.totalSlides === 1 ? "" : "s"}{" "}
                  inserted
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearImageSlideImportReport}>
              Clear image import report
            </DropdownMenuItem>
          </>
        ) : null}

        {odpImportReport ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Last ODP preflight</DropdownMenuLabel>
            <DropdownMenuItem disabled>
              <FileText className="size-4" />
              <span className="grid min-w-0">
                <span className="truncate">
                  {odpImportReportLabel(odpImportReport)}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {odpImportReport.issues.length} compatibility item
                  {odpImportReport.issues.length === 1 ? "" : "s"}
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearOdpImportReport}>
              Clear ODP preflight
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportPptx}>
          <FileDown className="size-4" />
          Export PowerPoint PPTX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPdf}>
          <FileDown className="size-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canExportSelectedSlide}
          onClick={onExportSlideSvg}
        >
          <FileDown className="size-4" />
          Export slide SVG
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canExportSelectedSlide}
          onClick={onExportSlidePng}
        >
          <FileImage className="size-4" />
          Export slide PNG
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Recent local decks</DropdownMenuLabel>
        {recentDecks.length ? (
          <>
            {recentDecks.map((recent) => (
              <DropdownMenuItem
                key={recent.id}
                onClick={() => onOpenRecentDeck(recent.id)}
              >
                <FileText className="size-4" />
                <span className="truncate">{recentLabel(recent)}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearRecentDecks}>
              Clear recent decks
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled>No recent local decks</DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Recovery snapshots</DropdownMenuLabel>
        {recoverySnapshots.length ? (
          <>
            {currentRecoverySnapshots.length ? (
              <>
                {currentRecoverySnapshots.map((snapshot) => (
                  <DropdownMenuItem
                    key={snapshot.id}
                    onClick={() => onOpenRecoverySnapshot(snapshot.id)}
                  >
                    <History className="size-4" />
                    <span className="truncate">
                      {recoveryLabel(snapshot)}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={onClearCurrentRecoverySnapshots}>
                  Clear current deck snapshots
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>
                No current deck snapshots
              </DropdownMenuItem>
            )}

            {olderRecoverySnapshots.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Older decks</DropdownMenuLabel>
                {visibleOlderRecoverySnapshots.map((snapshot) => (
                  <DropdownMenuItem
                    key={snapshot.id}
                    onClick={() => onOpenRecoverySnapshot(snapshot.id)}
                  >
                    <History className="size-4" />
                    <span className="truncate">
                      {recoveryLabel(snapshot)}
                    </span>
                  </DropdownMenuItem>
                ))}
                {hiddenOlderSnapshotCount > 0 ? (
                  <DropdownMenuItem disabled>
                    {hiddenOlderSnapshotCount} older snapshot
                    {hiddenOlderSnapshotCount === 1 ? "" : "s"}
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearRecoverySnapshots}>
              Clear all recovery snapshots
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled>No recovery snapshots</DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Last PPTX import</DropdownMenuLabel>
        {hasPptxReviewState ? (
          <>
            {pptxWarnings.length ? (
              <>
                {pptxWarningSource ? (
                  <DropdownMenuItem disabled>
                    <FileText className="size-4" />
                    <span className="truncate text-muted-foreground">
                      {pptxWarningSource}
                    </span>
                  </DropdownMenuItem>
                ) : null}
                {pptxWarnings.slice(0, 4).map((warning) => (
                  <DropdownMenuItem key={warning.id} disabled>
                    <AlertTriangle className="size-4" />
                    <span className="grid min-w-0">
                      <span className="truncate">{warning.label}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {warning.detail}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
                {pptxWarnings.length > 4 ? (
                  <DropdownMenuItem disabled>
                    {pptxWarnings.length - 4} more warning
                    {pptxWarnings.length - 4 === 1 ? "" : "s"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearPptxWarnings}>
                  Clear import warnings
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>
                No active compatibility warnings
              </DropdownMenuItem>
            )}

            {archivedPptxWarningReports.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Earlier PPTX imports</DropdownMenuLabel>
                {visibleArchivedPptxWarningReports.map((report) => (
                  <DropdownMenuItem
                    key={report.id}
                    onClick={() => onOpenPptxWarningReport(report.id)}
                  >
                    <FileText className="size-4" />
                    <span className="truncate">
                      {pptxReportLabel(report)}
                    </span>
                  </DropdownMenuItem>
                ))}
                {hiddenArchivedPptxWarningCount > 0 ? (
                  <DropdownMenuItem disabled>
                    {hiddenArchivedPptxWarningCount} earlier import
                    {hiddenArchivedPptxWarningCount === 1 ? "" : "s"}
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}

            {pptxWarningReports.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearPptxWarningHistory}>
                  Clear compatibility history
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <DropdownMenuItem disabled>No compatibility warnings</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
