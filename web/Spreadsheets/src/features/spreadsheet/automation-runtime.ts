import {
  deleteColumnsForRange,
  deleteRowsForRange,
  insertColumnsForRange,
  insertRowsForRange,
} from "@/features/spreadsheet/state/sheet-structure-state";
import { updateRangeCellStyle } from "@/features/spreadsheet/state/format-state";
import { updateRangeRaw } from "@/features/spreadsheet/state/edit-state";
import { sortRangeInSheet } from "@/features/spreadsheet/state/sort-state";
import { removeDuplicateRowsInRange } from "@/features/spreadsheet/state/duplicate-state";
import {
  getAutomationStepPermission,
  getAutomationScriptPermissions,
} from "@/features/workbooks/workbook-automation";
import type {
  CellStyle,
  SheetData,
  WorkbookAutomationPermission,
  WorkbookAutomationScript,
  WorkbookAutomationStep,
  WorkbookDocument,
} from "@/features/workbooks/types";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

export type WorkbookAutomationRunResult = {
  executedStepCount: number;
  messages: string[];
  skippedStepCount: number;
  status: "succeeded" | "failed";
};

export type WorkbookAutomationRunPolicy = {
  maxSteps?: number;
  permissions: WorkbookAutomationPermission[];
};

function hasPermission(
  policy: WorkbookAutomationRunPolicy,
  permission: WorkbookAutomationPermission,
) {
  return policy.permissions.includes(permission);
}

function clampRangeToSheet(range: CellRange, sheet: SheetData): CellRange {
  const startRowIndex = Math.min(
    Math.max(range.startRowIndex, 0),
    sheet.rowCount - 1,
  );
  const startColumnIndex = Math.min(
    Math.max(range.startColumnIndex, 0),
    sheet.columnCount - 1,
  );

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex: Math.min(
      Math.max(range.endRowIndex, startRowIndex),
      sheet.rowCount - 1,
    ),
    endColumnIndex: Math.min(
      Math.max(range.endColumnIndex, startColumnIndex),
      sheet.columnCount - 1,
    ),
  };
}

function getStepSheet(
  document: WorkbookDocument,
  step: WorkbookAutomationStep,
) {
  return (
    document.sheets.find((sheet) => sheet.id === step.targetSheetId) ??
    document.sheets.find((sheet) => sheet.id === document.activeSheetId) ??
    null
  );
}

function getStepRange(sheet: SheetData, step: WorkbookAutomationStep) {
  return clampRangeToSheet(
    step.targetRange ?? {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    },
    sheet,
  );
}

