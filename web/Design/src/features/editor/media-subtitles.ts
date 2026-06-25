import type { MediaSubtitleCue } from "@/features/editor/types";

const timestampPattern =
  /(\d{1,2}:\d{2}:\d{2}[,.]\d{3}|\d{1,2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3}|\d{1,2}:\d{2}[,.]\d{3})/;

export function parseMediaSubtitles(input: string): MediaSubtitleCue[] {
  return input
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .flatMap(parseSubtitleBlock)
    .sort((first, second) => first.startSeconds - second.startSeconds);
}

export function createMediaSubtitlesVtt(cues: MediaSubtitleCue[]) {
  return `WEBVTT\n\n${normalizeCues(cues)
    .map((cue, index) =>
      [
        cue.id || String(index + 1),
        `${formatVttTimestamp(cue.startSeconds)} --> ${formatVttTimestamp(
          cue.endSeconds,
        )}`,
        cue.text,
      ].join("\n"),
    )
    .join("\n\n")}\n`;
}

export function createMediaSubtitlesSrt(cues: MediaSubtitleCue[]) {
  return `${normalizeCues(cues)
    .map((cue, index) =>
      [
        String(index + 1),
        `${formatSrtTimestamp(cue.startSeconds)} --> ${formatSrtTimestamp(
          cue.endSeconds,
        )}`,
        cue.text,
      ].join("\n"),
    )
    .join("\n\n")}\n`;
}

function parseSubtitleBlock(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length || /^WEBVTT$/i.test(lines[0]) || /^NOTE\b/i.test(lines[0])) {
    return [];
  }

  const timestampLineIndex = lines.findIndex((line) => line.includes("-->"));
  const timestampLine = lines[timestampLineIndex];
  const match = timestampLine?.match(timestampPattern);

  if (!match) return [];

  const text = lines.slice(timestampLineIndex + 1).join("\n").trim();
  const startSeconds = parseTimestamp(match[1]);
  const endSeconds = parseTimestamp(match[2]);

  if (!text || !Number.isFinite(startSeconds) || endSeconds <= startSeconds) {
    return [];
  }

  return [
    {
      id: timestampLineIndex > 0 ? lines[0] : undefined,
      startSeconds,
      endSeconds,
      text,
    },
  ];
}

function normalizeCues(cues: MediaSubtitleCue[]) {
  return cues
    .map((cue) => ({
      ...cue,
      startSeconds: Math.max(0, cue.startSeconds),
      endSeconds: Math.max(0, cue.endSeconds),
      text: cue.text.trim(),
    }))
    .filter((cue) => cue.text && cue.endSeconds > cue.startSeconds)
    .sort((first, second) => first.startSeconds - second.startSeconds);
}

function parseTimestamp(value: string) {
  const parts = value.replace(",", ".").split(":");
  const secondsPart = Number(parts.pop());
  const minutes = Number(parts.pop() ?? 0);
  const hours = Number(parts.pop() ?? 0);

  return hours * 3600 + minutes * 60 + secondsPart;
}

function formatVttTimestamp(seconds: number) {
  return formatTimestamp(seconds, ".");
}

function formatSrtTimestamp(seconds: number) {
  return formatTimestamp(seconds, ",");
}

function formatTimestamp(seconds: number, millisecondSeparator: "." | ",") {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(wholeSeconds).padStart(2, "0")}${millisecondSeparator}${String(
    milliseconds,
  ).padStart(3, "0")}`;
}
