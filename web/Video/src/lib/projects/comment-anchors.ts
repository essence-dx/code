import { formatTime } from "@/lib/editor/factory";

export interface ProjectCommentAnchorInput {
  time?: number;
  timeEnd?: number;
  layerId?: string;
  canvasX?: number;
  canvasY?: number;
}

export interface ProjectCommentAnchor {
  time?: number;
  timeEnd?: number;
  layerId?: string;
  canvasX?: number;
  canvasY?: number;
}

export function normalizeProjectCommentAnchor(input: ProjectCommentAnchorInput): ProjectCommentAnchor {
  const time = normalizeTime(input.time);
  const timeEnd = normalizeTime(input.timeEnd);
  const canvasX = normalizeCanvasPercent(input.canvasX);
  const canvasY = normalizeCanvasPercent(input.canvasY);
  const layerId = normalizeOptionalId(input.layerId);

  return {
    time,
    timeEnd: time !== undefined && timeEnd !== undefined && timeEnd > time ? timeEnd : undefined,
    layerId,
    canvasX: canvasX !== undefined && canvasY !== undefined ? canvasX : undefined,
    canvasY: canvasX !== undefined && canvasY !== undefined ? canvasY : undefined,
  };
}

export function projectCommentAnchorLabel(comment: ProjectCommentAnchor) {
  const labels: string[] = [];

  if (comment.time !== undefined && comment.timeEnd !== undefined) {
    labels.push(`${formatTime(comment.time)}-${formatTime(comment.timeEnd)}`);
  } else if (comment.time !== undefined) {
    labels.push(formatTime(comment.time));
  }

  if (comment.layerId) {
    labels.push(`Layer ${shortAnchorId(comment.layerId)}`);
  }

  if (comment.canvasX !== undefined && comment.canvasY !== undefined) {
    labels.push(`Canvas ${Math.round(comment.canvasX)}%, ${Math.round(comment.canvasY)}%`);
  }

  return labels.length ? labels.join(" / ") : "General";
}

function normalizeTime(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 7200 ? roundTwo(value) : undefined;
}

function normalizeCanvasPercent(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? roundTwo(Math.min(100, Math.max(0, value))) : undefined;
}

function normalizeOptionalId(value: string | undefined) {
  const normalized = value?.trim().slice(0, 160);
  return normalized || undefined;
}

function shortAnchorId(value: string) {
  return value.replace(/^layer_/, "").slice(0, 8);
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}
