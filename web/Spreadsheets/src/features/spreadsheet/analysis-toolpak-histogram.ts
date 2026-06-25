import { formatAnalysisNumber } from "@/features/spreadsheet/analysis-toolpak-statistics";

export type HistogramRow = {
  bin: string;
  cumulativePercent: string;
  frequency: string;
};

function getAutomaticBinCount(valueCount: number) {
  if (valueCount <= 1) {
    return 1;
  }

  return Math.min(20, Math.max(2, Math.ceil(Math.log2(valueCount) + 1)));
}

function createEqualWidthBins(values: number[]) {
  const sortedValues = [...values].sort((left, right) => left - right);
  const minimum = sortedValues[0] ?? 0;
  const maximum = sortedValues[sortedValues.length - 1] ?? 0;

  if (minimum === maximum) {
    return [maximum];
  }

  const binCount = getAutomaticBinCount(values.length);
  const width = (maximum - minimum) / binCount;

  return Array.from({ length: binCount }, (_, index) => {
    if (index === binCount - 1) {
      return maximum;
    }

    return minimum + width * (index + 1);
  });
}

function getBinIndex(value: number, bins: number[]) {
  const index = bins.findIndex((bin) => value <= bin);

  return index === -1 ? bins.length - 1 : index;
}

export function createHistogramRows(values: number[]) {
  const bins = createEqualWidthBins(values);
  const frequencies = bins.map(() => 0);

  values.forEach((value) => {
    frequencies[getBinIndex(value, bins)] += 1;
  });

  let cumulativeCount = 0;

  return bins.map((bin, index) => {
    cumulativeCount += frequencies[index] ?? 0;

    return {
      bin: formatAnalysisNumber(bin),
      cumulativePercent: `${formatAnalysisNumber(
        (cumulativeCount / values.length) * 100,
      )}%`,
      frequency: String(frequencies[index] ?? 0),
    };
  }) satisfies HistogramRow[];
}
