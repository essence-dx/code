import { removeDuplicateRowsInRange } from "@/features/spreadsheet/state/duplicate-state";
import { updateRangeRaw } from "@/features/spreadsheet/state/edit-state";
import { updateRangeCellStyle } from "@/features/spreadsheet/state/format-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  WorkbookAddInManifest,
  WorkbookAddInSandboxCommand,
  WorkbookAutomationPermission,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookAddInSandboxResult = {
  executedCommandCount: number;
  messages: string[];
  skippedCommandCount: number;
  status: "succeeded" | "failed";
};

export type WorkbookAddInSandboxPolicy = {
  maxCommands?: number;
  permissions: WorkbookAutomationPermission[];
};

function hasPermission(
  policy: WorkbookAddInSandboxPolicy,
  permission: WorkbookAutomationPermission,
) {
  return policy.permissions.includes(permission);
}

function getCommandSheet(
  document: WorkbookDocument,
  command: WorkbookAddInSandboxCommand,
) {
  const targetSheetId =
    "targetSheetId" in command ? command.targetSheetId : undefined;

  return (
    document.sheets.find((sheet) => sheet.id === targetSheetId) ??
    document.sheets.find((sheet) => sheet.id === document.activeSheetId) ??
    null
  );
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

function getCommandRange(
  sheet: SheetData,
  command: WorkbookAddInSandboxCommand,
) {
  const targetRange = "targetRange" in command ? command.targetRange : undefined;

  return clampRangeToSheet(
    targetRange ?? {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    },
    sheet,
  );
}

function rawComputedValues(sheet: SheetData) {
  return Object.fromEntries(
    Object.entries(sheet.cells).map(([key, cell]) => [key, cell.raw]),
  );
}

function getPopulatedCellCount(document: WorkbookDocument) {
  return document.sheets.reduce(
    (total, sheet) => total + Object.keys(sheet.cells).length,
    0,
  );
}

function markAddInRun(
  addIn: WorkbookAddInManifest,
  timestamp: string,
  result: WorkbookAddInSandboxResult,
) {
  addIn.lastRunAt = timestamp;
  addIn.lastRunStatus = result.status;
  addIn.lastRunMessage =
    result.messages[0] ??
    `Executed ${result.executedCommandCount} command${
      result.executedCommandCount === 1 ? "" : "s"
    }.`;

  return result;
}

function executeCommand(input: {
  addIn: WorkbookAddInManifest;
  command: WorkbookAddInSandboxCommand;
  document: WorkbookDocument;
  messages: string[];
}) {
  if (input.command.kind === "workbook.summary") {
    input.messages.push(
      `${input.addIn.name} read ${input.document.sheets.length} sheet${
        input.document.sheets.length === 1 ? "" : "s"
      } and ${getPopulatedCellCount(input.document)} populated cell${
        getPopulatedCellCount(input.document) === 1 ? "" : "s"
      }.`,
    );
    return true;
  }

  const sheet = getCommandSheet(input.document, input.command);

  if (!sheet) {
    input.messages.push(`Skipped ${input.command.label}: sheet was not found.`);
    return false;
  }

  const range = getCommandRange(sheet, input.command);

  if (input.command.kind === "cell.setValue") {
    updateRangeRaw(sheet, range, input.command.value);
    return true;
  }

  if (input.command.kind === "range.fill") {
    updateRangeCellStyle(sheet, range, { background: input.command.color });
    return true;
  }

  if (input.command.kind === "data.removeDuplicates") {
    const removedCount = removeDuplicateRowsInRange({
      computedValues: rawComputedValues(sheet),
      range,
      sheet,
    });

    input.messages.push(
      removedCount === 0
        ? `No duplicate rows found for ${input.command.label}.`
        : `Removed ${removedCount} duplicate row${
            removedCount === 1 ? "" : "s"
          }.`,
    );
    return true;
  }

  return false;
}

export function runWorkbookAddInPackage({
  addInId,
  document,
  policy,
}: {
  addInId: string;
  document: WorkbookDocument;
  policy: WorkbookAddInSandboxPolicy;
}): WorkbookAddInSandboxResult {
  const addIn = (document.addIns ?? []).find((item) => item.id === addInId);
  const timestamp = new Date().toISOString();

  if (!addIn) {
    return {
      executedCommandCount: 0,
      messages: ["Add-in package was not found."],
      skippedCommandCount: 0,
      status: "failed",
    };
  }

  if (addIn.signatureStatus !== "verified") {
    return markAddInRun(addIn, timestamp, {
      executedCommandCount: 0,
      messages: ["Add-in package signature is not verified."],
      skippedCommandCount: addIn.sandboxCommands.length,
      status: "failed",
    });
  }

  if (!addIn.enabled) {
    return markAddInRun(addIn, timestamp, {
      executedCommandCount: 0,
      messages: ["Add-in package is not enabled."],
      skippedCommandCount: addIn.sandboxCommands.length,
      status: "failed",
    });
  }

  const deniedPermissions = addIn.permissions.filter(
    (permission) => !hasPermission(policy, permission),
  );

  if (deniedPermissions.length > 0) {
    return markAddInRun(addIn, timestamp, {
      executedCommandCount: 0,
      messages: [`Missing permissions: ${deniedPermissions.join(", ")}.`],
      skippedCommandCount: addIn.sandboxCommands.length,
      status: "failed",
    });
  }

  let executedCommandCount = 0;
  let skippedCommandCount = 0;
  const messages: string[] = [];
  const maxCommands = Math.min(policy.maxCommands ?? 50, 50);

  for (const command of addIn.sandboxCommands.slice(0, maxCommands)) {
    if (!hasPermission(policy, command.permission)) {
      skippedCommandCount += 1;
      messages.push(`Skipped ${command.label}: permission denied.`);
      continue;
    }

    if (executeCommand({ addIn, command, document, messages })) {
      executedCommandCount += 1;
    } else {
      skippedCommandCount += 1;
    }
  }

  if (addIn.sandboxCommands.length > maxCommands) {
    skippedCommandCount += addIn.sandboxCommands.length - maxCommands;
    messages.push(`Stopped at the ${maxCommands}-command sandbox limit.`);
  }

  return markAddInRun(addIn, timestamp, {
    executedCommandCount,
    messages,
    skippedCommandCount,
    status: skippedCommandCount === 0 ? "succeeded" : "failed",
  });
}
