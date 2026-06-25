import { analyzeDeckAssets } from "./asset-health"
import type { CloudDeckSummary } from "./cloud-api"
import type { ImageSlideImportReport } from "./image-slide-import-review"
import type { LocalDeckFileStatus } from "./local-deck-file-state"
import type { LocalDeckRecoverySnapshot } from "./local-deck-recovery"
import type { PptxCompatibilityWarning } from "./pptx-compatibility"
import type { PptxCompatibilityReport } from "./pptx-compatibility-history"
import { pptxExportPreflight } from "./pptx-export-preflight"
import type { Deck } from "./types"

export type FileBackstageReadinessState = "ready" | "warning" | "attention"

export type FileBackstageMetric = {
  detail: string
  id: string
  label: string
  value: string
}

export type FileBackstageReadinessCheck = {
  detail: string
  id: string
  label: string
  state: FileBackstageReadinessState
}

export type FileBackstageReadinessReport = {
  attentionCount: number
  checks: FileBackstageReadinessCheck[]
  metrics: FileBackstageMetric[]
  readyCount: number
  status: FileBackstageReadinessState
  warningCount: number
}

export type FileBackstageReadinessInput = {
  cloudDecks: CloudDeckSummary[]
  cloudSignedIn: boolean
  currentFileStatus: LocalDeckFileStatus
  deck: Deck
  deckSizeBytes: number
  imageSlideImportReport: ImageSlideImportReport | null
  openCommentCount: number
  pptxWarningReports: PptxCompatibilityReport[]
  pptxWarnings: PptxCompatibilityWarning[]
  recoverySnapshots: LocalDeckRecoverySnapshot[]
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

function reportStatus(checks: FileBackstageReadinessCheck[]) {
  if (checks.some((check) => check.state === "attention")) return "attention"
  if (checks.some((check) => check.state === "warning")) return "warning"

  return "ready"
}

export function fileBackstageReadinessReport(
  input: FileBackstageReadinessInput,
): FileBackstageReadinessReport {
  const assetReport = analyzeDeckAssets(input.deck)
  const objectCount = input.deck.slides.reduce(
    (total, slide) => total + slide.elements.length,
    0,
  )
  const currentRecoverySnapshots = input.recoverySnapshots.filter(
    (snapshot) => snapshot.deckId === input.deck.id,
  )
  const assetWarningCount = assetReport.issues.filter(
    (issue) => issue.severity === "warning",
  ).length
  const exportPreflight = pptxExportPreflight(input.deck)
  const cloudTracksCurrentDeck = input.cloudDecks.some(
    (deck) => deck.id === input.deck.id,
  )
  const checks: FileBackstageReadinessCheck[] = [
    {
      id: "local-file",
      label: "Local file",
      state:
        input.currentFileStatus.kind === "clean"
          ? "ready"
          : input.currentFileStatus.kind === "dirty"
            ? "warning"
            : "attention",
      detail: input.currentFileStatus.detail,
    },
    {
      id: "cloud-account",
      label: "Cloud account",
      state: input.cloudSignedIn
        ? cloudTracksCurrentDeck
          ? "ready"
          : "warning"
        : "attention",
      detail: input.cloudSignedIn
        ? cloudTracksCurrentDeck
          ? "Current deck is available in recent cloud shortcuts."
          : "Signed in, but this deck has not been opened or saved as a cloud shortcut yet."
        : "Sign in to enable cloud save, version history, sharing, and collaboration.",
    },
    {
      id: "assets",
      label: "Assets",
      state: assetWarningCount
        ? "attention"
        : assetReport.issues.length
          ? "warning"
          : "ready",
      detail: assetReport.issues.length
        ? `${assetReport.issues.length} asset health issue${
            assetReport.issues.length === 1 ? "" : "s"
          }; ${assetReport.reclaimableBytes} bytes are reclaimable.`
        : "Stored assets are referenced cleanly.",
    },
    {
      id: "recovery",
      label: "Recovery",
      state: currentRecoverySnapshots.length ? "ready" : "warning",
      detail: currentRecoverySnapshots.length
        ? `${plural(currentRecoverySnapshots.length, "snapshot")} for this deck.`
        : "No recovery snapshot has been captured for this deck yet.",
    },
    {
      id: "compatibility",
      label: "Compatibility",
      state: input.pptxWarnings.length
        ? "attention"
        : input.pptxWarningReports.length
          ? "warning"
          : "ready",
      detail: input.pptxWarnings.length
        ? `${plural(input.pptxWarnings.length, "active PPTX warning")} should be reviewed before export.`
        : input.pptxWarningReports.length
          ? `${plural(input.pptxWarningReports.length, "stored import report")} available for review.`
          : "No active PPTX compatibility warnings.",
    },
    {
      id: "export",
      label: "Export readiness",
      state:
        input.pptxWarnings.length ||
        assetWarningCount ||
        exportPreflight.status === "attention"
          ? "attention"
          : input.currentFileStatus.hasUnsavedChanges ||
              exportPreflight.status === "warning"
            ? "warning"
            : "ready",
      detail:
        input.pptxWarnings.length || assetWarningCount
          ? "Review compatibility and asset warnings before sending this deck out."
          : exportPreflight.issues.length
            ? exportPreflight.summary
          : input.currentFileStatus.hasUnsavedChanges
            ? "Export works, but save the latest local/cloud copy for a cleaner handoff."
            : "Ready for PPTX, PDF, image, and handout export paths.",
    },
  ]
  const status = reportStatus(checks)

  return {
    attentionCount: checks.filter((check) => check.state === "attention").length,
    checks,
    metrics: [
      {
        id: "slides",
        label: "Slides",
        value: String(input.deck.slides.length),
        detail: `${plural(objectCount, "object")} across the deck`,
      },
      {
        id: "size",
        label: "Deck payload",
        value: `${Math.max(1, Math.round(input.deckSizeBytes / 1024))} KB`,
        detail: "JSON payload size before exported formats",
      },
      {
        id: "assets",
        label: "Assets",
        value: String(assetReport.totalAssets),
        detail: `${plural(assetReport.remoteAssets, "remote asset")} / ${plural(assetReport.usedAssets, "used asset")}`,
      },
      {
        id: "review",
        label: "Review",
        value: String(input.openCommentCount),
        detail: input.imageSlideImportReport
          ? "Open comments plus latest image-import report"
          : "Open comments in this deck",
      },
    ],
    readyCount: checks.filter((check) => check.state === "ready").length,
    status,
    warningCount: checks.filter((check) => check.state === "warning").length,
  }
}
