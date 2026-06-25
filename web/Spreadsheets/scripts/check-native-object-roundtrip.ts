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

function objectKindSet(document: ReturnType<typeof xlsxToWorkbookDocument>) {
  return new Set(document.nativeObjects.map((object) => object.kind));
}

const document = createDefaultWorkbookDocument();
const baseWorkbook = workbookDocumentToXlsx(document);
const packageFile = readPackage(baseWorkbook);
const contentTypes = getPackageText(packageFile, "[Content_Types].xml");
const sheetXml = getPackageText(packageFile, "xl/worksheets/sheet1.xml");

setPackageText(
  packageFile,
  "[Content_Types].xml",
  contentTypes.replace(
    "</Types>",
    [
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>',
      '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>',
      '<Override PartName="/xl/ctrlProps/ctrlProp1.xml" ContentType="application/vnd.ms-excel.controlproperties+xml"/>',
      '<Default Extension="png" ContentType="image/png"/>',
      '<Default Extension="svg" ContentType="image/svg+xml"/>',
      '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>',
      "</Types>",
    ].join(""),
  ),
);
setPackageText(
  packageFile,
  "xl/worksheets/sheet1.xml",
  sheetXml.replace(
    "</worksheet>",
    '<drawing r:id="rIdDrawing1"/><oleObjects><oleObject progId="Package" name="Budget Attachment" r:id="rIdOle1"/></oleObjects><controls><control name="Run Report" shapeId="1025" r:id="rIdCtrl1"/></controls></worksheet>',
  ),
);
setPackageText(
  packageFile,
  "xl/worksheets/_rels/sheet1.xml.rels",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDrawing1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/><Relationship Id="rIdOle1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="../embeddings/oleObject1.bin"/><Relationship Id="rIdCtrl1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/control" Target="../ctrlProps/ctrlProp1.xml"/></Relationships>',
);
setPackageText(
  packageFile,
  "xl/drawings/drawing1.xml",
  [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<xdr:twoCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:row>2</xdr:row></xdr:from><xdr:to><xdr:col>6</xdr:col><xdr:row>14</xdr:row></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Sales Chart" descr="Quarterly sales"/></xdr:nvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rIdChart1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>',
    '<xdr:oneCellAnchor><xdr:from><xdr:col>8</xdr:col><xdr:row>3</xdr:row></xdr:from><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="3" name="Logo Image" descr="Imported logo"/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdImage1"/></xdr:blipFill></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>',
    '<xdr:oneCellAnchor><xdr:from><xdr:col>10</xdr:col><xdr:row>3</xdr:row></xdr:from><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="4" name="Status Icon" descr="Imported icon"/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdIcon1"/></xdr:blipFill></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>',
    '<xdr:twoCellAnchor><xdr:from><xdr:col>2</xdr:col><xdr:row>16</xdr:row></xdr:from><xdr:to><xdr:col>4</xdr:col><xdr:row>20</xdr:row></xdr:to><xdr:sp><xdr:nvSpPr><xdr:cNvPr id="5" name="Approval Shape"/></xdr:nvSpPr><xdr:spPr><a:prstGeom prst="roundRect"/></xdr:spPr></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>',
    '<xdr:twoCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:row>20</xdr:row></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:row>20</xdr:row></xdr:to><xdr:cxnSp><xdr:nvCxnSpPr><xdr:cNvPr id="6" name="Flow Connector"/></xdr:nvCxnSpPr><xdr:spPr><a:prstGeom prst="straightConnector1"/></xdr:spPr></xdr:cxnSp><xdr:clientData/></xdr:twoCellAnchor>',
    "</xdr:wsDr>",
  ].join(""),
);
setPackageText(
  packageFile,
  "xl/drawings/_rels/drawing1.xml.rels",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdChart1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/><Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/><Relationship Id="rIdIcon1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/icon1.svg"/></Relationships>',
);
setPackageText(
  packageFile,
  "xl/charts/chart1.xml",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:view3D><c:rotX val="20"/><c:rotY val="30"/><c:perspective val="45"/><c:depthPercent val="140"/></c:view3D><c:bar3DChart><c:barDir val="col"/></c:bar3DChart><c:dTable/></c:chart></c:chartSpace>',
);
setPackageText(
  packageFile,
  "xl/ctrlProps/ctrlProp1.xml",
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><formControlPr objectType="Button"/>',
);
setPackageBytes(packageFile, "xl/media/image1.png", "png-bytes");
setPackageBytes(packageFile, "xl/media/icon1.svg", "<svg/>");
setPackageBytes(packageFile, "xl/embeddings/oleObject1.bin", "ole-bytes");

