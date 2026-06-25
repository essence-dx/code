import { strict as assert } from "node:assert";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  createImportedVbaProject,
  recordAutomationScriptStep,
  startAutomationScript,
  stopAutomationScript,
} from "@/features/workbooks/workbook-automation";
import {
  workbookDocumentToXlsm,
  xlsmToWorkbookDocument,
} from "@/features/workbooks/xlsx";

const document = createDefaultWorkbookDocument();
const vbaProjectBase64 = btoa("disabled-vba-project");

document.macroProjects = [
  createImportedVbaProject({
    binarySize: atob(vbaProjectBase64).length,
    sourceFormat: "xlsm",
    vbaProjectBase64,
    sheetCodeNames: [
      {
        sheetName: document.sheets[0]?.name ?? "Sheet 1",
        codeName: "Sheet1",
        hiddenState: "visible",
      },
    ],
  }),
];
document.automationScripts = startAutomationScript([], "Clean selected range");
document.automationScripts = recordAutomationScriptStep(
  document.automationScripts,
  {
    command: "cell.setValue",
    label: "Set A1 value",
    targetSheetId: document.sheets[0]?.id,
    targetRange: {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    },
    valuePreview: "Hello",
  },
);
document.automationScripts = stopAutomationScript(
  document.automationScripts,
  document.automationScripts[0]?.id ?? "",
);

const normalized = normalizeWorkbookDocument(document);

assert.equal(normalized.macroProjects.length, 1);
assert.equal(normalized.macroProjects[0]?.disabled, true);
assert.equal(normalized.automationScripts.length, 1);
assert.equal(normalized.automationScripts[0]?.status, "ready");
assert.deepEqual(normalized.automationScripts[0]?.permissions, ["writeCells"]);
assert.equal(normalized.automationScripts[0]?.steps.length, 1);

const exported = workbookDocumentToXlsm(normalized);
const imported = xlsmToWorkbookDocument(exported);

assert.equal(
  imported.macroProjects.length,
  1,
  "XLSM round trip keeps a disabled VBA project",
);
assert.equal(
  imported.macroProjects[0]?.vbaProjectBase64,
  vbaProjectBase64,
  "VBA binary payload survives XLSM export/import",
);
assert.equal(
  imported.macroProjects[0]?.disabled,
  true,
  "imported VBA project remains disabled",
);

console.log("Macro preservation checks passed.");
