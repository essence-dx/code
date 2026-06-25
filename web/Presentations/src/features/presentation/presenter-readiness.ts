import { hasMediaCaptions } from "./media-captions"
import { sequencedSlideElements } from "./slideshow-sequence"
import { formatDuration, type SlideshowBlankMode } from "./slideshow-tools"
import type { Deck, PresentationElement, Slide } from "./types"

export type PresenterReadinessState = "ready" | "warning" | "attention"

export type AudienceDisplayState = "not-opened" | "connected" | "blocked"

export type PresenterReadinessSlideIssueKind =
  | "missing-rehearsal"
  | "timing-mismatch"
  | "missing-notes"
  | "short-notes"
  | "missing-media-captions"

export type PresenterReadinessSlideIssue = {
  kind: PresenterReadinessSlideIssueKind
  label: string
  detail: string
  state: Exclude<PresenterReadinessState, "ready">
}

export type PresenterReadinessSlideReview = {
  autoAdvanceDurationMs: number
  autoAdvanceLabel: string
  canApplyRehearsedTiming: boolean
  hasClickSequence: boolean
  hasTimingMismatch: boolean
  issueCount: number
  issues: PresenterReadinessSlideIssue[]
  needsRehearsedTimingApply: boolean
  noteWordCount: number
  notesPreview: string
  rehearsalDurationMs: number
  rehearsalLabel: string
  slideId: string
  slideNumber: number
  title: string
}

export type PresenterReadinessCleanupKind =
  | "captions"
  | "delivery"
  | "notes"
  | "timing"

export type PresenterReadinessCleanupAction = {
  action?:
    | "add-captions"
    | "add-notes"
    | "apply-rehearsed-timing"
    | "clear-screen-handoff"
    | "open-audience-display"
    | "run-rehearsal"
  detail: string
  id: string
  kind: PresenterReadinessCleanupKind
  label: string
  slideIds: string[]
  slideNumbers: number[]
  state: Exclude<PresenterReadinessState, "ready">
}

export type PresenterReadinessTimingSummary = {
  averageRehearsedLabel: string
  averageRehearsedMs: number
  longestSlide:
    | {
        durationLabel: string
        durationMs: number
        slideId: string
        slideNumber: number
        title: string
      }
    | null
  missingCount: number
  rehearsedCount: number
  totalRehearsedLabel: string
  totalRehearsedMs: number
  totalSlides: number
}

export type PresenterReadinessRuntime = {
  audienceChannelAvailable?: boolean
  audienceDisplayState?: AudienceDisplayState
  blankMode?: SlideshowBlankMode
  captionsVisible?: boolean
  fullscreenAvailable?: boolean
}

export type PresenterReadinessCheck = {
  id: string
  label: string
  state: PresenterReadinessState
  detail: string
}

export type PresenterReadinessMetric = {
  id: string
  label: string
  value: string
  detail: string
}

export type PresenterReadinessReport = {
  checks: PresenterReadinessCheck[]
  cleanupActions: PresenterReadinessCleanupAction[]
  metrics: PresenterReadinessMetric[]
  slideReviews: PresenterReadinessSlideReview[]
  status: PresenterReadinessState
  summary: string
  timing: PresenterReadinessTimingSummary
  readyCount: number
  warningCount: number
  attentionCount: number
}

const NOTE_WORD_TARGET = 6
const TIMING_MISMATCH_MIN_MS = 15_000
const TIMING_MISMATCH_RATIO = 0.35

function isMediaElement(element: PresentationElement) {
  return element.type === "audio" || element.type === "video"
}

function slideHasMedia(slide: Slide) {
  return slide.elements.some(isMediaElement)
}

function mediaElements(slides: Slide[]) {
  return slides.flatMap((slide) => slide.elements.filter(isMediaElement))
}

function mediaCaptionCount(slides: Slide[]) {
  return mediaElements(slides).filter(hasMediaCaptions).length
}

function slideMediaWithoutCaptions(slide: Slide) {
  return slide.elements.filter(
    (element) => isMediaElement(element) && !hasMediaCaptions(element),
  )
}

function noteWordCount(notes: string) {
  return notes.trim().split(/\s+/).filter(Boolean).length
}

