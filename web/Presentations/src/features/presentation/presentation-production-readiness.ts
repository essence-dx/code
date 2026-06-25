import { canvasRenderBudget } from "./canvas-render-budget"
import {
  deckScaleLabel,
  deckScaleLimits,
  deckScaleMetrics,
  formatBytes,
  historyMetrics,
} from "./deck-performance"
import { largeDeckSafeguardReport } from "./large-deck-windowing"
import {
  presentationBrowserSmokeReadinessReport,
  type PresentationBrowserSmokeReadinessInput,
  type PresentationBrowserSmokeReadinessReport,
} from "./presentation-browser-smoke-contract"
import type { Deck } from "./types"

export type PresentationProductionReadinessStatus =
  | "attention"
  | "ready"
  | "watch"

export type PresentationPressureDiagnostic = {
  detail: string
  id: string
  label: string
  limit: string
  status: PresentationProductionReadinessStatus
  value: string
}

export type PresentationPerformancePressureReport = {
  diagnostics: PresentationPressureDiagnostic[]
  readyCount: number
  status: PresentationProductionReadinessStatus
  summary: string
  totalCount: number
}

export type PresentationProductionReadinessReport = {
  browserSmoke: PresentationBrowserSmokeReadinessReport
  performance: PresentationPerformancePressureReport
  readyCount: number
  status: PresentationProductionReadinessStatus
  summary: string
  totalCount: number
}

function pressureStatus(
  value: number,
  largeLimit: number,
  heavyLimit: number,
): PresentationProductionReadinessStatus {
  if (value >= heavyLimit) return "attention"
  if (value >= largeLimit) return "watch"
  return "ready"
}

function statusFromSmoke(
  report: PresentationBrowserSmokeReadinessReport,
): PresentationProductionReadinessStatus {
  if (report.status === "fail") return "attention"
  if (report.status === "warn") return "watch"
  return "ready"
}

function combineStatuses(
  statuses: PresentationProductionReadinessStatus[],
): PresentationProductionReadinessStatus {
  if (statuses.includes("attention")) return "attention"
  if (statuses.includes("watch")) return "watch"
  return "ready"
}

function numericDiagnostic(input: {
  detail: string
  heavyLimit: number
  id: string
  label: string
  largeLimit: number
  value: number
}) {
  const status = pressureStatus(input.value, input.largeLimit, input.heavyLimit)

  return {
    detail: input.detail,
    id: input.id,
    label: input.label,
    limit: `${input.largeLimit} watch / ${input.heavyLimit} attention`,
    status,
    value: `${input.value}`,
  } satisfies PresentationPressureDiagnostic
}

