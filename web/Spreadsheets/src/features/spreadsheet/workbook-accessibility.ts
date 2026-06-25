import { parseCellKey } from "@/features/workbooks/addresses";
import type {
  ChartRange,
  ConditionalFormatRule,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookAccessibilitySeverity = "error" | "warning" | "info";

export type WorkbookAccessibilityIssue = {
  id: string;
  title: string;
  details: string;
  severity: WorkbookAccessibilitySeverity;
  category: "Contrast" | "Readability" | "Navigation" | "Alternative text";
  count?: number;
  sheetId?: string;
  sheetName?: string;
  range?: ChartRange;
};

const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_FOREGROUND = "#111827";
const MIN_BODY_CONTRAST = 4.5;
const MIN_LARGE_TEXT_CONTRAST = 3;
const MIN_FONT_SIZE = 11;

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

function expandShortHex(value: string) {
  return value
    .split("")
    .map((character) => `${character}${character}`)
    .join("");
}

function parseHexColor(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/^#/, "");
  const hex =
    normalized.length === 3 ? expandShortHex(normalized) : normalized.slice(0, 6);

  if (!/^[\da-f]{6}$/i.test(hex)) {
    return null;
  }

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance(channel: number) {
  const normalized = channel / 255;

  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function colorLuminance(color: NonNullable<ReturnType<typeof parseHexColor>>) {
  return (
    0.2126 * relativeLuminance(color.red) +
    0.7152 * relativeLuminance(color.green) +
    0.0722 * relativeLuminance(color.blue)
  );
}

function contrastRatio(foreground: string | undefined, background: string | undefined) {
  const foregroundColor = parseHexColor(foreground ?? DEFAULT_FOREGROUND);
  const backgroundColor = parseHexColor(background ?? DEFAULT_BACKGROUND);

  if (!foregroundColor || !backgroundColor) {
    return null;
  }

  const foregroundLuminance = colorLuminance(foregroundColor);
  const backgroundLuminance = colorLuminance(backgroundColor);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function isLargeText(fontSize: number | undefined) {
  return typeof fontSize === "number" && fontSize >= 18;
}

function isVisualOnlyRule(rule: ConditionalFormatRule) {
  return ["colorScale", "dataBar", "iconSet"].includes(rule.operator);
}

function addIssue(
  issues: WorkbookAccessibilityIssue[],
  issue: WorkbookAccessibilityIssue,
) {
  if (issue.count === 0) {
    return;
  }

  issues.push(issue);
}

export function getWorkbookAccessibilityIssues(document: WorkbookDocument) {
  const issues: WorkbookAccessibilityIssue[] = [];

  for (const sheet of document.sheets) {
    const lowContrastKeys: string[] = [];
    const smallFontKeys: string[] = [];
    const colorOnlyIndicatorKeys: string[] = [];

    for (const [key, cell] of Object.entries(sheet.cells)) {
      const ratio = contrastRatio(
        cell.style?.foreground,
        cell.style?.background,
      );
      const minimumContrast = isLargeText(cell.style?.fontSize)
        ? MIN_LARGE_TEXT_CONTRAST
        : MIN_BODY_CONTRAST;

      if (ratio !== null && ratio < minimumContrast) {
        lowContrastKeys.push(key);
      }

      if (
        typeof cell.style?.fontSize === "number" &&
        cell.style.fontSize < MIN_FONT_SIZE
      ) {
        smallFontKeys.push(key);
      }

      if (cell.style?.indicator && !cell.raw.trim()) {
        colorOnlyIndicatorKeys.push(key);
      }
    }

    addIssue(issues, {
      id: `low-contrast:${sheet.id}`,
      title: "Cells may have low text contrast",
      details:
        "Foreground and fill colors should meet readable contrast for worksheet users.",
      severity: "warning",
      category: "Contrast",
      count: lowContrastKeys.length,
      sheetId: sheet.id,
      sheetName: sheet.name,
      range: firstCellRange(sheet, lowContrastKeys),
    });

    addIssue(issues, {
      id: `small-font:${sheet.id}`,
      title: "Cells use very small font sizes",
      details: "Tiny cell text is hard to read and zoom-dependent.",
      severity: "warning",
      category: "Readability",
      count: smallFontKeys.length,
      sheetId: sheet.id,
      sheetName: sheet.name,
      range: firstCellRange(sheet, smallFontKeys),
    });

    addIssue(issues, {
      id: `merged-cells:${sheet.id}`,
      title: "Merged cells can complicate navigation",
      details:
        "Merged ranges may be harder to navigate with keyboards and assistive technology.",
      severity: "info",
      category: "Navigation",
      count: sheet.mergedCells.length,
      sheetId: sheet.id,
      sheetName: sheet.name,
      range: sheet.mergedCells[0],
    });

    addIssue(issues, {
      id: `color-only-indicators:${sheet.id}`,
      title: "Indicators rely on color without text",
      details:
        "Icon or color indicators should be paired with meaningful cell values.",
      severity: "warning",
      category: "Alternative text",
      count: colorOnlyIndicatorKeys.length,
      sheetId: sheet.id,
      sheetName: sheet.name,
      range: firstCellRange(sheet, colorOnlyIndicatorKeys),
    });

    addIssue(issues, {
      id: `hidden-structure:${sheet.id}`,
      title: "Hidden rows or columns need review",
      details:
        "Hidden worksheet structure can make keyboard navigation and review workflows harder to understand.",
      severity: "info",
      category: "Navigation",
      count: sheet.hiddenRows.length + sheet.hiddenColumns.length,
      sheetId: sheet.id,
      sheetName: sheet.name,
      range:
        sheet.hiddenRows[0] !== undefined
          ? cellRange(sheet.hiddenRows[0], 0)
          : sheet.hiddenColumns[0] !== undefined
            ? cellRange(0, sheet.hiddenColumns[0])
            : undefined,
    });

    addIssue(issues, {
      id: `hidden-gridlines:${sheet.id}`,
      title: "Gridlines are hidden",
      details:
        "Hidden gridlines can reduce spatial orientation for high-contrast and magnified views.",
      severity: "info",
      category: "Readability",
      count: sheet.showGridlines === false ? 1 : 0,
      sheetId: sheet.id,
      sheetName: sheet.name,
    });
  }

  const blankLabelLinks = document.cellLinks.filter(
    (link) => !link.label.trim(),
  );

  if (blankLabelLinks.length > 0) {
    const firstLink = blankLabelLinks[0];
    const sheet = document.sheets.find((item) => item.id === firstLink.sheetId);

    addIssue(issues, {
      id: "blank-link-labels",
      title: "Links should have readable labels",
      details:
        "Descriptive labels are easier to scan than raw URLs for keyboard and screen-reader users.",
      severity: "warning",
      category: "Alternative text",
      count: blankLabelLinks.length,
      sheetId: sheet?.id,
      sheetName: sheet?.name,
      range: sheet ? firstCellRange(sheet, [firstLink.cellKey]) : undefined,
    });
  }

  const visualOnlyRules = document.conditionalFormats.filter(isVisualOnlyRule);

  if (visualOnlyRules.length > 0) {
    const firstRule = visualOnlyRules[0];
    const sheet = document.sheets.find((item) => item.id === firstRule.sheetId);

    addIssue(issues, {
      id: "visual-only-rules",
      title: "Conditional formatting may be color-only",
      details:
        "Color scales, data bars, and icon sets should not be the only way values are communicated.",
      severity: "info",
      category: "Alternative text",
      count: visualOnlyRules.length,
      sheetId: sheet?.id,
      sheetName: sheet?.name,
      range: firstRule.range,
    });
  }

  const unclearValidationRules = document.dataValidations.filter(
    (rule) =>
      (rule.showInputMessage !== false && !rule.inputMessage?.trim()) ||
      (rule.showErrorAlert !== false && !rule.errorMessage?.trim()),
  );

  if (unclearValidationRules.length > 0) {
    const firstRule = unclearValidationRules[0];
    const sheet = document.sheets.find((item) => item.id === firstRule?.sheetId);

    addIssue(issues, {
      id: "unclear-validation-rules",
      title: "Validation rules should explain allowed input",
      details:
        "Input prompts and error alerts help keyboard and screen-reader users recover from invalid entries.",
      severity: "warning",
      category: "Navigation",
      count: unclearValidationRules.length,
      sheetId: sheet?.id,
      sheetName: sheet?.name,
      range: firstRule?.range,
    });
  }

  return issues;
}
