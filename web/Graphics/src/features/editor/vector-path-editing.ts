import type { DesignLayer } from "@/features/editor/types";

export type EditableVectorPathPointKind = "anchor" | "control";

export type EditableVectorPathPoint = {
  id: string;
  label: string;
  command: string;
  kind: EditableVectorPathPointKind;
  relative: boolean;
  x?: number;
  y?: number;
  xTokenIndex?: number;
  yTokenIndex?: number;
};

export type VectorPathCanvasPoint = EditableVectorPathPoint & {
  localX: number;
  localY: number;
};

export type VectorPathInsertPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  localX: number;
  localY: number;
};

export type VectorPathControlTether = {
  id: string;
  label: string;
  fromPointId: string;
  toPointId: string;
  localX1: number;
  localY1: number;
  localX2: number;
  localY2: number;
};

export type RefinedPencilPathPatch = Pick<
  DesignLayer,
  "height" | "pathData" | "pathViewBox" | "width" | "x" | "y"
> & {
  pathData: string;
  pathViewBox: NonNullable<DesignLayer["pathViewBox"]>;
};

export type VectorPathNodeHandleMode = "corner" | "mirrored" | "disconnected";

type PathToken = {
  value: string;
  numberValue?: number;
  kind: "command" | "number";
};

type PathSegment = {
  command: string;
  segmentIndex: number;
  commandTokenIndex?: number;
  valueStartTokenIndex: number;
  valueTokenIndexes: number[];
  values: number[];
  endTokenIndex: number;
};

type PointDefinition = {
  suffix: string;
  kind: EditableVectorPathPointKind;
  xOffset?: number;
  yOffset?: number;
};

type AbsoluteAnchorSegment = {
  segment: PathSegment;
  x: number;
  y: number;
  cubicControl?: PathPoint;
  quadraticControl?: PathPoint;
};

type PathPoint = {
  x: number;
  y: number;
};

type HandleTarget = {
  xTokenIndex: number;
  yTokenIndex: number;
  x: number;
  y: number;
};

export function getEditableVectorPathPoints(pathData: string) {
  return parsePathSegments(tokenizePathData(pathData)).flatMap((segment) =>
    getPointDefinitions(segment.command).map((definition) =>
      createEditablePoint(segment, definition),
    ),
  );
}

export function getVectorPathCanvasPoints(layer: DesignLayer) {
  if (layer.type !== "path" || !layer.pathData) {
    return [];
  }

  const box = getLayerPathViewBox(layer);

  return getEditableVectorPathPoints(layer.pathData)
    .filter(
      (point) =>
        !point.relative &&
        point.x !== undefined &&
        point.y !== undefined &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y),
    )
    .map((point): VectorPathCanvasPoint => ({
      ...point,
      localX:
        ((point.x ?? box.x) - box.x) / Math.max(1, box.width) * layer.width,
      localY:
        ((point.y ?? box.y) - box.y) / Math.max(1, box.height) * layer.height,
    }));
}

export function getVectorPathInsertPoints(layer: DesignLayer) {
  if (layer.type !== "path" || !layer.pathData) {
    return [];
  }

  const box = getLayerPathViewBox(layer);
  const anchors = getAbsoluteAnchorSegments(layer.pathData);
  const insertPoints: VectorPathInsertPoint[] = [];

  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const current = anchors[index];
    const point = getSegmentInsertionPoint(previous, current);

    insertPoints.push({
      id: `insert:${current.segment.segmentIndex}`,
      label: `Insert before node ${current.segment.segmentIndex + 1}`,
      ...point,
      ...toLayerLocalPoint(layer, box, point),
    });
  }

  if (isClosedPath(layer.pathData) && anchors.length > 2) {
    const first = anchors[0];
    const last = anchors[anchors.length - 1];
    const point = {
      x: (first.x + last.x) / 2,
      y: (first.y + last.y) / 2,
    };

    insertPoints.push({
      id: `insert-close:${last.segment.segmentIndex}`,
      label: `Insert after node ${last.segment.segmentIndex + 1}`,
      ...point,
      ...toLayerLocalPoint(layer, box, point),
    });
  }

  return insertPoints;
}

