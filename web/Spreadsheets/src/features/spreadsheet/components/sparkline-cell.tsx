"use client";

import { getSparklineValues } from "@/features/spreadsheet/sparklines";
import type {
  SheetData,
  SparklineDefinition,
} from "@/features/workbooks/types";

export function SparklineCell({
  sheet,
  computedValues,
  sparkline,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  sparkline: SparklineDefinition;
}) {
  const values = getSparklineValues({ sheet, computedValues, sparkline });
  const width = 96;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  if (values.length < 2) {
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Line sparkline"
      className="h-full w-full text-primary"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
