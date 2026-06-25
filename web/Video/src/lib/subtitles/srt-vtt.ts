import type { SubtitleCue } from "@/lib/editor/types";
import { normalizeSubtitleCues } from "@/lib/subtitles/cue-operations";
export { downloadTextFile } from "@/lib/files/download";

export function parseSubtitleFile(input: string): SubtitleCue[] {
  const text = input.replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n+/i, "").trim();
  if (!text) return [];

  return text
    .split(/\n{2,}/)
    .map((block) => parseSubtitleBlock(block))
    .filter((cue): cue is SubtitleCue => Boolean(cue));
}

export function formatSrt(cues: SubtitleCue[]) {
  return normalizeSubtitleCues(cues)
    .map(
      (cue, index) =>
        `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text.trim()}`,
    )
    .join("\n\n");
}

export function formatVtt(cues: SubtitleCue[]) {
  return `WEBVTT\n\n${normalizeSubtitleCues(cues)
    .map((cue) => `${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text.trim()}`)
    .join("\n\n")}`;
}

export function formatTranscript(cues: SubtitleCue[]) {
  return normalizeSubtitleCues(cues)
    .sort((a, b) => a.start - b.start)
    .map((cue) => cue.text.trim())
    .filter(Boolean)
    .join("\n");
}

function parseSubtitleBlock(block: string): SubtitleCue | null {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
  if (timeLineIndex === -1) return null;

  const [startRaw, endRaw] = lines[timeLineIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
  const start = parseSubtitleTime(startRaw ?? "");
  const end = parseSubtitleTime(endRaw ?? "");
  const text = lines.slice(timeLineIndex + 1).join(" ").trim();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) return null;

  return {
    id: crypto.randomUUID(),
    start,
    end,
    text,
    emphasis: "normal",
  };
}

function parseSubtitleTime(value: string) {
  const normalized = value.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return Number.NaN;

  const seconds = Number(parts.at(-1));
  const minutes = Number(parts.at(-2));
  const hours = parts.length === 3 ? Number(parts[0]) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return Number.NaN;
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59 || seconds < 0 || seconds >= 60) return Number.NaN;
  if (hours < 0) return Number.NaN;

  return hours * 3600 + minutes * 60 + seconds;
}

function formatSrtTime(seconds: number) {
  return formatTime(seconds, ",");
}

function formatVttTime(seconds: number) {
  return formatTime(seconds, ".");
}

function formatTime(seconds: number, decimal: "," | ".") {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const millis = Math.floor((safe % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${wholeSeconds
    .toString()
    .padStart(2, "0")}${decimal}${millis.toString().padStart(3, "0")}`;
}
