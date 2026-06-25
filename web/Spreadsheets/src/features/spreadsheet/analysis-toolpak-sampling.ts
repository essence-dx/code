import { formatAnalysisNumber } from "@/features/spreadsheet/analysis-toolpak-statistics";
import { writeAnalysisTableToDocument } from "@/features/spreadsheet/analysis-toolpak-output";
import {
  getAnalysisValues,
  getOutputRange,
  type AnalysisPlanContext,
} from "@/features/spreadsheet/analysis-toolpak-plan-utils";
import type { AnalysisTablePlan } from "@/features/spreadsheet/analysis-toolpak-types";
import type { WorkbookDocument } from "@/features/workbooks/types";

type IndexedValue = {
  sourceIndex: number;
  value: number;
};

function getSampleSize(valueCount: number) {
  return Math.min(20, Math.max(1, Math.ceil(Math.sqrt(valueCount))));
}

function getSystematicSample(values: number[], sampleSize: number) {
  const interval = Math.max(1, Math.floor(values.length / sampleSize));
  const sample: IndexedValue[] = [];

  for (
    let sourceIndex = 0;
    sourceIndex < values.length && sample.length < sampleSize;
    sourceIndex += interval
  ) {
    sample.push({
      sourceIndex,
      value: values[sourceIndex] ?? 0,
    });
  }

  return sample;
}

function createSeed(values: number[]) {
  return values.reduce((seed, value, index) => {
    const normalized = Math.round(Math.abs(value) * 1000);

    return (seed * 31 + normalized + index + 1) >>> 0;
  }, 2166136261);
}

function getNextSeed(seed: number) {
  return (1664525 * seed + 1013904223) >>> 0;
}

function getRandomSample(values: number[], sampleSize: number) {
  const available = values.map((value, sourceIndex) => ({ sourceIndex, value }));
  const sample: IndexedValue[] = [];
  let seed = createSeed(values);

  while (available.length > 0 && sample.length < sampleSize) {
    seed = getNextSeed(seed);

    const index = seed % available.length;
    const [entry] = available.splice(index, 1);

    if (entry) {
      sample.push(entry);
    }
  }

  return sample;
}

function createSamplingRows(values: number[]) {
  const sampleSize = getSampleSize(values.length);
  const systematicSample = getSystematicSample(values, sampleSize);
  const randomSample = getRandomSample(values, sampleSize);

  return [
    ...systematicSample.map((entry, index) => [
      "Systematic",
      String(index + 1),
      String(entry.sourceIndex + 1),
      formatAnalysisNumber(entry.value),
    ]),
    ...randomSample.map((entry, index) => [
      "Random",
      String(index + 1),
      String(entry.sourceIndex + 1),
      formatAnalysisNumber(entry.value),
    ]),
  ];
}

export function createSamplingPlan({
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

  const rows = createSamplingRows(result.values);
  const output = getOutputRange({
    columnCount: 4,
    document,
    outputError: "There is not enough worksheet space for sampling output.",
    rowCount: rows.length,
    sourceRange,
  });

  if (output.error || !output.outputRange) {
    return { error: output.error };
  }

  return {
    error: null,
    plan: {
      headers: ["Method", "Sample #", "Source Index", "Value"],
      outputRange: output.outputRange,
      rows,
    },
  };
}

export function writeSamplingToDocument(
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
