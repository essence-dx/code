import { nanoid } from "nanoid";

import type {
  DrawElement,
  DrawPoint,
  DrawTool,
} from "@/features/editor/types";

export const drawToolLabels: Record<DrawTool, string> = {
  pen: "Pen",
  highlighter: "Highlighter",
  eraser: "Eraser",
};

export type DrawToolSettings = Pick<
  DrawElement,
  "stroke" | "strokeWidth" | "strokeOpacity"
>;

export function getDrawToolSettings(
  tool: DrawTool,
  pageBackground = "#ffffff",
): DrawToolSettings {
  if (tool === "highlighter") {
    return {
      stroke: "#facc15",
      strokeWidth: 22,
      strokeOpacity: 0.42,
    };
  }

  if (tool === "eraser") {
    return {
      stroke: pageBackground || "#ffffff",
      strokeWidth: 32,
      strokeOpacity: 1,
    };
  }

  return {
    stroke: "#111827",
    strokeWidth: 6,
    strokeOpacity: 1,
  };
}

export function appendDrawPoint(
  points: DrawPoint[],
  point: DrawPoint,
  minDistance = 2,
) {
  const previous = points[points.length - 1];

  if (!previous) return [point];
  if (getPointDistance(previous, point) < minDistance) return points;

  return [...points, point];
}

export function createDrawElementFromPoints({
  points,
  tool,
  pageBackground,
}: {
  points: DrawPoint[];
  tool: DrawTool;
  pageBackground?: string;
}): DrawElement | null {
  const settings = getDrawToolSettings(tool, pageBackground);
  const frame = normalizeDrawPoints(points, settings.strokeWidth);

  if (!frame) return null;

  return {
    id: nanoid(),
    type: "draw",
    name: `${drawToolLabels[tool]} stroke`,
    tool,
    points: frame.points,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    rotation: 0,
    opacity: 1,
    stroke: settings.stroke,
    strokeWidth: settings.strokeWidth,
    strokeOpacity: settings.strokeOpacity,
  };
}

export function normalizeDrawPoints(
  points: DrawPoint[],
  strokeWidth: number,
) {
  const usablePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );

  if (usablePoints.length === 0) return null;

  const padding = Math.ceil(Math.max(1, strokeWidth) / 2) + 2;
  const minX = Math.min(...usablePoints.map((point) => point.x));
  const minY = Math.min(...usablePoints.map((point) => point.y));
  const maxX = Math.max(...usablePoints.map((point) => point.x));
  const maxY = Math.max(...usablePoints.map((point) => point.y));
  const x = Math.floor(minX - padding);
  const y = Math.floor(minY - padding);
  const width = Math.max(1, Math.ceil(maxX - minX + padding * 2));
  const height = Math.max(1, Math.ceil(maxY - minY + padding * 2));

  return {
    x,
    y,
    width,
    height,
    points: usablePoints.map((point) => ({
      x: roundPathNumber(point.x - x),
      y: roundPathNumber(point.y - y),
    })),
  };
}

export function getDrawSvgPath(points: readonly DrawPoint[]) {
  if (points.length === 0) return "";

  const [first] = points;

  if (!first) return "";

  if (points.length === 1) {
    return `M ${formatPathNumber(first.x)} ${formatPathNumber(
      first.y,
    )} l 0.01 0`;
  }

  if (points.length === 2) {
    const second = points[1];

    return `M ${formatPathNumber(first.x)} ${formatPathNumber(
      first.y,
    )} L ${formatPathNumber(second.x)} ${formatPathNumber(second.y)}`;
  }

  let path = `M ${formatPathNumber(first.x)} ${formatPathNumber(first.y)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (!current || !next) continue;

    const midpoint = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2,
    };

    path += ` Q ${formatPathNumber(current.x)} ${formatPathNumber(
      current.y,
    )} ${formatPathNumber(midpoint.x)} ${formatPathNumber(midpoint.y)}`;
  }

  const last = points[points.length - 1];

  return `${path} L ${formatPathNumber(last.x)} ${formatPathNumber(last.y)}`;
}

function getPointDistance(first: DrawPoint, second: DrawPoint) {
  const x = first.x - second.x;
  const y = first.y - second.y;

  return Math.sqrt(x * x + y * y);
}

function formatPathNumber(value: number) {
  return String(roundPathNumber(value));
}

function roundPathNumber(value: number) {
  return Math.round(value * 100) / 100;
}
