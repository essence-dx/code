import * as XLSX from "xlsx";
import { cellKey } from "@/features/workbooks/addresses";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import {
  getEffectiveHiddenColumns,
  getEffectiveHiddenRows,
} from "@/features/spreadsheet/outline-groups";
import { createBlankSheet } from "@/features/workbooks/default-workbook";
import { defaultWorkbookTheme } from "@/features/workbooks/workbook-themes";
import {
  cellStyleToExcelNumberFormat,
  excelNumberFormatToCellStyle,
} from "@/features/workbooks/number-formats";
import { createImportedVbaProject } from "@/features/workbooks/workbook-automation";
import { recoverOoxmlWorkbookDocument } from "@/features/workbooks/workbook-recovery";
import {
  getWorkbookProtectionFromPackage,
  markWorkbookPackageAsTemplate,
  type OoxmlWorkbookFormat,
} from "@/features/workbooks/workbook-template-package";
import {
  applyUnsupportedWorkbookPartsToBuffer,
  getUnsupportedWorkbookParts,
} from "@/features/workbooks/workbook-unsupported-parts";
import { discoverNativeWorkbookObjects } from "@/features/workbooks/workbook-native-objects";
import { applyGeneratedNative3DChartsToBuffer } from "@/features/workbooks/workbook-native-chart-export";
import type {
  CellRecord,
  CellStyle,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

type WorkbookBookType = "xlsx" | "xlsm" | "ods" | "biff8";
type WorkbookSourceFormat = OoxmlWorkbookFormat | "xls" | "ods";
type WorkbookCustomProps = Record<string, unknown>;

const METADATA_TAG_SEPARATOR = ", ";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function rawVbaToBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
  }

  if (typeof value === "string") {
    return Uint8Array.from(value, (character) => character.charCodeAt(0));
  }

  return null;
}

function xlsxCellStyle(cell: XLSX.CellObject): CellStyle | undefined {
  return excelNumberFormatToCellStyle(cell.z);
}

function cellToXlsxValue(cell?: CellRecord) {
  if (!cell?.raw) {
    return undefined;
  }

  const numberFormat = cellStyleToExcelNumberFormat(cell.style);

  if (cell.raw.startsWith("=")) {
    return {
      f: cell.raw.slice(1),
      ...(numberFormat ? { z: numberFormat } : {}),
    };
  }

  const numeric = Number(cell.raw);

  if (Number.isFinite(numeric) && cell.raw.trim() !== "") {
    return numberFormat
      ? {
          t: "n",
          v: numeric,
          z: numberFormat,
        }
      : numeric;
  }

  return numberFormat
    ? {
        t: "s",
        v: cell.raw,
        z: numberFormat,
      }
    : cell.raw;
}

function getOutlineLevel(
  groups: SheetData["rowGroups"],
  index: number,
) {
  return groups.reduce((level, group) => {
    if (index < group.startIndex || index > group.endIndex) {
      return level;
    }

    return Math.max(level, group.level);
  }, 0);
}

function buildOutlineGroupsFromLevels(levels: number[]) {
  const normalizedLevels = levels.map((level) =>
    Number.isFinite(level) ? Math.min(Math.max(Math.floor(level), 0), 8) : 0,
  );
  const groups: SheetData["rowGroups"] = [];
  const maxLevel = Math.max(0, ...normalizedLevels);

  for (let level = 1; level <= maxLevel; level += 1) {
    let startIndex: number | null = null;

    for (let index = 0; index <= normalizedLevels.length; index += 1) {
      const isInLevel = (normalizedLevels[index] ?? 0) >= level;

      if (isInLevel && startIndex === null) {
        startIndex = index;
        continue;
      }

      if ((!isInLevel || index === levels.length) && startIndex !== null) {
        const endIndex = index - 1;

        if (endIndex > startIndex) {
          groups.push({
            id: `outline_${crypto.randomUUID()}`,
            startIndex,
            endIndex,
            level,
            collapsed: false,
          });
        }

        startIndex = null;
      }
    }
  }

  return groups;
}

