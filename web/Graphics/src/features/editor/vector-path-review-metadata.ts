import type { DesignLayer } from "@/features/editor/types";
import { getEditableVectorPathPoints } from "@/features/editor/vector-path-editing";

export type VectorPathMetadata = {
  anchors: number;
  controls: number;
  commands: string[];
  commandCount: number;
  relativePointCount: number;
  fractionalPointCount: number;
  subpathCount: number;
  unsupportedCommands: string[];
  bounds: PathBounds | null;
  closed: boolean;
  hasValidViewBox: boolean;
  viewBox: PathBounds;
};

export type PathBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const supportedPathCommands = new Set([
  "m",
  "l",
  "h",
  "v",
  "c",
  "s",
  "q",
  "t",
  "a",
  "z",
]);

export function getVectorPathMetadata(layer: DesignLayer): VectorPathMetadata {
  const pathData = layer.pathData ?? "";
  const points = getEditableVectorPathPoints(pathData);
  const commands = getPathCommands(pathData);
  const viewBox = getLayerPathViewBox(layer);
  const bounds = getAbsolutePointBounds(points);

  return {
    anchors: points.filter((point) => point.kind === "anchor").length,
    controls: points.filter((point) => point.kind === "control").length,
    commands,
    commandCount: commands.length,
    relativePointCount: points.filter((point) => point.relative).length,
    fractionalPointCount: points.filter(
      (point) =>
        (point.x !== undefined && !isWholePixel(point.x)) ||
        (point.y !== undefined && !isWholePixel(point.y)),
    ).length,
    subpathCount: commands.filter((command) => command.toLowerCase() === "m")
      .length,
    unsupportedCommands: Array.from(
      new Set(
        commands.filter(
          (command) => !supportedPathCommands.has(command.toLowerCase()),
        ),
      ),
    ),
    bounds,
    closed: /[zZ]\s*$/.test(pathData.trim()),
    hasValidViewBox: isValidBounds(viewBox),
    viewBox,
  };
}

export function getLayerPathViewBox(layer: DesignLayer): PathBounds {
  return (
    layer.pathViewBox ?? {
      x: 0,
      y: 0,
      width: Math.max(1, layer.width),
      height: Math.max(1, layer.height),
    }
  );
}

export function isOutsideViewBox(bounds: PathBounds, viewBox: PathBounds) {
  const tolerance = Math.max(2, Math.min(viewBox.width, viewBox.height) * 0.02);
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  const viewRight = viewBox.x + viewBox.width;
  const viewBottom = viewBox.y + viewBox.height;

  return (
    bounds.x < viewBox.x - tolerance ||
    bounds.y < viewBox.y - tolerance ||
    right > viewRight + tolerance ||
    bottom > viewBottom + tolerance
  );
}

export function hasMoveCommand(commands: string[]) {
  return commands.some((command) => command.toLowerCase() === "m");
}

export function hasArcCommand(commands: string[]) {
  return commands.some((command) => command.toLowerCase() === "a");
}

export function isBooleanVectorLayer(
  layer: DesignLayer,
  meta: VectorPathMetadata,
) {
  return (
    /^(union|subtract|intersect|exclude) vector/i.test(layer.name) ||
    (meta.subpathCount > 1 && layer.fillRule === "evenodd")
  );
}

export function hasVisibleFill(layer: DesignLayer) {
  if (layer.fillPaints?.some((paint) => paint.visible && paint.opacity > 0)) {
    return true;
  }

  return isVisiblePaintValue(layer.fill);
}

export function hasVisibleStroke(layer: DesignLayer) {
  return layer.strokeWidth > 0 && isVisiblePaintValue(layer.stroke);
}

export function isValidBounds(bounds: PathBounds) {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function getPathCommands(pathData: string) {
  return pathData.match(/[a-zA-Z]/g) ?? [];
}

function getAbsolutePointBounds(
  points: ReturnType<typeof getEditableVectorPathPoints>,
): PathBounds | null {
  const absolutePoints = points.filter(
    (point) =>
      !point.relative &&
      point.x !== undefined &&
      point.y !== undefined &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y),
  );

  if (absolutePoints.length === 0) {
    return null;
  }

  const xs = absolutePoints.map((point) => point.x ?? 0);
  const ys = absolutePoints.map((point) => point.y ?? 0);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function isVisiblePaintValue(value: string | undefined) {
  if (!value?.trim()) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  const transparentHex =
    (/^#[0-9a-f]{8}$/i.test(normalized) && normalized.endsWith("00")) ||
    (/^#[0-9a-f]{4}$/i.test(normalized) && normalized.endsWith("0"));

  return (
    normalized !== "transparent" &&
    !transparentHex &&
    !/rgba\([^)]*,\s*0(?:\.0+)?\s*\)/i.test(normalized)
  );
}

function isWholePixel(value: number) {
  return Math.abs(value - Math.round(value)) < 0.01;
}
