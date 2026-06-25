import type {
  DesignAutoLayout,
  DesignAutoLayoutAlignment,
  DesignAutoLayoutMode,
  DesignAutoLayoutWrap,
  DesignLayoutSizing,
  DesignLayoutSizingMode,
  DesignLayer,
} from "@/features/editor/types";

export type AutoLayoutLayerPatch = {
  layerId: string;
  patch: Partial<DesignLayer>;
};

export const defaultAutoLayout: DesignAutoLayout = {
  mode: "horizontal",
  gap: 16,
  paddingX: 24,
  paddingY: 24,
  align: "start",
  wrap: "nowrap",
};

export const defaultLayoutSizing: DesignLayoutSizing = {
  horizontal: "fixed",
  vertical: "fixed",
};

export const autoLayoutModeOptions = [
  { value: "none", label: "None" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
] satisfies Array<{ value: DesignAutoLayoutMode | "none"; label: string }>;

export const autoLayoutAlignmentOptions = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "stretch", label: "Stretch" },
] satisfies Array<{ value: DesignAutoLayoutAlignment; label: string }>;

export const autoLayoutWrapOptions = [
  { value: "nowrap", label: "No wrap" },
  { value: "wrap", label: "Wrap" },
] satisfies Array<{ value: DesignAutoLayoutWrap; label: string }>;

export const layoutSizingOptions = [
  { value: "fixed", label: "Fixed" },
  { value: "hug", label: "Hug" },
  { value: "fill", label: "Fill" },
] satisfies Array<{ value: DesignLayoutSizingMode; label: string }>;

export function getAutoLayoutChildLayers(
  frame: DesignLayer,
  layers: DesignLayer[],
) {
  const layout = frame.autoLayout;

  if (frame.type !== "frame" || !layout) {
    return [];
  }

  const ownedChildren = layers.filter((layer) =>
    isOwnedAutoLayoutChild(frame, layer),
  );
  const children =
    ownedChildren.length > 0
      ? ownedChildren
      : layers.filter((layer) => isContainedAutoLayoutChild(frame, layer));

  return sortAutoLayoutChildren(children, layout.mode);
}

export function createAutoLayoutParentPatches(
  frame: DesignLayer,
  layers: DesignLayer[],
): AutoLayoutLayerPatch[] {
  if (frame.type !== "frame") {
    return [];
  }

  return layers
    .filter((layer) => isContainedAutoLayoutChild(frame, layer))
    .filter((layer) => layer.parentId !== frame.id)
    .map((layer) => ({
      layerId: layer.id,
      patch: { parentId: frame.id, absolutePositioned: undefined },
    }));
}

export function createAutoLayoutLayerPatches(
  frame: DesignLayer,
  layers: DesignLayer[],
): AutoLayoutLayerPatch[] {
  const layout = frame.autoLayout;

  if (frame.type !== "frame" || !layout) {
    return [];
  }

  const children = getAutoLayoutChildLayers(frame, layers);
  const innerWidth = Math.max(1, frame.width - layout.paddingX * 2);
  const innerHeight = Math.max(1, frame.height - layout.paddingY * 2);

  if ((layout.wrap ?? "nowrap") === "wrap") {
    return createWrappedAutoLayoutLayerPatches(
      frame,
      children,
      layout,
      innerWidth,
      innerHeight,
    );
  }

  const frameSizing = getLayerSizing(frame);
  const mainAxis = layout.mode === "horizontal" ? "horizontal" : "vertical";
  const crossAxis = layout.mode === "horizontal" ? "vertical" : "horizontal";
  const mainFillSize =
    frameSizing[mainAxis] === "hug"
      ? null
      : getFillChildSize(children, mainAxis, layout.gap, layout.mode === "horizontal" ? innerWidth : innerHeight);
  let cursor =
    layout.mode === "horizontal" ? frame.x + layout.paddingX : frame.y + layout.paddingY;

  const patches = children.map((child) => {
    const patch: Partial<DesignLayer> = {};
    const childSizing = getLayerSizing(child);
    const childWidth =
      childSizing.horizontal === "fill" && mainAxis === "horizontal" && mainFillSize !== null
        ? mainFillSize
        : child.width;
    const childHeight =
      childSizing.vertical === "fill" && mainAxis === "vertical" && mainFillSize !== null
        ? mainFillSize
        : child.height;

    if (layout.mode === "horizontal") {
      patch.x = Math.round(cursor);
      patch.y = Math.round(
        getCrossAxisPosition(frame.y, innerHeight, layout.paddingY, childHeight, layout.align),
      );

      if (layout.align === "stretch" || childSizing[crossAxis] === "fill") {
        patch.height = innerHeight;
      }

      if (childSizing[mainAxis] === "fill" && mainFillSize !== null) {
        patch.width = childWidth;
      }

      cursor += childWidth + layout.gap;
    } else {
      patch.x = Math.round(
        getCrossAxisPosition(frame.x, innerWidth, layout.paddingX, childWidth, layout.align),
      );
      patch.y = Math.round(cursor);

      if (layout.align === "stretch" || childSizing[crossAxis] === "fill") {
        patch.width = innerWidth;
      }

      if (childSizing[mainAxis] === "fill" && mainFillSize !== null) {
        patch.height = childHeight;
      }

      cursor += childHeight + layout.gap;
    }

    return {
      layerId: child.id,
      patch,
    };
  });

  const framePatch = getHugFramePatch(frame, children, layout);

  return framePatch ? [...patches, { layerId: frame.id, patch: framePatch }] : patches;
}

