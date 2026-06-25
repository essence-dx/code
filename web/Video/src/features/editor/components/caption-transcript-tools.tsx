"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CaseSensitive, Replace, Scissors, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/editor/factory";
import type { SubtitleCue } from "@/lib/editor/types";
import {
  cleanSubtitleTranscriptCasing,
  countSubtitleTranscriptMatches,
  replaceSubtitleTranscriptText,
} from "@/lib/subtitles/cue-operations";
import { createTranscriptCutProposals, totalTranscriptCutDuration } from "@/lib/subtitles/transcript-cuts";
import type { TranscriptCutProposal } from "@/lib/subtitles/transcript-cuts";

interface CaptionTranscriptToolsProps {
  cues: SubtitleCue[];
  onChange: (cues: SubtitleCue[]) => void;
  onApplyCuts?: (proposals: TranscriptCutProposal[]) => TranscriptCutApplySummary;
}

interface TranscriptCutApplySummary {
  changedLayerCount: number;
  removedLayerCount: number;
  createdLayerCount: number;
  rangeCount: number;
}

export function CaptionTranscriptTools({ cues, onChange, onApplyCuts }: CaptionTranscriptToolsProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showCutProposals, setShowCutProposals] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const matchCount = useMemo(() => countSubtitleTranscriptMatches(cues, query), [cues, query]);
  const cutProposals = useMemo(() => createTranscriptCutProposals(cues, { query }), [cues, query]);
  const proposedCutDuration = useMemo(() => totalTranscriptCutDuration(cutProposals), [cutProposals]);

  function applyTranscriptCuts() {
    if (!onApplyCuts || cutProposals.length === 0) return;
    const summary = onApplyCuts(cutProposals);
    setApplyMessage(transcriptCutApplyMessage(summary));
  }

  return (
    <TooltipProvider>
      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input className="h-8 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find transcript text" />
          </div>
          <Badge variant={matchCount > 0 ? "secondary" : "outline"}>{matchCount}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input className="h-8 text-xs" value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="Replace with" />
          <ButtonGroup>
            <TooltipButton
              label="Replace all matches"
              disabled={matchCount === 0}
              onClick={() => onChange(replaceSubtitleTranscriptText(cues, query, replacement))}
            >
              <Replace className="size-3.5" />
            </TooltipButton>
            <TooltipButton label="Clean transcript casing" disabled={cues.length === 0} onClick={() => onChange(cleanSubtitleTranscriptCasing(cues))}>
              <CaseSensitive className="size-3.5" />
            </TooltipButton>
            <TooltipButton
              label="Preview transcript cuts"
              disabled={cutProposals.length === 0}
              onClick={() => setShowCutProposals((current) => !current)}
            >
              <Scissors className="size-3.5" />
            </TooltipButton>
          </ButtonGroup>
        </div>
        {showCutProposals && cutProposals.length > 0 ? (
          <div className="space-y-1 rounded-md border border-border bg-background p-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{cutProposals.length} proposed cut{cutProposals.length === 1 ? "" : "s"}</span>
              <span>{formatTime(proposedCutDuration)}</span>
            </div>
            <Button className="h-8 w-full justify-start text-xs" size="sm" variant="outline" disabled={!onApplyCuts} onClick={applyTranscriptCuts}>
              <Scissors className="size-3.5" />
              Apply transcript cuts
            </Button>
            {applyMessage ? <p className="text-[11px] text-muted-foreground">{applyMessage}</p> : null}
            {cutProposals.slice(0, 4).map((proposal) => (
              <div key={proposal.id} className="rounded-sm border border-border px-2 py-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {formatTime(proposal.start)} - {formatTime(proposal.end)}
                  </span>
                  <Badge variant="outline">{formatTime(proposal.duration)}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {proposal.cueIds.length} caption{proposal.cueIds.length === 1 ? "" : "s"}
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{proposal.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function transcriptCutApplyMessage(summary: TranscriptCutApplySummary) {
  if (summary.rangeCount === 0) return "No transcript cuts were applied.";
  if (summary.changedLayerCount === 0) return `${summary.rangeCount} transcript cut${summary.rangeCount === 1 ? "" : "s"} reviewed; no editable layers crossed those ranges.`;

  return `${summary.rangeCount} transcript cut${summary.rangeCount === 1 ? "" : "s"} applied across ${summary.changedLayerCount} layer${
    summary.changedLayerCount === 1 ? "" : "s"
  }.`;
}

function TooltipButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={disabled} onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
