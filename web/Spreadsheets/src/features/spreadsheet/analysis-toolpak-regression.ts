import { formatAnalysisNumber } from "@/features/spreadsheet/analysis-toolpak-statistics";
import type { NumericColumnSeries } from "@/features/spreadsheet/analysis-toolpak-output";

export type RegressionOutput = {
  headers: string[];
  rows: string[][];
};

export type CorrelationOutput = RegressionOutput;

function getPairedValues(
  left: NumericColumnSeries,
  right: NumericColumnSeries,
) {
  const pairs: { x: number; y: number }[] = [];
  const rowCount = Math.max(left.valuesByRow.length, right.valuesByRow.length);

  for (let index = 0; index < rowCount; index += 1) {
    const x = left.valuesByRow[index];
    const y = right.valuesByRow[index];

    if (x !== null && y !== null && x !== undefined && y !== undefined) {
      pairs.push({ x, y });
    }
  }

  return pairs;
}

function getMean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getCorrelationFromPairs(pairs: { x: number; y: number }[]) {
  if (pairs.length < 2) {
    return null;
  }

  const xValues = pairs.map((pair) => pair.x);
  const yValues = pairs.map((pair) => pair.y);
  const meanX = getMean(xValues);
  const meanY = getMean(yValues);
  const covariance = pairs.reduce(
    (total, pair) => total + (pair.x - meanX) * (pair.y - meanY),
    0,
  );
  const xVariance = xValues.reduce(
    (total, value) => total + (value - meanX) ** 2,
    0,
  );
  const yVariance = yValues.reduce(
    (total, value) => total + (value - meanY) ** 2,
    0,
  );
  const denominator = Math.sqrt(xVariance * yVariance);

  return denominator === 0 ? null : covariance / denominator;
}

function formatMaybeNumber(value: number | null) {
  return value === null ? "-" : formatAnalysisNumber(value);
}

export function createCorrelationOutput(columns: NumericColumnSeries[]) {
  const headers = ["Variable", ...columns.map((column) => column.label)];
  const rows = columns.map((leftColumn) => [
    leftColumn.label,
    ...columns.map((rightColumn) =>
      leftColumn === rightColumn
        ? "1"
        : formatMaybeNumber(
            getCorrelationFromPairs(getPairedValues(leftColumn, rightColumn)),
          ),
    ),
  ]);

  return { headers, rows } satisfies CorrelationOutput;
}

export function createRegressionOutput(
  xColumn: NumericColumnSeries,
  yColumn: NumericColumnSeries,
): { error: string; headers?: never; rows?: never } | RegressionOutput {
  const pairs = getPairedValues(xColumn, yColumn);

  if (pairs.length < 2) {
    return { error: "Regression needs at least two paired numeric rows." };
  }

  const xValues = pairs.map((pair) => pair.x);
  const yValues = pairs.map((pair) => pair.y);
  const meanX = getMean(xValues);
  const meanY = getMean(yValues);
  const sxx = xValues.reduce((total, value) => total + (value - meanX) ** 2, 0);
  const sxy = pairs.reduce(
    (total, pair) => total + (pair.x - meanX) * (pair.y - meanY),
    0,
  );

  if (sxx === 0) {
    return { error: "Regression X values must not all be the same." };
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = pairs.map((pair) => pair.y - (intercept + slope * pair.x));
  const sse = residuals.reduce((total, value) => total + value ** 2, 0);
  const sst = yValues.reduce((total, value) => total + (value - meanY) ** 2, 0);
  const rSquared = sst === 0 ? 0 : 1 - sse / sst;
  const correlation = getCorrelationFromPairs(pairs);
  const standardError =
    pairs.length > 2 ? Math.sqrt(sse / (pairs.length - 2)) : null;
  const adjustedRSquared =
    pairs.length > 2
      ? 1 - (1 - rSquared) * ((pairs.length - 1) / (pairs.length - 2))
      : null;
  const slopeStandardError =
    standardError === null ? null : standardError / Math.sqrt(sxx);
  const interceptStandardError =
    standardError === null
      ? null
      : standardError * Math.sqrt(1 / pairs.length + (meanX ** 2) / sxx);

  return {
    headers: ["Metric", "Value", "Std Error", "t Stat"],
    rows: [
      ["Y Range", yColumn.label, "", ""],
      ["X Range", xColumn.label, "", ""],
      ["Observations", formatAnalysisNumber(pairs.length), "", ""],
      [
        "Multiple R",
        formatMaybeNumber(correlation ? Math.abs(correlation) : correlation),
        "",
        "",
      ],
      ["R Square", formatAnalysisNumber(rSquared), "", ""],
      ["Adjusted R Square", formatMaybeNumber(adjustedRSquared), "", ""],
      ["Standard Error", formatMaybeNumber(standardError), "", ""],
      [
        "Intercept",
        formatAnalysisNumber(intercept),
        formatMaybeNumber(interceptStandardError),
        formatMaybeNumber(
          interceptStandardError ? intercept / interceptStandardError : null,
        ),
      ],
      [
        xColumn.label,
        formatAnalysisNumber(slope),
        formatMaybeNumber(slopeStandardError),
        formatMaybeNumber(
          slopeStandardError ? slope / slopeStandardError : null,
        ),
      ],
    ],
  } satisfies RegressionOutput;
}
