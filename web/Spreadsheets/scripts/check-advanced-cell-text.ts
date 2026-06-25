import { strict as assert } from "node:assert";
import {
  applyRichTextRunsToRange,
  clearRangeRichTextRuns,
  updateRangeCellStyle,
} from "@/features/spreadsheet/state/format-state";
import { createSpreadsheetClipboardPayload } from "@/features/spreadsheet/cell-clipboard";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { sheetToHtml } from "@/features/workbooks/html";
import { normalizeCellRichTextRuns } from "@/features/workbooks/rich-text";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];
const range = {
  startRowIndex: 0,
  startColumnIndex: 0,
  endRowIndex: 0,
  endColumnIndex: 0,
};

assert(sheet, "default workbook has a sheet");

sheet.cells.A1 = { raw: "Revenue" };
updateRangeCellStyle(sheet, range, {
  bold: true,
  foreground: "#1d4ed8",
  shrinkToFit: true,
  textRotation: 45,
  verticalAlign: "middle",
});
applyRichTextRunsToRange({
  sheet,
  range,
  style: sheet.cells.A1?.style ?? {},
  computedValues: { A1: "Revenue" },
});

assert.equal(sheet.cells.A1?.richTextRuns?.[0]?.text, "Revenue");
assert.equal(sheet.cells.A1?.richTextRuns?.[0]?.bold, true);

const clipboardPayload = createSpreadsheetClipboardPayload(
  sheet,
  range,
  { A1: "Revenue" },
);

assert.match(clipboardPayload.html, /data-ee-rich-run="true"/);
assert.match(clipboardPayload.html, /transform:rotate\(45deg\)/);
assert.match(clipboardPayload.html, /font-stretch:condensed/);
assert.match(clipboardPayload.html, /vertical-align:middle/);
assert.equal(
  normalizeCellRichTextRuns([{ text: "Revenue", bold: true }], "Revenue")[0]
    ?.bold,
  true,
);

clearRangeRichTextRuns(sheet, range);
assert.equal(sheet.cells.A1?.richTextRuns, undefined);

sheet.cells.B1 = {
  raw: "Vertical",
  style: {
    verticalText: true,
    verticalAlign: "bottom",
  },
};

const html = sheetToHtml(sheet, { A1: "Revenue", B1: "Vertical" });

assert.match(html, /writing-mode:vertical-rl/);
assert.match(html, /vertical-align:bottom/);

const normalized = normalizeWorkbookDocument({
  ...document,
  sheets: [
    {
      ...sheet,
      cells: {
        A1: {
          raw: "Revenue",
          richTextRuns: [{ text: "Wrong text", bold: true }],
          style: {
            textRotation: 181,
            verticalAlign: "sideways",
          },
        },
      },
    },
  ],
});
const normalizedCell = normalized.sheets[0]?.cells.A1;

assert.equal(normalizedCell?.style?.textRotation, 90);
assert.equal(normalizedCell?.style?.verticalAlign, undefined);
assert.equal(
  normalizedCell?.richTextRuns,
  undefined,
  "rich text runs that no longer match cell text are discarded",
);

console.log("Advanced cell text checks passed.");