export function getVectorPathControlTethers(layer: DesignLayer) {
  const points = getVectorPathCanvasPoints(layer);
  const anchors = new Map<number, VectorPathCanvasPoint>();
  const segments = new Map<
    number,
    {
      command: string;
      anchor?: VectorPathCanvasPoint;
      controlA?: VectorPathCanvasPoint;
      controlB?: VectorPathCanvasPoint;
    }
  >();

  for (const point of points) {
    const segmentIndex = getPointSegmentIndex(point.id);

    if (segmentIndex === undefined) {
      continue;
    }

    const segment = segments.get(segmentIndex) ?? {
      command: point.command,
    };

    if (point.kind === "anchor") {
      segment.anchor = point;
      anchors.set(segmentIndex, point);
    } else if (point.id.endsWith(":A")) {
      segment.controlA = point;
    } else if (point.id.endsWith(":B")) {
      segment.controlB = point;
    }

    segments.set(segmentIndex, segment);
  }

  const tethers: VectorPathControlTether[] = [];

  for (const [segmentIndex, segment] of segments) {
    const command = segment.command.toLowerCase();
    const previousAnchor = findPreviousAnchor(anchors, segmentIndex);

    if (command === "c") {
      if (previousAnchor && segment.controlA) {
        tethers.push(
          createControlTether(
            segmentIndex,
            "incoming",
            previousAnchor,
            segment.controlA,
          ),
        );
      }

      if (segment.anchor && segment.controlB) {
        tethers.push(
          createControlTether(
            segmentIndex,
            "outgoing",
            segment.anchor,
            segment.controlB,
          ),
        );
      }
    }

    if (command === "q") {
      if (previousAnchor && segment.controlA) {
        tethers.push(
          createControlTether(
            segmentIndex,
            "start",
            previousAnchor,
            segment.controlA,
          ),
        );
      }

      if (segment.anchor && segment.controlA) {
        tethers.push(
          createControlTether(
            segmentIndex,
            "end",
            segment.anchor,
            segment.controlA,
          ),
        );
      }
    }

    if (command === "s" && segment.anchor && segment.controlA) {
      tethers.push(
        createControlTether(
          segmentIndex,
          "smooth",
          segment.anchor,
          segment.controlA,
        ),
      );
    }
  }

  return tethers;
}

export function updateEditableVectorPathPoint(
  pathData: string,
  pointId: string,
  patch: Pick<EditableVectorPathPoint, "x" | "y">,
) {
  const tokens = tokenizePathData(pathData);
  const point = parsePathSegments(tokens)
    .flatMap((segment) =>
      getPointDefinitions(segment.command).map((definition) =>
        createEditablePoint(segment, definition),
      ),
    )
    .find((item) => item.id === pointId);

  if (!point) {
    return pathData;
  }

  const nextTokens = tokens.map((token) => token.value);

  if (point.xTokenIndex !== undefined && patch.x !== undefined) {
    nextTokens[point.xTokenIndex] = formatPathNumber(patch.x);
  }

  if (point.yTokenIndex !== undefined && patch.y !== undefined) {
    nextTokens[point.yTokenIndex] = formatPathNumber(patch.y);
  }

  return nextTokens.join(" ");
}

export function createVectorPathPointPatch(
  layer: DesignLayer,
  pointId: string,
  canvasPoint: { x: number; y: number },
): Pick<DesignLayer, "pathData"> | null {
  if (layer.type !== "path" || !layer.pathData) {
    return null;
  }

  const box = getLayerPathViewBox(layer);
  const x =
    box.x +
    ((canvasPoint.x - layer.x) / Math.max(1, layer.width)) * box.width;
  const y =
    box.y +
    ((canvasPoint.y - layer.y) / Math.max(1, layer.height)) * box.height;

  return {
    pathData: updateEditableVectorPathPoint(layer.pathData, pointId, { x, y }),
  };
}

export function createInsertedVectorPathPointPatch(
  layer: DesignLayer,
  insertPointId: string,
): Pick<DesignLayer, "pathData" | "pathViewBox"> | null {
  if (layer.type !== "path" || !layer.pathData) {
    return null;
  }

  const tokens = tokenizePathData(layer.pathData);
  const anchors = getAbsoluteAnchorSegments(layer.pathData);
  const closeSegment = anchors.find(
    (item) => `insert-close:${item.segment.segmentIndex}` === insertPointId,
  );

  if (closeSegment) {
    const firstAnchor = anchors[0];

    if (!firstAnchor || !isClosedPath(layer.pathData)) {
      return null;
    }

    const point = {
      x: (closeSegment.x + firstAnchor.x) / 2,
      y: (closeSegment.y + firstAnchor.y) / 2,
    };
    const insertionIndex = closeSegment.segment.endTokenIndex;
    const nextTokens = tokens.map((token) => token.value);

    nextTokens.splice(
      insertionIndex,
      0,
      "L",
      formatPathNumber(point.x),
      formatPathNumber(point.y),
    );

    return {
      pathData: nextTokens.join(" "),
      pathViewBox: getLayerPathViewBox(layer),
    };
  }

  const targetAnchor = anchors.find(
    (item) => `insert:${item.segment.segmentIndex}` === insertPointId,
  );

  if (!targetAnchor) {
    return null;
  }

  const previousAnchor = anchors[anchors.indexOf(targetAnchor) - 1];

  if (!previousAnchor) {
    return null;
  }

  const replacementTokens = createSegmentInsertionTokens(
    previousAnchor,
    targetAnchor,
  );

  if (replacementTokens.length === 0) {
    return null;
  }

  const insertionIndex = getSegmentReplacementStartTokenIndex(
    targetAnchor.segment,
  );
  const nextTokens = tokens.map((token) => token.value);

  nextTokens.splice(
    insertionIndex,
    targetAnchor.segment.endTokenIndex - insertionIndex,
    ...replacementTokens,
  );

  return {
    pathData: nextTokens.join(" "),
    pathViewBox: getLayerPathViewBox(layer),
  };
}

