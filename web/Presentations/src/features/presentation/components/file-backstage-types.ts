import type { ImageSlideImportReport } from "../image-slide-import-review"
import type { LocalDeckFileStatus } from "../local-deck-file-state"
import type { LocalDeckRecoverySnapshot } from "../local-deck-recovery"
import type { OdpImportPreflightReport } from "../odp-import-preflight"
import type { CloudDeckSummary } from "../cloud-api"
import type { PptxCompatibilityWarning } from "../pptx-compatibility"
import type { PptxCompatibilityReport } from "../pptx-compatibility-history"
import type { RecentLocalDeckFile } from "../recent-local-deck-files"
import type { Deck } from "../types"

export type FileBackstageDialogProps = {
  canExportSelectedSlide: boolean
  currentFileStatus: LocalDeckFileStatus
  deck: Deck
  cloudDeckMessage: string
  cloudDecks: CloudDeckSummary[]
  cloudDecksWorking: boolean
  cloudPinnedDeckIds: string[]
  cloudSignedIn: boolean
  imageSlideImportReport: ImageSlideImportReport | null
  odpImportReport: OdpImportPreflightReport | null
  pptxWarningReportId?: string
  pptxWarningReports: PptxCompatibilityReport[]
  pptxWarnings: PptxCompatibilityWarning[]
  recentDecks: RecentLocalDeckFile[]
  recoverySnapshots: LocalDeckRecoverySnapshot[]
  onClearCurrentRecoverySnapshots: () => void
  onClearImageSlideImportReport: () => void
  onClearOdpImportReport: () => void
  onClearPptxWarningHistory: () => void
  onClearPptxWarnings: () => void
  onClearRecentDecks: () => void
  onClearStaleRecentDecks: () => void
  onClearRecoverySnapshots: () => void
  onForgetRecentCloudDeck: (deckId: string) => void
  onExportPdf: () => void
  onExportPptx: () => void
  onExportSlidePng: () => void
  onExportSlideSvg: () => void
  onImportGoogleSlides: () => void
  onImportImageSlides: () => void
  onImportOutline: () => void
  onImportPptx: () => void
  onOpenDeck: () => void
  onOpenPptxWarningReport: (reportId: string) => void
  onOpenRecentCloudDeck: (deckId: string) => void
  onOpenRecentDeck: (recentId: string) => void
  onOpenRecoverySnapshot: (snapshotId: string) => void
  onForgetRecentDeck: (recentId: string) => void
  onSaveDeck: () => void
  onSaveDeckAs: () => void
  onToggleCloudDeckPin: (deckId: string) => void
  onToggleRecentDeckPin: (recentId: string, pinned: boolean) => void
  onRefreshCloudDeckShortcuts: () => void
}

export const fileBackstageActionClassName =
  "h-auto justify-start gap-2 px-3 py-2 text-left"

export function formatBackstageDate(value: number | string) {
  const timestamp = typeof value === "number" ? value : Date.parse(value)
  if (!Number.isFinite(timestamp)) return "Unknown date"

  return new Date(timestamp).toLocaleDateString()
}

export function formatBackstageBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function deckBackstageByteSize(deck: Deck) {
  return new TextEncoder().encode(JSON.stringify(deck)).byteLength
}

export function deckOpenCommentCount(deck: Deck) {
  return deck.slides.reduce(
    (total, slide) =>
      total + (slide.comments ?? []).filter((comment) => !comment.resolved).length,
    0,
  )
}

export function recentBackstageLabel(recent: RecentLocalDeckFile) {
  return `${recent.name} - ${formatBackstageDate(recent.lastOpenedAt)}`
}

export function recoveryBackstageLabel(snapshot: LocalDeckRecoverySnapshot) {
  return `${snapshot.title} - ${formatBackstageDate(snapshot.capturedAt)}`
}

export function pptxBackstageReportLabel(report: PptxCompatibilityReport) {
  const warningLabel = report.warnings.length === 1 ? "warning" : "warnings"

  return `${report.sourceFileName} - ${report.warnings.length} ${warningLabel}`
}
