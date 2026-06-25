import type {
  ConnectorAnchor,
  ConnectorElement,
  ConnectorLabelPosition,
  DesignElement,
} from "@/features/editor/types";
import { createConnectorElement } from "@/features/editor/document-factory";

type Point = {
  x: number;
  y: number;
};

export type ConnectorPathGeometry = {
  width: number;
  height: number;
  path: string;
  labelX: number;
  labelY: number;
};

const FRAME_PADDING_X = 12;
const FRAME_PADDING_Y = 12;
const anchorPreference: DesignElement["type"][] = [
  "shape",
  "sticky-note",
  "image",
  "table",
  "chart",
  "form",
  "embed",
  "timer",
  "qr",
  "svg",
  "lottie",
  "video",
  "pdf",
  "audio",
  "text",
];

export function getConnectorAnchorCandidates(
  elements: readonly DesignElement[],
  selectedElementIds: readonly string[],
) {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const handledSelectionKeys = new Set<string>();
  const candidates: DesignElement[] = [];

  for (const elementId of selectedElementIds) {
    const element = elementMap.get(elementId);

    if (!element || !isAnchorableElement(element)) continue;

    const selectionKey = element.groupId ?? element.id;

    if (handledSelectionKeys.has(selectionKey)) continue;

    handledSelectionKeys.add(selectionKey);
    candidates.push(
      element.groupId
        ? getPreferredAnchorElement(
            elements.filter((item) => item.groupId === element.groupId),
          ) ?? element
        : element,
    );
  }

  return candidates;
}

export function createAnchoredConnectorBetweenElements(
  startElement: DesignElement,
  endElement: DesignElement,
): ConnectorElement {
  const startCenter = getElementCenter(startElement);
  const endCenter = getElementCenter(endElement);

  return createConnectorElement({
    x: Math.round(Math.min(startCenter.x, endCenter.x)),
    y: Math.round(Math.min(startCenter.y, endCenter.y)),
    width: Math.max(120, Math.round(Math.abs(endCenter.x - startCenter.x))),
    height: Math.max(48, Math.round(Math.abs(endCenter.y - startCenter.y))),
    stroke: "#2563eb",
    strokeWidth: 4,
    label: "Connection",
    startElementId: startElement.id,
    endElementId: endElement.id,
    startAnchor: "auto",
    endAnchor: "auto",
  });
}

export function resolveAnchoredConnectors(
  elements: DesignElement[],
  changedElementIds?: Set<string>,
): DesignElement[] {
  if (!elements.some((element) => hasConnectorAnchors(element))) {
    return elements;
  }

  const elementMap = new Map(elements.map((element) => [element.id, element]));

  return elements.map((element) => {
    if (!hasConnectorAnchors(element)) return element;

    const shouldResolve =
      !changedElementIds ||
      changedElementIds.has(element.id) ||
      changedElementIds.has(element.startElementId) ||
      changedElementIds.has(element.endElementId);

    if (!shouldResolve) return element;

    const frame = getAnchoredConnectorFrame(element, elementMap);

    return frame ? ({ ...element, ...frame } as DesignElement) : element;
  });
}

export function getConnectorPathGeometry(
  element: ConnectorElement,
  pageElements?: readonly DesignElement[],
): ConnectorPathGeometry {
  const width = Math.max(24, element.width);
  const height = Math.max(24, element.height);
  const elementMap = pageElements
    ? new Map(pageElements.map((item) => [item.id, item]))
    : undefined;
  const points = elementMap
    ? getAnchoredConnectorPoints(element, elementMap)
    : null;

  if (points) {
    const start = {
      x: points.start.x - element.x,
      y: points.start.y - element.y,
    };
    const end = {
      x: points.end.x - element.x,
      y: points.end.y - element.y,
    };
    const path = getConnectorPath(element.connectorKind, start, end);
    const labelPoint = getConnectorLabelPoint(
      element.connectorKind,
      element.labelPosition ?? "center",
      start,
      end,
    );

    return {
      width,
      height,
      path,
      labelX: labelPoint.x,
      labelY: labelPoint.y,
    };
  }

  const start = { x: 8, y: height / 2 };
  const end = { x: width - 8, y: height / 2 };

  if (element.connectorKind === "elbow") {
    start.y = 12;
    end.y = height - 12;
  }

  const labelPoint = getConnectorLabelPoint(
    element.connectorKind,
    element.labelPosition ?? "center",
    start,
    end,
  );

  return {
    width,
    height,
    path: getConnectorPath(element.connectorKind, start, end),
    labelX: labelPoint.x,
    labelY: labelPoint.y,
  };
}

