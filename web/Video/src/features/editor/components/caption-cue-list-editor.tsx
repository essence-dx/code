"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Scissors, Trash2, Wand, WrapText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CaptionTranscriptTools } from "@/features/editor/components/caption-transcript-tools";
import type { SubtitleCue } from "@/lib/editor/types";
import { formatTime } from "@/lib/editor/factory";
import type { TranscriptCutProposal } from "@/lib/subtitles/transcript-cuts";
import {
  duplicateSubtitleCue,
  mergeSubtitleCues,
  normalizeSubtitleCues,
  repairSubtitleCueTiming,
  removeSubtitleCue,
  shiftSubtitleCues,
  splitSubtitleCue,
  updateSubtitleCue,
} from "@/lib/subtitles/cue-operations";

interface CaptionCueListEditorProps {
  cues: SubtitleCue[];
  duration: number;
  onChange: (cues: SubtitleCue[]) => void;
  onApplyCuts?: (proposals: TranscriptCutProposal[]) => TranscriptCutApplySummary;
}

interface TranscriptCutApplySummary {
  changedLayerCount: number;
  removedLayerCount: number;
  createdLayerCount: number;
  rangeCount: number;
}

const emphasisOptions: Array<{ value: NonNullable<SubtitleCue["emphasis"]>; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Strong" },
  { value: "quiet", label: "Quiet" },
];

export function CaptionCueListEditor({ cues, duration, onChange, onApplyCuts }: CaptionCueListEditorProps) {
  const [shiftAmount, setShiftAmount] = useState(0.25);
  const normalizedCues = normalizeSubtitleCues(cues);

  function updateCue(cueId: string, patch: Partial<Pick<SubtitleCue, "start" | "end" | "text" | "emphasis">>) {
    onChange(updateSubtitleCue(normalizedCues, cueId, patch));
  }

  function splitCue(cue: SubtitleCue) {
    onChange(splitSubtitleCue(normalizedCues, cue.id, cue.start + (cue.end - cue.start) / 2));
  }

  function mergeCueWithNext(index: number) {
    const cue = normalizedCues[index];
    const nextCue = normalizedCues[index + 1];
    if (!cue || !nextCue) return;
    onChange(mergeSubtitleCues(normalizedCues, cue.id, nextCue.id));
  }

  if (normalizedCues.length === 0) {
    return <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No caption cues.</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <CaptionTranscriptTools cues={normalizedCues} onChange={onChange} onApplyCuts={onApplyCuts} />
        <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Shift</span>
            <Input
              className="h-8 w-20 font-mono text-xs"
              type="number"
              min={0.05}
              step={0.05}
              value={shiftAmount}
              onChange={(event) => setShiftAmount(safeShiftAmount(event.target.value))}
              aria-label="Caption timing shift amount"
            />
          </div>
          <ButtonGroup>
            <TooltipButton label="Shift captions earlier" onClick={() => onChange(shiftSubtitleCues(normalizedCues, -shiftAmount))}>
              <ArrowLeft className="size-3.5" />
            </TooltipButton>
            <TooltipButton label="Shift captions later" onClick={() => onChange(shiftSubtitleCues(normalizedCues, shiftAmount))}>
              <ArrowRight className="size-3.5" />
            </TooltipButton>
            <TooltipButton label="Repair caption gaps and overlaps" onClick={() => onChange(repairSubtitleCueTiming(normalizedCues))}>
              <Wand className="size-3.5" />
            </TooltipButton>
          </ButtonGroup>
        </div>
        {normalizedCues.map((cue, index) => (
          <div key={cue.id} className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {index + 1}
                </Badge>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {formatTime(cue.start)} - {formatTime(cue.end)}
                </span>
              </div>
              <ButtonGroup>
                <TooltipButton label="Split cue" disabled={cue.end - cue.start <= 0.2} onClick={() => splitCue(cue)}>
                  <Scissors className="size-3.5" />
                </TooltipButton>
                <TooltipButton label="Merge with next cue" disabled={index >= normalizedCues.length - 1} onClick={() => mergeCueWithNext(index)}>
                  <WrapText className="size-3.5" />
                </TooltipButton>
                <TooltipButton label="Duplicate cue" onClick={() => onChange(duplicateSubtitleCue(normalizedCues, cue.id))}>
                  <Copy className="size-3.5" />
                </TooltipButton>
                <TooltipButton label="Delete cue" onClick={() => onChange(removeSubtitleCue(normalizedCues, cue.id))}>
                  <Trash2 className="size-3.5" />
                </TooltipButton>
              </ButtonGroup>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TimeField label="Start" value={cue.start} max={duration} onChange={(start) => updateCue(cue.id, { start })} />
              <TimeField label="End" value={cue.end} max={duration} onChange={(end) => updateCue(cue.id, { end })} />
            </div>
            <Textarea
              className="min-h-16 text-xs"
              value={cue.text}
              onChange={(event) => updateCue(cue.id, { text: event.target.value })}
              aria-label={`Caption cue ${index + 1} text`}
            />
            <Select value={cue.emphasis ?? "normal"} onValueChange={(emphasis) => updateCue(cue.id, { emphasis: emphasis as SubtitleCue["emphasis"] })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emphasisOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

function safeShiftAmount(rawValue: string) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? Math.max(0.05, parsed) : 0.25;
}

function TimeField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  function handleChange(rawValue: string) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(0, Math.min(max, parsed)));
  }

  return (
    <label className="space-y-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <Input className="h-8 font-mono text-xs" type="number" min={0} max={max} step={0.05} value={value} onChange={(event) => handleChange(event.target.value)} />
    </label>
  );
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
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={disabled} onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
