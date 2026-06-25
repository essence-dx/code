import { normalizeCellLinkUrl } from "@/features/workbooks/cell-links";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  hasFormulaSecurityRisk,
  isFormulaBlockedBySecurityPolicy,
  neutralizeFormulaForStorage,
} from "@/features/workbooks/formula-security";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type {
  CellLink,
  CellNote,
  ConditionalFormatRule,
  DataValidationRule,
  FormulaWatch,
  SheetData,
  SheetPrintSettings,
  WorkbookDocument,
  WorkbookMetadata,
} from "@/features/workbooks/types";

export type ImportSanitizationReport = {
  cleanedTextCount: number;
  disabledFormulaCount: number;
  normalizedLinkCount: number;
  removedLinkCount: number;
  removedSnapshotCount: number;
  removedRestoreCount: number;
};

const emptyReport: ImportSanitizationReport = {
  cleanedTextCount: 0,
  disabledFormulaCount: 0,
  normalizedLinkCount: 0,
  removedLinkCount: 0,
  removedSnapshotCount: 0,
  removedRestoreCount: 0,
};

const controlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cloneReport() {
  return { ...emptyReport };
}

function cleanText(value: string, report: ImportSanitizationReport) {
  const cleanedValue = value.replace(controlCharacterPattern, "");

  if (cleanedValue !== value) {
    report.cleanedTextCount += 1;
  }

  return cleanedValue;
}

function sanitizeFormula(value: string, report: ImportSanitizationReport) {
  if (!isFormulaBlockedBySecurityPolicy(value)) {
    return value;
  }

  report.disabledFormulaCount += 1;
  return neutralizeFormulaForStorage(value);
}

function sanitizeRuleFormula(value: string, report: ImportSanitizationReport) {
  const cleanedValue = cleanText(value, report);

  if (!hasFormulaSecurityRisk(cleanedValue)) {
    return cleanedValue;
  }

  report.disabledFormulaCount += 1;
  return "=FALSE";
}

function sanitizeSheet(sheet: SheetData, report: ImportSanitizationReport) {
  const sanitizedSheet = structuredClone(sheet);

  for (const cell of Object.values(sanitizedSheet.cells)) {
    const cleanedRaw = cleanText(cell.raw, report);
    cell.raw = sanitizeFormula(cleanedRaw, report);
  }

  return sanitizedSheet;
}

function sanitizeConditionalFormats(
  rules: ConditionalFormatRule[],
  report: ImportSanitizationReport,
) {
  return rules.map((rule) =>
    rule.operator === "formula"
      ? {
          ...rule,
          value: sanitizeRuleFormula(rule.value, report),
        }
      : {
          ...rule,
          value: cleanText(rule.value, report),
        },
  );
}

function sanitizeDataValidations(
  rules: DataValidationRule[],
  report: ImportSanitizationReport,
) {
  return rules.map((rule) =>
    rule.type === "customFormula"
      ? {
          ...rule,
          value: sanitizeRuleFormula(rule.value, report),
          inputMessage: rule.inputMessage
            ? cleanText(rule.inputMessage, report)
            : undefined,
          errorMessage: rule.errorMessage
            ? cleanText(rule.errorMessage, report)
            : undefined,
          dependentCell: rule.dependentCell
            ? cleanText(rule.dependentCell, report)
            : undefined,
        }
      : {
          ...rule,
          value: cleanText(rule.value, report),
          inputMessage: rule.inputMessage
            ? cleanText(rule.inputMessage, report)
            : undefined,
          errorMessage: rule.errorMessage
            ? cleanText(rule.errorMessage, report)
            : undefined,
          dependentCell: rule.dependentCell
            ? cleanText(rule.dependentCell, report)
            : undefined,
        },
  );
}

function sanitizeMetadata(
  metadata: WorkbookMetadata,
  report: ImportSanitizationReport,
) {
  return {
    ...metadata,
    description: cleanText(metadata.description, report),
    folderName: cleanText(metadata.folderName, report),
    tags: metadata.tags.map((tag) => cleanText(tag, report)),
  };
}

function sanitizeNotes(notes: CellNote[], report: ImportSanitizationReport) {
  return notes.map((note) => ({
    ...note,
    text: cleanText(note.text, report),
    mentions: note.mentions.map((mention) => ({
      ...mention,
      label: cleanText(mention.label, report),
    })),
    replies: note.replies.map((reply) => ({
      ...reply,
      text: cleanText(reply.text, report),
      mentions: reply.mentions.map((mention) => ({
        ...mention,
        label: cleanText(mention.label, report),
      })),
    })),
  }));
}

