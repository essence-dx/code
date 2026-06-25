import { formatAnalysisNumber } from "@/features/spreadsheet/analysis-toolpak-statistics";
import { writeAnalysisTableToDocument } from "@/features/spreadsheet/analysis-toolpak-output";
import {
  getAnalysisValues,
  getOutputRange,
  type AnalysisPlanContext,
} from "@/features/spreadsheet/analysis-toolpak-plan-utils";
import type { AnalysisTablePlan } from "@/features/spreadsheet/analysis-toolpak-types";
import type { WorkbookDocument } from "@/features/workbooks/types";

const movingAveragePeriod = 3;

function getMovingAverage(values: number[], endIndex: number) {
  const startIndex = endIndex - movingAveragePeriod + 1;

  if (startIndex < 0) {
    return null;
  }

  const windowValues = values.slice(startIndex, endIndex + 1);

  return (
    windowValues.reduce((total, value) => total + value, 0) /
    movingAveragePeriod
  );
}

function createMovingAverageRows(values: number[]) {
  return values.map((value, index) => {
    const movingAverage = getMovingAverage(values, index);

    return [
      String(index + 1),
      formatAnalysisNumber(value),
      movingAverage === null ? "" : formatAnalysisNumber(movingAverage),
      movingAverage === null ? "" : formatAnalysisNumber(value - movingAverage),
    ];
  });
}

export function createMovingAveragePlan({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext):
  | { error: string; plan?: never }
  | { error: null; plan: AnalysisTablePlan } {
  const result = getAnalysisValues({ computedValues, document, sourceRange });

  if (result.error) {
    return { error: result.error };
  }

  if (result.values.length < movingAveragePeriod) {
    return {
      error: `Moving average needs at least ${movingAveragePeriod} numeric values.`,
    };
  }

  const rows = createMovingAverageRows(result.values);
  const output = getOutputRange({
    columnCount: 4,
    document,
    outputError: "There is not enough worksheet space for moving average output.",
    rowCount: rows.length,
    sourceRange,
  });

  if (output.error || !output.outputRange) {
    return { error: output.error };
  }

  return {
    error: null,
    plan: {
      headers: ["Period", "Value", "Moving Average (3)", "Error"],
      outputRange: output.outputRange,
      rows,
    },
  };
}

export function writeMovingAverageToDocument(
  document: WorkbookDocument,
  plan: AnalysisTablePlan,
) {
  return writeAnalysisTableToDocument({
    document,
    headers: plan.headers,
    outputRange: plan.outputRange,
    rows: plan.rows,
  });
}