export function presentationPerformancePressureReport(
  deck: Deck,
  history: Deck[] = [],
): PresentationPerformancePressureReport {
  const scale = deckScaleMetrics(deck)
  const undo = historyMetrics(history)
  const slideBudgets = deck.slides.map((slide) => canvasRenderBudget(slide))
  const denseSlides = slideBudgets.filter(
    (budget) => budget.density === "dense",
  ).length
  const budgetedSlides = slideBudgets.filter(
    (budget) => budget.density === "budgeted",
  ).length
  const largeDeckSafeguards = largeDeckSafeguardReport(deck)
  const diagnostics = [
    numericDiagnostic({
      detail: "Total slide count affects thumbnail windows, search, export, and autosave payload size.",
      heavyLimit: deckScaleLimits.heavy.slides,
      id: "slides",
      label: "Slides",
      largeLimit: deckScaleLimits.large.slides,
      value: scale.slides,
    }),
    numericDiagnostic({
      detail: "Total editable object count drives selection, hit-testing, persistence, and export cost.",
      heavyLimit: deckScaleLimits.heavy.elements,
      id: "objects",
      label: "Objects",
      largeLimit: deckScaleLimits.large.elements,
      value: scale.elements,
    }),
    numericDiagnostic({
      detail: "Animated object count affects slideshow sequencing and PPTX timing XML size.",
      heavyLimit: deckScaleLimits.heavy.animatedElements,
      id: "animations",
      label: "Animations",
      largeLimit: deckScaleLimits.large.animatedElements,
      value: scale.animatedElements,
    }),
    numericDiagnostic({
      detail: "The busiest slide controls canvas render pressure more than deck size alone.",
      heavyLimit: deckScaleLimits.heavy.maxElementsOnSlide,
      id: "busiest-slide",
      label: "Busiest slide objects",
      largeLimit: deckScaleLimits.large.maxElementsOnSlide,
      value: scale.maxElementsOnSlide,
    }),
    numericDiagnostic({
      detail: "Many animated objects on one slide are costly for preview and slideshow playback.",
      heavyLimit: deckScaleLimits.heavy.maxAnimatedElementsOnSlide,
      id: "busiest-animation-slide",
      label: "Busiest slide animations",
      largeLimit: deckScaleLimits.large.maxAnimatedElementsOnSlide,
      value: scale.maxAnimatedElementsOnSlide,
    }),
    {
      detail: "Estimated deck bytes combine structural JSON and stored asset payloads.",
      id: "deck-bytes",
      label: "Deck size",
      limit: `${formatBytes(deckScaleLimits.large.estimatedBytes)} watch / ${formatBytes(deckScaleLimits.heavy.estimatedBytes)} attention`,
      status: pressureStatus(
        scale.estimatedBytes,
        deckScaleLimits.large.estimatedBytes,
        deckScaleLimits.heavy.estimatedBytes,
      ),
      value: formatBytes(scale.estimatedBytes),
    },
    {
      detail: "Undo history is bounded so large edits cannot grow memory without limit.",
      id: "undo-entries",
      label: "Undo entries",
      limit: `${deckScaleLimits.history.entries} kept`,
      status:
        undo.entries > deckScaleLimits.history.entries ? "attention" : "ready",
      value: `${undo.entries}`,
    },
    {
      detail: "Undo snapshot bytes are capped independently from entry count.",
      id: "undo-bytes",
      label: "Undo memory",
      limit: formatBytes(deckScaleLimits.history.estimatedBytes),
      status:
        undo.estimatedBytes > deckScaleLimits.history.estimatedBytes
          ? "attention"
          : undo.estimatedBytes > deckScaleLimits.history.estimatedBytes * 0.8
            ? "watch"
            : "ready",
      value: formatBytes(undo.estimatedBytes),
    },
    {
      detail: "Dense slides keep overflow checks but opt into browser containment.",
      id: "dense-slides",
      label: "Dense slides",
      limit: "0 ideal",
      status: denseSlides ? "watch" : "ready",
      value: `${denseSlides}`,
    },
    {
      detail: "Budgeted slides reduce repeated overflow work while preserving selected text checks.",
      id: "budgeted-slides",
      label: "Budgeted slides",
      limit: "0 ideal",
      status: budgetedSlides ? "attention" : "ready",
      value: `${budgetedSlides}`,
    },
    ...largeDeckSafeguards.checks,
  ] satisfies PresentationPressureDiagnostic[]
  const readyCount = diagnostics.filter(
    (diagnostic) => diagnostic.status === "ready",
  ).length
  const status = combineStatuses(diagnostics.map((diagnostic) => diagnostic.status))

  return {
    diagnostics,
    readyCount,
    status,
    summary: `${deckScaleLabel(scale.rating)}: ${readyCount} of ${diagnostics.length} production pressure checks are ready.`,
    totalCount: diagnostics.length,
  }
}

export function presentationProductionReadinessReport(input: {
  browserSmoke?: PresentationBrowserSmokeReadinessInput
  deck: Deck
  history?: Deck[]
}): PresentationProductionReadinessReport {
  const performance = presentationPerformancePressureReport(
    input.deck,
    input.history ?? [],
  )
  const browserSmoke = presentationBrowserSmokeReadinessReport(
    input.browserSmoke,
  )
  const browserStatus = statusFromSmoke(browserSmoke)
  const totalCount = performance.totalCount + browserSmoke.checks.length
  const readyCount =
    performance.readyCount +
    browserSmoke.checks.filter((check) => check.status === "pass").length
  const status = combineStatuses([performance.status, browserStatus])

  return {
    browserSmoke,
    performance,
    readyCount,
    status,
    summary: `${readyCount} of ${totalCount} production readiness checks are ready.`,
    totalCount,
  }
}
