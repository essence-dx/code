import { nanoid } from "nanoid";
import type { DesignLayer, DesignPaint } from "@/features/editor/types";

const defaultPaintBlendMode = "normal";

export function createLayerPaint(
  value: string,
  options: Partial<Omit<DesignPaint, "id" | "value">> = {},
): DesignPaint {
  return {
    id: nanoid(),
    name: options.name,
    value,
    visible: options.visible ?? true,
    opacity: clampPaintOpacity(options.opacity ?? 1),
    blendMode: options.blendMode ?? defaultPaintBlendMode,
  };
}

export function getLayerFillPaints(layer: DesignLayer): DesignPaint[] {
  const paints = layer.fillPaints?.length
    ? layer.fillPaints
    : [
        {
          id: "legacy-fill",
          value: layer.fill,
          visible: true,
          opacity: 1,
          blendMode: layer.blendMode ?? defaultPaintBlendMode,
        },
      ];

  return paints.map(normalizeLayerPaint);
}

export function getLayerStrokePaints(layer: DesignLayer): DesignPaint[] {
  const paints = layer.strokePaints?.length
    ? layer.strokePaints
    : [
        {
          id: "legacy-stroke",
          value: layer.stroke,
          visible: true,
          opacity: 1,
          blendMode: "normal",
        },
      ];

  return paints.map(normalizeLayerPaint);
}

export function getVisibleLayerFillPaints(layer: DesignLayer) {
  return getLayerFillPaints(layer).filter(
    (paint) => paint.visible && paint.opacity > 0 && paint.value !== "transparent",
  );
}

export function getVisibleLayerStrokePaints(layer: DesignLayer) {
  if (layer.strokeWidth <= 0) {
    return [];
  }

  return getLayerStrokePaints(layer).filter(
    (paint) => paint.visible && paint.opacity > 0 && paint.value !== "transparent",
  );
}

export function getPrimaryFillValue(layer: DesignLayer) {
  return getVisibleLayerFillPaints(layer)[0]?.value ?? "transparent";
}

export function getPrimaryFillBlendMode(layer: DesignLayer) {
  return getVisibleLayerFillPaints(layer)[0]?.blendMode ?? "normal";
}

export function getPrimaryStrokeValue(layer: DesignLayer) {
  return getVisibleLayerStrokePaints(layer)[0]?.value ?? "transparent";
}

export function getFillPaintLayerPatch(paints: DesignPaint[]): Partial<DesignLayer> {
  const normalizedPaints = paints.map(normalizeLayerPaint);
  const primaryPaint =
    normalizedPaints.find((paint) => paint.visible && paint.opacity > 0) ??
    normalizedPaints[0];

  return {
    fillPaints: normalizedPaints,
    fill: primaryPaint?.value ?? "transparent",
    blendMode: primaryPaint?.blendMode ?? "normal",
  };
}

export function getStrokePaintLayerPatch(
  paints: DesignPaint[],
): Partial<DesignLayer> {
  const normalizedPaints = paints.map(normalizeLayerPaint);
  const primaryPaint =
    normalizedPaints.find((paint) => paint.visible && paint.opacity > 0) ??
    normalizedPaints[0];

  return {
    strokePaints: normalizedPaints,
    stroke: primaryPaint?.value ?? "transparent",
  };
}

export function getPrimaryFillPaintPatch(
  layer: DesignLayer,
  patch: Partial<Pick<DesignPaint, "value" | "blendMode">>,
): Partial<DesignLayer> {
  const paints = getLayerFillPaints(layer);
  const targetIndex = Math.max(
    0,
    paints.findIndex((paint) => paint.visible && paint.opacity > 0),
  );
  const nextPaints = paints.map((paint, index) =>
    index === targetIndex
      ? {
          ...paint,
          ...patch,
        }
      : paint,
  );

  return getFillPaintLayerPatch(nextPaints);
}

export function getPrimaryStrokePaintPatch(
  layer: DesignLayer,
  patch: Partial<Pick<DesignPaint, "value" | "blendMode">>,
): Partial<DesignLayer> {
  const paints = getLayerStrokePaints(layer);
  const targetIndex = Math.max(
    0,
    paints.findIndex((paint) => paint.visible && paint.opacity > 0),
  );
  const nextPaints = paints.map((paint, index) =>
    index === targetIndex
      ? {
          ...paint,
          ...patch,
        }
      : paint,
  );

  return getStrokePaintLayerPatch(nextPaints);
}

export function getPaintStackSignature(paints: DesignPaint[] | undefined) {
  if (!paints?.length) {
    return "";
  }

  return paints
    .map((paint) => {
      const normalized = normalizeLayerPaint(paint);

      return [
        normalized.visible ? "on" : "off",
        normalized.value,
        normalized.opacity.toFixed(2),
        normalized.blendMode ?? "normal",
      ].join(":");
    })
    .join("|");
}

export function normalizeLayerPaint(paint: DesignPaint): DesignPaint {
  return {
    id: paint.id || nanoid(),
    name: paint.name,
    value: paint.value || "transparent",
    visible: paint.visible ?? true,
    opacity: clampPaintOpacity(paint.opacity ?? 1),
    blendMode: paint.blendMode ?? defaultPaintBlendMode,
  };
}

export function setLinearGradientStop(
  value: string,
  stopIndex: number,
  color: string,
  position: number,
) {
  const gradient = parseLinearGradient(value);

  if (!gradient || !gradient.stops[stopIndex]) {
    return value;
  }

  const stops = gradient.stops.map((stop, index) =>
    index === stopIndex
      ? {
          color,
          position: clampStopPosition(position),
        }
      : stop,
  );

  return stringifyLinearGradient(gradient.angle, stops);
}

export function parseLinearGradient(value: string) {
  const match = value.match(/^linear-gradient\((.+)\)$/i);

  if (!match?.[1]) {
    return null;
  }

  const parts = splitGradientParts(match[1]);
  const anglePart = parts[0]?.trim() ?? "90deg";
  const angleMatch = anglePart.match(/^(-?\d+(?:\.\d+)?)deg$/i);
  const angle = angleMatch ? Number.parseFloat(angleMatch[1]) : 90;
  const stopParts = angleMatch ? parts.slice(1) : parts;
  const stops = stopParts
    .map(parseGradientStop)
    .filter((stop): stop is { color: string; position: number } =>
      Boolean(stop),
    );

  return stops.length >= 2
    ? {
        angle,
        stops,
      }
    : null;
}

function stringifyLinearGradient(
  angle: number,
  stops: Array<{ color: string; position: number }>,
) {
  const stopText = stops
    .map((stop) => `${stop.color} ${clampStopPosition(stop.position)}%`)
    .join(", ");

  return `linear-gradient(${Math.round(angle)}deg, ${stopText})`;
}

function parseGradientStop(part: string) {
  const trimmed = part.trim();
  const match = trimmed.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)%$/);

  if (!match?.[1] || !match[2]) {
    return {
      color: trimmed,
      position: 0,
    };
  }

  return {
    color: match[1].trim(),
    position: clampStopPosition(Number.parseFloat(match[2])),
  };
}

function splitGradientParts(value: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;
    }

    if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function clampPaintOpacity(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

function clampStopPosition(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}
