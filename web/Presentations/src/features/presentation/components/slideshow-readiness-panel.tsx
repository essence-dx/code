"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type {
  PresenterReadinessCheck,
  PresenterReadinessCleanupAction,
  PresenterReadinessReport,
  PresenterReadinessSlideIssue,
  PresenterReadinessState,
} from "../presenter-readiness"

type SlideshowReadinessPanelProps = {
  currentSlideId?: string
  onApplyAllRehearsedTimings?: () => void
  onApplyRehearsedTiming?: (slideId: string) => void
  onJumpToSlide?: (slideId: string) => void
  report: PresenterReadinessReport
}

function stateLabel(state: PresenterReadinessState) {
  if (state === "attention") return "Needs action"
  if (state === "warning") return "Review"

  return "Ready"
}

function stateIcon(state: PresenterReadinessState) {
  if (state === "attention") return ShieldAlert
  if (state === "warning") return AlertTriangle

  return CheckCircle2
}

function stateClassName(state: PresenterReadinessState) {
  if (state === "attention") return "border-red-400/30 bg-red-500/10"
  if (state === "warning") return "border-amber-300/30 bg-amber-400/10"

  return "border-emerald-300/25 bg-emerald-400/10"
}

function issueClassName(issue: PresenterReadinessSlideIssue) {
  if (issue.state === "attention") return "text-red-100"

  return "text-amber-100"
}

function cleanupKindLabel(action: PresenterReadinessCleanupAction) {
  if (action.kind === "captions") return "Captions"
  if (action.kind === "delivery") return "Delivery"
  if (action.kind === "notes") return "Notes"

  return "Timing"
}

function CheckRow({ check }: { check: PresenterReadinessCheck }) {
  const Icon = stateIcon(check.state)

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2",
        stateClassName(check.state),
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 text-white/70" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-white/85">
            {check.label}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/45">
            {stateLabel(check.state)}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-white/55">{check.detail}</p>
      </div>
    </div>
  )
}

