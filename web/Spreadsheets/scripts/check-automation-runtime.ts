import assert from "node:assert/strict";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  recordAutomationScriptStep,
  startAutomationScript,
  stopAutomationScript,
} from "@/features/workbooks/workbook-automation";
import {
  registerAddInManifest,
  setAddInEnabled,
  upsertCustomFunction,
} from "@/features/workbooks/workbook-extensions";
import { runWorkbookAddInPackage } from "@/features/spreadsheet/add-in-sandbox";
import { runWorkbookAutomationScript } from "@/features/spreadsheet/automation-runtime";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

document.automationScripts = startAutomationScript([], "Prepare report");
document.automationScripts = recordAutomationScriptStep(
  document.automationScripts,
  {
    command: "cell.setValue",
    label: "Set A1 value",
    targetSheetId: sheet.id,
    targetRange: {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    },
    valuePreview: "Revenue",
  },
);
document.automationScripts = recordAutomationScriptStep(
  document.automationScripts,
  {
    command: "format.fill",
    label: "Set fill color #22c55e",
    targetSheetId: sheet.id,
    targetRange: {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    },
  },
);
document.automationScripts = stopAutomationScript(
  document.automationScripts,
  document.automationScripts[0]?.id ?? "",
);

const script = document.automationScripts[0];

assert.ok(script, "script is recorded");
assert.equal(script.status, "ready");
assert.deepEqual(script.permissions, ["writeCells", "formatCells"]);

const deniedResult = runWorkbookAutomationScript({
  document,
  policy: { permissions: ["writeCells"] },
  scriptId: script.id,
});

assert.equal(deniedResult.status, "failed");
assert.equal(sheet.cells.A1?.raw, "Essence Excel");

const runResult = runWorkbookAutomationScript({
  document,
  policy: { permissions: ["writeCells", "formatCells"], maxSteps: 20 },
  scriptId: script.id,
});

assert.equal(runResult.status, "succeeded");
assert.equal(runResult.executedStepCount, 2);
assert.equal(sheet.cells.A1?.raw, "Revenue");
assert.equal(sheet.cells.A1?.style?.background, "#22c55e");
assert.equal(script.lastRunStatus, "succeeded");

document.customFunctions = upsertCustomFunction([], {
  description: "Clean text spacing",
  expression: '=TRIM(SUBSTITUTE(value,CHAR(160)," "))',
  name: "clean_text",
});
document.addIns = registerAddInManifest([], {
  description: "Safe report cleanup manifest",
  name: "Report cleanup",
  permissions: ["readWorkbook", "writeCells"],
  provider: "Essence",
});

const normalized = normalizeWorkbookDocument(document);

assert.equal(normalized.customFunctions?.[0]?.name, "CLEAN_TEXT");
assert.equal(normalized.addIns?.[0]?.enabled, false);
assert.equal(normalized.addIns?.[0]?.signatureStatus, "verified");
assert.ok(normalized.addIns?.[0]?.packageDigest);
assert.equal(normalized.addIns?.[0]?.sandboxCommands.length, 1);
assert.deepEqual(normalized.addIns?.[0]?.permissions, [
  "readWorkbook",
  "writeCells",
]);

const addIn = normalized.addIns?.[0];

assert.ok(addIn, "add-in package is normalized");

const disabledAddInResult = runWorkbookAddInPackage({
  addInId: addIn.id,
  document: normalized,
  policy: { permissions: ["readWorkbook", "writeCells"], maxCommands: 20 },
});

assert.equal(disabledAddInResult.status, "failed");
assert.match(addIn.lastRunMessage ?? "", /not enabled/i);

normalized.addIns = setAddInEnabled(normalized.addIns ?? [], addIn.id, true);

const enabledAddIn = normalized.addIns[0];

assert.ok(enabledAddIn, "add-in can be enabled explicitly");
assert.equal(enabledAddIn.enabled, true);

const addInRunResult = runWorkbookAddInPackage({
  addInId: enabledAddIn.id,
  document: normalized,
  policy: { permissions: ["readWorkbook", "writeCells"], maxCommands: 20 },
});

assert.equal(addInRunResult.status, "succeeded");
assert.equal(addInRunResult.executedCommandCount, 1);
assert.equal(enabledAddIn.lastRunStatus, "succeeded");

const enabledSignature = enabledAddIn.signature;

assert.ok(enabledSignature, "enabled add-in keeps its package signature");

const tampered = normalizeWorkbookDocument({
  ...normalized,
  addIns: [
    {
      ...enabledAddIn,
      signature: {
        ...enabledSignature,
        value: "tampered",
      },
    },
  ],
});

assert.equal(tampered.addIns?.[0]?.signatureStatus, "invalid");
assert.equal(tampered.addIns?.[0]?.enabled, false);

console.log("Automation runtime checks passed.");
