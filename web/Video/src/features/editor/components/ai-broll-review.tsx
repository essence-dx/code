"use client";

import { useMemo, useState } from "react";
import { Check, Film, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import type { BrollOutput, BrollSuggestion } from "@/features/editor/components/ai-result-types";
import { formatTime } from "@/lib/editor/factory";

export interface BrollInsertSummary {
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
}

interface AiBrollReviewProps {
  output: BrollOutput;
  onInsertBroll?: (suggestions: BrollSuggestion[]) => Promise<BrollInsertSummary>;
}

export function AiBrollReview({ output, onInsertBroll }: AiBrollReviewProps) {
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [isInserting, setIsInserting] = useState(false);
  const [insertMessage, setInsertMessage] = useState<string | null>(null);
  const acceptedSuggestions = useMemo(
    () =>
      output.suggestions.filter((suggestion, index) => {
        const id = brollDecisionId(suggestion, index);
        return decisions[id] ?? true;
      }),
    [decisions, output.suggestions],
  );

  function setAccepted(suggestion: BrollSuggestion, index: number, accepted: boolean) {
    setInsertMessage(null);
    setDecisions((current) => ({
      ...current,
      [brollDecisionId(suggestion, index)]: accepted,
    }));
  }

  async function insertAcceptedBroll() {
    if (!onInsertBroll || isInserting || acceptedSuggestions.length === 0) return;

    setIsInserting(true);
    setInsertMessage(null);
    try {
      const summary = await onInsertBroll(acceptedSuggestions);
      setInsertMessage(brollInsertMessage(summary));
    } catch {
      setInsertMessage("B-roll could not be inserted. Try fewer suggestions or a simpler search term.");
    } finally {
      setIsInserting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-background p-3 text-sm">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Film className="size-4" />
          B-roll review
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{acceptedSuggestions.length} accepted</Badge>
          <Badge variant="outline">{output.suggestions.length} suggested</Badge>
          <Button size="sm" onClick={() => void insertAcceptedBroll()} disabled={!onInsertBroll || isInserting || acceptedSuggestions.length === 0}>
            {isInserting ? "Inserting..." : "Insert accepted B-roll"}
          </Button>
        </div>
        {insertMessage ? <p className="mt-2 text-xs text-muted-foreground">{insertMessage}</p> : null}
      </div>
      {output.suggestions.map((suggestion, index) => {
        const accepted = decisions[brollDecisionId(suggestion, index)] ?? true;

        return (
          <div key={brollDecisionId(suggestion, index)} className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="mr-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {suggestion.layerName} | {formatTime(suggestion.start)} - {formatTime(suggestion.end)}
              </div>
              <Badge variant="outline">{suggestion.mediaType}</Badge>
              <Badge variant="secondary">{suggestion.placement}</Badge>
              <Button size="sm" variant={accepted ? "default" : "outline"} onClick={() => setAccepted(suggestion, index, true)}>
                <Check className="size-4" />
                Accept
              </Button>
              <Button size="sm" variant={accepted ? "outline" : "secondary"} onClick={() => setAccepted(suggestion, index, false)}>
                <X className="size-4" />
                Skip
              </Button>
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline">Search: {suggestion.query}</Badge>
            </div>
            <MessageResponse>{[suggestion.rationale, ...suggestion.searchNotes].filter(Boolean).join("\n\n")}</MessageResponse>
          </div>
        );
      })}
    </div>
  );
}

function brollDecisionId(suggestion: BrollSuggestion, index: number) {
  return `${index}:${suggestion.start}:${suggestion.end}:${suggestion.query}`;
}

function brollInsertMessage(summary: BrollInsertSummary) {
  if (summary.insertedCount === 0) {
    if (summary.skippedCount > 0) return "No matching stock media was found for the accepted B-roll suggestions.";
    return "No B-roll layers were inserted.";
  }

  const skipped = summary.skippedCount > 0 ? ` ${summary.skippedCount} search${summary.skippedCount === 1 ? "" : "es"} had no usable stock result.` : "";
  const failed = summary.failedCount > 0 ? ` ${summary.failedCount} import${summary.failedCount === 1 ? "" : "s"} failed.` : "";
  return `${summary.insertedCount} B-roll layer${summary.insertedCount === 1 ? "" : "s"} inserted.${skipped}${failed}`;
}
