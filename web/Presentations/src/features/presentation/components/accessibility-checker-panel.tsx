"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

import {
  scanDeckAccessibility,
  summarizeAccessibility,
  type AccessibilityFinding,
} from "../accessibility-checker"
import { accessibilityKeyboardParityReport } from "../accessibility-keyboard-parity"
import { usePresentationStore } from "../use-presentation-store"

function severityVariant(severity: AccessibilityFinding["severity"]) {
  return severity === "error" ? "destructive" : "secondary"
}

export function AccessibilityCheckerPanel() {
  const [deckWide, setDeckWide] = useState(true)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectElement = usePresentationStore((state) => state.selectElement)
  const findings = useMemo(() => scanDeckAccessibility(deck), [deck])
  const parityReport = useMemo(
    () => accessibilityKeyboardParityReport({ findings }),
    [findings],
  )
  const visibleFindings = deckWide
    ? findings
    : findings.filter((finding) => finding.slideId === selectedSlideId)
  const summary = summarizeAccessibility(visibleFindings)

  function goToFinding(finding: AccessibilityFinding) {
    selectSlide(finding.slideId)
    selectElement(finding.elementId ?? null)
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4" />
          Accessibility
        </div>
        <Badge variant={summary.errors ? "destructive" : "outline"}>
          {summary.total} issues
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-muted-foreground">Errors</div>
          <div className="font-mono text-base text-destructive">
            {summary.errors}
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-muted-foreground">Warnings</div>
          <div className="font-mono text-base">{summary.warnings}</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-muted-foreground">Keyboard</div>
          <div className="font-mono text-base">
            {parityReport.readyCount}/{parityReport.totalCount}
          </div>
        </div>
        <label className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2 text-muted-foreground">
          Deck
          <Switch size="sm" checked={deckWide} onCheckedChange={setDeckWide} />
        </label>
      </div>

      <div className="grid gap-1 rounded-md border bg-muted/20 p-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Focus and keyboard</span>
          <Badge variant={parityReport.status === "ready" ? "outline" : "secondary"}>
            {parityReport.status}
          </Badge>
        </div>
        <div className="grid gap-1 text-muted-foreground">
          {parityReport.checks.map((check) => (
            <div key={check.id} className="flex items-start justify-between gap-2">
              <span>{check.label}</span>
              <span className="shrink-0 font-medium text-foreground">
                {check.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {visibleFindings.length ? (
        <div className="max-h-56 space-y-2 overflow-auto rounded-md border bg-muted/20 p-2">
          {visibleFindings.map((finding) => (
            <article
              key={finding.id}
              className="grid gap-2 rounded-md border bg-background p-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">
                    {finding.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Slide {finding.slideIndex + 1}: {finding.slideTitle}
                  </div>
                </div>
                <Badge variant={severityVariant(finding.severity)}>
                  {finding.severity}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {finding.details}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Go to ${finding.title} on slide ${finding.slideIndex + 1}`}
                onClick={() => goToFinding(finding)}
              >
                <AlertTriangle className="size-4" />
                Go to issue
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" />
          No accessibility issues found.
        </div>
      )}
    </section>
  )
}
