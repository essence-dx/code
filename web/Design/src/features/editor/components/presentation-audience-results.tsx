"use client";

import { useEffect, useState } from "react";
import { BarChart3, HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PresentationResponseSummary } from "@/db/presentation-responses";
import { getPublicSurfaceCopy } from "@/features/editor/public-surface-localization";
import type { AudienceInteraction } from "@/features/editor/types";
import { useLocalePreference } from "@/features/localization/locale-preference";

type PresentationAudienceResultsProps = {
  shareId: string | null;
  pageId: string;
  interaction: AudienceInteraction | undefined;
};

export function PresentationAudienceResults({
  shareId,
  pageId,
  interaction,
}: PresentationAudienceResultsProps) {
  const { locale } = useLocalePreference();
  const copy = getPublicSurfaceCopy(locale);
  const [summary, setSummary] = useState<PresentationResponseSummary | null>(
    null,
  );

  useEffect(() => {
    if (!shareId || !interaction?.enabled) {
      setSummary(null);
      return;
    }

    const activeInteraction = interaction;
    let cancelled = false;

    async function loadSummary() {
      const params = new URLSearchParams({
        pageId,
        interactionId: activeInteraction.id,
      });
      const response = await fetch(
        `/api/audience/${shareId}/responses?${params.toString()}`,
      );

      if (!response.ok || cancelled) return;

      const body = (await response.json()) as {
        summary: PresentationResponseSummary;
      };
      setSummary(body.summary);
    }

    void loadSummary();
    const intervalId = window.setInterval(loadSummary, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [interaction, pageId, shareId]);

  if (!interaction?.enabled) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        {copy.noPromptOnSlide}
      </div>
    );
  }

  if (!shareId) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        {copy.createPublicLink}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {interaction.kind === "qa" ? (
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          ) : (
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-semibold">{interaction.prompt}</h3>
        </div>
        <Badge variant="outline">{summary?.totalResponses ?? 0}</Badge>
      </div>

      {interaction.kind === "qa" ? (
        <div className="space-y-2">
          {summary?.questions.length ? (
            summary.questions.slice(0, 5).map((question) => (
              <div
                key={question.id}
                className="rounded-md border border-border p-2 text-sm"
              >
                <p>{question.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.name}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.noQuestionsYet}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(summary?.options ?? interaction.options.map((label) => ({
            label,
            count: 0,
            correct: false,
          }))).map((option) => {
            const total = Math.max(1, summary?.totalResponses ?? 0);
            const percentage = Math.round((option.count / total) * 100);

            return (
              <div key={option.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{option.label}</span>
                  <span>
                    {option.count} {option.correct ? copy.correct : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-muted">
                  <div
                    className={
                      option.correct
                        ? "h-full rounded bg-emerald-500"
                        : "h-full rounded bg-primary"
                    }
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
