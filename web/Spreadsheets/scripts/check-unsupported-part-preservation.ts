import { strict as assert } from "node:assert";
import * as XLSX from "xlsx";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  workbookDocumentToXlsx,
  xlsxToWorkbookDocument,
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

function setPackageBytes(cfb: unknown, path: string, value: string) {
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
const baseWorkbook = workbookDocumentToXlsx(document);
const packageFile = readPackage(baseWorkbook);
const contentTypes = getPackageText(packageFile, "[Content_Types].xml");
const rootRelationships = getPackageText(packageFile, "_rels/.rels");
const workbookRelationships = getPackageText(
  packageFile,
  "xl/_rels/workbook.xml.rels",
);
const workbookXml = getPackageText(packageFile, "xl/workbook.xml");
const sheetXml = getPackageText(packageFile, "xl/worksheets/sheet1.xml");

setPackageText(
  packageFile,
  "[Content_Types].xml",
  contentTypes.replace(
    "</Types>",
    [
      '<Override PartName="/customXml/item1.xml" ContentType="application/xml"/>',
      '<Override PartName="/xl/connections.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml"/>',
      '<Override PartName="/xl/externalLinks/externalLink1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml"/>',
      '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>',
      "</Types>",
    ].join(""),
  ),
);
setPackageText(
  packageFile,
  "_rels/.rels",
  rootRelationships.replace(
    "</Relationships>",
    '<Relationship Id="rIdCustomXml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="customXml/item1.xml"/></Relationships>',
  ),
);
setPackageText(
  packageFile,
  "xl/_rels/workbook.xml.rels",
  workbookRelationships.replace(
    "</Relationships>",
    '<Relationship Id="rIdExternal1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink" Target="externalLinks/externalLink1.xml"/></Relationships>',
  ),
);
setPackageText(
  packageFile,
  "xl/workbook.xml",
  workbookXml.replace(
    "</workbook>",
    '<externalReferences><externalReference r:id="rIdExternal1"/></externalReferences></workbook>',
  ),
);
setPackageText(
  packageFile,
  "xl/worksheets/sheet1.xml",
  sheetXml.replace(
    "</worksheet>",
    '<drawing r:id="rIdDrawing1"/><oleObjects><oleObject progId="Forms.CommandButton.1" r:id="rIdOle1"/></oleObjects></worksheet>',
  ),
);
setPackageText(
  packageFile,
  "xl/worksheets/_rels/sheet1.xml.rels",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDrawing1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/><Relationship Id="rIdOle1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="../embeddings/oleObject1.bin"/></Relationships>',
);
setPackageText(
  packageFile,
  "xl/drawings/drawing1.xml",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"/>',
);
setPackageText(
  packageFile,
  "xl/ctrlProps/ctrlProp1.xml",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><formControlPr objectType="Button"/>',
);
setPackageBytes(packageFile, "customXml/item1.xml", "<root>preserved</root>");
setPackageBytes(packageFile, "xl/connections.xml", "<connections/>");
setPackageBytes(
  packageFile,
  "xl/externalLinks/externalLink1.xml",
  "<externalLink/>",
);
setPackageBytes(packageFile, "xl/embeddings/oleObject1.bin", "ole-bytes");
setPackageBytes(packageFile, "xl/activeX/activeX1.bin", "activex-bytes");

const imported = xlsxToWorkbookDocument(writePackage(packageFile));
const importedKinds = new Set(imported.unsupportedParts.map((part) => part.kind));

assert.ok(
  imported.unsupportedParts.length >= 10,
  "imports unsupported OOXML package parts",
);
assert.ok(importedKinds.has("custom-xml"), "captures custom XML parts");
assert.ok(importedKinds.has("external-link"), "captures external link parts");
assert.ok(
  importedKinds.has("workbook-connection"),
  "captures workbook connection parts",
);
assert.ok(importedKinds.has("embedded-object"), "captures embedded objects");
assert.ok(importedKinds.has("form-control"), "captures form control metadata");
assert.ok(importedKinds.has("activex-control"), "captures ActiveX metadata");
assert.ok(importedKinds.has("drawing"), "captures drawing parts");
assert.ok(
  importedKinds.has("package-relationship"),
  "captures supporting OOXML relationships",
);
assert.ok(importedKinds.has("content-type"), "captures content type metadata");
assert.ok(importedKinds.has("workbook-markup"), "captures workbook markup");
assert.ok(importedKinds.has("worksheet-markup"), "captures worksheet markup");

const conflictDocument = {
  ...imported,
  unsupportedParts: imported.unsupportedParts.map((part) => {
    if (part.path !== "xl/_rels/workbook.xml.rels" && part.path !== "xl/workbook.xml") {
      return part;
    }

    const text = atob(part.dataBase64).replaceAll("rIdExternal1", "rId1");

    return {
      ...part,
      dataBase64: btoa(text),
      binarySize: text.length,
    };
  }),
};
const exported = workbookDocumentToXlsx(conflictDocument);
const exportedPackage = readPackage(exported);

assert.equal(
  getPackageText(exportedPackage, "customXml/item1.xml"),
  "<root>preserved</root>",
  "custom XML payload survives export",
);
assert.equal(
  getPackageText(exportedPackage, "xl/embeddings/oleObject1.bin"),
  "ole-bytes",
  "embedded object payload survives export",
);
assert.match(
  getPackageText(exportedPackage, "[Content_Types].xml"),
  /customXml\/item1\.xml/,
  "custom content type survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/_rels/workbook.xml.rels"),
  /Id="rIdEssence\d+"[^>]+externalLinks\/externalLink1\.xml/,
  "external link relationship survives export with a non-conflicting id",
);
assert.match(
  getPackageText(exportedPackage, "xl/workbook.xml"),
  /externalReference r:id="rIdEssence\d+"/,
  "workbook external reference markup remaps relationship ids",
);
assert.match(
  getPackageText(exportedPackage, "xl/worksheets/sheet1.xml"),
  /drawing/,
  "worksheet drawing markup survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/worksheets/_rels/sheet1.xml.rels"),
  /drawings\/drawing1\.xml/,
  "worksheet drawing relationship survives export",
);

console.log("Unsupported workbook part preservation checks passed.");
