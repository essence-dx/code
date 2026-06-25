import type { SubtitleCue } from "@/lib/editor/types";

export function normalizeSubtitleCues(cues: SubtitleCue[]) {
  return cues
    .filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start && cue.text.trim())
    .map((cue) => ({
      ...cue,
      id: cue.id || crypto.randomUUID(),
      start: roundCueTime(cue.start),
      end: roundCueTime(cue.end),
      text: cue.text.trim(),
      emphasis: cue.emphasis ?? "normal",
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.text.localeCompare(b.text));
}

export function shiftSubtitleCues(cues: SubtitleCue[], deltaSeconds: number) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds === 0) return normalizeSubtitleCues(cues);

  return normalizeSubtitleCues(
    cues.map((cue) => {
      const duration = cue.end - cue.start;
      const start = Math.max(0, cue.start + deltaSeconds);

      return {
        ...cue,
        start,
        end: start + duration,
      };
    }),
  );
}

export function repairSubtitleCueTiming(cues: SubtitleCue[], minimumGap = 0.05, maximumRepairableGap = 0.35) {
  const normalized = normalizeSubtitleCues(cues);
  let previousEnd: number | null = null;

  return normalizeSubtitleCues(
    normalized.map((cue) => {
      const duration = cue.end - cue.start;
      const nextAllowedStart = previousEnd === null ? cue.start : previousEnd + Math.max(0, minimumGap);
      const gap = cue.start - nextAllowedStart;
      const start = previousEnd === null || gap > maximumRepairableGap ? cue.start : nextAllowedStart;
      const end = start + duration;
      previousEnd = end;

      return {
        ...cue,
        start,
        end,
      };
    }),
  );
}

export function splitSubtitleCue(cues: SubtitleCue[], cueId: string, time: number) {
  const cue = cues.find((item) => item.id === cueId);
  if (!cue || !Number.isFinite(time) || time <= cue.start || time >= cue.end) {
    return normalizeSubtitleCues(cues);
  }

  return normalizeSubtitleCues(
    cues.flatMap((item) => {
      if (item.id !== cueId) return [item];

      return [
        { ...item, end: roundCueTime(time) },
        { ...item, id: crypto.randomUUID(), start: roundCueTime(time) },
      ];
    }),
  );
}

export function updateSubtitleCue(cues: SubtitleCue[], cueId: string, patch: Partial<Pick<SubtitleCue, "start" | "end" | "text" | "emphasis">>) {
  return normalizeSubtitleCues(
    cues.map((cue) => {
      if (cue.id !== cueId) return cue;

      return {
        ...cue,
        ...patch,
      };
    }),
  );
}

export function duplicateSubtitleCue(cues: SubtitleCue[], cueId: string) {
  const normalized = normalizeSubtitleCues(cues);
  const cue = normalized.find((item) => item.id === cueId);
  if (!cue) return normalized;

  const duration = cue.end - cue.start;
  return normalizeSubtitleCues([
    ...normalized,
    {
      ...cue,
      id: crypto.randomUUID(),
      start: cue.end,
      end: cue.end + duration,
    },
  ]);
}

export function mergeSubtitleCues(cues: SubtitleCue[], firstCueId: string, secondCueId: string) {
  const normalized = normalizeSubtitleCues(cues);
  const firstIndex = normalized.findIndex((cue) => cue.id === firstCueId);
  const secondIndex = normalized.findIndex((cue) => cue.id === secondCueId);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) return normalized;

  const [leftIndex, rightIndex] = firstIndex < secondIndex ? [firstIndex, secondIndex] : [secondIndex, firstIndex];
  const left = normalized[leftIndex];
  const right = normalized[rightIndex];

  return normalizeSubtitleCues(
    normalized.flatMap((cue, index) => {
      if (index === leftIndex) {
        return [
          {
            ...left,
            end: Math.max(left.end, right.end),
            text: `${left.text} ${right.text}`.trim(),
          },
        ];
      }

      return index === rightIndex ? [] : [cue];
    }),
  );
}

export function removeSubtitleCue(cues: SubtitleCue[], cueId: string) {
  return normalizeSubtitleCues(cues.filter((cue) => cue.id !== cueId));
}

export function countSubtitleTranscriptMatches(cues: SubtitleCue[], query: string, caseSensitive = false) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return 0;

  const flags = caseSensitive ? "g" : "gi";
  const matcher = new RegExp(escapeRegExp(normalizedQuery), flags);
  return normalizeSubtitleCues(cues).reduce((count, cue) => count + [...cue.text.matchAll(matcher)].length, 0);
}

export function replaceSubtitleTranscriptText(cues: SubtitleCue[], query: string, replacement: string, caseSensitive = false) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return normalizeSubtitleCues(cues);

  const flags = caseSensitive ? "g" : "gi";
  const matcher = new RegExp(escapeRegExp(normalizedQuery), flags);
  return normalizeSubtitleCues(cues.map((cue) => ({ ...cue, text: cue.text.replace(matcher, replacement) })));
}

export function cleanSubtitleTranscriptCasing(cues: SubtitleCue[]) {
  return normalizeSubtitleCues(cues.map((cue) => ({ ...cue, text: cleanSentenceText(cue.text) })));
}

function cleanSentenceText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const readable = normalized === normalized.toUpperCase() && /[A-Z]/.test(normalized) ? normalized.toLowerCase() : normalized;

  return readable.replace(/(^|[.!?]\s+)([a-z])/g, (match) => match.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundCueTime(value: number) {
  return Math.round(value * 1000) / 1000;
}
