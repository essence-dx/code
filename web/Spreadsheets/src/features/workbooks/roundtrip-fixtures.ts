import type { CellRecord, SheetData, WorkbookDocument } from "./types";
import { createDefaultWorkbookDocument } from "./default-workbook";
import { createImportedVbaProject } from "./workbook-automation";

export type GoldenRoundTripFormat = "xlsx" | "xlsm" | "ods" | "xltx" | "xltm";

export type GoldenRoundTripExpectation = {
  format: GoldenRoundTripFormat;
  preservesFormula: boolean;
  preservesLayout: boolean;
  preservesMetadata: boolean;
  preservesTemplateFlag: boolean;
  preservesMacroProject: boolean;
};

export type GoldenRoundTripCell = {
  address: string;
  value: string;
};

export const goldenRoundTripExpectations: GoldenRoundTripExpectation[] = [
  {
    format: "xlsx",
    preservesFormula: true,
    preservesLayout: true,
    preservesMetadata: true,
    preservesTemplateFlag: false,
    preservesMacroProject: false,
  },
  {
    format: "xlsm",
    preservesFormula: true,
    preservesLayout: true,
    preservesMetadata: true,
    preservesTemplateFlag: false,
    preservesMacroProject: true,
  },
  {
    format: "ods",
    preservesFormula: false,
    preservesLayout: false,
    preservesMetadata: false,
    preservesTemplateFlag: false,
    preservesMacroProject: false,
  },
  {
    format: "xltx",
    preservesFormula: true,
    preservesLayout: true,
    preservesMetadata: true,
    preservesTemplateFlag: true,
    preservesMacroProject: false,
  },
  {
    format: "xltm",
    preservesFormula: true,
    preservesLayout: true,
    preservesMetadata: true,
    preservesTemplateFlag: true,
    preservesMacroProject: true,
  },
];

export const goldenRoundTripCells: GoldenRoundTripCell[] = [
  { address: "A1", value: "Golden fixture" },
  { address: "A2", value: "42" },
  { address: "D2", value: "text, comma" },
];

export const goldenRoundTripFormulaCells: GoldenRoundTripCell[] = [
  { address: "B2", value: "=A2*2" },
];

export function createGoldenRoundTripWorkbook(): WorkbookDocument {
  const document = createDefaultWorkbookDocument();
  const sheet = createGoldenRoundTripSheet(document.sheets[0]);
  const macroProject = createImportedVbaProject({
    sourceFormat: "xlsm",
    vbaProjectBase64: btoa("golden-disabled-vba-project"),
    binarySize: "golden-disabled-vba-project".length,
    name: "Golden disabled VBA project",
    sheetCodeNames: [
      {
        sheetName: sheet.name,
        codeName: "FidelitySheet",
        hiddenState: "visible",
      },
    ],
  });

  return {
    ...document,
    metadata: {
      ...document.metadata,
      description: "Golden import/export fidelity fixture",
      favorite: true,
      folderName: "Fidelity",
      isTemplate: false,
      lastOpenedAt: "2026-05-16T00:00:00.000Z",
      tags: ["golden", "roundtrip", "fidelity"],
      updatedAt: "2026-05-16T00:30:00.000Z",
    },
    sheets: [sheet],
    activeSheetId: sheet.id,
    macroProjects: [macroProject],
  };
}

export function getGoldenRoundTripExpectation(format: GoldenRoundTripFormat) {
  const expectation = goldenRoundTripExpectations.find((item) => item.format === format);

  if (!expectation) {
    throw new Error(`No golden round-trip expectation for ${format}`);
  }

  return expectation;
}

function createGoldenRoundTripSheet(sheet: SheetData): SheetData {
  return {
    ...sheet,
    name: "Fidelity",
    rowCount: 12,
    columnCount: 8,
    cells: createGoldenRoundTripCells(),
    columnWidths: {
      0: 128,
      1: 96,
      2: 112,
    },
    hiddenRows: [5],
    hiddenColumns: [6],
    rowGroups: [
      {
        id: "row_group_golden",
        startIndex: 2,
        endIndex: 4,
        level: 1,
        collapsed: false,
      },
    ],
    columnGroups: [
      {
        id: "column_group_golden",
        startIndex: 1,
        endIndex: 3,
        level: 1,
        collapsed: false,
      },
    ],
    mergedCells: [
      {
        id: "merge_golden",
        startRowIndex: 0,
        startColumnIndex: 2,
        endRowIndex: 0,
        endColumnIndex: 3,
      },
    ],
  };
}

function createGoldenRoundTripCells(): Record<string, CellRecord> {
  return {
    A1: {
      raw: "Golden fixture",
    },
    A2: {
      raw: "42",
    },
    B2: {
      raw: "=A2*2",
    },
    C2: {
      raw: "2026-05-16",
      style: {
        numberFormat: "date",
      },
    },
    D2: {
      raw: "text, comma",
    },
    A4: {
      raw: "Merged",
    },
    C4: {
      raw: "1234.5",
      style: {
        numberFormat: "currency",
      },
    },
    D4: {
      raw: "0.25",
      style: {
        numberFormat: "percent",
      },
    },
  };
}
