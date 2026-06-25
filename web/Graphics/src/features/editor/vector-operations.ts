import { nanoid } from "nanoid";
import { createLayerPaint } from "@/features/editor/paint-stack";
import type {
  DesignLayer,
  DesignLayerMask,
  FillRule,
} from "@/features/editor/types";

export type VectorBooleanOperation =
  | "union"
  | "subtract"
  | "intersect"
  | "exclude";
export type VectorPathFlipAxis = "horizontal" | "vertical";
export type VectorPathTransformPatch = Pick<
  DesignLayer,
  "pathData" | "pathViewBox"
>;

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const booleanLabels: Record<VectorBooleanOperation, string> = {
  union: "Union",
  subtract: "Subtract",
  intersect: "Intersect",
  exclude: "Exclude",
};

export function canConvertLayerToPath(layer: DesignLayer) {
  return layer.type === "rectangle" || layer.type === "ellipse" || layer.type === "path";
}

export function canOutlineStroke(layer: DesignLayer) {
  return (
    (layer.type === "rectangle" || layer.type === "ellipse") &&
    layer.stroke !== "transparent" &&
    layer.strokeWidth > 0
  );
}

export function canUseLayerAsMask(layer: DesignLayer) {
  return (
    layer.type === "frame" ||
    layer.type === "rectangle" ||
    layer.type === "ellipse" ||
    layer.type === "path" ||
    layer.type === "image" ||
    layer.type === "sticky"
  );
}

export function createLayerMask(
  maskLayer: DesignLayer,
  targetLayer: DesignLayer,
): DesignLayerMask | null {
  if (!canUseLayerAsMask(maskLayer)) {
    return null;
  }

  const bounds = getLayerBounds(targetLayer);
  const baseMask = {
    x: round(maskLayer.x - targetLayer.x),
    y: round(maskLayer.y - targetLayer.y),
    width: round(maskLayer.width),
    height: round(maskLayer.height),
    sourceLayerId: maskLayer.id,
    sourceName: maskLayer.name,
  };

  if (maskLayer.type === "ellipse") {
    return {
      ...baseMask,
      kind: "ellipse",
    };
  }

  if (maskLayer.type === "path" && maskLayer.pathData) {
    return {
      ...baseMask,
      kind: "path",
      pathData: getPagePathData(maskLayer, bounds),
      pathViewBox: {
        x: 0,
        y: 0,
        width: Math.max(1, targetLayer.width),
        height: Math.max(1, targetLayer.height),
      },
    };
  }

  return {
    ...baseMask,
    kind: "rectangle",
    cornerRadius: round(maskLayer.cornerRadius ?? 0),
  };
}

export function canResizeLayerMask(layer: DesignLayer) {
  return Boolean(layer.mask && layer.mask.kind !== "path");
}

export function fitLayerMaskToLayer(layer: DesignLayer): DesignLayerMask | null {
  const mask = layer.mask;

  if (!mask || mask.kind === "path") {
    return null;
  }

  return {
    ...mask,
    x: 0,
    y: 0,
    width: round(layer.width),
    height: round(layer.height),
    cornerRadius:
      mask.kind === "rectangle"
        ? Math.min(mask.cornerRadius ?? layer.cornerRadius, layer.width / 2, layer.height / 2)
        : mask.cornerRadius,
  };
}

export function centerLayerMask(layer: DesignLayer): DesignLayerMask | null {
  const mask = layer.mask;

  if (!mask || mask.kind === "path") {
    return null;
  }

  return {
    ...mask,
    x: round((layer.width - mask.width) / 2),
    y: round((layer.height - mask.height) / 2),
  };
}

export function canTransformPathLayer(layer: DesignLayer) {
  return layer.type === "path" && Boolean(layer.pathData);
}

export function createNormalizedPathPatch(
  layer: DesignLayer,
): VectorPathTransformPatch | null {
  if (!canTransformPathLayer(layer) || !layer.pathData) {
    return null;
  }

  return {
    pathData: transformPathDataToBounds(layer.pathData, layer, getLayerBounds(layer)),
    pathViewBox: {
      x: 0,
      y: 0,
      width: Math.max(1, round(layer.width)),
      height: Math.max(1, round(layer.height)),
    },
  };
}

export function createFlippedPathPatch(
  layer: DesignLayer,
  axis: VectorPathFlipAxis,
): VectorPathTransformPatch | null {
  const normalizedPatch = createNormalizedPathPatch(layer);

  if (!normalizedPatch?.pathData || !normalizedPatch.pathViewBox) {
    return null;
  }

  return {
    ...normalizedPatch,
    pathData: flipPathData(
      normalizedPatch.pathData,
      axis,
      normalizedPatch.pathViewBox.width,
      normalizedPatch.pathViewBox.height,
    ),
  };
}