export function createDeletedVectorPathPointPatch(
  layer: DesignLayer,
  pointId: string,
): Pick<DesignLayer, "pathData" | "pathViewBox"> | null {
  const target = getDeletableVectorPathPointTarget(layer, pointId);

  if (!target) {
    return null;
  }

  const nextTokens = target.tokens.map((token) => token.value);

  nextTokens.splice(
    target.startTokenIndex,
    target.endTokenIndex - target.startTokenIndex,
  );

  const pathData = nextTokens.join(" ").trim();

  return pathData
    ? {
        pathData,
        pathViewBox: getLayerPathViewBox(layer),
      }
    : null;
}

export function canDeleteVectorPathPoint(layer: DesignLayer, pointId: string) {
  return getDeletableVectorPathPointTarget(layer, pointId) !== null;
}

export function createVectorPathNodeHandleModePatch(
  layer: DesignLayer,
  pointId: string,
  mode: VectorPathNodeHandleMode,
): Pick<DesignLayer, "pathData" | "pathViewBox"> | null {
  if (layer.type !== "path" || !layer.pathData) {
    return null;
  }

  const tokens = tokenizePathData(layer.pathData);
  const segments = parsePathSegments(tokens);
  const anchors = getAbsoluteAnchorSegments(layer.pathData);
  const target = getAnchorSegmentForPoint(segments, pointId);

  if (!target || target.command === target.command.toLowerCase()) {
    return null;
  }

  const targetAnchorIndex = anchors.findIndex(
    (anchor) => anchor.segment.segmentIndex === target.segmentIndex,
  );
  const targetAnchor = anchors[targetAnchorIndex];

  if (!targetAnchor) {
    return null;
  }

  if (mode === "disconnected") {
    return createDisconnectedVectorPathPatch(
      layer,
      tokens,
      segments,
      anchors,
      targetAnchorIndex,
    );
  }

  const nextAnchor = anchors[targetAnchorIndex + 1];
  const incomingHandle = getIncomingHandleTarget(target);
  const outgoingHandle = nextAnchor
    ? getOutgoingHandleTarget(nextAnchor.segment)
    : null;
  const nextTokens = tokens.map((token) => token.value);

  if (mode === "corner") {
    const changed = [
      updateHandleTarget(nextTokens, incomingHandle, targetAnchor),
      updateHandleTarget(nextTokens, outgoingHandle, targetAnchor),
    ].some(Boolean);

    return changed
      ? { pathData: nextTokens.join(" "), pathViewBox: getLayerPathViewBox(layer) }
      : null;
  }

  const incomingPoint = getHandleTargetPoint(incomingHandle);
  const outgoingPoint = getHandleTargetPoint(outgoingHandle);

  if (!incomingPoint || !outgoingPoint) {
    return null;
  }

  const incomingDistance = getDistance(targetAnchor, incomingPoint);
  const outgoingDistance = getDistance(targetAnchor, outgoingPoint);
  const nextOutgoing =
    incomingDistance > 0 || outgoingDistance === 0
      ? reflectPoint(incomingPoint, targetAnchor)
      : outgoingPoint;
  const nextIncoming =
    incomingDistance > 0 || outgoingDistance === 0
      ? incomingPoint
      : reflectPoint(outgoingPoint, targetAnchor);
  const changed = [
    updateHandleTarget(nextTokens, incomingHandle, nextIncoming),
    updateHandleTarget(nextTokens, outgoingHandle, nextOutgoing),
  ].some(Boolean);

  return changed
    ? { pathData: nextTokens.join(" "), pathViewBox: getLayerPathViewBox(layer) }
    : null;
}

export function canSetVectorPathNodeHandleMode(
  layer: DesignLayer,
  pointId: string,
  mode: VectorPathNodeHandleMode,
) {
  return createVectorPathNodeHandleModePatch(layer, pointId, mode) !== null;
}

export function createExtendedVectorPathPatch(
  layer: DesignLayer,
  canvasPoint: { x: number; y: number },
): Pick<DesignLayer, "pathData" | "pathViewBox"> | null {
  if (layer.type !== "path") {
    return null;
  }

  const box = getLayerPathViewBox(layer);
  const pathPoint = getPathPointFromCanvasPoint(layer, box, canvasPoint);
  const pointCommand = `${formatPathNumber(pathPoint.x)} ${formatPathNumber(pathPoint.y)}`;
  const pathData = stripTrailingCloseCommand(layer.pathData ?? "").trim();

  return {
    pathData: pathData ? `${pathData} L ${pointCommand}` : `M ${pointCommand}`,
    pathViewBox: box,
  };
}

