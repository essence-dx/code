import type { DesignElement } from "@/features/editor/types";

export type CanvasBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type PageSize = {
  width: number;
  height: number;
};

const defaultWhiteboardMargin = 960;
const elementBoundsPadding = 360;

export function getPageBounds(pageSize: PageSize): CanvasBounds {
  return {
    left: 0,
    top: 0,
    right: pageSize.width,
    bottom: pageSize.height,
  };
}

export function getWhiteboardBounds(
  pageSize: PageSize,
  elements: DesignElement[],
): CanvasBounds {
  const visibleElements = elements.filter((element) => !element.hidden);

  return visibleElements.reduce(
    (bounds, element) => ({
      left: Math.min(bounds.left, element.x - elementBoundsPadding),
      top: Math.min(bounds.top, element.y - elementBoundsPadding),
      right: Math.max(
        bounds.right,
        element.x + element.width + elementBoundsPadding,
      ),
      bottom: Math.max(
        bounds.bottom,
        element.y + element.height + elementBoundsPadding,
      ),
    }),
    {
      left: -defaultWhiteboardMargin,
      top: -defaultWhiteboardMargin,
      right: pageSize.width + defaultWhiteboardMargin,
      bottom: pageSize.height + defaultWhiteboardMargin,
    },
  );
}

export function getCanvasBoundsSize(bounds: CanvasBounds) {
  return {
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  };
}