function sanitizePrintSettings(
  settings: SheetPrintSettings[],
  report: ImportSanitizationReport,
) {
  return settings.map((setting) => ({
    ...setting,
    headerText: cleanText(setting.headerText, report),
    footerText: cleanText(setting.footerText, report),
  }));
}

function sanitizeFormulaWatches(
  watches: FormulaWatch[],
  sheets: SheetData[],
) {
  return watches.filter((watch) => {
    const sheet = sheets.find((item) => item.id === watch.sheetId);

    return sheet?.cells[watch.cellKey]?.raw.startsWith("=") === true;
  });
}

function sanitizeLinks(links: CellLink[], report: ImportSanitizationReport) {
  return links.flatMap((link) => {
    const normalizedUrl = normalizeCellLinkUrl(link.url);

    if (!normalizedUrl) {
      report.removedLinkCount += 1;
      return [];
    }

    if (normalizedUrl !== link.url) {
      report.normalizedLinkCount += 1;
    }

    return [
      {
        ...link,
        url: normalizedUrl,
        label: cleanText(link.label, report),
      },
    ];
  });
}

export function getImportSanitizationChangeCount(
  report: ImportSanitizationReport,
) {
  return Object.values(report).reduce((total, count) => total + count, 0);
}

export function getImportSanitizationNotice(
  report: ImportSanitizationReport,
) {
  const parts: string[] = [];

  if (report.disabledFormulaCount > 0) {
    parts.push(
      `${report.disabledFormulaCount} risky ${report.disabledFormulaCount === 1 ? "formula was" : "formulas were"} stored as text`,
    );
  }

  if (report.cleanedTextCount > 0) {
    parts.push(
      `${report.cleanedTextCount} text ${report.cleanedTextCount === 1 ? "value was" : "values were"} cleaned`,
    );
  }

  if (report.removedLinkCount > 0) {
    parts.push(
      `${report.removedLinkCount} unsafe ${report.removedLinkCount === 1 ? "link was" : "links were"} removed`,
    );
  }

  if (report.normalizedLinkCount > 0) {
    parts.push(
      `${report.normalizedLinkCount} ${report.normalizedLinkCount === 1 ? "link was" : "links were"} normalized`,
    );
  }

  if (report.removedSnapshotCount + report.removedRestoreCount > 0) {
    parts.push("imported history was cleared");
  }

  return parts.length === 0
    ? null
    : `Import sanitized: ${parts.join(", ")}.`;
}

export function sanitizeImportedSheet(sheet: SheetData) {
  const report = cloneReport();

  return {
    sheet: sanitizeSheet(sheet, report),
    report,
  };
}

export function sanitizeWorkbookImportDocument(value: WorkbookDocument) {
  const report = cloneReport();
  const document = normalizeWorkbookDocument(value);
  const removedSnapshotCount = document.versionHistory.length;
  const removedRestoreCount = document.versionRestores.length;
  const sanitizedDocument: WorkbookDocument = {
    ...document,
    metadata: sanitizeMetadata(document.metadata, report),
    versionHistory: [],
    versionRestores: [],
    sheets: document.sheets.map((sheet) => sanitizeSheet(sheet, report)),
    conditionalFormats: sanitizeConditionalFormats(
      document.conditionalFormats ?? [],
      report,
    ),
    dataValidations: sanitizeDataValidations(
      document.dataValidations ?? [],
      report,
    ),
    cellNotes: sanitizeNotes(document.cellNotes ?? [], report),
    commentNotifications: (document.commentNotifications ?? []).map(
      (notification) => ({
        ...notification,
        text: cleanText(notification.text, report),
      }),
    ),
    cellLinks: sanitizeLinks(document.cellLinks ?? [], report),
    sheetPrintSettings: sanitizePrintSettings(
      document.sheetPrintSettings ?? [],
      report,
    ),
  };

  sanitizedDocument.formulaWatches = sanitizeFormulaWatches(
    document.formulaWatches ?? [],
    sanitizedDocument.sheets,
  );

  report.removedSnapshotCount += removedSnapshotCount;
  report.removedRestoreCount += removedRestoreCount;

  return {
    document: sanitizedDocument.sheets.length
      ? sanitizedDocument
      : createDefaultWorkbookDocument(),
    report,
  };
}
