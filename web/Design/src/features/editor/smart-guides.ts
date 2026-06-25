import type { DesignElement } from "@/features/editor/types";

export type SmartGuideLine = {
  orientation: "vertical" | "horizontal";
  position: number;
};

type SnapTarget = {
  position: number;
  kind: "edge" | "center";
};

type SnapCandidate = {
  position: number;
  offset: number;
};

type GetSmartGuideSnapArgs = {
  canvasWidth: number;
  canvasHeight: number;
  elements: DesignElement[];
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tolerance?: number;
};

export function getSmartGuideSnap({
  canvasWidth,
  canvasHeight,
  elements,
  elementId,
  x,
  y,
  width,
  height,
  tolerance = 6,
}: GetSmartGuideSnapArgs) {
  const verticalTargets = buildTargets(canvasWidth, elements, elementId, "x");
  const horizontalTargets = buildTargets(
    canvasHeight,
    elements,
    elementId,
    "y",
  );
  const verticalSnap = findAxisSnap(
    [
      { position: x, offset: 0 },
      { position: x + width / 2, offset: width / 2 },
      { position: x + width, offset: width },
    ],
    verticalTargets,
    tolerance,
  );
  const horizontalSnap = findAxisSnap(
    [
      { position: y, offset: 0 },
      { position: y + height / 2, offset: height / 2 },
      { position: y + height, offset: height },
    ],
    horizontalTargets,
    tolerance,
  );

  return {
    x: verticalSnap
      ? Math.round(verticalSnap.position - verticalSnap.offset)
      : x,
    y: horizontalSnap
      ? Math.round(horizontalSnap.position - horizontalSnap.offset)
      : y,
    lines: [
      ...(verticalSnap
        ? [
            {
              orientation: "vertical" as const,
              position: verticalSnap.position,
            },
          ]
        : []),
      ...(horizontalSnap
        ? [
            {
              orientation: "horizontal" as const,
              position: horizontalSnap.position,
            },
          ]
        : []),
    ] satisfies SmartGuideLine[],
  };
}

function buildTargets(
  canvasSize: number,
  elements: DesignElement[],
  elementId: string,
  axis: "x" | "y",
) {
  const sizeKey = axis === "x" ? "width" : "height";
  const targets: SnapTarget[] = [
    { position: 0, kind: "edge" },
    { position: canvasSize / 2, kind: "center" },
    { position: canvasSize, kind: "edge" },
  ];

  for (const element of elements) {
    if (element.id === elementId || element.hidden) continue;

    const start = element[axis];
    const size = element[sizeKey];

    targets.push(
      { position: start, kind: "edge" },
      { position: start + size / 2, kind: "center" },
      { position: start + size, kind: "edge" },
    );
  }

  return targets;
}

function findAxisSnap(
  candidates: SnapCandidate[],
  targets: SnapTarget[],
  tolerance: number,
) {
  let closest: {
    distance: number;
    offset: number;
    position: number;
  } | null = null;

  for (const candidate of candidates) {
    for (const target of targets) {
      const distance = Math.abs(candidate.position - target.position);

      if (distance > tolerance) continue;

      if (!closest || distance < closest.distance) {
        closest = {
          distance,
          offset: candidate.offset,
          position: Math.round(target.position),
        };
      }
    }
  }

  return closest;
}