export function createRefinedPencilPathPatch(
  points: Array<{ x: number; y: number }>,
  options: { tolerance?: number } = {},
): RefinedPencilPathPatch | null {
  const refinedPoints = simplifyPencilPoints(
    points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    options.tolerance ?? 3,
  );

  if (refinedPoints.length < 2) {
    return null;
  }

  const bounds = getPencilPointBounds(refinedPoints);
  const localPoints = refinedPoints.map((point) => ({
    x: point.x - bounds.x,
    y: point.y - bounds.y,
  }));

  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
    pathData: getSmoothedPencilPathData(localPoints),
    pathViewBox: {
      x: 0,
      y: 0,
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    },
  };
}

export function createClosedVectorPathPatch(
  layer: DesignLayer,
): Pick<DesignLayer, "pathData"> | null {
  if (layer.type !== "path" || !layer.pathData?.trim()) {
    return null;
  }

  if (/[zZ]\s*$/.test(layer.pathData)) {
    return null;
  }

  return { pathData: `${layer.pathData.trim()} Z` };
}

export function createOpenVectorPathPatch(
  layer: DesignLayer,
): Pick<DesignLayer, "pathData"> | null {
  if (layer.type !== "path" || !layer.pathData?.trim()) {
    return null;
  }

  const pathData = stripTrailingCloseCommand(layer.pathData);

  return pathData === layer.pathData.trim() ? null : { pathData };
}

export function createSnappedVectorPathPatch(
  layer: DesignLayer,
): Pick<DesignLayer, "pathData"> | null {
  if (layer.type !== "path" || !layer.pathData) {
    return null;
  }

  const pathData = snapVectorPathData(layer.pathData);

  return pathData === layer.pathData ? null : { pathData };
}

function snapVectorPathData(pathData: string) {
  const tokens = tokenizePathData(pathData);
  const coordinateTokenIndexes = new Set<number>();

  for (const segment of parsePathSegments(tokens)) {
    for (const definition of getPointDefinitions(segment.command)) {
      const xTokenIndex =
        definition.xOffset !== undefined
          ? segment.valueTokenIndexes[definition.xOffset]
          : undefined;
      const yTokenIndex =
        definition.yOffset !== undefined
          ? segment.valueTokenIndexes[definition.yOffset]
          : undefined;

      if (xTokenIndex !== undefined) {
        coordinateTokenIndexes.add(xTokenIndex);
      }

      if (yTokenIndex !== undefined) {
        coordinateTokenIndexes.add(yTokenIndex);
      }
    }
  }

  return tokens
    .map((token, tokenIndex) => {
      if (
        token.kind !== "number" ||
        token.numberValue === undefined ||
        !coordinateTokenIndexes.has(tokenIndex)
      ) {
        return token.value;
      }

      return formatPathNumber(Math.round(token.numberValue));
    })
    .join(" ");
}

function getAbsoluteAnchorSegments(pathData: string): AbsoluteAnchorSegment[] {
  const tokens = tokenizePathData(pathData);
  const anchors: AbsoluteAnchorSegment[] = [];
  let previousAnchor: AbsoluteAnchorSegment | undefined;
  let previousQuadraticControl: PathPoint | undefined;

  for (const segment of parsePathSegments(tokens)) {
    if (segment.command === segment.command.toLowerCase()) {
      continue;
    }

    const anchorDefinition = getPointDefinitions(segment.command).find(
      (definition) =>
        definition.kind === "anchor" &&
        definition.xOffset !== undefined &&
        definition.yOffset !== undefined,
    );

    if (!anchorDefinition) {
      continue;
    }

    const x = segment.values[anchorDefinition.xOffset ?? 0];
    const y = segment.values[anchorDefinition.yOffset ?? 0];

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    const command = segment.command.toLowerCase();
    const current = { segment, x, y };
    const anchor: AbsoluteAnchorSegment = {
      ...current,
      cubicControl:
        command === "c"
          ? getPathPoint(segment.values[2], segment.values[3], current)
          : command === "s"
            ? getPathPoint(segment.values[0], segment.values[1], current)
            : undefined,
      quadraticControl:
        command === "q"
          ? getPathPoint(segment.values[0], segment.values[1], current)
          : command === "t" && previousAnchor
            ? reflectPoint(
                previousQuadraticControl ?? previousAnchor,
                previousAnchor,
              )
            : undefined,
    };

    anchors.push(anchor);
    previousAnchor = anchor;
    previousQuadraticControl = anchor.quadraticControl;
  }

  return anchors;
}

function getSegmentInsertionPoint(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const command = current.segment.command.toLowerCase();

  if (command === "c") {
    return splitCubicAtMidpoint(previous, current).anchor;
  }

  if (command === "s") {
    return splitSmoothCubicAtMidpoint(previous, current).anchor;
  }

  if (command === "q") {
    return splitQuadraticAtMidpoint(previous, current).anchor;
  }

  if (command === "t") {
    return splitSmoothQuadraticAtMidpoint(previous, current).anchor;
  }

  return getMidpoint(previous, current);
}

