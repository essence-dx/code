import type {
  ChartRange,
  SheetPrintSettings,
} from "@/features/workbooks/types";

export const printMarginValues: Record<SheetPrintSettings["margins"], string> = {
  normal: "0.7in",
  narrow: "0.35in",
  wide: "1in",
};

export function clampPrintScale(scale: unknown) {
  const numericScale = Number(scale);

  if (!Number.isFinite(numericScale)) {
    return 100;
  }

  return Math.min(Math.max(Math.round(numericScale), 50), 200);
}

export function normalizePrintText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function normalizeRowPageBreaks(value: unknown) {
  return normalizePrintBreakIndexes(value);
}

export function normalizeColumnPageBreaks(value: unknown) {
  return normalizePrintBreakIndexes(value);
}

function normalizePrintBreakIndexes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((rowIndex) => Number(rowIndex))
        .filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex > 0),
    ),
  ).sort((left, right) => left - right);
}

export function createDefaultSheetPrintSettings(
  sheetId: string,
): SheetPrintSettings {
  return {
    sheetId,
    orientation: "portrait",
    scale: 100,
    margins: "normal",
    rowPageBreaks: [],
    columnPageBreaks: [],
    repeatHeaderRows: false,
    repeatFirstColumn: false,
    printGridlines: true,
    headerText: "",
    footerText: "",
    updatedAt: "",
  };
}

export function getEffectiveSheetPrintSettings(
  sheetId: string,
  settings?: Partial<SheetPrintSettings>,
): SheetPrintSettings {
  return {
    ...createDefaultSheetPrintSettings(sheetId),
    ...settings,
    sheetId,
    orientation: settings?.orientation === "landscape" ? "landscape" : "portrait",
    scale: clampPrintScale(settings?.scale),
    margins:
      settings?.margins === "narrow" || settings?.margins === "wide"
        ? settings.margins
        : "normal",
    repeatHeaderRows: settings?.repeatHeaderRows === true,
    repeatFirstColumn: settings?.repeatFirstColumn === true,
    printGridlines: settings?.printGridlines === false ? false : true,
    headerText: normalizePrintText(settings?.headerText),
    footerText: normalizePrintText(settings?.footerText),
    printArea: settings?.printArea,
    rowPageBreaks: normalizeRowPageBreaks(settings?.rowPageBreaks),
    columnPageBreaks: normalizeColumnPageBreaks(settings?.columnPageBreaks),
    updatedAt:
      typeof settings?.updatedAt === "string" ? settings.updatedAt : "",
  };
}

export function clonePrintArea(printArea?: ChartRange) {
  return printArea
    ? {
        startRowIndex: printArea.startRowIndex,
        startColumnIndex: printArea.startColumnIndex,
        endRowIndex: printArea.endRowIndex,
        endColumnIndex: printArea.endColumnIndex,
      }
    : undefined;
}
