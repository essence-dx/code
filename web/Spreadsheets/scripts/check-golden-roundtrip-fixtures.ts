import assert from "node:assert/strict";
import {
  createGoldenRoundTripWorkbook,
  getGoldenRoundTripExpectation,
  goldenRoundTripCells,
  goldenRoundTripFormulaCells,
  type GoldenRoundTripFormat,
} from "@/features/workbooks/roundtrip-fixtures";
import type { WorkbookDocument } from "@/features/workbooks/types";
import {
  odsToWorkbookDocument,
  workbookDocumentToOds,
  workbookDocumentToXlsm,
  workbookDocumentToXltm,
  workbookDocumentToXltx,
  workbookDocumentToXlsx,
  xlsmToWorkbookDocument,
  xltmToWorkbookDocument,
  xltxToWorkbookDocument,
  xlsxToWorkbookDocument,
} from "@/features/workbooks/xlsx";
import {
  getWorkbookMainContentType,
  workbookContentTypeIsMacro,
  workbookContentTypeIsTemplate,
} from "@/features/workbooks/workbook-template-package";

type RoundTripAdapter = {
  format: GoldenRoundTripFormat;
  exportDocument: (document: WorkbookDocument) => ArrayBuffer;
  importDocument: (buffer: ArrayBuffer) => WorkbookDocument;
};

const roundTripAdapters: RoundTripAdapter[] = [
  {
    format: "xlsx",
    exportDocument: workbookDocumentToXlsx,
    importDocument: xlsxToWorkbookDocument,
  },
  {
    format: "xlsm",
    exportDocument: workbookDocumentToXlsm,
    importDocument: xlsmToWorkbookDocument,
  },
  {
    format: "ods",
    exportDocument: workbookDocumentToOds,
    importDocument: odsToWorkbookDocument,
  },
  {
    format: "xltx",
    exportDocument: workbookDocumentToXltx,
    importDocument: xltxToWorkbookDocument,
  },
  {
    format: "xltm",
    exportDocument: workbookDocumentToXltm,
    importDocument: xltmToWorkbookDocument,
  },
];

for (const adapter of roundTripAdapters) {
  const expectation = getGoldenRoundTripExpectation(adapter.format);
  const fixture = createGoldenRoundTripWorkbook();
  const exported = adapter.exportDocument(fixture);
  const imported = adapter.importDocument(exported);

  assert.ok(
    exported.byteLength > 0,
    `${adapter.format} export produces a non-empty workbook`,
  );

  if (expectation.preservesTemplateFlag) {
    const contentType = getWorkbookMainContentType(exported);

    assert.ok(
      workbookContentTypeIsTemplate(contentType),
      `${adapter.format} uses a template workbook content type`,
    );
    assert.equal(
      imported.metadata.isTemplate,
      true,
      `${adapter.format} import marks the workbook as a template`,
    );
  }

  if (expectation.preservesMacroProject) {
    const contentType = getWorkbookMainContentType(exported);

    assert.ok(
      workbookContentTypeIsMacro(contentType),
      `${adapter.format} uses a macro workbook content type`,
    );
  }

  assertGoldenWorkbook(imported, adapter.format);

  const reexported = adapter.exportDocument(imported);
  const reimported = adapter.importDocument(reexported);

  assertGoldenWorkbook(reimported, adapter.format);
}

console.log("Golden import/export round-trip fixtures passed.");

function assertGoldenWorkbook(
  document: WorkbookDocument,
  format: GoldenRoundTripFormat,
) {
  const expectation = getGoldenRoundTripExpectation(format);
  const sheet = document.sheets[0];

  assert.ok(sheet, `${format} import includes the first sheet`);
  assert.equal(sheet.name, "Fidelity", `${format} keeps the sheet name`);

  for (const cell of goldenRoundTripCells) {
    assert.equal(
      sheet.cells[cell.address]?.raw,
      cell.value,
      `${format} keeps ${cell.address}`,
    );
  }

  if (expectation.preservesFormula) {
    for (const cell of goldenRoundTripFormulaCells) {
      assert.equal(
        sheet.cells[cell.address]?.raw,
        cell.value,
        `${format} keeps ${cell.address}`,
      );
    }
  }

  if (expectation.preservesLayout) {
    assert.ok(
      sheet.mergedCells.some(
        (range) =>
          range.startRowIndex === 0 &&
          range.startColumnIndex === 2 &&
          range.endRowIndex === 0 &&
          range.endColumnIndex === 3,
      ),
      `${format} keeps merged range C1:D1`,
    );
    assert.equal(
      sheet.columnWidths[0],
      128,
      `${format} keeps the first custom column width`,
    );
    assert.ok(sheet.hiddenRows.includes(5), `${format} keeps hidden rows`);
    assert.ok(sheet.hiddenColumns.includes(6), `${format} keeps hidden columns`);
    assert.ok(
      sheet.rowGroups.some((group) => group.startIndex === 2 && group.endIndex === 4),
      `${format} keeps row outline groups`,
    );
    assert.ok(
      sheet.columnGroups.some(
        (group) => group.startIndex === 1 && group.endIndex === 3,
      ),
      `${format} keeps column outline groups`,
    );
  }

  if (expectation.preservesMetadata) {
    assert.equal(
      document.metadata.description,
      "Golden import/export fidelity fixture",
      `${format} keeps workbook description metadata`,
    );
    assert.ok(
      document.metadata.tags.includes("golden"),
      `${format} keeps workbook tags metadata`,
    );
    assert.equal(document.metadata.favorite, true, `${format} keeps favorite metadata`);
  }

  assert.equal(
    document.macroProjects.length > 0,
    expectation.preservesMacroProject,
    `${format} macro project preservation matches expectations`,
  );

  if (expectation.preservesMacroProject) {
    assert.equal(
      document.macroProjects[0]?.vbaProjectBase64,
      btoa("golden-disabled-vba-project"),
      `${format} keeps disabled VBA binary for re-export only`,
    );
  }
}