function sheetToWorksheet(sheet: SheetData) {
  const rows: unknown[][] = [];

  for (let rowIndex = 0; rowIndex < sheet.rowCount; rowIndex += 1) {
    const row: unknown[] = [];

    for (let columnIndex = 0; columnIndex < sheet.columnCount; columnIndex += 1) {
      row.push(cellToXlsxValue(sheet.cells[cellKey(rowIndex, columnIndex)]));
    }

    rows.push(row);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const hiddenColumns = getEffectiveHiddenColumns(sheet);
  const hiddenRows = getEffectiveHiddenRows(sheet);

  worksheet["!cols"] = Array.from({ length: sheet.columnCount }, (_, columnIndex) => ({
    hidden: hiddenColumns.has(columnIndex),
    level: getOutlineLevel(sheet.columnGroups ?? [], columnIndex),
    wpx: sheet.columnWidths[String(columnIndex)] ?? 112,
  }));
  worksheet["!rows"] = Array.from({ length: sheet.rowCount }, (_, rowIndex) => ({
    hidden: hiddenRows.has(rowIndex),
    level: getOutlineLevel(sheet.rowGroups ?? [], rowIndex),
  }));
  worksheet["!merges"] = (sheet.mergedCells ?? []).map((range) => ({
    s: {
      r: range.startRowIndex,
      c: range.startColumnIndex,
    },
    e: {
      r: range.endRowIndex,
      c: range.endColumnIndex,
    },
  }));

  return worksheet;
}

function worksheetToSheet(worksheet: XLSX.WorkSheet, name: string) {
  const sheet = createBlankSheet(name);
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");

  sheet.rowCount = Math.max(sheet.rowCount, range.e.r + 1);
  sheet.columnCount = Math.max(sheet.columnCount, range.e.c + 1);
  sheet.columnWidths =
    worksheet["!cols"]?.reduce<Record<string, number>>((widths, column, index) => {
      const width = column.wpx ?? (column.wch ? column.wch * 8 : undefined);

      if (width) {
        widths[String(index)] = Math.round(width);
      }

      return widths;
    }, {}) ?? {};
  sheet.hiddenColumns =
    worksheet["!cols"]?.reduce<number[]>((hiddenColumns, column, index) => {
      if (column.hidden) {
        hiddenColumns.push(index);
      }

      return hiddenColumns;
    }, []) ?? [];
  sheet.hiddenRows =
    worksheet["!rows"]?.reduce<number[]>((hiddenRows, row, index) => {
      if (row.hidden) {
        hiddenRows.push(index);
      }

      return hiddenRows;
    }, []) ?? [];
  sheet.columnGroups = buildOutlineGroupsFromLevels(
    Array.from({ length: sheet.columnCount }, (_, index) =>
      Number(
        (worksheet["!cols"]?.[index] as { level?: unknown } | undefined)?.level ??
          0,
      ),
    ),
  );
  sheet.rowGroups = buildOutlineGroupsFromLevels(
    Array.from({ length: sheet.rowCount }, (_, index) =>
      Number(
        (worksheet["!rows"]?.[index] as { level?: unknown } | undefined)?.level ??
          0,
      ),
    ),
  );
  sheet.mergedCells =
    worksheet["!merges"]?.map((range) => ({
      id: `merge_${crypto.randomUUID()}`,
      startRowIndex: range.s.r,
      startColumnIndex: range.s.c,
      endRowIndex: range.e.r,
      endColumnIndex: range.e.c,
    })) ?? [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = worksheet[address];

      if (!cell) {
        continue;
      }

      const raw =
        typeof cell.f === "string"
          ? canonicalizeFormulaInput(`=${cell.f}`)
          : cell.v === undefined || cell.v === null
            ? ""
            : String(cell.v);
      const style = xlsxCellStyle(cell);

      if (raw || style) {
        sheet.cells[cellKey(rowIndex, columnIndex)] = {
          raw,
          ...(style ? { style } : {}),
        };
      }
    }
  }

  return sheet;
}

function parseMetadataDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function safeMetadataText(value: string, limit: number) {
  const text = value.trim();

  return text ? text.slice(0, limit) : undefined;
}

function workbookMetadataToProperties(
  document: WorkbookDocument,
): XLSX.FullProperties {
  const modifiedDate = parseMetadataDate(document.metadata.updatedAt);

  return {
    Subject: safeMetadataText(document.metadata.folderName, 120),
    Keywords:
      document.metadata.tags.length > 0
        ? document.metadata.tags.join(METADATA_TAG_SEPARATOR)
        : undefined,
    Comments: safeMetadataText(document.metadata.description, 1000),
    ModifiedDate: modifiedDate,
    Application: "Essence Excel",
  };
}

function workbookMetadataToCustomProperties(
  document: WorkbookDocument,
): WorkbookCustomProps {
  return {
    EssenceDescription: document.metadata.description,
    EssenceFavorite: document.metadata.favorite,
    EssenceFolderName: document.metadata.folderName,
    EssenceTemplate: document.metadata.isTemplate,
    EssenceLastOpenedAt: document.metadata.lastOpenedAt,
    EssenceTags: document.metadata.tags.join(METADATA_TAG_SEPARATOR),
    EssenceUpdatedAt: document.metadata.updatedAt,
    EssenceVersionHistoryCount: document.versionHistory.length,
    EssenceVersionRestoreCount: document.versionRestores.length,
    EssenceMacroProjectCount: document.macroProjects.length,
    EssenceNativeObjectCount: document.nativeObjects.length,
    EssenceAutomationScriptCount: document.automationScripts.length,
  };
}

function getCustomProps(workbook: XLSX.WorkBook): WorkbookCustomProps {
  return typeof workbook.Custprops === "object" && workbook.Custprops !== null
    ? (workbook.Custprops as WorkbookCustomProps)
    : {};
}

function getStringMetadata(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDateMetadata(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return getStringMetadata(value);
}

function getBooleanMetadata(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
}

function splitMetadataTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,;]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 32)),
    ),
  ).slice(0, 12);
}

function workbookPropertiesToMetadata(workbook: XLSX.WorkBook) {
  const customProps = getCustomProps(workbook);
  const properties = workbook.Props;
  const updatedAt =
    getStringMetadata(customProps.EssenceUpdatedAt) ||
    getDateMetadata(properties?.ModifiedDate);

  return {
    description:
      getStringMetadata(customProps.EssenceDescription) ||
      getStringMetadata(properties?.Comments),
    favorite: getBooleanMetadata(customProps.EssenceFavorite),
    folderName:
      getStringMetadata(customProps.EssenceFolderName) ||
      getStringMetadata(properties?.Subject),
    isTemplate: getBooleanMetadata(customProps.EssenceTemplate),
    lastOpenedAt: getStringMetadata(customProps.EssenceLastOpenedAt),
    tags: splitMetadataTags(
      getStringMetadata(customProps.EssenceTags) ||
        getStringMetadata(properties?.Keywords),
    ),
    updatedAt,
  };
}

