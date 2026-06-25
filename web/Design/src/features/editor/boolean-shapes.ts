import { nanoid } from "nanoid";

import { getVectorPathData } from "@/features/editor/vector-path";
import type {
  BooleanShapeOperation,
  DesignElement,
  ShapeElement,
  VectorPathElement,
} from "@/features/editor/types";

type BooleanShapeCandidate = ShapeElement | VectorPathElement;

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type BooleanShapeSource = {
  element: BooleanShapeCandidate;
  bounds: Bounds;
};

const pathCommandParamCounts: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
};

const booleanOperationLabels: Record<BooleanShapeOperation, string> = {
  union: "Union",
  subtract: "Subtract",
  intersect: "Intersect",
  exclude: "Exclude",
};

export function canCreateBooleanShape(
  elements: readonly DesignElement[],
  elementIds: readonly string[],
) {
  return getBooleanShapeSources(elements, elementIds).length >= 2;
}

export function createBooleanShapeElement({
  elements,
  elementIds,
  operation,
}: {
  elements: readonly DesignElement[];
  elementIds: readonly string[];
  operation: BooleanShapeOperation;
}): VectorPathElement | null {
  const sources = getBooleanShapeSources(elements, elementIds);

  if (sources.length < 2) return null;

  const bounds =
    operation === "subtract"
      ? sources[0].bounds
      : operation === "intersect"
        ? getIntersectionBounds(sources.map((source) => source.bounds))
        : getUnionBounds(sources.map((source) => source.bounds));

  if (!bounds) return null;

  const width = Math.max(1, roundPathNumber(bounds.right - bounds.left));
  const height = Math.max(1, roundPathNumber(bounds.bottom - bounds.top));
  const sourcePaths = sources.map((source) =>
    getSourcePathDataInBounds(source, bounds),
  );
  const baseElement = sources[0].element;
  const fallbackPathData =
    operation === "intersect"
      ? getRectanglePathData(0, 0, width, height)
      : operation === "subtract"
        ? sourcePaths[0]
        : sourcePaths.join(" ");

  return {
    id: nanoid(),
    type: "path",
    name: `${booleanOperationLabels[operation]} shape`,
    x: roundPathNumber(bounds.left),
    y: roundPathNumber(bounds.top),
    width,
    height,
    rotation: 0,
    opacity: baseElement.opacity,
    startX: 0,
    startY: 0,
    segments: [],
    closed: true,
    fill: baseElement.fill,
    stroke: baseElement.stroke,
    strokeWidth: baseElement.strokeWidth,
    ...getFillStyleFields(baseElement),
    customPathData: fallbackPathData,
    fillRule: operation === "exclude" ? "evenodd" : "nonzero",
    booleanOperation: operation,
    booleanSourceElementIds: sources.map((source) => source.element.id),
    booleanSourcePaths: sourcePaths,
  };
}

export function replaceBooleanShapeSources(
  elements: readonly DesignElement[],
  elementIds: readonly string[],
  replacement: VectorPathElement,
) {
  const sourceIdSet = new Set(elementIds);
  const nextElements: DesignElement[] = [];
  let inserted = false;

  for (const element of elements) {
    if (sourceIdSet.has(element.id)) {
      if (!inserted) {
        nextElements.push(replacement);
        inserted = true;
      }

      continue;
    }

    nextElements.push(element);
  }

  return inserted ? nextElements : [...elements, replacement];
}

function getBooleanShapeSources(
  elements: readonly DesignElement[],
  elementIds: readonly string[],
): BooleanShapeSource[] {
  const idSet = new Set(elementIds);

  return elements
    .filter((element): element is BooleanShapeCandidate =>
      idSet.has(element.id) && isBooleanShapeCandidate(element),
    )
    .map((element) => ({
      element,
      bounds: getElementBounds(element),
    }));
}

function isBooleanShapeCandidate(
  element: DesignElement,
): element is BooleanShapeCandidate {
  if (element.locked || element.hidden) return false;

  if (element.type === "shape") {
    return (
      element.shape !== "line" &&
      element.width > 0 &&
      element.height > 0 &&
      element.opacity > 0
    );
  }

  if (element.type === "path") {
    return (
      element.closed &&
      element.width > 0 &&
      element.height > 0 &&
      element.opacity > 0
    );
  }

  return false;
}

function getSourcePathDataInBounds(source: BooleanShapeSource, bounds: Bounds) {
  const { element } = source;
  const x = roundPathNumber(element.x - bounds.left);
  const y = roundPathNumber(element.y - bounds.top);

  if (element.type === "shape" && element.shape === "ellipse") {
    return getEllipsePathData(x, y, element.width, element.height);
  }

  if (element.type === "shape") {
    return getRoundedRectanglePathData(
      x,
      y,
      element.width,
      element.height,
      element.radius,
    );
  }

  return offsetSvgPathData(getVectorPathData(element), x, y);
}

function getElementBounds(element: BooleanShapeCandidate): Bounds {
  return {
    left: element.x,
    top: element.y,
    right: element.x + element.width,
    bottom: element.y + element.height,
  };
}

function getUnionBounds(bounds: readonly Bounds[]): Bounds {
  return {
    left: Math.min(...bounds.map((item) => item.left)),
    top: Math.min(...bounds.map((item) => item.top)),
    right: Math.max(...bounds.map((item) => item.right)),
    bottom: Math.max(...bounds.map((item) => item.bottom)),
  };
}

function getIntersectionBounds(bounds: readonly Bounds[]) {
  const intersection = {
    left: Math.max(...bounds.map((item) => item.left)),
    top: Math.max(...bounds.map((item) => item.top)),
    right: Math.min(...bounds.map((item) => item.right)),
    bottom: Math.min(...bounds.map((item) => item.bottom)),
  };

  if (
    intersection.right <= intersection.left ||
    intersection.bottom <= intersection.top
  ) {
    return null;
  }

  return intersection;
}