function createSegmentInsertionTokens(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const command = current.segment.command.toLowerCase();

  if (command === "c") {
    const split = splitCubicAtMidpoint(previous, current);

    return [
      "C",
      ...formatPathPoint(split.firstControl),
      ...formatPathPoint(split.secondControl),
      ...formatPathPoint(split.anchor),
      "C",
      ...formatPathPoint(split.thirdControl),
      ...formatPathPoint(split.fourthControl),
      ...formatPathPoint({ x: current.x, y: current.y }),
    ];
  }

  if (command === "q") {
    const split = splitQuadraticAtMidpoint(previous, current);

    return [
      "Q",
      ...formatPathPoint(split.firstControl),
      ...formatPathPoint(split.anchor),
      "Q",
      ...formatPathPoint(split.secondControl),
      ...formatPathPoint({ x: current.x, y: current.y }),
    ];
  }

  if (command === "s") {
    const split = splitSmoothCubicAtMidpoint(previous, current);

    return [
      "C",
      ...formatPathPoint(split.firstControl),
      ...formatPathPoint(split.secondControl),
      ...formatPathPoint(split.anchor),
      "C",
      ...formatPathPoint(split.thirdControl),
      ...formatPathPoint(split.fourthControl),
      ...formatPathPoint({ x: current.x, y: current.y }),
    ];
  }

  if (command === "t") {
    const split = splitSmoothQuadraticAtMidpoint(previous, current);

    return [
      "Q",
      ...formatPathPoint(split.firstControl),
      ...formatPathPoint(split.anchor),
      "Q",
      ...formatPathPoint(split.secondControl),
      ...formatPathPoint({ x: current.x, y: current.y }),
    ];
  }

  return [
    "L",
    ...formatPathPoint(getMidpoint(previous, current)),
    "L",
    ...formatPathPoint({ x: current.x, y: current.y }),
  ];
}

function getSegmentReplacementStartTokenIndex(segment: PathSegment) {
  return segment.commandTokenIndex ?? segment.valueStartTokenIndex;
}

function splitCubicAtMidpoint(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const [controlX1, controlY1, controlX2, controlY2] = current.segment.values;
  const start = { x: previous.x, y: previous.y };
  const firstControl = getPathPoint(controlX1, controlY1, previous);
  const fourthControl = getPathPoint(controlX2, controlY2, current);
  const end = { x: current.x, y: current.y };

  return splitCubicPoints(start, firstControl, fourthControl, end);
}

function splitSmoothCubicAtMidpoint(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const [controlX, controlY] = current.segment.values;
  const start = { x: previous.x, y: previous.y };
  const firstControl = getReflectedCubicControl(previous);
  const fourthControl = getPathPoint(controlX, controlY, current);
  const end = { x: current.x, y: current.y };

  return splitCubicPoints(start, firstControl, fourthControl, end);
}

function splitCubicPoints(
  start: { x: number; y: number },
  firstControl: { x: number; y: number },
  fourthControl: { x: number; y: number },
  end: { x: number; y: number },
) {
  const firstMidpoint = getMidpoint(start, firstControl);
  const handleMidpoint = getMidpoint(firstControl, fourthControl);
  const lastMidpoint = getMidpoint(fourthControl, end);
  const secondControl = getMidpoint(firstMidpoint, handleMidpoint);
  const thirdControl = getMidpoint(handleMidpoint, lastMidpoint);
  const anchor = getMidpoint(secondControl, thirdControl);

  return {
    firstControl: firstMidpoint,
    secondControl,
    anchor,
    thirdControl,
    fourthControl: lastMidpoint,
  };
}

function splitQuadraticAtMidpoint(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const [controlX, controlY] = current.segment.values;
  const start = { x: previous.x, y: previous.y };
  const control = getPathPoint(controlX, controlY, previous);
  const end = { x: current.x, y: current.y };

  return splitQuadraticPoints(start, control, end);
}

function splitSmoothQuadraticAtMidpoint(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const start = { x: previous.x, y: previous.y };
  const control = getReflectedQuadraticControl(previous);
  const end = { x: current.x, y: current.y };

  return splitQuadraticPoints(start, control, end);
}

function splitQuadraticPoints(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
) {
  const firstControl = getMidpoint(start, control);
  const secondControl = getMidpoint(control, end);
  const anchor = getMidpoint(firstControl, secondControl);

  return {
    firstControl,
    anchor,
    secondControl,
  };
}

function getReflectedCubicControl(segment: AbsoluteAnchorSegment) {
  return reflectPoint(segment.cubicControl ?? segment, segment);
}

function getReflectedQuadraticControl(segment: AbsoluteAnchorSegment) {
  return reflectPoint(segment.quadraticControl ?? segment, segment);
}

function reflectPoint(
  point: { x: number; y: number },
  anchor: { x: number; y: number },
) {
  return {
    x: anchor.x * 2 - point.x,
    y: anchor.y * 2 - point.y,
  };
}

function getPathPoint(
  x: number | undefined,
  y: number | undefined,
  fallback: { x: number; y: number },
) {
  return {
    x: x ?? fallback.x,
    y: y ?? fallback.y,
  };
}

