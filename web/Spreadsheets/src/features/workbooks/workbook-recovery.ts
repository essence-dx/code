import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { createBlankSheet } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  detectEncryptedOoxmlPackage,
  getWorkbookProtectionFromPackage,
  readOoxmlPackage,
  readOoxmlPackageText,
  type OoxmlWorkbookFormat,
} from "@/features/workbooks/workbook-template-package";
import type { SheetData, WorkbookDocument } from "@/features/workbooks/types";

function decodeXmlText(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readAttributes(source: string) {
  const attributes = new Map<string, string>();
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    attributes.set(match[1] ?? "", decodeXmlText(match[2] ?? ""));
  }

  return attributes;
}

function getSheetNames(workbookXml: string) {
  const names: string[] = [];
  const pattern = /<sheet\b([^>]*)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(workbookXml)) !== null) {
    const attributes = readAttributes(match[1] ?? "");
    const name = attributes.get("name")?.trim();

    if (name) {
      names.push(name.slice(0, 31));
    }
  }

  return names;
}

function getWorksheetPaths(cfb: unknown) {
  const workbookXml = readOoxmlPackageText(cfb, "xl/workbook.xml");
  const sheetNames = getSheetNames(workbookXml);
  const paths = Array.from({ length: Math.max(sheetNames.length, 1) }, (_, index) =>
    `xl/worksheets/sheet${index + 1}.xml`,
  );

  return paths.map((path, index) => ({
    name: sheetNames[index] ?? `Recovered ${index + 1}`,
    path,
  }));
}

function readSharedStrings(cfb: unknown) {
  const xml = readOoxmlPackageText(cfb, "xl/sharedStrings.xml");
  const values: string[] = [];
  const pattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const textValues = Array.from(
      (match[1] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g),
      (textMatch) => decodeXmlText(textMatch[1] ?? ""),
    );

    values.push(textValues.join(""));
  }

  return values;
}

function readCellText({
  body,
  sharedStrings,
  type,
}: {
  body: string;
  sharedStrings: string[];
  type?: string;
}) {
  const formula = /<f\b[^>]*>([\s\S]*?)<\/f>/i.exec(body)?.[1];

  if (formula !== undefined) {
    return `=${decodeXmlText(formula)}`;
  }

  const inlineText = /<is\b[^>]*>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/i.exec(
    body,
  )?.[1];

  if (inlineText !== undefined) {
    return decodeXmlText(inlineText);
  }

  const value = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(body)?.[1] ?? "";

  if (type === "s") {
    return sharedStrings[Number(value)] ?? "";
  }

  return decodeXmlText(value);
}

function recoverWorksheet({
  name,
  sharedStrings,
  xml,
}: {
  name: string;
  sharedStrings: string[];
  xml: string;
}): SheetData {
  const sheet = createBlankSheet(name);
  let maxRowIndex = 0;
  let maxColumnIndex = 0;
  const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = cellPattern.exec(xml)) !== null) {
    const attributes = readAttributes(match[1] ?? match[3] ?? "");
    const reference = attributes.get("r");
    const position = reference ? parseCellKey(reference) : null;

    if (!position) {
      continue;
    }

    const raw = readCellText({
      body: match[2] ?? "",
      sharedStrings,
      type: attributes.get("t"),
    });

    if (!raw) {
      continue;
    }

    sheet.cells[cellKey(position.rowIndex, position.columnIndex)] = { raw };
    maxRowIndex = Math.max(maxRowIndex, position.rowIndex);
    maxColumnIndex = Math.max(maxColumnIndex, position.columnIndex);
  }

  sheet.rowCount = Math.max(sheet.rowCount, maxRowIndex + 1);
  sheet.columnCount = Math.max(sheet.columnCount, maxColumnIndex + 1);

  return sheet;
}

function createEncryptedRecoveryDocument({
  buffer,
  sourceFormat,
}: {
  buffer: ArrayBuffer;
  sourceFormat: OoxmlWorkbookFormat;
}) {
  const document = normalizeWorkbookDocument({
    version: 1,
    metadata: {
      description:
        "This file is encrypted or password-protected. Essence Excel preserved the protection metadata, but the sheet contents require the original password in Excel-compatible software.",
      favorite: false,
      folderName: "Recovered imports",
      isTemplate: sourceFormat === "xltx" || sourceFormat === "xltm",
      lastOpenedAt: "",
      tags: ["recovery", "password-protected"],
      updatedAt: new Date().toISOString(),
    },
    activeSheetId: "",
    versionHistory: [],
    versionRestores: [],
    customViews: [],
    formulaWatches: [],
    whatIfScenarios: [],
    theme: undefined,
    cellStyles: [],
    queries: [],
    macroProjects: [],
    unsupportedParts: [],
    nativeObjects: [],
    automationScripts: [],
    workbookProtection: getWorkbookProtectionFromPackage({
      buffer,
      sourceFormat,
    }),
    sheets: [createBlankSheet("Password protected")],
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
  });

  return {
    document,
    recoveredSheetCount: 0,
  };
}

export function recoverOoxmlWorkbookDocument({
  buffer,
  sourceFormat,
}: {
  buffer: ArrayBuffer;
  sourceFormat: OoxmlWorkbookFormat;
}) {
  if (detectEncryptedOoxmlPackage(buffer)) {
    return createEncryptedRecoveryDocument({ buffer, sourceFormat });
  }

  const cfb = readOoxmlPackage(buffer);
  const sharedStrings = readSharedStrings(cfb);
  const sheets = getWorksheetPaths(cfb).flatMap(({ name, path }) => {
    const xml = readOoxmlPackageText(cfb, path);

    return xml
      ? [
          recoverWorksheet({
            name,
            sharedStrings,
            xml,
          }),
        ]
      : [];
  });
  const recoveredSheets = sheets.length ? sheets : [createBlankSheet("Recovered")];
  const document = normalizeWorkbookDocument({
    version: 1,
    metadata: {
      description:
        "Recovered from the workbook package. Review formulas, formatting, tables, charts, and external metadata before relying on this file.",
      favorite: false,
      folderName: "Recovered imports",
      isTemplate: sourceFormat === "xltx" || sourceFormat === "xltm",
      lastOpenedAt: "",
      tags: ["recovery"],
      updatedAt: new Date().toISOString(),
    },
    activeSheetId: recoveredSheets[0]?.id ?? "",
    versionHistory: [],
    versionRestores: [],
    customViews: [],
    formulaWatches: [],
    whatIfScenarios: [],
    theme: undefined,
    cellStyles: [],
    queries: [],
    macroProjects: [],
    unsupportedParts: [],
    nativeObjects: [],
    automationScripts: [],
    workbookProtection: getWorkbookProtectionFromPackage({
      buffer,
      sourceFormat,
    }),
    sheets: recoveredSheets,
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
  });

  return {
    document,
    recoveredSheetCount: sheets.length,
  };
}
