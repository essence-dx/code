"use client";

type CanvasPrintMarksProps = {
  width: number;
  height: number;
};

const cropMarkLength = 36;
const bleedInset = 18;

export function CanvasPrintMarks({ width, height }: CanvasPrintMarksProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden="true"
    >
      <div
        className="absolute border border-dashed border-rose-500/70"
        style={{
          left: bleedInset,
          top: bleedInset,
          width: width - bleedInset * 2,
          height: height - bleedInset * 2,
        }}
      />
      <CropCorner x={0} y={0} horizontal="right" vertical="down" />
      <CropCorner x={width} y={0} horizontal="left" vertical="down" />
      <CropCorner x={0} y={height} horizontal="right" vertical="up" />
      <CropCorner x={width} y={height} horizontal="left" vertical="up" />
    </div>
  );
}

function CropCorner({
  x,
  y,
  horizontal,
  vertical,
}: {
  x: number;
  y: number;
  horizontal: "left" | "right";
  vertical: "up" | "down";
}) {
  return (
    <>
      <div
        className="absolute border-t border-foreground/80"
        style={{
          left: horizontal === "right" ? x : x - cropMarkLength,
          top: y,
          width: cropMarkLength,
        }}
      />
      <div
        className="absolute border-l border-foreground/80"
        style={{
          left: x,
          top: vertical === "down" ? y : y - cropMarkLength,
          height: cropMarkLength,
        }}
      />
    </>
  );
}
