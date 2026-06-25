"use client";

export const variantChartWidth = 280;
export const variantChartHeight = 144;
export const variantChartPadding = 12;

export function scaleLinear(
  value: number,
  min: number,
  max: number,
  start: number,
  end: number,
) {
  const span = max - min || 1;

  return start + ((value - min) / span) * (end - start);
}

export function variantGridlines(show: boolean) {
  if (!show) {
    return null;
  }

  return [0.25, 0.5, 0.75].map((level) => (
    <line
      key={level}
      x1={variantChartPadding}
      y1={variantChartHeight * level}
      x2={variantChartWidth - variantChartPadding}
      y2={variantChartHeight * level}
      stroke="currentColor"
      strokeOpacity="0.12"
    />
  ));
}

export function chartColor(colors: string[], index: number) {
  return colors[index % colors.length] ?? "currentColor";
}
