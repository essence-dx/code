export type DescriptiveStatisticsRow = {
  label: string;
  value: string;
};

export function parseNumericCellValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isAccountingNegative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const withoutAccounting = isAccountingNegative
    ? trimmed.slice(1, -1)
    : trimmed;
  const normalized = withoutAccounting.replace(/[$,\s]/g, "");
  const isPercent = normalized.endsWith("%");
  const numericText = isPercent ? normalized.slice(0, -1) : normalized;
  const numericValue = Number(numericText);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const signedValue = isAccountingNegative ? -numericValue : numericValue;

  return isPercent ? signedValue / 100 : signedValue;
}

export function formatAnalysisNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toPrecision(12)));
}

function getMedian(sortedValues: number[]) {
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] ?? 0;
  }

  return (
    ((sortedValues[middleIndex - 1] ?? 0) + (sortedValues[middleIndex] ?? 0)) /
    2
  );
}

function getMode(values: number[]) {
  const counts = new Map<string, { count: number; value: number }>();

  values.forEach((value) => {
    const key = value.toPrecision(12);
    const existing = counts.get(key);

    counts.set(key, {
      count: (existing?.count ?? 0) + 1,
      value,
    });
  });

  let mode: { count: number; value: number } | null = null;

  for (const entry of counts.values()) {
    if (!mode || entry.count > mode.count) {
      mode = entry;
    }
  }

  return mode && mode.count > 1 ? mode.value : null;
}

function getSampleVariance(values: number[], mean: number) {
  if (values.length < 2) {
    return null;
  }

  return (
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (values.length - 1)
  );
}

function getSkewness(values: number[], mean: number, standardDeviation: number) {
  const count = values.length;

  if (count < 3 || standardDeviation === 0) {
    return null;
  }

  const standardizedTotal = values.reduce(
    (total, value) => total + ((value - mean) / standardDeviation) ** 3,
    0,
  );

  return (count / ((count - 1) * (count - 2))) * standardizedTotal;
}

function getKurtosis(values: number[], mean: number, standardDeviation: number) {
  const count = values.length;

  if (count < 4 || standardDeviation === 0) {
    return null;
  }

  const standardizedTotal = values.reduce(
    (total, value) => total + ((value - mean) / standardDeviation) ** 4,
    0,
  );
  const sampleAdjustment =
    (count * (count + 1)) / ((count - 1) * (count - 2) * (count - 3));
  const normalAdjustment =
    (3 * (count - 1) ** 2) / ((count - 2) * (count - 3));

  return sampleAdjustment * standardizedTotal - normalAdjustment;
}

function formatMaybeNumber(value: number | null) {
  return value === null ? "-" : formatAnalysisNumber(value);
}

export function createDescriptiveStatisticsRows(values: number[]) {
  const sortedValues = [...values].sort((left, right) => left - right);
  const count = values.length;
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / count;
  const variance = getSampleVariance(values, mean);
  const standardDeviation = variance === null ? null : Math.sqrt(variance);
  const mode = getMode(values);
  const minimum = sortedValues[0] ?? 0;
  const maximum = sortedValues[sortedValues.length - 1] ?? 0;
  const numericStandardDeviation = standardDeviation ?? 0;

  return [
    { label: "Mean", value: formatAnalysisNumber(mean) },
    {
      label: "Standard Error",
      value:
        standardDeviation === null
          ? "-"
          : formatAnalysisNumber(standardDeviation / Math.sqrt(count)),
    },
    { label: "Median", value: formatAnalysisNumber(getMedian(sortedValues)) },
    { label: "Mode", value: mode === null ? "-" : formatAnalysisNumber(mode) },
    {
      label: "Standard Deviation",
      value: formatMaybeNumber(standardDeviation),
    },
    { label: "Sample Variance", value: formatMaybeNumber(variance) },
    {
      label: "Kurtosis",
      value: formatMaybeNumber(
        standardDeviation === null
          ? null
          : getKurtosis(values, mean, numericStandardDeviation),
      ),
    },
    {
      label: "Skewness",
      value: formatMaybeNumber(
        standardDeviation === null
          ? null
          : getSkewness(values, mean, numericStandardDeviation),
      ),
    },
    { label: "Range", value: formatAnalysisNumber(maximum - minimum) },
    { label: "Minimum", value: formatAnalysisNumber(minimum) },
    { label: "Maximum", value: formatAnalysisNumber(maximum) },
    { label: "Sum", value: formatAnalysisNumber(sum) },
    { label: "Count", value: formatAnalysisNumber(count) },
  ] satisfies DescriptiveStatisticsRow[];
}
