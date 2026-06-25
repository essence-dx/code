import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import {
  createAnalysisOutputRange,
  getNumericColumnSeriesFromRange,
  getNumericValuesFromRange,
} from "@/features/spreadsheet/analysis-toolpak-output";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { WorkbookDocument } from "@/features/workbooks/types";
import type { AnalysisTablePlan } from "@/features/spreadsheet/analysis-toolpak-types";

export type AnalysisPlanContext = {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  sourceRange: CellRange;
};

export function getAnalysisValues({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext) {
  const values = getNumericValuesFromRange({
    computedValues,
    range: sourceRange,
    sheet: getActiveSheet(document),
  });

  if (values.length === 0) {
    return { error: "Select a range with at least one numeric value.", values };
  }

  return { error: null, values };
}

export function getAnalysisColumns({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext) {
  const columns = getNumericColumnSeriesFromRange({
    computedValues,
    range: sourceRange,
    sheet: getActiveSheet(document),
  });

  if (columns.length < 2) {
    return { columns, error: "Select at least two numeric columns." };
  }

  return { columns, error: null };
}

export function getOutputRange({
  columnCount,
  document,
  outputError,
  rowCount,
  sourceRange,
}: {
  columnCount: number;
  document: WorkbookDocument;
  outputError: string;
  rowCount: number;
  sourceRange: CellRange;
}) {
  const outputRange = createAnalysisOutputRange(
    getActiveSheet(document),
    sourceRange,
    rowCount,
    columnCount,
  );

  return outputRange ? { error: null, outputRange } : { error: outputError };
}

export function createTablePlan({
  columnCount,
  document,
  output,
  outputError,
  sourceRange,
}: {
  columnCount: number;
  document: WorkbookDocument;
  output: { headers: string[]; rows: string[][] };
  outputError: string;
  sourceRange: CellRange;
}): { error: string; plan?: never } | { error: null; plan: AnalysisTablePlan } {
  const range = getOutputRange({
    columnCount,
    document,
    outputError,
    rowCount: output.rows.length,
    sourceRange,
  });

  if (range.error || !range.outputRange) {
    return { error: range.error };
  }

  return {
    error: null,
    plan: {
      ...output,
      outputRange: range.outputRange,
    },
  };
}
