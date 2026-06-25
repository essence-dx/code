import { getExternalLinkIssues } from "@/features/spreadsheet/external-link-review";
import { parseCellKey } from "@/features/workbooks/addresses";
import type {
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookInspectionSeverity = "error" | "warning" | "info";

export type WorkbookInspectionIssue = {
  id: string;
  title: string;
  details: string;
  severity: WorkbookInspectionSeverity;
  category: "Privacy" | "Security" | "Review";
  count?: number;
  sheetId?: string;
  sheetName?: string;
  range?: ChartRange;
};

const externalFormulaPattern = /\b(?:https?:\/\/|mailto:|tel:|www\.)/i;

function cellRange(rowIndex: number, columnIndex: number): ChartRange {
  return {
    startRowIndex: rowIndex,
    startColumnIndex: columnIndex,
    endRowIndex: rowIndex,
    endColumnIndex: columnIndex,
  };
}

function firstCellRange(sheet: SheetData, keys: string[]) {
  for (const key of keys) {
    const position = parseCellKey(key);

    if (
      position &&
      position.rowIndex >= 0 &&
      position.rowIndex < sheet.rowCount &&
      position.columnIndex >= 0 &&
      position.columnIndex < sheet.columnCount
    ) {
      return cellRange(position.rowIndex, position.columnIndex);
    }
  }

  return undefined;
}

function nativeObjectRange(
  object: WorkbookDocument["nativeObjects"][number] | undefined,
): ChartRange | undefined {
  const anchor = object?.anchor;

  if (
    anchor?.fromRowIndex === undefined ||
    anchor.fromColumnIndex === undefined
  ) {
    return undefined;
  }

  return {
    startRowIndex: anchor.fromRowIndex,
    startColumnIndex: anchor.fromColumnIndex,
    endRowIndex: anchor.toRowIndex ?? anchor.fromRowIndex,
    endColumnIndex: anchor.toColumnIndex ?? anchor.fromColumnIndex,
  };
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function countHiddenFormulaCells(sheet: SheetData) {
  return Object.entries(sheet.cells)
    .filter(([, cell]) => cell.raw.trimStart().startsWith("="))
    .filter(([, cell]) => cell.style?.formulaHidden)
    .map(([key]) => key);
}

function countExternalFormulaCells(sheet: SheetData) {
  return Object.entries(sheet.cells)
    .filter(([, cell]) => cell.raw.trimStart().startsWith("="))
    .filter(([, cell]) => externalFormulaPattern.test(cell.raw))
    .map(([key]) => key);
}

export function getWorkbookInspectionIssues(document: WorkbookDocument) {
  const issues: WorkbookInspectionIssue[] = [];
  const protectedSheetIds = new Set(
    document.sheetProtections.map((protection) => protection.sheetId),
  );
  const metadataFields = [
    document.metadata.description,
    document.metadata.folderName,
    ...document.metadata.tags,
  ].filter((value) => value.trim().length > 0);

  if (metadataFields.length > 0) {
    issues.push({
      id: "metadata",
      title: "Workbook metadata is populated",
      details:
        "Description, folder, or tags may be included when the workbook is exported or shared.",
      severity: "info",
      category: "Privacy",
      count: metadataFields.length,
    });
  }

  if (document.cellNotes.length > 0) {
    const firstNote = document.cellNotes[0];
    const sheet = document.sheets.find((item) => item.id === firstNote.sheetId);

    issues.push({
      id: "cell-notes",
      title: "Cell comments are present",
      details: "Comments can contain private review context before sharing.",
      severity: "warning",
      category: "Privacy",
      count: document.cellNotes.length,
      sheetId: sheet?.id,
      sheetName: sheet?.name,
      range: sheet ? firstCellRange(sheet, [firstNote.cellKey]) : undefined,
    });
  }

  if (document.versionHistory.length > 0) {
    issues.push({
      id: "version-history",
      title: "Version snapshots retain workbook history",
      details:
        "Saved snapshots can preserve older values, formulas, notes, and links.",
      severity: "warning",
      category: "Privacy",
      count: document.versionHistory.length,
    });
  }

  if (document.macroProjects.length > 0) {
    issues.push({
      id: "disabled-macro-projects",
      title: "Disabled macro project is preserved",
      details:
        "Imported VBA is stored only for round-tripping. Review it before sharing or exporting back to XLSM.",
      severity: "warning",
      category: "Security",
      count: document.macroProjects.length,
    });
  }

  if (document.unsupportedParts.length > 0) {
    issues.push({
      id: "preserved-unsupported-package-parts",
      title: "Unsupported package parts are preserved",
      details:
        "Opaque imported workbook parts are kept only for XLSX/XLSM round-tripping. Review embedded files, controls, macro sheets, external links, and custom XML before sharing.",
      severity: "warning",
      category: "Security",
      count: document.unsupportedParts.length,
    });
  }

  if ((document.nativeObjects ?? []).length > 0) {
    const firstObject = document.nativeObjects[0];

    issues.push({
      id: "native-excel-objects",
      title: "Native Excel objects need review",
      details:
        "Imported charts, images, icons, connectors, shapes, OLE objects, form controls, and drawings are indexed for round-tripping. Review embedded content and controls before sharing or exporting.",
      severity: "warning",
      category: "Security",
      count: document.nativeObjects.length,
      sheetId: firstObject?.sheetId,
      sheetName: firstObject?.sheetName,
      range: nativeObjectRange(firstObject),
    });
  }

  if (document.automationScripts.length > 0) {
    issues.push({
      id: "safe-script-recordings",
      title: "Safe script recordings are present",
      details:
        "Recorded script steps run only through the workbook permission gate, but they may disclose workbook workflow details.",
      severity: "info",
      category: "Review",
      count: document.automationScripts.length,
    });
  }

  if ((document.addIns ?? []).length > 0) {
    issues.push({
      id: "workbook-add-in-manifests",
      title: "Workbook add-in manifests are registered",
      details:
        "Add-in manifests are stored disabled by default. Review requested permissions before enabling future extension execution.",
      severity: "info",
      category: "Security",
      count: document.addIns?.length ?? 0,
    });
  }

  if (document.workbookProtection === null && document.sheets.length > 1) {
    issues.push({
      id: "workbook-protection",
      title: "Workbook structure is not protected",
      details: "Sheets can still be added, renamed, duplicated, or deleted.",
      severity: "info",
      category: "Security",
      count: document.sheets.length,
    });
  }

  const externalLinkIssues = getExternalLinkIssues(document.cellLinks);

  if (externalLinkIssues.length > 0) {
    const firstIssue = externalLinkIssues[0];
    const firstLink = document.cellLinks.find(
      (link) => link.id === firstIssue.linkId,
    );
    const sheet = document.sheets.find((item) => item.id === firstLink?.sheetId);

    issues.push({
      id: "external-link-issues",
      title: "External links need review",
      details: "Broken, unsupported, or unencrypted links were found.",
      severity: externalLinkIssues.some((issue) => issue.severity === "error")
        ? "error"
        : "warning",
      category: "Security",
      count: externalLinkIssues.length,
      sheetId: sheet?.id,
      sheetName: sheet?.name,
      range: sheet
        ? firstCellRange(sheet, [firstLink?.cellKey ?? ""])
        : undefined,
    });
  } else if (document.cellLinks.length > 0) {
    const firstLink = document.cellLinks[0];
    const sheet = document.sheets.find((item) => item.id === firstLink.sheetId);

    issues.push({
      id: "external-links",
      title: "External links are present",
      details: "Review outbound links before sharing this workbook.",
      severity: "info",
      category: "Security",
      count: document.cellLinks.length,
      sheetId: sheet?.id,
      sheetName: sheet?.name,
      range: sheet ? firstCellRange(sheet, [firstLink.cellKey]) : undefined,
    });
  }

  for (const sheet of document.sheets) {
    const hiddenFormulaKeys = countHiddenFormulaCells(sheet);

    if (hiddenFormulaKeys.length > 0 && !protectedSheetIds.has(sheet.id)) {
      issues.push({
        id: `unprotected-hidden-formulas:${sheet.id}`,
        title: "Hidden formulas are not protected",
        details:
          "Formula hiding only takes effect after sheet protection is enabled.",
        severity: "warning",
        category: "Security",
        count: hiddenFormulaKeys.length,
        sheetId: sheet.id,
        sheetName: sheet.name,
        range: firstCellRange(sheet, hiddenFormulaKeys),
      });
    }

    const hiddenStructureCount =
      sheet.hiddenRows.length + sheet.hiddenColumns.length;

    if (hiddenStructureCount > 0) {
      issues.push({
        id: `hidden-structure:${sheet.id}`,
        title: "Rows or columns are hidden",
        details: "Hidden worksheet structure may still contain private data.",
        severity: "warning",
        category: "Privacy",
        count: hiddenStructureCount,
        sheetId: sheet.id,
        sheetName: sheet.name,
      });
    }

    const externalFormulaKeys = countExternalFormulaCells(sheet);

    if (externalFormulaKeys.length > 0) {
      issues.push({
        id: `external-formulas:${sheet.id}`,
        title: "Formulas contain external addresses",
        details: "Review URL-like text inside formulas before sharing.",
        severity: "warning",
        category: "Security",
        count: externalFormulaKeys.length,
        sheetId: sheet.id,
        sheetName: sheet.name,
        range: firstCellRange(sheet, externalFormulaKeys),
      });
    }
  }

  const printHeaderFooterCount = document.sheetPrintSettings.filter(
    (settings) => settings.headerText.trim() || settings.footerText.trim(),
  ).length;

  if (printHeaderFooterCount > 0) {
    issues.push({
      id: "print-header-footer",
      title: "Print headers or footers are populated",
      details: "Headers and footers may disclose file, author, or workflow text.",
      severity: "info",
      category: "Privacy",
      count: printHeaderFooterCount,
    });
  }

  const customViewsWithHiddenState = document.customViews.filter(
    (view) => view.hiddenRows.length > 0 || view.hiddenColumns.length > 0,
  );

  if (customViewsWithHiddenState.length > 0) {
    issues.push({
      id: "custom-view-hidden-state",
      title: "Custom views save hidden rows or columns",
      details: "Saved views can restore hidden worksheet structure.",
      severity: "info",
      category: "Review",
      count: customViewsWithHiddenState.length,
    });
  }

  if (document.workbookProtection && document.sheetProtections.length > 0) {
    const protectedSheetCount = document.sheetProtections.length;

    issues.push({
      id: "protected-workbook",
      title: "Workbook protection is enabled",
      details: `${pluralize(protectedSheetCount, "sheet")} and workbook structure are protected.`,
      severity: "info",
      category: "Security",
      count: protectedSheetCount,
    });
  }

  return issues;
}
