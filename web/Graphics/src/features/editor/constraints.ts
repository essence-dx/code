import type {
  DesignConstraints,
  DesignHorizontalConstraint,
  DesignLayer,
  DesignVerticalConstraint,
} from "@/features/editor/types";

export type ConstraintLayerPatch = {
  layerId: string;
  patch: Partial<DesignLayer>;
};

type Rect = Pick<DesignLayer, "x" | "y" | "width" | "height">;

export const defaultConstraints: DesignConstraints = {
  horizontal: "left",
  vertical: "top",
};

export const horizontalConstraintOptions = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "left-right", label: "Left & right" },
  { value: "center", label: "Center" },
  { value: "scale", label: "Scale" },
] satisfies Array<{ value: DesignHorizontalConstraint; label: string }>;

export const verticalConstraintOptions = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "top-bottom", label: "Top & bottom" },
  { value: "center", label: "Center" },
  { value: "scale", label: "Scale" },
] satisfies Array<{ value: DesignVerticalConstraint; label: string }>;

export function getLayerConstraints(layer: DesignLayer): DesignConstraints {
  return {
    ...defaultConstraints,
    ...layer.constraints,
  };
}

export function getConstraintsSignature(layer: DesignLayer) {
  const constraints = getLayerConstraints(layer);

  return `${constraints.horizontal}:${constraints.vertical}`;
}

export function createFrameResizeConstraintPatches({
  frame,
  nextFrame,
  layers,
}: {
  frame: DesignLayer;
  nextFrame: Rect;
  layers: DesignLayer[];
}): ConstraintLayerPatch[] {
  if (frame.type !== "frame") {
    return [];
  }

  return layers
    .filter((layer) => layer.parentId === frame.id && !layer.locked)
    .map((layer) => ({
      layerId: layer.id,
      patch: getConstrainedChildPatch(frame, nextFrame, layer),
    }));
}

function getConstrainedChildPatch(
  frame: Rect,
  nextFrame: Rect,
  layer: DesignLayer,
) {
  const constraints = getLayerConstraints(layer);
  const horizontal = getHorizontalConstraintPatch(
    frame,
    nextFrame,
    layer,
    constraints.horizontal,
  );
  const vertical = getVerticalConstraintPatch(
    frame,
    nextFrame,
    layer,
    constraints.vertical,
  );

  return {
    ...horizontal,
    ...vertical,
  };
}

function getHorizontalConstraintPatch(
  frame: Rect,
  nextFrame: Rect,
  layer: DesignLayer,
  constraint: DesignHorizontalConstraint,
) {
  const left = layer.x - frame.x;
  const right = frame.x + frame.width - layer.x - layer.width;
  const centerOffset = layer.x + layer.width / 2 - (frame.x + frame.width / 2);
  const scale = nextFrame.width / Math.max(1, frame.width);

  if (constraint === "right") {
    return {
      x: Math.round(nextFrame.x + nextFrame.width - right - layer.width),
    };
  }

  if (constraint === "left-right") {
    return {
      x: Math.round(nextFrame.x + left),
      width: Math.max(1, Math.round(nextFrame.width - left - right)),
    };
  }

  if (constraint === "center") {
    return {
      x: Math.round(nextFrame.x + nextFrame.width / 2 + centerOffset - layer.width / 2),
    };
  }

  if (constraint === "scale") {
    return {
      x: Math.round(nextFrame.x + left * scale),
      width: Math.max(1, Math.round(layer.width * scale)),
    };
  }

  return {
    x: Math.round(nextFrame.x + left),
  };
}

function getVerticalConstraintPatch(
  frame: Rect,
  nextFrame: Rect,
  layer: DesignLayer,
  constraint: DesignVerticalConstraint,
) {
  const top = layer.y - frame.y;
  const bottom = frame.y + frame.height - layer.y - layer.height;
  const centerOffset = layer.y + layer.height / 2 - (frame.y + frame.height / 2);
  const scale = nextFrame.height / Math.max(1, frame.height);

  if (constraint === "bottom") {
    return {
      y: Math.round(nextFrame.y + nextFrame.height - bottom - layer.height),
    };
  }

  if (constraint === "top-bottom") {
    return {
      y: Math.round(nextFrame.y + top),
      height: Math.max(1, Math.round(nextFrame.height - top - bottom)),
    };
  }

  if (constraint === "center") {
    return {
      y: Math.round(nextFrame.y + nextFrame.height / 2 + centerOffset - layer.height / 2),
    };
  }

  if (constraint === "scale") {
    return {
      y: Math.round(nextFrame.y + top * scale),
      height: Math.max(1, Math.round(layer.height * scale)),
    };
  }

  return {
    y: Math.round(nextFrame.y + top),
  };
}
