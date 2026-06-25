"use client";

import type { SmartGuideLine } from "@/features/editor/smart-guides";

type CanvasSmartGuidesProps = {
  lines: SmartGuideLine[];
};

export function CanvasSmartGuides({ lines }: CanvasSmartGuidesProps) {
  if (lines.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      aria-hidden="true"
    >
      {lines.map((line) => (
        <div
          key={`${line.orientation}-${line.position}`}
          className={
            line.orientation === "vertical"
              ? "absolute top-0 h-full border-l border-fuchsia-500"
              : "absolute left-0 w-full border-t border-fuchsia-500"
          }
          style={
            line.orientation === "vertical"
              ? { left: line.position }
              : { top: line.position }
          }
        />
      ))}
    </div>
  );
}
