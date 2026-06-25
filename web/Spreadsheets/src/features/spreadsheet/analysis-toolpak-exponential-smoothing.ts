import { formatAnalysisNumber } from "@/features/spreadsheet/analysis-toolpak-statistics";
import { writeAnalysisTableToDocument } from "@/features/spreadsheet/analysis-toolpak-output";
import {
  getAnalysisValues,
  getOutputRange,
  type AnalysisPlanContext,
} from "@/features/spreadsheet/analysis-toolpak-plan-utils";
import type { AnalysisTablePlan } from "@/features/spreadsheet/analysis-toolpak-types";
import type { WorkbookDocument } from "@/features/workbooks/types";

const smoothingFactor = 0.3;

function createSmoothedValues(values: number[]) {
  const smoothedValues: number[] = [];

  values.forEach((value, index) => {
    if (index === 0) {
      smoothedValues.push(value);
      return;
    }

    const previousSmoothedValue = smoothedValues[index - 1] ?? value;

    smoothedValues.push(
      smoothingFactor * value + (1 - smoothingFactor) * previousSmoothedValue,
    );
  });

  return smoothedValues;
}

function createExponentialSmoothingRows(values: number[]) {
  const smoothedValues = createSmoothedValues(values);

  return values.map((value, index) => {
    const smoothedValue = smoothedValues[index] ?? value;

    return [
      String(index + 1),
      formatAnalysisNumber(value),
      formatAnalysisNumber(smoothedValue),
      formatAnalysisNumber(value - smoothedValue),
    ];
  });
}

export function createExponentialSmoothingPlan({
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

  if (result.values.length < 2) {
    return {
      error: "Exponential smoothing needs at least two numeric values.",
    };
  }

  const rows = createExponentialSmoothingRows(result.values);
  const output = getOutputRange({
    columnCount: 4,
    document,
    outputError: "There is not enough worksheet space for smoothing output.",
    rowCount: rows.length,
    sourceRange,
  });

  if (output.error || !output.outputRange) {
    return { error: output.error };
  }

  return {
    error: null,
    plan: {
      headers: ["Period", "Value", "Smoothed (0.3)", "Error"],
      outputRange: output.outputRange,
      rows,
    },
  };
}

export function writeExponentialSmoothingToDocument(
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