function CleanupActionRow({
  action,
  onApplyAllRehearsedTimings,
  onJumpToSlide,
}: {
  action: PresenterReadinessCleanupAction
  onApplyAllRehearsedTimings?: () => void
  onJumpToSlide?: (slideId: string) => void
}) {
  const firstSlideId = action.slideIds[0]
  const canApplyTimingAction =
    action.action === "apply-rehearsed-timing" &&
    Boolean(onApplyAllRehearsedTimings)
  const canJumpToSlide = Boolean(onJumpToSlide && firstSlideId)

  return (
    <div
      className={cn(
        "rounded-md border px-2.5 py-2",
        stateClassName(action.state),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-5 border-white/15 bg-black/10 px-1.5 text-[9px] text-white/55"
            >
              {cleanupKindLabel(action)}
            </Badge>
            <div className="truncate text-xs font-medium text-white/85">
              {action.label}
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-white/55">
            {action.detail}
          </p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/45">
          {stateLabel(action.state)}
        </span>
      </div>
      {canApplyTimingAction || canJumpToSlide ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {canApplyTimingAction ? (
            <Button
              aria-label="Use all rehearsed timings"
              title="Use all rehearsed timings"
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px] text-white/70 hover:bg-white/10"
              onClick={onApplyAllRehearsedTimings}
            >
              <Clock3 className="size-3" />
              Use times
            </Button>
          ) : null}
          {canJumpToSlide ? (
            <Button
              aria-label={`Jump to slide ${action.slideNumbers[0]}`}
              title="Jump to first affected slide"
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px] text-white/70 hover:bg-white/10"
              onClick={() => {
                if (onJumpToSlide && firstSlideId) {
                  onJumpToSlide(firstSlideId)
                }
              }}
            >
              <ArrowRight className="size-3" />
              Go
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function SlideshowReadinessPanel({
  currentSlideId,
  onApplyAllRehearsedTimings,
  onApplyRehearsedTiming,
  onJumpToSlide,
  report,
}: SlideshowReadinessPanelProps) {
  const issueSlides = report.slideReviews.filter((slide) => slide.issueCount)
  const visibleIssueSlides = issueSlides.slice(0, 4)
  const visibleCleanupActions = report.cleanupActions.slice(0, 4)
  const hiddenCleanupActionCount = Math.max(
    0,
    report.cleanupActions.length - visibleCleanupActions.length,
  )
  const hiddenIssueSlideCount = Math.max(
    0,
    issueSlides.length - visibleIssueSlides.length,
  )
  const timingActionCount = report.slideReviews.filter(
    (slide) => slide.needsRehearsedTimingApply,
  ).length
  const canApplyAllTimings =
    timingActionCount > 0 && Boolean(onApplyAllRehearsedTimings)
  const longestSlide = report.timing.longestSlide

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
            Readiness
          </div>
          <p className="mt-1 text-xs leading-5 text-white/55">{report.summary}</p>
        </div>
        <Badge
          variant={report.status === "attention" ? "destructive" : "outline"}
          className="border-white/15 bg-white/10 text-white"
        >
          {stateLabel(report.status)}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {report.metrics.map((metric) => (
          <div key={metric.id} className="rounded-md border border-white/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/40">
              {metric.label}
            </div>
            <div className="mt-1 font-mono text-sm text-white/85">
              {metric.value}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-white/45">
              {metric.detail}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-white/10 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wide text-white/40">
            Rehearsal run
          </div>
          <div className="font-mono text-xs text-white/75">
            {report.timing.rehearsedCount}/{report.timing.totalSlides}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-white/55">
          <div>
            <div className="text-white/35">Total</div>
            <div className="mt-0.5 font-mono text-white/85">
              {report.timing.totalRehearsedLabel}
            </div>
          </div>
          <div>
            <div className="text-white/35">Average</div>
            <div className="mt-0.5 font-mono text-white/85">
              {report.timing.averageRehearsedLabel}
            </div>
          </div>
          <div>
            <div className="text-white/35">Longest</div>
            <div className="mt-0.5 truncate font-mono text-white/85">
              {report.timing.longestSlide?.durationLabel ?? "0:00"}
            </div>
          </div>
        </div>
        {longestSlide ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-[10px] text-white/45">
              Longest: {longestSlide.slideNumber}. {longestSlide.title}
            </div>
            {onJumpToSlide ? (
              <Button
                aria-label={`Jump to slide ${longestSlide.slideNumber}`}
                title="Jump to longest slide"
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-[10px] text-white/70 hover:bg-white/10"
                onClick={() => onJumpToSlide(longestSlide.slideId)}
              >
                <ArrowRight className="size-3" />
                Go
              </Button>
            ) : null}
          </div>
        ) : null}
        {canApplyAllTimings ? (
          <Button
            aria-label="Use rehearsed timings for auto advance"
            title="Use rehearsed timings for auto advance"
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 w-full justify-center gap-1.5 border border-white/10 px-2 text-[11px] text-white/75 hover:bg-white/10"
            onClick={onApplyAllRehearsedTimings}
          >
            <Clock3 className="size-3" />
            Use rehearsed timings
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {report.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
      {visibleCleanupActions.length ? (
        <div className="mt-3 rounded-md border border-white/10 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wide text-white/40">
              Cleanup plan
            </div>
            <div className="text-[10px] text-white/45">
              {report.cleanupActions.length} action
              {report.cleanupActions.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="mt-2 grid gap-2">
            {visibleCleanupActions.map((action) => (
              <CleanupActionRow
                key={action.id}
                action={action}
                onApplyAllRehearsedTimings={onApplyAllRehearsedTimings}
                onJumpToSlide={onJumpToSlide}
              />
            ))}
            {hiddenCleanupActionCount ? (
              <div className="text-[10px] text-white/45">
                +{hiddenCleanupActionCount} more cleanup actions
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mt-3 rounded-md border border-white/10 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wide text-white/40">
            Slide review
          </div>
          <div className="text-[10px] text-white/45">
            {issueSlides.length ? `${issueSlides.length} need review` : "Ready"}
          </div>
        </div>
        {visibleIssueSlides.length ? (
          <div className="mt-2 grid gap-2">
            {visibleIssueSlides.map((slide) => (
              <div
                key={slide.slideId}
                className="rounded border border-white/10 bg-white/[0.03] p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-medium text-white/80">
                    {slide.slideNumber}. {slide.title}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="font-mono text-[10px] text-white/45">
                      {slide.rehearsalLabel}
                    </div>
                    {currentSlideId === slide.slideId ? (
                      <Badge
                        variant="outline"
                        className="h-5 border-white/15 bg-white/10 px-1.5 text-[9px] text-white/70"
                      >
                        Live
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-white/45">
                  <span>{slide.noteWordCount} words</span>
                  <span>{slide.autoAdvanceLabel}</span>
                  {slide.hasClickSequence ? <span>Click sequence</span> : null}
                </div>
                {slide.notesPreview ? (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/50">
                    {slide.notesPreview}
                  </p>
                ) : null}
                <div className="mt-2 grid gap-1">
                  {slide.issues.map((issue) => (
                    <div
                      key={issue.kind}
                      className={cn("text-[11px] leading-4", issueClassName(issue))}
                    >
                      {issue.label}:{" "}
                      <span className="text-white/50">{issue.detail}</span>
                    </div>
                  ))}
                </div>
                {onJumpToSlide || onApplyRehearsedTiming ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {onJumpToSlide ? (
                      <Button
                        aria-label={`Jump to slide ${slide.slideNumber}`}
                        title="Jump to slide"
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px] text-white/70 hover:bg-white/10"
                        onClick={() => onJumpToSlide(slide.slideId)}
                      >
                        <ArrowRight className="size-3" />
                        Go
                      </Button>
                    ) : null}
                    {onApplyRehearsedTiming &&
                    slide.canApplyRehearsedTiming &&
                    slide.needsRehearsedTimingApply ? (
                      <Button
                        aria-label={`Use rehearsed timing for slide ${slide.slideNumber}`}
                        title="Use rehearsed timing for this slide"
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px] text-white/70 hover:bg-white/10"
                        onClick={() => onApplyRehearsedTiming(slide.slideId)}
                      >
                        <Clock3 className="size-3" />
                        Use time
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {hiddenIssueSlideCount ? (
              <div className="text-[10px] text-white/45">
                +{hiddenIssueSlideCount} more slides need review
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 rounded border border-emerald-300/20 bg-emerald-400/10 p-2 text-[11px] leading-4 text-emerald-50/80">
            Every slide has presenter notes, saved timing, and media caption
            coverage.
          </div>
        )}
      </div>
    </div>
  )
}