function getMidpoint(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function formatPathPoint(point: { x: number; y: number }) {
  return [formatPathNumber(point.x), formatPathNumber(point.y)];
}

function getDeletableVectorPathPointTarget(
  layer: DesignLayer,
  pointId: string,
) {
  if (layer.type !== "path" || !layer.pathData) {
    return null;
  }

  const tokens = tokenizePathData(layer.pathData);
  const segments = parsePathSegments(tokens);
  const segmentIndex = getPointSegmentIndex(pointId);

  if (segmentIndex === undefined) {
    return null;
  }

  const segment = segments.find((item) => item.segmentIndex === segmentIndex);

  if (!segment || !isSegmentAnchorPoint(segment, pointId)) {
    return null;
  }

  const anchorSegments = segments.filter(hasAnchorPoint);
  const isFirstAnchor = anchorSegments[0]?.segmentIndex === segment.segmentIndex;

  if (isFirstAnchor || anchorSegments.length <= 2) {
    return null;
  }

  const nextSegment = segments.find(
    (item) => item.segmentIndex === segment.segmentIndex + 1,
  );
  const commandContinues =
    nextSegment?.command === segment.command &&
    nextSegment.commandTokenIndex === undefined &&
    nextSegment.valueStartTokenIndex === segment.endTokenIndex;
  const startTokenIndex =
    segment.commandTokenIndex !== undefined && !commandContinues
      ? segment.commandTokenIndex
      : segment.valueStartTokenIndex;

  return {
    tokens,
    startTokenIndex,
    endTokenIndex: segment.endTokenIndex,
  };
}

function isSegmentAnchorPoint(segment: PathSegment, pointId: string) {
  return getPointDefinitions(segment.command)
    .filter((definition) => definition.kind === "anchor")
    .some(
      (definition) =>
        createEditablePoint(segment, definition).id === pointId,
    );
}

function hasAnchorPoint(segment: PathSegment) {
  return getPointDefinitions(segment.command).some(
    (definition) => definition.kind === "anchor",
  );
}

function getAnchorSegmentForPoint(segments: PathSegment[], pointId: string) {
  return (
    segments.find((segment) => isSegmentAnchorPoint(segment, pointId)) ?? null
  );
}

function createDisconnectedVectorPathPatch(
  layer: DesignLayer,
  tokens: PathToken[],
  segments: PathSegment[],
  anchors: AbsoluteAnchorSegment[],
  targetAnchorIndex: number,
): Pick<DesignLayer, "pathData" | "pathViewBox"> | null {
  const targetAnchor = anchors[targetAnchorIndex];
  const nextAnchor = anchors[targetAnchorIndex + 1];
  const replacements = [
    targetAnchor
      ? createSmoothSegmentReplacement(segments, anchors, targetAnchor)
      : null,
    nextAnchor ? createSmoothSegmentReplacement(segments, anchors, nextAnchor) : null,
  ].filter((replacement): replacement is NonNullable<typeof replacement> =>
    Boolean(replacement),
  );

  if (replacements.length === 0) {
    return null;
  }

  const nextTokens = tokens.map((token) => token.value);

  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    nextTokens.splice(
      replacement.start,
      replacement.end - replacement.start,
      ...replacement.tokens,
    );
  }

  return {
    pathData: nextTokens.join(" "),
    pathViewBox: getLayerPathViewBox(layer),
  };
}

function createSmoothSegmentReplacement(
  segments: PathSegment[],
  anchors: AbsoluteAnchorSegment[],
  anchor: AbsoluteAnchorSegment,
) {
  const command = anchor.segment.command.toLowerCase();

  if (command !== "s" && command !== "t") {
    return null;
  }

  if (!canReplaceSegmentCommandSafely(segments, anchor.segment)) {
    return null;
  }

  const previousAnchor = anchors[anchors.indexOf(anchor) - 1];

  if (!previousAnchor) {
    return null;
  }

  const start = getSegmentReplacementStartTokenIndex(anchor.segment);

  return {
    start,
    end: anchor.segment.endTokenIndex,
    tokens:
      command === "s"
        ? createExplicitSmoothCubicTokens(previousAnchor, anchor)
        : createExplicitSmoothQuadraticTokens(previousAnchor, anchor),
  };
}

function createExplicitSmoothCubicTokens(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  const [controlX, controlY] = current.segment.values;

  return [
    "C",
    ...formatPathPoint(getReflectedCubicControl(previous)),
    ...formatPathPoint(getPathPoint(controlX, controlY, current)),
    ...formatPathPoint(current),
  ];
}

function createExplicitSmoothQuadraticTokens(
  previous: AbsoluteAnchorSegment,
  current: AbsoluteAnchorSegment,
) {
  return [
    "Q",
    ...formatPathPoint(getReflectedQuadraticControl(previous)),
    ...formatPathPoint(current),
  ];
}