function workbookDocumentToBook(
  document: WorkbookDocument,
  bookType: WorkbookBookType,
  options?: {
    templateFormat?: "xltx" | "xltm";
  },
) {
  const workbook = XLSX.utils.book_new();
  const exportDocument = options?.templateFormat
    ? {
        ...document,
        metadata: {
          ...document.metadata,
          isTemplate: true,
        },
      }
    : document;
  const preservedVbaProject = exportDocument.macroProjects[0];

  workbook.Props = workbookMetadataToProperties(exportDocument);
  workbook.Custprops = workbookMetadataToCustomProperties(exportDocument);

  if (bookType === "xlsm" && preservedVbaProject?.vbaProjectBase64) {
    workbook.vbaraw = base64ToBytes(preservedVbaProject.vbaProjectBase64);
    workbook.Workbook = {
      ...(workbook.Workbook ?? {}),
      Sheets: exportDocument.sheets.map((sheet) => {
        const preservedSheet = preservedVbaProject.sheetCodeNames.find(
          (item) => item.sheetName === sheet.name,
        );

        return {
          name: sheet.name,
          ...(preservedSheet ? { CodeName: preservedSheet.codeName } : {}),
        };
      }),
    };
  }

  for (const sheet of exportDocument.sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      sheetToWorksheet(sheet),
      sheet.name.slice(0, 31) || "Sheet",
    );
  }

  let exported = XLSX.write(workbook, {
    bookType,
    type: "array",
  }) as ArrayBuffer;

  if (bookType === "xlsx" || bookType === "xlsm") {
    exported = applyUnsupportedWorkbookPartsToBuffer(exported, exportDocument);
    exported = applyGeneratedNative3DChartsToBuffer(exported, exportDocument);
  }

  if (options?.templateFormat) {
    exported = markWorkbookPackageAsTemplate({
      buffer: exported,
      format: options.templateFormat,
    });
  }

  return exported;
}

function getWorkbookSheetCodeNames(workbook: XLSX.WorkBook) {
  return (workbook.Workbook?.Sheets ?? [])
    .flatMap((sheet, index) => {
      if (!sheet.CodeName) {
        return [];
      }

      return [
        {
          sheetName:
            workbook.SheetNames[index] ?? sheet.name ?? `Sheet ${index + 1}`,
          codeName: sheet.CodeName,
          hiddenState:
            sheet.Hidden === 2
              ? "veryHidden"
              : sheet.Hidden === 1
                ? "hidden"
                : "visible",
        } as const,
      ];
    });
}

function getWorkbookMacroProjects(
  workbook: XLSX.WorkBook,
  sourceFormat: "xlsm" | "xls" | "xltm",
) {
  const vbaBytes = rawVbaToBytes(workbook.vbaraw);

  if (!vbaBytes) {
    return [];
  }

  return [
    createImportedVbaProject({
      binarySize: vbaBytes.byteLength,
      name: "Preserved VBA project",
      sourceFormat: sourceFormat === "xls" ? "xls" : "xlsm",
      vbaProjectBase64: bytesToBase64(vbaBytes),
      sheetCodeNames: getWorkbookSheetCodeNames(workbook),
    }),
  ];
}

function workbookBufferToDocument(
  buffer: ArrayBuffer,
  sourceFormat: WorkbookSourceFormat,
): WorkbookDocument {
  const ooxmlFormat =
    sourceFormat === "xlsx" ||
    sourceFormat === "xlsm" ||
    sourceFormat === "xltx" ||
    sourceFormat === "xltm"
      ? sourceFormat
      : null;
  const macroFormat = sourceFormat === "xlsm" || sourceFormat === "xltm";
  const workbook = XLSX.read(buffer, {
    bookFiles: Boolean(ooxmlFormat),
    bookVBA: macroFormat || sourceFormat === "xls",
    cellFormula: true,
    cellNF: true,
    cellStyles: true,
    type: "array",
  });
  const sheets = workbook.SheetNames.map((name) =>
    worksheetToSheet(workbook.Sheets[name], name),
  );
  const fallbackSheet = createBlankSheet();
  const firstSheet = sheets[0] ?? fallbackSheet;
  const metadata = {
    ...workbookPropertiesToMetadata(workbook),
    isTemplate:
      sourceFormat === "xltx" ||
      sourceFormat === "xltm" ||
      workbookPropertiesToMetadata(workbook).isTemplate,
  };
  const unsupportedParts = ooxmlFormat
    ? getUnsupportedWorkbookParts(
        workbook,
        ooxmlFormat === "xlsm" || ooxmlFormat === "xltm" ? "xlsm" : "xlsx",
      )
    : [];
  const nativeObjects = ooxmlFormat
    ? discoverNativeWorkbookObjects({
        importedAt: new Date().toISOString(),
        sheetNames: workbook.SheetNames,
        sheets,
        unsupportedParts,
      })
    : [];

  return {
    version: 1,
    metadata,
    activeSheetId: firstSheet.id,
    versionHistory: [],
    versionRestores: [],
    customViews: [],
    formulaWatches: [],
    whatIfScenarios: [],
    theme: defaultWorkbookTheme,
    cellStyles: [],
    queries: [],
    macroProjects:
      macroFormat || sourceFormat === "xls"
        ? getWorkbookMacroProjects(workbook, sourceFormat)
        : [],
    unsupportedParts,
    nativeObjects,
    automationScripts: [],
    workbookProtection: ooxmlFormat
      ? getWorkbookProtectionFromPackage({
          buffer,
          sourceFormat: ooxmlFormat,
        })
      : null,
    sheets: sheets.length > 0 ? sheets : [fallbackSheet],
    charts: [],
    sparklines: [],
    insertedObjects: [],
    tables: [],
    tableSlicers: [],
    tableTimelines: [],
    pivotTables: [],
    conditionalFormats: [],
    dataValidations: [],
    filters: [],
    filterPresets: [],
    cellNotes: [],
    commentNotifications: [],
    cellLinks: [],
    namedRanges: [],
    sheetProtections: [],
    sheetPrintSettings: [],
  };
}