function extractColor(step: WorkbookAutomationStep) {
  const value = step.valuePreview || step.label;
  const match = value.match(/#[0-9a-f]{3,8}\b/i);

  return match?.[0];
}

function extractNumberFormat(step: WorkbookAutomationStep) {
  const match = step.label.match(/to\s+(.+)$/i);

  return match?.[1]?.trim();
}

function rawComputedValues(sheet: SheetData) {
  return Object.fromEntries(
    Object.entries(sheet.cells).map(([key, cell]) => [key, cell.raw]),
  );
}

function applyFormatStep(
  sheet: SheetData,
  range: CellRange,
  step: WorkbookAutomationStep,
) {
  const style: Partial<CellStyle> = {};

  if (step.command === "format.bold") {
    style.bold = true;
  } else if (step.command === "format.italic") {
    style.italic = true;
  } else if (step.command === "format.underline") {
    style.underline = true;
  } else if (step.command === "format.fill") {
    const color = extractColor(step);

    if (!color) {
      return false;
    }

    style.background = color;
  } else if (step.command === "format.textColor") {
    const color = extractColor(step);

    if (!color) {
      return false;
    }

    style.foreground = color;
  } else if (step.command === "format.number") {
    const numberFormat = extractNumberFormat(step);

    if (!numberFormat) {
      return false;
    }

    style.numberFormat = numberFormat as CellStyle["numberFormat"];
    style.customNumberFormat = undefined;
  } else {
    return false;
  }

  updateRangeCellStyle(sheet, range, style);
  return true;
}

function executeStep(input: {
  document: WorkbookDocument;
  step: WorkbookAutomationStep;
}) {
  const sheet = getStepSheet(input.document, input.step);

  if (!sheet) {
    return false;
  }

  const range = getStepRange(sheet, input.step);

  if (
    input.step.command === "cell.setValue" ||
    input.step.command === "range.setValue"
  ) {
    updateRangeRaw(sheet, range, input.step.valuePreview ?? "");
    return true;
  }

  if (input.step.command.startsWith("format.")) {
    return applyFormatStep(sheet, range, input.step);
  }

  if (input.step.command === "structure.insertRows") {
    insertRowsForRange(sheet, range);
    return true;
  }

  if (input.step.command === "structure.deleteRows") {
    deleteRowsForRange(sheet, range);
    return true;
  }

  if (input.step.command === "structure.insertColumns") {
    insertColumnsForRange(sheet, range);
    return true;
  }

  if (input.step.command === "structure.deleteColumns") {
    deleteColumnsForRange(sheet, range);
    return true;
  }

  if (input.step.command === "data.sortAsc" || input.step.command === "data.sortDesc") {
    sortRangeInSheet({
      sheet,
      range,
      direction: input.step.command === "data.sortAsc" ? "asc" : "desc",
      sortColumnIndex: range.startColumnIndex,
    });
    return true;
  }

  if (input.step.command === "data.removeDuplicates") {
    removeDuplicateRowsInRange({
      computedValues: rawComputedValues(sheet),
      range,
      sheet,
    });
    return true;
  }

  return false;
}

export function runWorkbookAutomationScript({
  document,
  policy,
  scriptId,
}: {
  document: WorkbookDocument;
  policy: WorkbookAutomationRunPolicy;
  scriptId: string;
}): WorkbookAutomationRunResult {
  const script = (document.automationScripts ?? []).find(
    (item) => item.id === scriptId,
  );
  const timestamp = new Date().toISOString();

  if (!script) {
    return {
      executedStepCount: 0,
      messages: ["Script was not found."],
      skippedStepCount: 0,
      status: "failed",
    };
  }

  if (script.status !== "ready") {
    return markScriptRun(script, timestamp, {
      executedStepCount: 0,
      messages: ["Only ready scripts can run."],
      skippedStepCount: script.steps.length,
      status: "failed",
    });
  }

  const requiredPermissions = getAutomationScriptPermissions(script.steps);
  const deniedPermissions = requiredPermissions.filter(
    (permission) => !hasPermission(policy, permission),
  );

  if (deniedPermissions.length > 0) {
    return markScriptRun(script, timestamp, {
      executedStepCount: 0,
      messages: [`Missing permissions: ${deniedPermissions.join(", ")}.`],
      skippedStepCount: script.steps.length,
      status: "failed",
    });
  }

  let executedStepCount = 0;
  let skippedStepCount = 0;
  const messages: string[] = [];
  const maxSteps = Math.min(policy.maxSteps ?? 100, 100);

  for (const step of script.steps.slice(0, maxSteps)) {
    const permission = getAutomationStepPermission(step.command);

    if (!permission || !hasPermission(policy, permission)) {
      skippedStepCount += 1;
      messages.push(`Skipped unsupported command: ${step.command}.`);
      continue;
    }

    if (executeStep({ document, step })) {
      executedStepCount += 1;
    } else {
      skippedStepCount += 1;
      messages.push(`Skipped command that could not be replayed: ${step.label}.`);
    }
  }

  if (script.steps.length > maxSteps) {
    skippedStepCount += script.steps.length - maxSteps;
    messages.push(`Stopped at the ${maxSteps}-step runtime limit.`);
  }

  return markScriptRun(script, timestamp, {
    executedStepCount,
    messages,
    skippedStepCount,
    status: messages.length === 0 ? "succeeded" : "failed",
  });
}

function markScriptRun(
  script: WorkbookAutomationScript,
  timestamp: string,
  result: WorkbookAutomationRunResult,
) {
  script.lastRunAt = timestamp;
  script.lastRunStatus = result.status;
  script.lastRunMessage =
    result.messages[0] ??
    `Executed ${result.executedStepCount} step${
      result.executedStepCount === 1 ? "" : "s"
    }.`;

  return result;
}