export function getAutoLayoutSignature(layer: DesignLayer) {
  const layout = layer.autoLayout;

  if (!layout) {
    return "";
  }

  return [
    layout.mode,
    layout.gap,
    layout.paddingX,
    layout.paddingY,
    layout.align,
    layout.wrap ?? "nowrap",
  ].join(":");
}

export function getLayoutSizingSignature(layer: DesignLayer) {
  const sizing = getLayerSizing(layer);

  return `${sizing.horizontal}:${sizing.vertical}`;
}

export function getLayerSizing(layer: DesignLayer): DesignLayoutSizing {
  return {
    ...defaultLayoutSizing,
    ...layer.layoutSizing,
  };
}

function getFillChildSize(
  children: DesignLayer[],
  axis: keyof DesignLayoutSizing,
  gap: number,
  availableSize: number,
) {
  const fillChildren = children.filter(
    (child) => getLayerSizing(child)[axis] === "fill",
  );

  if (fillChildren.length === 0) {
    return null;
  }

  const fixedSize = children
    .filter((child) => getLayerSizing(child)[axis] !== "fill")
    .reduce((total, child) => total + getLayerAxisSize(child, axis), 0);
  const totalGap = Math.max(0, children.length - 1) * gap;
  const remainingSize = Math.max(1, availableSize - fixedSize - totalGap);

  return Math.max(1, remainingSize / fillChildren.length);
}

type WrappedAutoLayoutItem = {
  layer: DesignLayer;
  mainSize: number;
  crossSize: number;
};

type WrappedAutoLayoutLine = {
  items: WrappedAutoLayoutItem[];
  mainSize: number;
  crossSize: number;
};

function createWrappedAutoLayoutLayerPatches(
  frame: DesignLayer,
  children: DesignLayer[],
  layout: DesignAutoLayout,
  innerWidth: number,
  innerHeight: number,
) {
  const mainAxis = layout.mode === "horizontal" ? "horizontal" : "vertical";
  const crossAxis = layout.mode === "horizontal" ? "vertical" : "horizontal";
  const availableMain = layout.mode === "horizontal" ? innerWidth : innerHeight;
  const lines = createWrappedAutoLayoutLines(
    children,
    mainAxis,
    availableMain,
    layout.gap,
  );
  const mainStart =
    layout.mode === "horizontal" ? frame.x + layout.paddingX : frame.y + layout.paddingY;
  let crossCursor =
    layout.mode === "horizontal" ? frame.y + layout.paddingY : frame.x + layout.paddingX;
  const patches: AutoLayoutLayerPatch[] = [];

  for (const line of lines) {
    let mainCursor = mainStart;

    for (const item of line.items) {
      const sizing = getLayerSizing(item.layer);
      const patch: Partial<DesignLayer> = {};
      const shouldStretchCross =
        layout.align === "stretch" || sizing[crossAxis] === "fill";
      const crossSize = shouldStretchCross ? line.crossSize : item.crossSize;
      const crossPosition = getLineCrossAxisPosition(
        crossCursor,
        line.crossSize,
        crossSize,
        layout.align,
      );

      if (layout.mode === "horizontal") {
        patch.x = Math.round(mainCursor);
        patch.y = Math.round(crossPosition);

        if (shouldStretchCross) {
          patch.height = Math.round(crossSize);
        }
      } else {
        patch.x = Math.round(crossPosition);
        patch.y = Math.round(mainCursor);

        if (shouldStretchCross) {
          patch.width = Math.round(crossSize);
        }
      }

      patches.push({ layerId: item.layer.id, patch });
      mainCursor += item.mainSize + layout.gap;
    }

    crossCursor += line.crossSize + layout.gap;
  }

  const framePatch = getWrappedHugFramePatch(frame, lines, layout);

  return framePatch ? [...patches, { layerId: frame.id, patch: framePatch }] : patches;
}