export function workbookDocumentToXlsx(document: WorkbookDocument) {
  return workbookDocumentToBook(document, "xlsx");
}

export function workbookDocumentToXlsm(document: WorkbookDocument) {
  return workbookDocumentToBook(document, "xlsm");
}

export function workbookDocumentToXltx(document: WorkbookDocument) {
  return workbookDocumentToBook(document, "xlsx", { templateFormat: "xltx" });
}

export function workbookDocumentToXltm(document: WorkbookDocument) {
  return workbookDocumentToBook(document, "xlsm", { templateFormat: "xltm" });
}

export function workbookDocumentToOds(document: WorkbookDocument) {
  return workbookDocumentToBook(document, "ods");
}

export function workbookDocumentToXls(document: WorkbookDocument) {
  return workbookDocumentToBook(document, "biff8");
}

export function xlsxToWorkbookDocument(buffer: ArrayBuffer): WorkbookDocument {
  return workbookBufferToDocument(buffer, "xlsx");
}

export function xlsmToWorkbookDocument(buffer: ArrayBuffer): WorkbookDocument {
  return workbookBufferToDocument(buffer, "xlsm");
}

export function xltxToWorkbookDocument(buffer: ArrayBuffer): WorkbookDocument {
  return workbookBufferToDocument(buffer, "xltx");
}

export function xltmToWorkbookDocument(buffer: ArrayBuffer): WorkbookDocument {
  return workbookBufferToDocument(buffer, "xltm");
}

export function odsToWorkbookDocument(buffer: ArrayBuffer): WorkbookDocument {
  return workbookBufferToDocument(buffer, "ods");
}

export function xlsToWorkbookDocument(buffer: ArrayBuffer): WorkbookDocument {
  return workbookBufferToDocument(buffer, "xls");
}

export function recoverWorkbookDocumentFromBuffer({
  buffer,
  sourceFormat,
}: {
  buffer: ArrayBuffer;
  sourceFormat: WorkbookSourceFormat;
}) {
  if (
    sourceFormat !== "xlsx" &&
    sourceFormat !== "xlsm" &&
    sourceFormat !== "xltx" &&
    sourceFormat !== "xltm"
  ) {
    return {
      document: workbookBufferToDocument(buffer, sourceFormat),
      recoveredSheetCount: 0,
      usedPackageRecovery: false,
    };
  }

  try {
    return {
      document: workbookBufferToDocument(buffer, sourceFormat),
      recoveredSheetCount: 0,
      usedPackageRecovery: false,
    };
  } catch {
    const recovered = recoverOoxmlWorkbookDocument({
      buffer,
      sourceFormat,
    });

    return {
      ...recovered,
      usedPackageRecovery: true,
    };
  }
}
