import { strict as assert } from "node:assert";
import * as XLSX from "xlsx";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  workbookDocumentToXlsm,
  xlsmToWorkbookDocument,
} from "@/features/workbooks/xlsx";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function readPackage(buffer: ArrayBuffer) {
  return XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });
}

function getPackageText(cfb: unknown, path: string) {
  const file = XLSX.CFB.find(cfb, `/${path}`);
  const content = file?.content;

  assert.ok(content, `Expected ${path} to exist`);

  return decoder.decode(content as Uint8Array);
}

function setPackageText(cfb: unknown, path: string, value: string) {
  XLSX.CFB.utils.cfb_add(cfb, `/${path}`, encoder.encode(value));
}

function writePackage(cfb: unknown) {
  const output = XLSX.CFB.write(cfb, {
    fileType: "zip",
    type: "array",
  });

  if (output instanceof ArrayBuffer) {
    return output;
  }

  const bytes = output as Uint8Array;
  const copy = new Uint8Array(bytes.byteLength);

  copy.set(bytes);

  return copy.buffer;
}

const document = createDefaultWorkbookDocument();
const packageFile = readPackage(workbookDocumentToXlsm(document));
const contentTypes = getPackageText(packageFile, "[Content_Types].xml");
const workbookRelationships = getPackageText(
  packageFile,
  "xl/_rels/workbook.xml.rels",
);
const workbookXml = getPackageText(packageFile, "xl/workbook.xml");

setPackageText(
  packageFile,
  "[Content_Types].xml",
  contentTypes.replace(
    "</Types>",
    '<Override PartName="/xl/macrosheets/sheet1.xml" ContentType="application/vnd.ms-excel.macrosheet+xml"/></Types>',
  ),
);
setPackageText(
  packageFile,
  "xl/_rels/workbook.xml.rels",
  workbookRelationships.replace(
    "</Relationships>",
    '<Relationship Id="rIdMacroSheet1" Type="http://schemas.microsoft.com/office/2006/relationships/xlMacrosheet" Target="macrosheets/sheet1.xml"/></Relationships>',
  ),
);
setPackageText(
  packageFile,
  "xl/workbook.xml",
  workbookXml.replace(
    "</sheets>",
    '<sheet name="MacroSheet1" sheetId="2" state="hidden" r:id="rIdMacroSheet1"/></sheets>',
  ),
);
setPackageText(
  packageFile,
  "xl/macrosheets/sheet1.xml",
  [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<xm:macrosheet xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<xm:sheetData><xm:row r="1"><xm:c r="A1"><xm:f>HALT()</xm:f></xm:c></xm:row></xm:sheetData>',
    "</xm:macrosheet>",
  ].join(""),
);

const imported = xlsmToWorkbookDocument(writePackage(packageFile));
const importedKinds = new Set(imported.unsupportedParts.map((part) => part.kind));

assert.ok(importedKinds.has("macro-sheet"), "imports disabled macro-sheet payloads");
assert.ok(importedKinds.has("content-type"), "imports macro-sheet content type");
assert.ok(
  importedKinds.has("package-relationship"),
  "imports macro-sheet workbook relationship",
);
assert.ok(importedKinds.has("workbook-markup"), "imports macro-sheet workbook metadata");

const exported = workbookDocumentToXlsm(imported);
const exportedPackage = readPackage(exported);

assert.match(
  getPackageText(exportedPackage, "[Content_Types].xml"),
  /application\/vnd\.ms-excel\.macrosheet\+xml/,
  "macro-sheet content type survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/_rels/workbook.xml.rels"),
  /relationships\/xlMacrosheet" Target="macrosheets\/sheet1\.xml"/,
  "macro-sheet relationship survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/workbook.xml"),
  /name="MacroSheet1"[^>]+state="hidden"[^>]+r:id="rIdMacroSheet1"/,
  "macro-sheet workbook entry survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/macrosheets/sheet1.xml"),
  /HALT\(\)/,
  "macro-sheet payload survives export",
);

console.log("Macro-sheet preservation checks passed.");
