import type {
  VectorPathElement,
  VectorPathPreset,
  VectorPathSegment,
} from "@/features/editor/types";

export const vectorPathPresets = [
  { id: "curve", label: "Curve" },
  { id: "blob", label: "Blob" },
  { id: "wave", label: "Wave" },
] satisfies Array<{ id: VectorPathPreset; label: string }>;

export function createVectorPathGeometry({
  preset,
  width,
  height,
}: {
  preset: VectorPathPreset;
  width: number;
  height: number;
}): Pick<VectorPathElement, "startX" | "startY" | "segments" | "closed"> {
  if (preset === "blob") {
    return {
      startX: roundPathNumber(width * 0.5),
      startY: roundPathNumber(height * 0.08),
      closed: true,
      segments: [
        {
          control1X: roundPathNumber(width * 0.9),
          control1Y: roundPathNumber(height * 0.02),
          control2X: roundPathNumber(width * 0.98),
          control2Y: roundPathNumber(height * 0.38),
          x: roundPathNumber(width * 0.84),
          y: roundPathNumber(height * 0.62),
        },
        {
          control1X: roundPathNumber(width * 0.72),
          control1Y: roundPathNumber(height * 0.92),
          control2X: roundPathNumber(width * 0.32),
          control2Y: roundPathNumber(height * 0.96),
          x: roundPathNumber(width * 0.18),
          y: roundPathNumber(height * 0.7),
        },
        {
          control1X: roundPathNumber(width * 0.02),
          control1Y: roundPathNumber(height * 0.42),
          control2X: roundPathNumber(width * 0.16),
          control2Y: roundPathNumber(height * 0.08),
          x: roundPathNumber(width * 0.5),
          y: roundPathNumber(height * 0.08),
        },
      ],
    };
  }

  if (preset === "wave") {
    return {
      startX: 0,
      startY: roundPathNumber(height * 0.55),
      closed: false,
      segments: [
        {
          control1X: roundPathNumber(width * 0.2),
          control1Y: roundPathNumber(height * 0.12),
          control2X: roundPathNumber(width * 0.35),
          control2Y: roundPathNumber(height * 0.92),
          x: roundPathNumber(width * 0.52),
          y: roundPathNumber(height * 0.45),
        },
        {
          control1X: roundPathNumber(width * 0.7),
          control1Y: roundPathNumber(height * 0.02),
          control2X: roundPathNumber(width * 0.82),
          control2Y: roundPathNumber(height * 0.78),
          x: width,
          y: roundPathNumber(height * 0.4),
        },
      ],
    };
  }

  return {
    startX: roundPathNumber(width * 0.1),
    startY: roundPathNumber(height * 0.72),
    closed: false,
    segments: [
      {
        control1X: roundPathNumber(width * 0.22),
        control1Y: roundPathNumber(height * 0.08),
        control2X: roundPathNumber(width * 0.76),
        control2Y: roundPathNumber(height * 0.1),
        x: roundPathNumber(width * 0.9),
        y: roundPathNumber(height * 0.66),
      },
    ],
  };
}

export function getVectorPathData(element: VectorPathElement) {
  if (element.customPathData) {
    return element.customPathData;
  }

  const start = `M ${formatPathNumber(element.startX)} ${formatPathNumber(
    element.startY,
  )}`;
  const segments = element.segments
    .map(
      (segment) =>
        `C ${formatPathNumber(segment.control1X)} ${formatPathNumber(
          segment.control1Y,
        )} ${formatPathNumber(segment.control2X)} ${formatPathNumber(
          segment.control2Y,
        )} ${formatPathNumber(segment.x)} ${formatPathNumber(segment.y)}`,
    )
    .join(" ");

  return `${start}${segments ? ` ${segments}` : ""}${element.closed ? " Z" : ""}`;
}

export function updateVectorPathSegment(
  segments: readonly VectorPathSegment[],
  index: number,
  updates: Partial<VectorPathSegment>,
) {
  return segments.map((segment, segmentIndex) =>
    segmentIndex === index ? { ...segment, ...updates } : segment,
  );
}

export function getVectorPathPresetLabel(preset: VectorPathPreset) {
  return (
    vectorPathPresets.find((item) => item.id === preset)?.label ?? "Custom"
  );
}

function formatPathNumber(value: number) {
  return String(roundPathNumber(value));
}

function roundPathNumber(value: number) {
  return Math.round(value * 100) / 100;
}