export function createEditablePathLayer(layer: DesignLayer): DesignLayer | null {
  if (!canConvertLayerToPath(layer)) {
    return null;
  }

  return {
    ...layer,
    id: nanoid(),
    type: "path",
    name: `${layer.name} Path`,
    pathData: getLocalPathData(layer),
    pathViewBox: getLocalViewBox(layer),
    fillRule: layer.fillRule ?? "nonzero",
  };
}

export function createOutlinedStrokeLayer(layer: DesignLayer): DesignLayer | null {
  if (!canOutlineStroke(layer)) {
    return null;
  }

  const inset = Math.min(
    layer.strokeWidth,
    Math.max(1, layer.width / 2 - 1),
    Math.max(1, layer.height / 2 - 1),
  );
  const outer = layer.type === "ellipse"
    ? ellipsePath(0, 0, layer.width, layer.height)
    : rectanglePath(0, 0, layer.width, layer.height, layer.cornerRadius);
  const inner = layer.type === "ellipse"
    ? ellipsePath(inset, inset, layer.width - inset * 2, layer.height - inset * 2)
    : rectanglePath(
        inset,
        inset,
        layer.width - inset * 2,
        layer.height - inset * 2,
        Math.max(0, layer.cornerRadius - inset),
      );

  return {
    ...layer,
    id: nanoid(),
    type: "path",
    name: `${layer.name} Outline`,
    fill: layer.stroke,
    fillPaints: [createLayerPaint(layer.stroke)],
    stroke: "transparent",
    strokeWidth: 0,
    pathData: `${outer} ${inner}`,
    pathViewBox: getLocalViewBox(layer),
    fillRule: "evenodd",
  };
}

export function createBooleanVectorLayer(
  layers: DesignLayer[],
  operation: VectorBooleanOperation,
): DesignLayer | null {
  const sourceLayers = layers.filter(canConvertLayerToPath);

  if (sourceLayers.length < (operation === "intersect" ? 2 : 1)) {
    return null;
  }

  if (operation === "intersect") {
    const intersection = intersectBounds(sourceLayers.map(getLayerBounds));

    if (!intersection || intersection.width <= 0 || intersection.height <= 0) {
      return null;
    }

    return baseResultLayer(
      sourceLayers[0],
      intersection,
      rectanglePath(0, 0, intersection.width, intersection.height, 0),
      "Intersect",
      "nonzero",
    );
  }

  const bounds = getUnionBounds(sourceLayers.map(getLayerBounds));
  const pathData = sourceLayers
    .map((layer) => getPagePathData(layer, bounds))
    .filter(Boolean)
    .join(" ");

  if (!pathData) {
    return null;
  }

  return baseResultLayer(
    sourceLayers[0],
    bounds,
    pathData,
    booleanLabels[operation],
    operation === "union" ? "nonzero" : "evenodd",
  );
}

export function cutLayerAtPoint(
  layer: DesignLayer,
  point: { x: number; y: number },
): DesignLayer[] | null {
  if (!canCutLayer(layer)) {
    return null;
  }

  const localX = point.x - layer.x;
  const localY = point.y - layer.y;
  const minSlice = 12;
  const canCutVertical = localX > minSlice && localX < layer.width - minSlice;
  const canCutHorizontal = localY > minSlice && localY < layer.height - minSlice;
  const cutVertical = canCutVertical && (!canCutHorizontal || layer.width >= layer.height);

  if (cutVertical) {
    return [
      createLayerSlice(layer, {
        x: layer.x,
        y: layer.y,
        width: localX,
        height: layer.height,
        suffix: "Left",
      }),
      createLayerSlice(layer, {
        x: layer.x + localX,
        y: layer.y,
        width: layer.width - localX,
        height: layer.height,
        suffix: "Right",
      }),
    ];
  }

  if (canCutHorizontal) {
    return [
      createLayerSlice(layer, {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: localY,
        suffix: "Top",
      }),
      createLayerSlice(layer, {
        x: layer.x,
        y: layer.y + localY,
        width: layer.width,
        height: layer.height - localY,
        suffix: "Bottom",
      }),
    ];
  }

  return null;
}

function canCutLayer(layer: DesignLayer) {
  return (
    layer.type === "frame" ||
    layer.type === "rectangle" ||
    layer.type === "image" ||
    layer.type === "sticky"
  );
}

