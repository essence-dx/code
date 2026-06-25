import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import {
  cloneDocument,
  getActiveSheet,
} from "@/features/spreadsheet/state/document-state";
import { updateCellRaw } from "@/features/spreadsheet/state/edit-state";
import type { WorkbookDocument } from "@/features/workbooks/types";

const defaultMaxIterations = 40;
const defaultTolerance = 0.000001;
const maxChangingValue = 1_000_000_000_000;

export type GoalSeekRequest = {
  changingCellKey: string;
  targetCellKey: string;
  targetValue: number;
};

export type GoalSeekResult = {
  achievedValue?: number;
  changingCellKey: string;
  changingValue?: number;
  iterations: number;
  message: string;
  success: boolean;
  targetCellKey: string;
  targetValue: number;
};

type GoalSeekInput = GoalSeekRequest & {
  activeSheetId: string;
  document: WorkbookDocument;
  maxIterations?: number;
  tolerance?: number;
};

function normalizeCellReference(value: string) {
  const position = parseCellKey(value);

  return position ? cellKey(position.rowIndex, position.columnIndex) : null;
}

function parseNumericValue(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "").replace(/%$/, "");
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatGoalSeekValue(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}

function evaluateTargetAt(input: {
  activeSheetId: string;
  changingCellKey: string;
  changingValue: number;
  document: WorkbookDocument;
  targetCellKey: string;
}) {
  const draft = cloneDocument(input.document);

  draft.activeSheetId = input.activeSheetId;

  const sheet = getActiveSheet(draft);
  const changingPosition = parseCellKey(input.changingCellKey);

  if (!changingPosition) {
    return null;
  }

  updateCellRaw(
    sheet,
    changingPosition,
    formatGoalSeekValue(input.changingValue),
  );

  const values = evaluateWorkbook(draft, input.activeSheetId);

  return parseNumericValue(values[input.targetCellKey] ?? "");
}

function createFailureResult(
  input: GoalSeekInput,
  message: string,
  iterations = 0,
): GoalSeekResult {
  return {
    changingCellKey: normalizeCellReference(input.changingCellKey) ?? input.changingCellKey,
    iterations,
    message,
    success: false,
    targetCellKey: normalizeCellReference(input.targetCellKey) ?? input.targetCellKey,
    targetValue: input.targetValue,
  };
}

function isUsableChangingValue(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= maxChangingValue;
}

export function solveGoalSeek(input: GoalSeekInput): GoalSeekResult {
  const targetCellKey = normalizeCellReference(input.targetCellKey);
  const changingCellKey = normalizeCellReference(input.changingCellKey);
  const sheet = input.document.sheets.find(
    (item) => item.id === input.activeSheetId,
  );

  if (!targetCellKey || !changingCellKey || !sheet) {
    return createFailureResult(input, "Use valid active-sheet cell references.");
  }

  if (targetCellKey === changingCellKey) {
    return createFailureResult(
      input,
      "The target cell and changing cell must be different.",
    );
  }

  const targetCell = sheet.cells[targetCellKey];
  const changingCell = sheet.cells[changingCellKey];

  if (!targetCell?.raw.startsWith("=")) {
    return createFailureResult(input, "The target cell must contain a formula.");
  }

  if (changingCell?.raw.startsWith("=")) {
    return createFailureResult(input, "The changing cell must be an input value.");
  }

  if (!Number.isFinite(input.targetValue)) {
    return createFailureResult(input, "Enter a numeric target value.");
  }

  const maxIterations = input.maxIterations ?? defaultMaxIterations;
  const tolerance = input.tolerance ?? defaultTolerance;
  const initialValue = changingCell?.raw
    ? (parseNumericValue(changingCell.raw) ?? 0)
    : 0;
  let bestChangingValue = initialValue;
  let bestAchievedValue = evaluateTargetAt({
    activeSheetId: input.activeSheetId,
    changingCellKey,
    changingValue: initialValue,
    document: input.document,
    targetCellKey,
  });

  if (bestAchievedValue === null) {
    return createFailureResult(
      input,
      "The target formula must evaluate to a numeric value.",
    );
  }

  let bestDelta = bestAchievedValue - input.targetValue;

  if (Math.abs(bestDelta) <= tolerance) {
    return {
      achievedValue: bestAchievedValue,
      changingCellKey,
      changingValue: bestChangingValue,
      iterations: 0,
      message: "Goal Seek already matches the target.",
      success: true,
      targetCellKey,
      targetValue: input.targetValue,
    };
  }

  let previousX = initialValue;
  let previousDelta = bestDelta;
  let currentX =
    initialValue + (initialValue === 0 ? 1 : Math.sign(initialValue) || 1) *
    Math.max(1, Math.abs(initialValue) * 0.1);
  let step = Math.max(1, Math.abs(initialValue) * 0.25);

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const achievedValue = evaluateTargetAt({
      activeSheetId: input.activeSheetId,
      changingCellKey,
      changingValue: currentX,
      document: input.document,
      targetCellKey,
    });

    if (achievedValue === null) {
      return createFailureResult(
        input,
        "Goal Seek stopped because the target formula returned a non-numeric value.",
        iteration,
      );
    }

    const currentDelta = achievedValue - input.targetValue;

    if (Math.abs(currentDelta) < Math.abs(bestDelta)) {
      bestChangingValue = currentX;
      bestAchievedValue = achievedValue;
      bestDelta = currentDelta;
    }

    if (Math.abs(currentDelta) <= tolerance) {
      return {
        achievedValue,
        changingCellKey,
        changingValue: currentX,
        iterations: iteration,
        message: "Goal Seek found a matching input value.",
        success: true,
        targetCellKey,
        targetValue: input.targetValue,
      };
    }

    const denominator = currentDelta - previousDelta;
    let nextX =
      Math.abs(denominator) > Number.EPSILON
        ? currentX - currentDelta * ((currentX - previousX) / denominator)
        : currentX + step * (iteration % 2 === 0 ? 1 : -1);

    if (!isUsableChangingValue(nextX) || Math.abs(nextX - currentX) < tolerance) {
      step *= 1.5;
      nextX = currentX + step * (iteration % 2 === 0 ? 1 : -1);
    }

    if (!isUsableChangingValue(nextX)) {
      break;
    }

    previousX = currentX;
    previousDelta = currentDelta;
    currentX = nextX;
  }

  if (Math.abs(bestDelta) <= Math.max(tolerance * 10, 0.0001)) {
    return {
      achievedValue: bestAchievedValue,
      changingCellKey,
      changingValue: bestChangingValue,
      iterations: maxIterations,
      message: "Goal Seek found a close matching input value.",
      success: true,
      targetCellKey,
      targetValue: input.targetValue,
    };
  }

  return {
    achievedValue: bestAchievedValue,
    changingCellKey,
    changingValue: bestChangingValue,
    iterations: maxIterations,
    message: "Goal Seek could not converge on the target value.",
    success: false,
    targetCellKey,
    targetValue: input.targetValue,
  };
}