const imported = xlsxToWorkbookDocument(writePackage(packageFile));
const importedKinds = objectKindSet(imported);
const importedPartKinds = new Set(
  imported.unsupportedParts.map((part) => part.kind),
);
const chartObject = imported.nativeObjects.find(
  (object) => object.kind === "chart",
);

assert.ok(imported.nativeObjects.length >= 7, "indexes native Excel objects");
assert.ok(importedKinds.has("chart"), "indexes imported chart objects");
assert.ok(importedKinds.has("image"), "indexes imported image objects");
assert.ok(importedKinds.has("icon"), "indexes imported icon objects");
assert.ok(importedKinds.has("shape"), "indexes imported shape objects");
assert.ok(importedKinds.has("connector"), "indexes imported connector objects");
assert.ok(importedKinds.has("oleObject"), "indexes imported OLE objects");
assert.ok(importedKinds.has("formControl"), "indexes imported form controls");
assert.ok(importedPartKinds.has("chart"), "preserves chart package payloads");
assert.equal(chartObject?.name, "Sales Chart", "keeps drawing object names");
assert.equal(
  chartObject?.targetPath,
  "xl/charts/chart1.xml",
  "resolves chart relationship targets",
);
assert.deepEqual(
  chartObject?.anchor,
  {
    fromColumnIndex: 1,
    fromRowIndex: 2,
    toColumnIndex: 6,
    toRowIndex: 14,
  },
  "keeps drawing anchors",
);
assert.equal(
  chartObject?.chart?.chartType,
  "bar3D",
  "detects native 3D chart type",
);
assert.equal(
  chartObject?.chart?.hasDataTable,
  true,
  "detects native chart data tables",
);
assert.deepEqual(
  chartObject?.chart?.threeDimensional,
  {
    enabled: true,
    depthPercent: 140,
    perspective: 45,
    rotationX: 20,
    rotationY: 30,
  },
  "reads native 3D chart view metadata",
);

const exported = workbookDocumentToXlsx(imported);
const exportedPackage = readPackage(exported);

assert.match(
  getPackageText(exportedPackage, "xl/worksheets/sheet1.xml"),
  /drawing r:id=/,
  "worksheet drawing markup survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/drawings/drawing1.xml"),
  /Sales Chart[\s\S]*Approval Shape[\s\S]*Flow Connector/,
  "drawing XML survives export",
);
assert.match(
  getPackageText(exportedPackage, "xl/charts/chart1.xml"),
  /chartSpace/,
  "chart XML survives export",
);
assert.equal(
  getPackageText(exportedPackage, "xl/embeddings/oleObject1.bin"),
  "ole-bytes",
  "OLE payload survives export",
);

const reimported = xlsxToWorkbookDocument(exported);
const reimportedKinds = objectKindSet(reimported);

assert.ok(reimportedKinds.has("chart"), "reimports exported chart metadata");
assert.ok(reimportedKinds.has("image"), "reimports exported image metadata");
assert.ok(reimportedKinds.has("icon"), "reimports exported icon metadata");
assert.ok(reimportedKinds.has("shape"), "reimports exported shape metadata");
assert.ok(reimportedKinds.has("connector"), "reimports exported connector metadata");
assert.ok(reimportedKinds.has("oleObject"), "reimports exported OLE metadata");
assert.ok(
  reimportedKinds.has("formControl"),
  "reimports exported form control metadata",
);
assert.equal(
  reimported.nativeObjects.find((object) => object.kind === "chart")?.chart
    ?.chartType,
  "bar3D",
  "reimports exported native 3D chart metadata",
);

console.log("Native Excel object round-trip checks passed.");