function getConnectorLabelPoint(
  connectorKind: ConnectorElement["connectorKind"],
  position: ConnectorLabelPosition,
  start: Point,
  end: Point,
): Point {
  const points = getConnectorPolylinePoints(connectorKind, start, end);
  const ratio = position === "start" ? 0.25 : position === "end" ? 0.75 : 0.5;
  const totalLength = points.reduce((length, point, index) => {
    if (index === 0) return length;

    return length + getDistance(points[index - 1], point);
  }, 0);

  if (totalLength === 0) {
    return { x: start.x, y: start.y - 8 };
  }

  let remainingLength = totalLength * ratio;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const segmentLength = getDistance(previous, point);

    if (remainingLength <= segmentLength) {
      const segmentRatio = segmentLength === 0 ? 0 : remainingLength / segmentLength;

      return {
        x: previous.x + (point.x - previous.x) * segmentRatio,
        y: previous.y + (point.y - previous.y) * segmentRatio - 8,
      };
    }

    remainingLength -= segmentLength;
  }

  return {
    x: end.x,
    y: end.y - 8,
  };
}

function getAnchoredConnectorFrame(
  connector: ConnectorElement,
  elementMap: Map<string, DesignElement>,
) {
  const points = getAnchoredConnectorPoints(connector, elementMap);

  if (!points) return null;

  const left = Math.min(points.start.x, points.end.x) - FRAME_PADDING_X;
  const top = Math.min(points.start.y, points.end.y) - FRAME_PADDING_Y;
  const right = Math.max(points.start.x, points.end.x) + FRAME_PADDING_X;
  const bottom = Math.max(points.start.y, points.end.y) + FRAME_PADDING_Y;

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(24, Math.round(right - left)),
    height: Math.max(24, Math.round(bottom - top)),
  };
}

function getAnchoredConnectorPoints(
  connector: ConnectorElement,
  elementMap: Map<string, DesignElement>,
) {
  if (!connector.startElementId || !connector.endElementId) return null;

  const startElement = elementMap.get(connector.startElementId);
  const endElement = elementMap.get(connector.endElementId);

  if (!startElement || !endElement) return null;
  if (startElement.hidden || endElement.hidden) return null;

  const startCenter = getElementCenter(startElement);
  const endCenter = getElementCenter(endElement);

  return {
    start: getAnchorPoint(
      startElement,
      connector.startAnchor ?? "auto",
      endCenter,
    ),
    end: getAnchorPoint(endElement, connector.endAnchor ?? "auto", startCenter),
  };
}

function getAnchorPoint(
  element: DesignElement,
  anchor: ConnectorAnchor,
  target: Point,
): Point {
  const resolvedAnchor = anchor === "auto" ? getAutoAnchor(element, target) : anchor;

  switch (resolvedAnchor) {
    case "left":
      return { x: element.x, y: element.y + element.height / 2 };
    case "right":
      return { x: element.x + element.width, y: element.y + element.height / 2 };
    case "top":
      return { x: element.x + element.width / 2, y: element.y };
    case "bottom":
      return { x: element.x + element.width / 2, y: element.y + element.height };
    case "center":
      return getElementCenter(element);
    default:
      return getElementCenter(element);
  }
}

function getAutoAnchor(element: DesignElement, target: Point): ConnectorAnchor {
  const center = getElementCenter(element);
  const deltaX = target.x - center.x;
  const deltaY = target.y - center.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaY >= 0 ? "bottom" : "top";
}

function getElementCenter(element: DesignElement): Point {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

function getPreferredAnchorElement(elements: readonly DesignElement[]) {
  return [...elements]
    .filter(isAnchorableElement)
    .sort(
      (left, right) =>
        anchorPreference.indexOf(left.type) -
        anchorPreference.indexOf(right.type),
    )[0];
}

function isAnchorableElement(element: DesignElement) {
  return !element.hidden && element.type !== "connector";
}

function getConnectorPath(
  connectorKind: ConnectorElement["connectorKind"],
  start: Point,
  end: Point,
) {
  const points = getConnectorPolylinePoints(connectorKind, start, end);
  const [first, ...rest] = points;

  return `M ${first.x} ${first.y} ${rest
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ")}`;
}

function getConnectorPolylinePoints(
  connectorKind: ConnectorElement["connectorKind"],
  start: Point,
  end: Point,
): Point[] {
  if (connectorKind === "elbow") {
    const midX = start.x + (end.x - start.x) / 2;

    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return [start, end];
}

function getDistance(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function hasConnectorAnchors(
  element: DesignElement,
): element is ConnectorElement & {
  startElementId: string;
  endElementId: string;
} {
  return (
    element.type === "connector" &&
    typeof element.startElementId === "string" &&
    typeof element.endElementId === "string"
  );
}