function createWrappedAutoLayoutLines(
  children: DesignLayer[],
  mainAxis: keyof DesignLayoutSizing,
  availableMain: number,
  gap: number,
) {
  const lines: WrappedAutoLayoutLine[] = [];
  let currentLine: WrappedAutoLayoutLine = {
    items: [],
    mainSize: 0,
    crossSize: 0,
  };

  for (const layer of children) {
    const item: WrappedAutoLayoutItem = {
      layer,
      mainSize: getLayerAxisSize(layer, mainAxis),
      crossSize: getLayerAxisSize(
        layer,
        mainAxis === "horizontal" ? "vertical" : "horizontal",
      ),
    };
    const nextMainSize =
      currentLine.items.length === 0
        ? item.mainSize
        : currentLine.mainSize + gap + item.mainSize;

    if (currentLine.items.length > 0 && nextMainSize > availableMain) {
      lines.push(currentLine);
      currentLine = {
        items: [],
        mainSize: 0,
        crossSize: 0,
      };
    }

    currentLine.items.push(item);
    currentLine.mainSize =
      currentLine.items.length === 1
        ? item.mainSize
        : currentLine.mainSize + gap + item.mainSize;
    currentLine.crossSize = Math.max(currentLine.crossSize, item.crossSize);
  }

  if (currentLine.items.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function getWrappedHugFramePatch(
  frame: DesignLayer,
  lines: WrappedAutoLayoutLine[],
  layout: DesignAutoLayout,
) {
  if (lines.length === 0 || !frame.layoutSizing) {
    return null;
  }

  const sizing = getLayerSizing(frame);
  const patch: Partial<DesignLayer> = {};
  const crossSize =
    lines.reduce((total, line) => total + line.crossSize, 0) +
    Math.max(0, lines.length - 1) * layout.gap;
  const mainSize = Math.max(...lines.map((line) => line.mainSize));

  if (sizing.horizontal === "hug") {
    patch.width =
      layout.mode === "horizontal"
        ? Math.round(layout.paddingX * 2 + mainSize)
        : Math.round(layout.paddingX * 2 + crossSize);
  }

  if (sizing.vertical === "hug") {
    patch.height =
      layout.mode === "vertical"
        ? Math.round(layout.paddingY * 2 + mainSize)
        : Math.round(layout.paddingY * 2 + crossSize);
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function getHugFramePatch(
  frame: DesignLayer,
  children: DesignLayer[],
  layout: DesignAutoLayout,
) {
  if (children.length === 0 || !frame.layoutSizing) {
    return null;
  }

  const sizing = getLayerSizing(frame);
  const patch: Partial<DesignLayer> = {};

  if (sizing.horizontal === "hug") {
    patch.width =
      layout.mode === "horizontal"
        ? Math.round(
            layout.paddingX * 2 +
              children.reduce((total, child) => total + child.width, 0) +
              Math.max(0, children.length - 1) * layout.gap,
          )
        : Math.round(
            layout.paddingX * 2 + Math.max(...children.map((child) => child.width)),
          );
  }

  if (sizing.vertical === "hug") {
    patch.height =
      layout.mode === "vertical"
        ? Math.round(
            layout.paddingY * 2 +
              children.reduce((total, child) => total + child.height, 0) +
              Math.max(0, children.length - 1) * layout.gap,
          )
        : Math.round(
            layout.paddingY * 2 + Math.max(...children.map((child) => child.height)),
          );
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function getLayerAxisSize(layer: DesignLayer, axis: keyof DesignLayoutSizing) {
  return axis === "horizontal" ? layer.width : layer.height;
}

function isOwnedAutoLayoutChild(frame: DesignLayer, layer: DesignLayer) {
  return layer.parentId === frame.id && isAutoLayoutChildCandidate(frame, layer);
}

function isContainedAutoLayoutChild(frame: DesignLayer, layer: DesignLayer) {
  return (
    isAutoLayoutChildCandidate(frame, layer) &&
    layer.x >= frame.x &&
    layer.y >= frame.y &&
    layer.x + layer.width <= frame.x + frame.width &&
    layer.y + layer.height <= frame.y + frame.height
  );
}

function isAutoLayoutChildCandidate(frame: DesignLayer, layer: DesignLayer) {
  if (
    layer.id === frame.id ||
    layer.locked ||
    !layer.visible ||
    layer.absolutePositioned
  ) {
    return false;
  }

  return true;
}

function sortAutoLayoutChildren(
  layers: DesignLayer[],
  mode: DesignAutoLayoutMode,
) {
  return [...layers].sort((left, right) =>
    mode === "horizontal"
      ? left.x - right.x || left.y - right.y
      : left.y - right.y || left.x - right.x,
  );
}

function getCrossAxisPosition(
  frameStart: number,
  innerSize: number,
  padding: number,
  childSize: number,
  align: DesignAutoLayoutAlignment,
) {
  if (align === "center") {
    return frameStart + padding + (innerSize - childSize) / 2;
  }

  if (align === "end") {
    return frameStart + padding + innerSize - childSize;
  }

  return frameStart + padding;
}

function getLineCrossAxisPosition(
  lineStart: number,
  lineSize: number,
  childSize: number,
  align: DesignAutoLayoutAlignment,
) {
  if (align === "center") {
    return lineStart + (lineSize - childSize) / 2;
  }

  if (align === "end") {
    return lineStart + lineSize - childSize;
  }

  return lineStart;
}
