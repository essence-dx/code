import type { SubtitleCue } from "@/lib/editor/types";
import { normalizeSubtitleCues } from "@/lib/subtitles/cue-operations";

export interface TranscriptCutSelection {
  query?: string;
  cueIds?: string[];
  gapTolerance?: number;
  maxProposals?: number;
}

export interface TranscriptCutProposal {
  id: string;
  start: number;
  end: number;
  duration: number;
  cueIds: string[];
  text: string;
  reason: string;
}

export function createTranscriptCutProposals(cues: SubtitleCue[], selection: TranscriptCutSelection = {}) {
  const normalized = normalizeSubtitleCues(cues);
  const cueIdSet = new Set(selection.cueIds ?? []);
  const query = selection.query?.trim() ?? "";
  const queryMatcher = query ? new RegExp(escapeRegExp(query), "i") : null;
  const matchedCues = normalized.filter((cue) => {
    if (cueIdSet.size > 0 && cueIdSet.has(cue.id)) return true;
    return queryMatcher ? queryMatcher.test(cue.text) : false;
  });

  if (matchedCues.length === 0) return [];

  const maxProposals = Math.max(1, Math.min(50, Math.floor(selection.maxProposals ?? 12)));
  const gapTolerance = Math.max(0, selection.gapTolerance ?? 0.35);
  const groups = groupAdjacentCues(matchedCues, gapTolerance);
  return groups.slice(0, maxProposals).map((group, index): TranscriptCutProposal => {
    const start = roundTime(Math.min(...group.map((cue) => cue.start)));
    const end = roundTime(Math.max(...group.map((cue) => cue.end)));
    const text = group.map((cue) => cue.text).join(" ").replace(/\s+/g, " ").trim();

    return {
      id: `transcript_cut_${index}_${start}_${end}`,
      start,
      end,
      duration: roundTime(end - start),
      cueIds: group.map((cue) => cue.id),
      text,
      reason: query ? `Matched "${query}" in ${group.length} caption${group.length === 1 ? "" : "s"}.` : `${group.length} selected caption${group.length === 1 ? "" : "s"}.`,
    };
  });
}

export function totalTranscriptCutDuration(proposals: TranscriptCutProposal[]) {
  return roundTime(proposals.reduce((total, proposal) => total + proposal.duration, 0));
}

function groupAdjacentCues(cues: SubtitleCue[], gapTolerance: number) {
  const groups: SubtitleCue[][] = [];

  for (const cue of cues) {
    const currentGroup = groups.at(-1);
    const previousCue = currentGroup?.at(-1);
    if (!currentGroup || !previousCue || cue.start > previousCue.end + gapTolerance) {
      groups.push([cue]);
      continue;
    }

    currentGroup.push(cue);
  }

  return groups;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000;
}
