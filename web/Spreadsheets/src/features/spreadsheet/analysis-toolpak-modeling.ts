import {
  createCorrelationOutput,
  createRegressionOutput,
} from "@/features/spreadsheet/analysis-toolpak-regression";
import { writeAnalysisTableToDocument } from "@/features/spreadsheet/analysis-toolpak-output";
import {
  createTablePlan,
  getAnalysisColumns,
  type AnalysisPlanContext,
} from "@/features/spreadsheet/analysis-toolpak-plan-utils";
import type { AnalysisTablePlan } from "@/features/spreadsheet/analysis-toolpak-types";
import type { WorkbookDocument } from "@/features/workbooks/types";

export function createCorrelationPlan({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext): { error: string; plan?: never } | { error: null; plan: AnalysisTablePlan } {
  const result = getAnalysisColumns({ computedValues, document, sourceRange });

  if (result.error) {
    return { error: result.error };
  }

  const output = createCorrelationOutput(result.columns);

  return createTablePlan({
    columnCount: output.headers.length,
    document,
    output,
    outputError: "There is not enough worksheet space for correlation output.",
    sourceRange,
  });
}

export function createRegressionPlan({
  computedValues,
  document,
  sourceRange,
}: AnalysisPlanContext): { error: string; plan?: never } | { error: null; plan: AnalysisTablePlan } {
  const result = getAnalysisColumns({ computedValues, document, sourceRange });

  if (result.error) {
    return { error: result.error };
  }

  const output = createRegressionOutput(result.columns[0]!, result.columns[1]!);

  if ("error" in output) {
    return { error: output.error };
  }

  return createTablePlan({
    columnCount: output.headers.length,
    document,
    output,
    outputError: "There is not enough worksheet space for regression output.",
    sourceRange,
  });
}

export function writeCorrelationToDocument(
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

export function writeRegressionToDocument(
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