function getRoundedRectanglePathData(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(
    Math.max(0, radius),
    Math.max(0, width / 2),
    Math.max(0, height / 2),
  );

  if (clampedRadius <= 0) {
    return getRectanglePathData(x, y, width, height);
  }

  const right = x + width;
  const bottom = y + height;
  const r = clampedRadius;

  return [
    `M ${formatPathNumber(x + r)} ${formatPathNumber(y)}`,
    `H ${formatPathNumber(right - r)}`,
    `Q ${formatPathNumber(right)} ${formatPathNumber(y)} ${formatPathNumber(
      right,
    )} ${formatPathNumber(y + r)}`,
    `V ${formatPathNumber(bottom - r)}`,
    `Q ${formatPathNumber(right)} ${formatPathNumber(bottom)} ${formatPathNumber(
      right - r,
    )} ${formatPathNumber(bottom)}`,
    `H ${formatPathNumber(x + r)}`,
    `Q ${formatPathNumber(x)} ${formatPathNumber(bottom)} ${formatPathNumber(
      x,
    )} ${formatPathNumber(bottom - r)}`,
    `V ${formatPathNumber(y + r)}`,
    `Q ${formatPathNumber(x)} ${formatPathNumber(y)} ${formatPathNumber(
      x + r,
    )} ${formatPathNumber(y)}`,
    "Z",
  ].join(" ");
}

function getRectanglePathData(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${formatPathNumber(x)} ${formatPathNumber(y)}`,
    `H ${formatPathNumber(right)}`,
    `V ${formatPathNumber(bottom)}`,
    `H ${formatPathNumber(x)}`,
    "Z",
  ].join(" ");
}

function getEllipsePathData(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const kappa = 0.5522847498;
  const rx = width / 2;
  const ry = height / 2;
  const cx = x + rx;
  const cy = y + ry;
  const ox = rx * kappa;
  const oy = ry * kappa;

  return [
    `M ${formatPathNumber(cx)} ${formatPathNumber(y)}`,
    `C ${formatPathNumber(cx + ox)} ${formatPathNumber(y)} ${formatPathNumber(
      x + width,
    )} ${formatPathNumber(cy - oy)} ${formatPathNumber(x + width)} ${formatPathNumber(
      cy,
    )}`,
    `C ${formatPathNumber(x + width)} ${formatPathNumber(cy + oy)} ${formatPathNumber(
      cx + ox,
    )} ${formatPathNumber(y + height)} ${formatPathNumber(cx)} ${formatPathNumber(
      y + height,
    )}`,
    `C ${formatPathNumber(cx - ox)} ${formatPathNumber(y + height)} ${formatPathNumber(
      x,
    )} ${formatPathNumber(cy + oy)} ${formatPathNumber(x)} ${formatPathNumber(
      cy,
    )}`,
    `C ${formatPathNumber(x)} ${formatPathNumber(cy - oy)} ${formatPathNumber(
      cx - ox,
    )} ${formatPathNumber(y)} ${formatPathNumber(cx)} ${formatPathNumber(y)}`,
    "Z",
  ].join(" ");
}

function offsetSvgPathData(pathData: string, offsetX: number, offsetY: number) {
  const tokens =
    pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const output: string[] = [];
  let index = 0;
  let command = "";

  while (index < tokens.length) {
    if (isPathCommand(tokens[index])) {
      command = tokens[index];
      output.push(command);
      index += 1;

      if (command.toUpperCase() === "Z") {
        continue;
      }
    }

    const commandKey = command.toUpperCase();
    const parameterCount = pathCommandParamCounts[commandKey];

    if (!parameterCount) {
      return pathData;
    }

    while (index < tokens.length && !isPathCommand(tokens[index])) {
      const values = tokens
        .slice(index, index + parameterCount)
        .map((token) => Number(token));

      if (values.length < parameterCount || values.some(Number.isNaN)) {
        return pathData;
      }

      output.push(
        values
          .map((value, parameterIndex) =>
            formatPathNumber(
              offsetSvgPathValue({
                command: commandKey,
                value,
                parameterIndex,
                offsetX,
                offsetY,
              }),
            ),
          )
          .join(" "),
      );
      index += parameterCount;
    }
  }

  return output.join(" ");
}

function offsetSvgPathValue({
  command,
  value,
  parameterIndex,
  offsetX,
  offsetY,
}: {
  command: string;
  value: number;
  parameterIndex: number;
  offsetX: number;
  offsetY: number;
}) {
  if (command === "H") return value + offsetX;
  if (command === "V") return value + offsetY;
  if (command === "A") {
    if (parameterIndex === 5) return value + offsetX;
    if (parameterIndex === 6) return value + offsetY;
    return value;
  }

  return parameterIndex % 2 === 0 ? value + offsetX : value + offsetY;
}

function isPathCommand(token: string) {
  return /^[a-zA-Z]$/.test(token);
}

function getFillStyleFields(element: BooleanShapeCandidate) {
  return {
    fillMode: element.fillMode,
    fillGradientFrom: element.fillGradientFrom,
    fillGradientTo: element.fillGradientTo,
    fillGradientAngle: element.fillGradientAngle,
    fillPattern: element.fillPattern,
    fillPatternColor: element.fillPatternColor,
    fillPatternScale: element.fillPatternScale,
    fillTexture: element.fillTexture,
    fillTextureIntensity: element.fillTextureIntensity,
  };
}

function formatPathNumber(value: number) {
  return String(roundPathNumber(value));
}

function roundPathNumber(value: number) {
  return Math.round(value * 100) / 100;
}
