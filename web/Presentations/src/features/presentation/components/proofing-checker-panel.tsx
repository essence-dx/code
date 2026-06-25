"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, SpellCheck2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

import {
  scanDeckProofing,
  summarizeProofing,
  type ProofingFinding,
} from "../proofing-checker"
import { usePresentationStore } from "../use-presentation-store"

function severityVariant(severity: ProofingFinding["severity"]) {
  return severity === "error" ? "destructive" : "secondary"
}

export function ProofingCheckerPanel() {
  const [deckWide, setDeckWide] = useState(true)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectElement = usePresentationStore((state) => state.selectElement)
  const findings = useMemo(() => scanDeckProofing(deck), [deck])
  const visibleFindings = deckWide
    ? findings
    : findings.filter((finding) => finding.slideId === selectedSlideId)
  const summary = summarizeProofing(visibleFindings)

  function goToFinding(finding: ProofingFinding) {
    selectSlide(finding.slideId)
    selectElement(finding.elementId ?? null)
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SpellCheck2 className="size-4" />
          Proofing
        </div>
        <Badge variant={summary.errors ? "destructive" : "outline"}>
          {summary.total} issues
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-muted-foreground">Typos</div>
          <div className="font-mono text-base text-destructive">
            {summary.errors}
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-muted-foreground">Style</div>
          <div className="font-mono text-base">{summary.warnings}</div>
        </div>
        <label className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2 text-muted-foreground">
          Deck
          <Switch size="sm" checked={deckWide} onCheckedChange={setDeckWide} />
        </label>
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
                    Slide {finding.slideIndex + 1}: {finding.source}
                  </div>
                </div>
                <Badge variant={severityVariant(finding.severity)}>
                  {finding.severity}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {finding.details}
              </p>
              <div className="rounded-md bg-muted/40 px-2 py-1 font-mono text-[11px]">
                {finding.snippet}
              </div>
              {finding.suggestion ? (
                <div className="text-xs text-muted-foreground">
                  Suggestion: {finding.suggestion}
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToFinding(finding)}
              >
                <AlertTriangle className="size-4" />
                Go to text
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" />
          No proofing issues found.
        </div>
      )}
    </section>
  )
}
