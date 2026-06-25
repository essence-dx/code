import type { ChartRange } from "@/features/workbooks/types";

export type AnalysisToolpakResult = {
  message: string;
  outputRange?: ChartRange;
  rowCount: number;
  success: boolean;
};

export type AnalysisTablePlan = {
  headers: string[];
  outputRange: ChartRange;
  rows: string[][];
};