function canReplaceSegmentCommandSafely(
  segments: PathSegment[],
  segment: PathSegment,
) {
  const nextSegment = segments.find(
    (item) => item.segmentIndex === segment.segmentIndex + 1,
  );

  return !(
    nextSegment?.command === segment.command &&
    nextSegment.commandTokenIndex === undefined
  );
}

function getIncomingHandleTarget(segment: PathSegment): HandleTarget | null {
  const command = segment.command.toLowerCase();

  if (command === "c") {
    return getHandleTarget(segment, 2, 3);
  }

  if (command === "s" || command === "q") {
    return getHandleTarget(segment, 0, 1);
  }

  return null;
}

function getOutgoingHandleTarget(segment: PathSegment): HandleTarget | null {
  const command = segment.command.toLowerCase();

  if (command === "c" || command === "q") {
    return getHandleTarget(segment, 0, 1);
  }

  return null;
}

function getHandleTarget(
  segment: PathSegment,
  xOffset: number,
  yOffset: number,
): HandleTarget | null {
  const xTokenIndex = segment.valueTokenIndexes[xOffset];
  const yTokenIndex = segment.valueTokenIndexes[yOffset];
  const x = segment.values[xOffset];
  const y = segment.values[yOffset];

  if (
    xTokenIndex === undefined ||
    yTokenIndex === undefined ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null;
  }

  return { xTokenIndex, yTokenIndex, x, y };
}

function getHandleTargetPoint(target: HandleTarget | null) {
  return target ? { x: target.x, y: target.y } : null;
}

function updateHandleTarget(
  tokens: string[],
  target: HandleTarget | null,
  point: PathPoint,
) {
  if (!target) {
    return false;
  }

  const x = formatPathNumber(point.x);
  const y = formatPathNumber(point.y);
  const changed = tokens[target.xTokenIndex] !== x || tokens[target.yTokenIndex] !== y;

  tokens[target.xTokenIndex] = x;
  tokens[target.yTokenIndex] = y;
  return changed;
}