function notePreview(notes: string) {
  const normalized = notes.replace(/\s+/g, " ").trim()

  if (normalized.length <= 96) return normalized

  return `${normalized.slice(0, 93).trim()}...`
}

function hasAutoAdvanceMismatch(slide: Slide) {
  if (!slide.autoAdvanceAfterMs || !slide.rehearsalDurationMs) return false

  const difference = Math.abs(slide.autoAdvanceAfterMs - slide.rehearsalDurationMs)

  return (
    difference >= TIMING_MISMATCH_MIN_MS &&
    difference >= slide.rehearsalDurationMs * TIMING_MISMATCH_RATIO
  )
}

function statusFromChecks(checks: PresenterReadinessCheck[]) {
  if (checks.some((check) => check.state === "attention")) return "attention"
  if (checks.some((check) => check.state === "warning")) return "warning"

  return "ready"
}

function countChecks(checks: PresenterReadinessCheck[], state: PresenterReadinessState) {
  return checks.filter((check) => check.state === state).length
}

function formatCoverage(count: number, total: number) {
  return `${count}/${total}`
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

function issueSlides(
  slideReviews: PresenterReadinessSlideReview[],
  issueKinds: PresenterReadinessSlideIssueKind[],
) {
  const issueKindSet = new Set(issueKinds)

  return slideReviews.filter((slide) =>
    slide.issues.some((issue) => issueKindSet.has(issue.kind)),
  )
}

function slideReference(slides: PresenterReadinessSlideReview[]) {
  const shownNumbers = slides.slice(0, 3).map((slide) => slide.slideNumber)
  const overflow = Math.max(0, slides.length - shownNumbers.length)
  const prefix = slides.length === 1 ? "slide" : "slides"
  const suffix = overflow ? `, +${overflow} more` : ""

  return `${prefix} ${shownNumbers.join(", ")}${suffix}`
}

function cleanupAction(
  input: Omit<PresenterReadinessCleanupAction, "slideIds" | "slideNumbers"> & {
    slides?: PresenterReadinessSlideReview[]
  },
): PresenterReadinessCleanupAction {
  const slides = input.slides ?? []

  return {
    action: input.action,
    detail: input.detail,
    id: input.id,
    kind: input.kind,
    label: input.label,
    slideIds: slides.map((slide) => slide.slideId),
    slideNumbers: slides.map((slide) => slide.slideNumber),
    state: input.state,
  }
}

function rehearsalCheck(slides: Slide[]): PresenterReadinessCheck {
  const rehearsedSlides = slides.filter((slide) => slide.rehearsalDurationMs > 0)
  const missing = slides.length - rehearsedSlides.length
  const mismatchedAutoAdvance = slides.filter(hasAutoAdvanceMismatch)

  if (!slides.length) {
    return {
      id: "rehearsal",
      label: "Rehearsal timing",
      state: "attention",
      detail: "Add slides before running a rehearsal.",
    }
  }

  if (!rehearsedSlides.length) {
    return {
      id: "rehearsal",
      label: "Rehearsal timing",
      state: "warning",
      detail: "No rehearsal timings are saved yet.",
    }
  }

  return {
    id: "rehearsal",
    label: "Rehearsal timing",
    state: missing || mismatchedAutoAdvance.length ? "warning" : "ready",
    detail: rehearsalDetail(missing, mismatchedAutoAdvance.length),
  }
}

function notesCheck(slides: Slide[]): PresenterReadinessCheck {
  const notedSlides = slides.filter((slide) => slide.notes.trim())
  const missing = slides.length - notedSlides.length
  const short = notedSlides.filter(
    (slide) => noteWordCount(slide.notes) < NOTE_WORD_TARGET,
  ).length

  return {
    id: "notes",
    label: "Speaker notes",
    state: missing || short ? "warning" : "ready",
    detail: notesDetail(missing, short),
  }
}

function rehearsalDetail(missing: number, mismatchedAutoAdvance: number) {
  const details: string[] = []

  if (missing) {
    details.push(`${plural(missing, "slide")} still need saved timing`)
  }
  if (mismatchedAutoAdvance) {
    details.push(
      `${plural(mismatchedAutoAdvance, "auto-advance timing")} need review`,
    )
  }

  return details.length
    ? `${details.join("; ")}.`
    : "Every slide has saved rehearsal timing."
}

function notesDetail(missing: number, short: number) {
  const details: string[] = []

  if (missing) {
    details.push(`${plural(missing, "slide")} have no speaker notes`)
  }
  if (short) {
    details.push(`${plural(short, "note")} need more delivery detail`)
  }

  return details.length
    ? `${details.join("; ")}.`
    : "Speaker notes are available on every slide."
}

function mediaCheck(
  slides: Slide[],
  runtime: PresenterReadinessRuntime,
): PresenterReadinessCheck {
  const media = mediaElements(slides)
  const captions = mediaCaptionCount(slides)
  const missingCaptions = media.length - captions

  if (!media.length) {
    return {
      id: "media-captions",
      label: "Media captions",
      state: "ready",
      detail: "No audio or video objects need caption checks.",
    }
  }

  if (missingCaptions) {
    return {
      id: "media-captions",
      label: "Media captions",
      state: "warning",
      detail: `${plural(missingCaptions, "media object")} are missing captions.`,
    }
  }

  return {
    id: "media-captions",
    label: "Media captions",
    state: runtime.captionsVisible === false ? "warning" : "ready",
    detail:
      runtime.captionsVisible === false
        ? "Captions exist, but the presenter caption toggle is off."
        : "Media captions are available for slideshow playback.",
  }
}

function audienceCheck(
  runtime: PresenterReadinessRuntime,
): PresenterReadinessCheck {
  if (runtime.audienceChannelAvailable === false) {
    return {
      id: "audience-display",
      label: "Audience display",
      state: "attention",
      detail: "This browser cannot sync the second-window audience display.",
    }
  }

  if (runtime.audienceDisplayState === "blocked") {
    return {
      id: "audience-display",
      label: "Audience display",
      state: "attention",
      detail: "Audience display did not open; allow pop-ups and retry.",
    }
  }

  if (runtime.audienceDisplayState === "connected") {
    return {
      id: "audience-display",
      label: "Audience display",
      state: "ready",
      detail: "Audience display is connected and receiving slide updates.",
    }
  }

  return {
    id: "audience-display",
    label: "Audience display",
    state: "warning",
    detail: "Open the audience display before presenting to a room.",
  }
}

function screenHandoffCheck(
  runtime: PresenterReadinessRuntime,
): PresenterReadinessCheck {
  if (runtime.blankMode && runtime.blankMode !== "none") {
    return {
      id: "screen-handoff",
      label: "Screen handoff",
      state: "attention",
      detail: `Audience screen is currently ${runtime.blankMode}.`,
    }
  }

  if (runtime.fullscreenAvailable === false) {
    return {
      id: "screen-handoff",
      label: "Screen handoff",
      state: "warning",
      detail: "Fullscreen is not available in this browser context.",
    }
  }

  return {
    id: "screen-handoff",
    label: "Screen handoff",
    state: "ready",
    detail: "Fullscreen and black/white screen controls are available.",
  }
}

function slideIssues(slide: Slide): PresenterReadinessSlideIssue[] {
  const issues: PresenterReadinessSlideIssue[] = []
  const missingCaptions = slideMediaWithoutCaptions(slide).length
  const words = noteWordCount(slide.notes)

  if (slide.rehearsalDurationMs <= 0) {
    issues.push({
      kind: "missing-rehearsal",
      label: "No saved timing",
      state: "warning",
      detail: "Run through this slide once in slideshow mode.",
    })
  }

  if (hasAutoAdvanceMismatch(slide)) {
    issues.push({
      kind: "timing-mismatch",
      label: "Auto timing mismatch",
      state: "warning",
      detail: `Auto ${formatDuration(slide.autoAdvanceAfterMs)} vs rehearsed ${formatDuration(slide.rehearsalDurationMs)}.`,
    })
  }

  if (!slide.notes.trim()) {
    issues.push({
      kind: "missing-notes",
      label: "No speaker notes",
      state: "warning",
      detail: "Add a presenter cue, transition, or risk note.",
    })
  } else if (words < NOTE_WORD_TARGET) {
    issues.push({
      kind: "short-notes",
      label: "Short speaker notes",
      state: "warning",
      detail: "Add enough context to present without guessing.",
    })
  }

  if (missingCaptions) {
    issues.push({
      kind: "missing-media-captions",
      label: "Media captions",
      state: "warning",
      detail: `${plural(missingCaptions, "media object")} need captions.`,
    })
  }

  return issues
}

function slideReview(slide: Slide, index: number): PresenterReadinessSlideReview {
  const issues = slideIssues(slide)

  return {
    autoAdvanceDurationMs: slide.autoAdvanceAfterMs,
    autoAdvanceLabel: slide.autoAdvanceAfterMs
      ? formatDuration(slide.autoAdvanceAfterMs)
      : "Manual",
    canApplyRehearsedTiming: slide.rehearsalDurationMs > 0,
    hasClickSequence: sequencedSlideElements(slide).length > 0,
    hasTimingMismatch: hasAutoAdvanceMismatch(slide),
    issueCount: issues.length,
    issues,
    needsRehearsedTimingApply:
      slide.rehearsalDurationMs > 0 &&
      slide.autoAdvanceAfterMs !== slide.rehearsalDurationMs,
    noteWordCount: noteWordCount(slide.notes),
    notesPreview: notePreview(slide.notes),
    rehearsalDurationMs: slide.rehearsalDurationMs,
    rehearsalLabel: slide.rehearsalDurationMs
      ? formatDuration(slide.rehearsalDurationMs)
      : "Not rehearsed",
    slideId: slide.id,
    slideNumber: index + 1,
    title: slide.title || `Slide ${index + 1}`,
  }
}

function presenterCleanupActions(
  checks: PresenterReadinessCheck[],
  slideReviews: PresenterReadinessSlideReview[],
): PresenterReadinessCleanupAction[] {
  const actions: PresenterReadinessCleanupAction[] = []
  const timingSlides = slideReviews.filter(
    (slide) => slide.needsRehearsedTimingApply,
  )
  const missingRehearsalSlides = issueSlides(slideReviews, ["missing-rehearsal"])
  const noteSlides = issueSlides(slideReviews, ["missing-notes", "short-notes"])
  const captionSlides = issueSlides(slideReviews, ["missing-media-captions"])
  const audienceCheckResult = checks.find((check) => check.id === "audience-display")
  const screenHandoffCheckResult = checks.find(
    (check) => check.id === "screen-handoff",
  )

  if (timingSlides.length) {
    actions.push(
      cleanupAction({
        action: "apply-rehearsed-timing",
        detail: `Use saved rehearsal timings for ${slideReference(timingSlides)}.`,
        id: "sync-rehearsed-timings",
        kind: "timing",
        label: "Sync rehearsed timings",
        slides: timingSlides,
        state: "warning",
      }),
    )
  }

  if (missingRehearsalSlides.length) {
    actions.push(
      cleanupAction({
        action: "run-rehearsal",
        detail: `Run slideshow rehearsal for ${slideReference(
          missingRehearsalSlides,
        )}.`,
        id: "rehearse-missing-slides",
        kind: "timing",
        label: "Rehearse missing slides",
        slides: missingRehearsalSlides,
        state: "warning",
      }),
    )
  }

  if (noteSlides.length) {
    actions.push(
      cleanupAction({
        action: "add-notes",
        detail: `Add or expand speaker notes on ${slideReference(noteSlides)}.`,
        id: "polish-speaker-notes",
        kind: "notes",
        label: "Polish speaker notes",
        slides: noteSlides,
        state: "warning",
      }),
    )
  }

  if (captionSlides.length) {
    actions.push(
      cleanupAction({
        action: "add-captions",
        detail: `Add media captions on ${slideReference(captionSlides)}.`,
        id: "add-media-captions",
        kind: "captions",
        label: "Add media captions",
        slides: captionSlides,
        state: "warning",
      }),
    )
  }

  if (
    audienceCheckResult &&
    audienceCheckResult.state !== "ready"
  ) {
    actions.push(
      cleanupAction({
        action: "open-audience-display",
        detail: audienceCheckResult.detail,
        id: "open-audience-display",
        kind: "delivery",
        label: "Prepare audience display",
        state: audienceCheckResult.state,
      }),
    )
  }

  if (
    screenHandoffCheckResult &&
    screenHandoffCheckResult.state !== "ready"
  ) {
    actions.push(
      cleanupAction({
        action: "clear-screen-handoff",
        detail: screenHandoffCheckResult.detail,
        id: "fix-screen-handoff",
        kind: "delivery",
        label: "Fix screen handoff",
        state: screenHandoffCheckResult.state,
      }),
    )
  }

  return actions
}

function timingSummary(slides: Slide[]): PresenterReadinessTimingSummary {
  const rehearsedSlides = slides.filter((slide) => slide.rehearsalDurationMs > 0)
  const totalRehearsedMs = rehearsedSlides.reduce(
    (total, slide) => total + slide.rehearsalDurationMs,
    0,
  )
  const averageRehearsedMs = rehearsedSlides.length
    ? Math.round(totalRehearsedMs / rehearsedSlides.length)
    : 0
  const longestSlide = rehearsedSlides.reduce<Slide | null>(
    (longest, slide) =>
      !longest || slide.rehearsalDurationMs > longest.rehearsalDurationMs
        ? slide
        : longest,
    null,
  )
  const longestSlideIndex = longestSlide ? slides.indexOf(longestSlide) : -1

  return {
    averageRehearsedLabel: formatDuration(averageRehearsedMs),
    averageRehearsedMs,
    longestSlide: longestSlide
      ? {
          durationLabel: formatDuration(longestSlide.rehearsalDurationMs),
          durationMs: longestSlide.rehearsalDurationMs,
          slideId: longestSlide.id,
          slideNumber: longestSlideIndex + 1,
          title: longestSlide.title || `Slide ${longestSlideIndex + 1}`,
        }
      : null,
    missingCount: slides.length - rehearsedSlides.length,
    rehearsedCount: rehearsedSlides.length,
    totalRehearsedLabel: formatDuration(totalRehearsedMs),
    totalRehearsedMs,
    totalSlides: slides.length,
  }
}

function readinessSummary(
  status: PresenterReadinessState,
  attentionCount: number,
  warningCount: number,
) {
  if (status === "ready") return "Presenter setup is ready for delivery."
  if (attentionCount && warningCount) {
    return `${plural(attentionCount, "handoff blocker")} and ${plural(
      warningCount,
      "readiness warning",
    )} need review.`
  }
  if (attentionCount) {
    return `${plural(attentionCount, "handoff blocker")} need review.`
  }

  return `${plural(warningCount, "readiness warning")} need review.`
}

export function presenterReadinessReport(
  deck: Deck,
  runtime: PresenterReadinessRuntime = {},
): PresenterReadinessReport {
  const slides = deck.slides
  const rehearsedSlides = slides.filter((slide) => slide.rehearsalDurationMs > 0)
  const notedSlides = slides.filter((slide) => slide.notes.trim())
  const mediaSlides = slides.filter(slideHasMedia)
  const media = mediaElements(slides)
  const captionedMedia = mediaCaptionCount(slides)
  const sequencedSlides = slides.filter(
    (slide) => sequencedSlideElements(slide).length > 0,
  )
  const checks = [
    rehearsalCheck(slides),
    notesCheck(slides),
    mediaCheck(slides, runtime),
    audienceCheck(runtime),
    screenHandoffCheck(runtime),
  ]
  const status = statusFromChecks(checks)
  const attentionCount = countChecks(checks, "attention")
  const warningCount = countChecks(checks, "warning")
  const readyCount = countChecks(checks, "ready")
  const slideReviews = slides.map(slideReview)

  return {
    checks,
    cleanupActions: presenterCleanupActions(checks, slideReviews),
    metrics: [
      {
        id: "rehearsed",
        label: "Rehearsed",
        value: formatCoverage(rehearsedSlides.length, slides.length),
        detail: "slides with saved timing",
      },
      {
        id: "notes",
        label: "Notes",
        value: formatCoverage(notedSlides.length, slides.length),
        detail: "slides with speaker notes",
      },
      {
        id: "media",
        label: "Media",
        value: String(mediaSlides.length),
        detail: `${formatCoverage(captionedMedia, media.length)} captioned`,
      },
      {
        id: "sequence",
        label: "Animation",
        value: String(sequencedSlides.length),
        detail: "slides with click sequence",
      },
    ],
    slideReviews,
    status,
    summary: readinessSummary(status, attentionCount, warningCount),
    timing: timingSummary(slides),
    readyCount,
    warningCount,
    attentionCount,
  }
}
