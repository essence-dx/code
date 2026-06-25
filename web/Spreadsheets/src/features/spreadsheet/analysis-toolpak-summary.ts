import {
  createHistogramRows,
  type HistogramRow,
} from "@/features/spreadsheet/analysis-toolpak-histogram";
import {
  createDescriptiveStatisticsRows,
  type DescriptiveStatisticsRow,
} from "@/features/spreadsheet/analysis-toolpak-statistics";
import { writeAnalysisTableToDocument } from "@/features/spreadsheet/analysis-toolpak-output";
import {
  getAnalysisValues,
  getOutputRange,
  type AnalysisPlanContext,
} from "@/features/spreadsheet/analysis-toolpak-plan-utils";
import type { ChartRange, WorkbookDocument } from "@/features/workbooks/types";

type DescriptiveStatisticsPlan = {
  outputRange: ChartRange;
  rows: DescriptiveStatisticsRow[];
};

type HistogramPlan = {
  outputRange: ChartRange;
  rows: HistogramRow[];
};

export function createDescriptiveStatisticsPlan({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext): { error: string; plan?: never } | { error: null; plan: DescriptiveStatisticsPlan } {
  const result = getAnalysisValues({ computedValues, document, sourceRange });

  if (result.error) {
    return { error: result.error };
  }

  const rows = createDescriptiveStatisticsRows(result.values);
  const output = getOutputRange({
    columnCount: 2,
    document,
    outputError: "There is not enough worksheet space for descriptive statistics.",
    rowCount: rows.length,
    sourceRange,
  });

  if (output.error || !output.outputRange) {
    return { error: output.error };
  }

  return {
    error: null,
    plan: {
      outputRange: output.outputRange,
      rows,
    },
  };
}

export function createHistogramPlan({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext): { error: string; plan?: never } | { error: null; plan: HistogramPlan } {
  const result = getAnalysisValues({ computedValues, document, sourceRange });

  if (result.error) {
    return { error: result.error };
  }

  const rows = createHistogramRows(result.values);
  const output = getOutputRange({
    columnCount: 3,
    document,
    outputError: "There is not enough worksheet space for histogram output.",
    rowCount: rows.length,
    sourceRange,
  });

  if (output.error || !output.outputRange) {
    return { error: output.error };
  }

  return {
    error: null,
    plan: {
      outputRange: output.outputRange,
      rows,
    },
  };
}

export function writeDescriptiveStatisticsToDocument(
  document: WorkbookDocument,
  plan: DescriptiveStatisticsPlan,
) {
  return writeAnalysisTableToDocument({
    document,
    headers: ["Metric", "Value"],
    outputRange: plan.outputRange,
    rows: plan.rows.map((row) => [row.label, row.value]),
  });
}

export function writeHistogramToDocument(
  document: WorkbookDocument,
  plan: HistogramPlan,
) {
  return writeAnalysisTableToDocument({
    document,
    headers: ["Bin", "Frequency", "Cumulative %"],
    outputRange: plan.outputRange,
    rows: plan.rows.map((row) => [
      row.bin,
      row.frequency,
      row.cumulativePercent,
    ]),
  });
}
