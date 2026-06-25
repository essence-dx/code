import { formatAnalysisNumber } from "@/features/spreadsheet/analysis-toolpak-statistics";
import { writeAnalysisTableToDocument } from "@/features/spreadsheet/analysis-toolpak-output";
import {
  getAnalysisValues,
  getOutputRange,
  type AnalysisPlanContext,
} from "@/features/spreadsheet/analysis-toolpak-plan-utils";
import type { AnalysisTablePlan } from "@/features/spreadsheet/analysis-toolpak-types";
import type { WorkbookDocument } from "@/features/workbooks/types";

const forecastHorizon = 6;
const confidenceMultiplier = 1.96;

function getMean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getLinearTrend(values: number[]) {
  const xValues = values.map((_, index) => index + 1);
  const meanX = getMean(xValues);
  const meanY = getMean(values);
  const sxx = xValues.reduce((total, value) => total + (value - meanX) ** 2, 0);
  const sxy = values.reduce(
    (total, value, index) => total + (xValues[index] - meanX) * (value - meanY),
    0,
  );
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;

  return { intercept, slope };
}

function getStandardError(values: number[], intercept: number, slope: number) {
  if (values.length < 3) {
    return null;
  }

  const squaredErrors = values.reduce((total, value, index) => {
    const period = index + 1;
    const forecast = intercept + slope * period;

    return total + (value - forecast) ** 2;
  }, 0);

  return Math.sqrt(squaredErrors / (values.length - 2));
}

function createForecastRows(values: number[]) {
  const { intercept, slope } = getLinearTrend(values);
  const standardError = getStandardError(values, intercept, slope);
  const totalPeriods = values.length + forecastHorizon;

  return Array.from({ length: totalPeriods }, (_, index) => {
    const period = index + 1;
    const actualValue = values[index];
    const forecast = intercept + slope * period;
    const margin =
      standardError === null ? null : standardError * confidenceMultiplier;

    return [
      String(period),
      actualValue === undefined ? "" : formatAnalysisNumber(actualValue),
      formatAnalysisNumber(forecast),
      margin === null ? "" : formatAnalysisNumber(forecast - margin),
      margin === null ? "" : formatAnalysisNumber(forecast + margin),
    ];
  });
}

export function createForecastSheetPlan({
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
    return { error: "Forecast Sheet needs at least two numeric values." };
  }

  const rows = createForecastRows(result.values);
  const output = getOutputRange({
    columnCount: 5,
    document,
    outputError: "There is not enough worksheet space for forecast output.",
    rowCount: rows.length,
    sourceRange,
  });

  if (output.error || !output.outputRange) {
    return { error: output.error };
  }

  return {
    error: null,
    plan: {
      headers: ["Period", "Actual", "Forecast", "Lower 95%", "Upper 95%"],
      outputRange: output.outputRange,
      rows,
    },
  };
}

export function writeForecastSheetToDocument(
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