function getDistance(first: PathPoint, second: PathPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function toLayerLocalPoint(
  layer: DesignLayer,
  box: NonNullable<DesignLayer["pathViewBox"]>,
  point: { x: number; y: number },
) {
  return {
    localX: ((point.x - box.x) / Math.max(1, box.width)) * layer.width,
    localY: ((point.y - box.y) / Math.max(1, box.height)) * layer.height,
  };
}

function getPathPointFromCanvasPoint(
  layer: DesignLayer,
  box: NonNullable<DesignLayer["pathViewBox"]>,
  canvasPoint: { x: number; y: number },
) {
  return {
    x:
      box.x +
      ((canvasPoint.x - layer.x) / Math.max(1, layer.width)) * box.width,
    y:
      box.y +
      ((canvasPoint.y - layer.y) / Math.max(1, layer.height)) * box.height,
  };
}

function stripTrailingCloseCommand(pathData: string) {
  return pathData.trim().replace(/\s*[zZ]\s*$/, "").trim();
}

function simplifyPencilPoints(
  points: Array<{ x: number; y: number }>,
  tolerance: number,
) {
  if (points.length <= 2) {
    return points;
  }

  const nextPoints = [points[0]];
  const minDistance = Math.max(1, tolerance);

  for (const point of points.slice(1, -1)) {
    const previous = nextPoints[nextPoints.length - 1];

    if (previous && getDistance(previous, point) >= minDistance) {
      nextPoints.push(point);
    }
  }

  const lastPoint = points[points.length - 1];

  if (lastPoint && nextPoints[nextPoints.length - 1] !== lastPoint) {
    nextPoints.push(lastPoint);
  }

  return nextPoints;
}

function getPencilPointBounds(points: Array<{ x: number; y: number }>) {
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function getSmoothedPencilPathData(points: Array<{ x: number; y: number }>) {
  const first = points[0];
  const last = points[points.length - 1];

  if (!first || !last) {
    return "";
  }

  if (points.length === 2) {
    return [
      "M",
      ...formatPathPoint(first),
      "L",
      ...formatPathPoint(last),
    ].join(" ");
  }

  const commands = ["M", ...formatPathPoint(first)];

  for (let index = 1; index < points.length - 1; index += 1) {
    const control = points[index];
    const next = points[index + 1];

    if (!control || !next) {
      continue;
    }

    commands.push("Q", ...formatPathPoint(control), ...formatPathPoint(getMidpoint(control, next)));
  }

  commands.push("L", ...formatPathPoint(last));

  return commands.join(" ");
}

function isClosedPath(pathData: string) {
  return /[zZ]\s*$/.test(pathData);
}

function getPointSegmentIndex(pointId: string) {
  const [rawSegmentIndex] = pointId.split(":");
  const segmentIndex = Number.parseInt(rawSegmentIndex ?? "", 10);

  return Number.isFinite(segmentIndex) ? segmentIndex : undefined;
}

function findPreviousAnchor(
  anchors: Map<number, VectorPathCanvasPoint>,
  segmentIndex: number,
) {
  let previousAnchor: VectorPathCanvasPoint | undefined;

  for (const [anchorSegmentIndex, anchor] of anchors) {
    if (anchorSegmentIndex < segmentIndex) {
      previousAnchor = anchor;
    }
  }

  return previousAnchor;
}

function createControlTether(
  segmentIndex: number,
  role: string,
  from: VectorPathCanvasPoint,
  to: VectorPathCanvasPoint,
): VectorPathControlTether {
  return {
    id: `tether:${segmentIndex}:${role}`,
    label: `${from.label} to ${to.label}`,
    fromPointId: from.id,
    toPointId: to.id,
    localX1: from.localX,
    localY1: from.localY,
    localX2: to.localX,
    localY2: to.localY,
  };
}

function createEditablePoint(
  segment: PathSegment,
  definition: PointDefinition,
): EditableVectorPathPoint {
  const xTokenIndex =
    definition.xOffset !== undefined
      ? segment.valueTokenIndexes[definition.xOffset]
      : undefined;
  const yTokenIndex =
    definition.yOffset !== undefined
      ? segment.valueTokenIndexes[definition.yOffset]
      : undefined;

  return {
    id: `${segment.segmentIndex}:${definition.suffix}`,
    label:
      definition.kind === "anchor"
        ? `Node ${segment.segmentIndex + 1}`
        : `Handle ${segment.segmentIndex + 1}${definition.suffix}`,
    command: segment.command,
    kind: definition.kind,
    relative: segment.command === segment.command.toLowerCase(),
    x:
      definition.xOffset !== undefined ? segment.values[definition.xOffset] : undefined,
    y:
      definition.yOffset !== undefined ? segment.values[definition.yOffset] : undefined,
    xTokenIndex,
    yTokenIndex,
  };
}

function getPointDefinitions(command: string): PointDefinition[] {
  const lower = command.toLowerCase();

  if (lower === "m" || lower === "l" || lower === "t") {
    return [{ suffix: "A", kind: "anchor", xOffset: 0, yOffset: 1 }];
  }

  if (lower === "h") {
    return [{ suffix: "A", kind: "anchor", xOffset: 0 }];
  }

  if (lower === "v") {
    return [{ suffix: "A", kind: "anchor", yOffset: 0 }];
  }

  if (lower === "c") {
    return [
      { suffix: "A", kind: "control", xOffset: 0, yOffset: 1 },
      { suffix: "B", kind: "control", xOffset: 2, yOffset: 3 },
      { suffix: "C", kind: "anchor", xOffset: 4, yOffset: 5 },
    ];
  }

  if (lower === "s" || lower === "q") {
    return [
      { suffix: "A", kind: "control", xOffset: 0, yOffset: 1 },
      { suffix: "B", kind: "anchor", xOffset: 2, yOffset: 3 },
    ];
  }

  if (lower === "a") {
    return [{ suffix: "A", kind: "anchor", xOffset: 5, yOffset: 6 }];
  }

  return [];
}

function parsePathSegments(tokens: PathToken[]) {
  const segments: PathSegment[] = [];
  let index = 0;
  let command = "";
  let commandTokenIndex: number | undefined;
  let segmentIndex = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (token.kind === "command") {
      command = token.value;
      commandTokenIndex = index;
      index += 1;

      if (commandNumberCount(command) === 0) {
        commandTokenIndex = undefined;
        continue;
      }
    }

    const count = commandNumberCount(command);

    if (!command || count <= 0 || index >= tokens.length) {
      index += 1;
      continue;
    }

    const valueTokenIndexes = tokens
      .slice(index, index + count)
      .map((_, offset) => index + offset);
    const values = valueTokenIndexes.map((tokenIndex) => tokens[tokenIndex]);

    if (
      values.length < count ||
      values.some(
        (value) => value.kind !== "number" || value.numberValue === undefined,
      )
    ) {
      index += 1;
      continue;
    }

    segments.push({
      command,
      segmentIndex,
      commandTokenIndex,
      valueStartTokenIndex: index,
      valueTokenIndexes,
      values: values.map((value) => value.numberValue ?? 0),
      endTokenIndex: index + count,
    });
    segmentIndex += 1;
    index += count;
    commandTokenIndex = undefined;
  }

  return segments;
}

function tokenizePathData(pathData: string) {
  return (
    pathData
      .match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g)
      ?.map((value) => {
        if (/^[a-zA-Z]$/.test(value)) {
          return { value, kind: "command" as const };
        }

        const numberValue = Number.parseFloat(value);

        return {
          value,
          numberValue: Number.isFinite(numberValue) ? numberValue : undefined,
          kind: "number" as const,
        };
      }) ?? []
  );
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

function getLayerPathViewBox(layer: DesignLayer) {
  return (
    layer.pathViewBox ?? {
      x: layer.x,
      y: layer.y,
      width: Math.max(1, layer.width),
      height: Math.max(1, layer.height),
    }
  );
}

function formatPathNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}