function createLayerSlice(
  layer: DesignLayer,
  slice: {
    x: number;
    y: number;
    width: number;
    height: number;
    suffix: string;
  },
): DesignLayer {
  return {
    ...layer,
    id: nanoid(),
    name: `${layer.name} ${slice.suffix}`,
    x: Math.round(slice.x),
    y: Math.round(slice.y),
    width: Math.max(1, Math.round(slice.width)),
    height: Math.max(1, Math.round(slice.height)),
    componentId: undefined,
    componentVariantId: undefined,
    componentLayerId: undefined,
    groupId: undefined,
  };
}

function baseResultLayer(
  source: DesignLayer,
  bounds: Bounds,
  pathData: string,
  label: string,
  fillRule: FillRule,
): DesignLayer {
  return {
    ...source,
    id: nanoid(),
    type: "path",
    name: `${label} Vector`,
    x: bounds.x,
    y: bounds.y,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
    rotation: 0,
    stroke: source.stroke,
    strokeWidth: source.strokeWidth,
    pathData,
    pathViewBox: {
      x: 0,
      y: 0,
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
    },
    fillRule,
  };
}

function getLocalPathData(layer: DesignLayer) {
  if (layer.type === "ellipse") {
    return ellipsePath(0, 0, layer.width, layer.height);
  }

  if (layer.type === "path" && layer.pathData) {
    return layer.pathData;
  }

  return rectanglePath(0, 0, layer.width, layer.height, layer.cornerRadius);
}

function getLocalViewBox(layer: DesignLayer) {
  return layer.pathViewBox ?? {
    x: 0,
    y: 0,
    width: Math.max(1, layer.width),
    height: Math.max(1, layer.height),
  };
}

function getPagePathData(layer: DesignLayer, bounds: Bounds) {
  if (layer.type === "rectangle") {
    return rectanglePath(
      layer.x - bounds.x,
      layer.y - bounds.y,
      layer.width,
      layer.height,
      layer.cornerRadius,
    );
  }

  if (layer.type === "ellipse") {
    return ellipsePath(
      layer.x - bounds.x,
      layer.y - bounds.y,
      layer.width,
      layer.height,
    );
  }

  if (!layer.pathData) {
    return "";
  }

  return transformPathDataToBounds(layer.pathData, layer, bounds);
}

