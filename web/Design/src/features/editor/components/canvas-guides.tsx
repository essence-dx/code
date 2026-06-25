"use client";

type CanvasGuidesProps = {
  width: number;
  height: number;
};

const rulerStep = 200;
const safeMarginRatio = 0.08;

export function CanvasGuides({ width, height }: CanvasGuidesProps) {
  const horizontalTicks = buildTicks(width);
  const verticalTicks = buildTicks(height);
  const safeMarginX = Math.round(width * safeMarginRatio);
  const safeMarginY = Math.round(height * safeMarginRatio);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
    >
      <div
        className="absolute border border-dashed border-amber-400/80"
        style={{
          left: safeMarginX,
          top: safeMarginY,
          width: width - safeMarginX * 2,
          height: height - safeMarginY * 2,
        }}
      />
      <div className="absolute left-1/2 top-0 h-full border-l border-sky-400/70" />
      <div className="absolute left-0 top-1/2 w-full border-t border-sky-400/70" />

      <div className="absolute left-0 top-0 h-6 w-full border-b border-border/70 bg-background/80">
        {horizontalTicks.map((tick) => (
          <div
            key={`x-${tick}`}
            className="absolute top-0 h-6 border-l border-foreground/40 pl-1 text-[10px] leading-6 text-foreground/70"
            style={{ left: tick }}
          >
            {tick}
          </div>
        ))}
      </div>

      <div className="absolute left-0 top-0 h-full w-8 border-r border-border/70 bg-background/80">
        {verticalTicks.map((tick) => (
          <div
            key={`y-${tick}`}
            className="absolute left-0 w-8 border-t border-foreground/40 pt-0.5 text-center text-[10px] leading-none text-foreground/70"
            style={{ top: tick }}
          >
            {tick}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTicks(size: number) {
  const ticks: number[] = [];

  for (let tick = 0; tick <= size; tick += rulerStep) {
    ticks.push(tick);
  }

  return ticks;
}
