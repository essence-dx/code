import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  recoverWorkbookDocumentFromBuffer,
  workbookDocumentToXltm,
  workbookDocumentToXltx,
  workbookDocumentToXlsx,
  xlsxToWorkbookDocument,
  xltmToWorkbookDocument,
  xltxToWorkbookDocument,
} from "@/features/workbooks/xlsx";
import {
  getWorkbookMainContentType,
  workbookContentTypeIsMacro,
  workbookContentTypeIsTemplate,
} from "@/features/workbooks/workbook-template-package";
import {
  textToBytes,
  toArrayBuffer,
} from "@/features/workbooks/workbook-unsupported-part-codec";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";

function patchPackageText(
  buffer: ArrayBuffer,
  path: string,
  update: (current: string) => string,
) {
  const cfb = XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });
  const file =
    XLSX.CFB.find(cfb, `/${path}`) ?? XLSX.CFB.find(cfb, path);
  const current = file?.content
    ? new TextDecoder().decode(file.content as Uint8Array)
    : "";

  XLSX.CFB.utils.cfb_add(cfb, `/${path}`, textToBytes(update(current)));

  return toArrayBuffer(
    XLSX.CFB.write(cfb, {
      fileType: "zip",
      type: "array",
    }),
  );
}

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

document.metadata.description = "Template recovery smoke test";
document.metadata.tags = ["ops", "template"];
sheet.cells.A1 = { raw: "Product" };
sheet.cells.B1 = { raw: "Amount" };
sheet.cells.A2 = { raw: "Widget" };
sheet.cells.B2 = { raw: "42" };

const xltx = workbookDocumentToXltx(document);
const xltxType = getWorkbookMainContentType(xltx);
const importedXltx = xltxToWorkbookDocument(xltx);

assert.ok(workbookContentTypeIsTemplate(xltxType), "XLTX uses template content type");
assert.equal(importedXltx.metadata.isTemplate, true, "XLTX import marks templates");
assert.equal(importedXltx.sheets[0]?.cells.A2?.raw, "Widget");

const xltm = workbookDocumentToXltm(document);
const xltmType = getWorkbookMainContentType(xltm);
const importedXltm = xltmToWorkbookDocument(xltm);

assert.ok(workbookContentTypeIsTemplate(xltmType), "XLTM uses template content type");
assert.ok(workbookContentTypeIsMacro(xltmType), "XLTM uses macro template content type");
assert.equal(importedXltm.metadata.isTemplate, true, "XLTM import marks templates");

const protectedXlsx = patchPackageText(
  workbookDocumentToXlsx(document),
  "xl/workbook.xml",
  (xml) =>
    xml.replace(
      "</workbook>",
      '<workbookProtection workbookPassword="ABCD" lockStructure="1" lockWindows="1"/></workbook>',
    ),
);
const importedProtected = xlsxToWorkbookDocument(protectedXlsx);

assert.equal(importedProtected.workbookProtection?.source, "imported-ooxml");
assert.equal(importedProtected.workbookProtection?.legacyPasswordHash, "ABCD");
assert.equal(importedProtected.workbookProtection?.lockStructure, true);
assert.equal(importedProtected.workbookProtection?.lockWindows, true);

const corruptedXlsx = patchPackageText(
  workbookDocumentToXlsx(document),
  "xl/workbook.xml",
  () => "<workbook><broken>",
);
const recovered = recoverWorkbookDocumentFromBuffer({
  buffer: corruptedXlsx,
  sourceFormat: "xlsx",
});

assert.equal(recovered.usedPackageRecovery, true, "corrupt workbook uses recovery");
assert.equal(recovered.document.metadata.tags.includes("recovery"), true);
assert.equal(recovered.document.sheets[0]?.cells.A1?.raw, "Product");
assert.equal(recovered.document.sheets[0]?.cells.B2?.raw, "42");

console.log("Template and recovery import checks passed.");
