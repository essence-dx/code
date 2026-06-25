import {
  clampPrintScale,
  clonePrintArea,
  getEffectiveSheetPrintSettings,
  normalizeColumnPageBreaks,
  normalizePrintText,
  normalizeRowPageBreaks,
} from "@/features/workbooks/print-settings";
import type {
  SheetPrintSettings,
  WorkbookDocument,
} from "@/features/workbooks/types";

export function updateActiveSheetPrintSettingsInDocument(
  document: WorkbookDocument,
  updates: Partial<Omit<SheetPrintSettings, "sheetId" | "updatedAt">>,
) {
  document.sheetPrintSettings ??= [];

  const settingIndex = document.sheetPrintSettings.findIndex(
    (settings) => settings.sheetId === document.activeSheetId,
  );
  const current = getEffectiveSheetPrintSettings(
    document.activeSheetId,
    settingIndex >= 0 ? document.sheetPrintSettings[settingIndex] : undefined,
  );
  const nextSettings = getEffectiveSheetPrintSettings(document.activeSheetId, {
    ...current,
    ...updates,
    scale:
      updates.scale === undefined ? current.scale : clampPrintScale(updates.scale),
    headerText:
      updates.headerText === undefined
        ? current.headerText
        : normalizePrintText(updates.headerText),
    footerText:
      updates.footerText === undefined
        ? current.footerText
        : normalizePrintText(updates.footerText),
    printArea:
      "printArea" in updates
        ? clonePrintArea(updates.printArea)
        : clonePrintArea(current.printArea),
    rowPageBreaks:
      updates.rowPageBreaks === undefined
        ? current.rowPageBreaks
        : normalizeRowPageBreaks(updates.rowPageBreaks),
    columnPageBreaks:
      updates.columnPageBreaks === undefined
        ? current.columnPageBreaks
        : normalizeColumnPageBreaks(updates.columnPageBreaks),
    updatedAt: new Date().toISOString(),
  });

  if (settingIndex >= 0) {
    document.sheetPrintSettings[settingIndex] = nextSettings;
    return;
  }

  document.sheetPrintSettings.push(nextSettings);
}