function rectanglePath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const right = x + w;
  const bottom = y + h;

  if (r === 0) {
    return `M ${x} ${y} L ${right} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`;
  }

  return [
    `M ${x + r} ${y}`,
    `L ${right - r} ${y}`,
    `Q ${right} ${y} ${right} ${y + r}`,
    `L ${right} ${bottom - r}`,
    `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `L ${x + r} ${bottom}`,
    `Q ${x} ${bottom} ${x} ${bottom - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function ellipsePath(x: number, y: number, width: number, height: number) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const rx = w / 2;
  const ry = h / 2;
  const cx = x + rx;
  const cy = y + ry;

  return [
    `M ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry * 0.55228475} ${cx - rx * 0.55228475} ${cy - ry} ${cx} ${cy - ry}`,
    `C ${cx + rx * 0.55228475} ${cy - ry} ${cx + rx} ${cy - ry * 0.55228475} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry * 0.55228475} ${cx + rx * 0.55228475} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - rx * 0.55228475} ${cy + ry} ${cx - rx} ${cy + ry * 0.55228475} ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

function transformPathDataToBounds(
  pathData: string,
  layer: DesignLayer,
  bounds: Bounds,
) {
  const box = layer.pathViewBox ?? {
    x: 0,
    y: 0,
    width: Math.max(1, layer.width),
    height: Math.max(1, layer.height),
  };
  const scaleX = layer.width / Math.max(1, box.width);
  const scaleY = layer.height / Math.max(1, box.height);
  const offsetX = layer.x - bounds.x - box.x * scaleX;
  const offsetY = layer.y - bounds.y - box.y * scaleY;
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const result: string[] = [];
  let index = 0;
  let command = "";

  while (index < tokens.length) {
    const token = tokens[index++];

    if (isCommand(token)) {
      command = token;
      result.push(token);
      continue;
    }

    if (!command) {
      result.push(token);
      continue;
    }

    index--;
    const count = commandNumberCount(command);
    const values = tokens
      .slice(index, index + count)
      .map((value) => Number.parseFloat(value));

    if (values.length < count || values.some((value) => !Number.isFinite(value))) {
      result.push(tokens[index++]);
      continue;
    }

    result.push(...transformCommandNumbers(command, values, scaleX, scaleY, offsetX, offsetY));
    index += count;
  }

  return result.join(" ");
}

function transformCommandNumbers(
  command: string,
  values: number[],
  scaleX: number,
  scaleY: number,
  offsetX: number,
  offsetY: number,
) {
  const lower = command.toLowerCase();
  const relative = command === lower;

  if (lower === "h") {
    return [formatNumber(relative ? values[0] * scaleX : values[0] * scaleX + offsetX)];
  }

  if (lower === "v") {
    return [formatNumber(relative ? values[0] * scaleY : values[0] * scaleY + offsetY)];
  }

  if (lower === "a") {
    return [
      formatNumber(values[0] * scaleX),
      formatNumber(values[1] * scaleY),
      formatNumber(values[2]),
      formatNumber(values[3]),
      formatNumber(values[4]),
      formatNumber(relative ? values[5] * scaleX : values[5] * scaleX + offsetX),
      formatNumber(relative ? values[6] * scaleY : values[6] * scaleY + offsetY),
    ];
  }

  return values.map((value, valueIndex) => {
    const isX = valueIndex % 2 === 0;
    const scale = isX ? scaleX : scaleY;
    const offset = isX ? offsetX : offsetY;

    return formatNumber(relative ? value * scale : value * scale + offset);
  });
}

function flipPathData(
  pathData: string,
  axis: VectorPathFlipAxis,
  width: number,
  height: number,
) {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const result: string[] = [];
  let index = 0;
  let command = "";

  while (index < tokens.length) {
    const token = tokens[index++];

    if (isCommand(token)) {
      command = token;
      result.push(token);
      continue;
    }

    if (!command) {
      result.push(token);
      continue;
    }

    index--;
    const count = commandNumberCount(command);

    if (count <= 0) {
      result.push(tokens[index++]);
      continue;
    }

    const values = tokens
      .slice(index, index + count)
      .map((value) => Number.parseFloat(value));

    if (values.length < count || values.some((value) => !Number.isFinite(value))) {
      result.push(tokens[index++]);
      continue;
    }

    result.push(...flipCommandNumbers(command, values, axis, width, height));
    index += count;
  }

  return result.join(" ");
}

function flipCommandNumbers(
  command: string,
  values: number[],
  axis: VectorPathFlipAxis,
  width: number,
  height: number,
) {
  const lower = command.toLowerCase();
  const relative = command === lower;

  if (lower === "h") {
    return [formatNumber(flipCoordinate(values[0], true, relative, axis, width, height))];
  }

  if (lower === "v") {
    return [formatNumber(flipCoordinate(values[0], false, relative, axis, width, height))];
  }

  if (lower === "a") {
    return [
      formatNumber(values[0]),
      formatNumber(values[1]),
      formatNumber(-values[2]),
      formatNumber(values[3]),
      formatNumber(values[4] === 0 ? 1 : 0),
      formatNumber(flipCoordinate(values[5], true, relative, axis, width, height)),
      formatNumber(flipCoordinate(values[6], false, relative, axis, width, height)),
    ];
  }

  return values.map((value, valueIndex) =>
    formatNumber(
      flipCoordinate(value, valueIndex % 2 === 0, relative, axis, width, height),
    ),
  );
}

function flipCoordinate(
  value: number,
  isX: boolean,
  relative: boolean,
  axis: VectorPathFlipAxis,
  width: number,
  height: number,
) {
  const affected = axis === "horizontal" ? isX : !isX;

  if (!affected) {
    return value;
  }

  return relative ? -value : (isX ? width : height) - value;
}

function commandNumberCount(command: string) {
  const counts: Record<string, number> = {
    m: 2,
    l: 2,
    h: 1,
    v: 1,
    c: 6,
    s: 4,
    q: 4,
    t: 2,
    a: 7,
    z: 0,
  };

  return counts[command.toLowerCase()] ?? 0;
}

function getLayerBounds(layer: DesignLayer): Bounds {
  return {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
  };
}

function getUnionBounds(bounds: Bounds[]): Bounds {
  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function intersectBounds(bounds: Bounds[]) {
  const left = Math.max(...bounds.map((bound) => bound.x));
  const top = Math.max(...bounds.map((bound) => bound.y));
  const right = Math.min(...bounds.map((bound) => bound.x + bound.width));
  const bottom = Math.min(...bounds.map((bound) => bound.y + bound.height));

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function isCommand(value: string) {
  return /^[a-zA-Z]$/.test(value);
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function round(value: number) {
  return Number(value.toFixed(2));
}
