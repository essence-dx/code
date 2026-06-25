import type {
  CellRecord,
  CellRichTextRun,
  CellStyle,
} from "@/features/workbooks/types";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import { inferCellFontFamily } from "@/features/workbooks/font-families";
import { excelNumberFormatToCellStyle } from "@/features/workbooks/number-formats";
import { normalizeCellRichTextRuns } from "@/features/workbooks/rich-text";

export function parseClipboardGrid(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n");

  return rows.map((row) => row.split("\t"));
}

export function serializeClipboardGrid(values: string[][]) {
  return values.map((row) => row.join("\t")).join("\n");
}

export function transposeClipboardGrid(values: string[][]) {
  const columnCount = Math.max(0, ...values.map((row) => row.length));

  return Array.from({ length: columnCount }, (_, columnIndex) =>
    values.map((row) => row[columnIndex] ?? ""),
  );
}

function normalizeHtmlCellText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseSpan(value: string | null) {
  const parsed = Number(value ?? 1);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export type HtmlTableClipboardPayload = {
  text: string;
  cells: (CellRecord | null)[][];
};

function normalizeCssValue(value: string | null | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function parseStyleText(styleText: string) {
  return styleText.split(";").reduce<Record<string, string>>((styles, rule) => {
    const separatorIndex = rule.indexOf(":");

    if (separatorIndex <= 0) {
      return styles;
    }

    const property = rule.slice(0, separatorIndex).trim().toLowerCase();
    const value = rule.slice(separatorIndex + 1).trim();

    if (property && value) {
      styles[property] = value;
    }

    return styles;
  }, {});
}

function getClassStyleMap(document: Document) {
  const classStyles = new Map<string, Record<string, string>>();

  document.querySelectorAll("style").forEach((styleElement) => {
    const text = styleElement.textContent ?? "";
    const classRulePattern = /\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}/g;

    for (const match of text.matchAll(classRulePattern)) {
      classStyles.set(match[1], {
        ...(classStyles.get(match[1]) ?? {}),
        ...parseStyleText(match[2]),
      });
    }
  });

  return classStyles;
}

function getElementStyles(
  element: Element,
  classStyles: Map<string, Record<string, string>>,
) {
  const styles: Record<string, string> = {};

  element.classList.forEach((className) => {
    Object.assign(styles, classStyles.get(className));
  });

  return {
    ...styles,
    ...parseStyleText(element.getAttribute("style") ?? ""),
  };
}

function normalizeCssColor(value: string | undefined) {
  const normalized = normalizeCssValue(value);

  if (
    !normalized ||
    normalized === "transparent" ||
    normalized === "inherit" ||
    normalized === "initial" ||
    normalized === "none"
  ) {
    return undefined;
  }

  return normalized;
}

function parseFontSize(value: string | undefined) {
  const normalized = normalizeCssValue(value);
  const match = normalized.match(/^(\d+(?:\.\d+)?)(px|pt)?$/i);

  if (!match) {
    return undefined;
  }

  const size = Number(match[1]);
  const pixels = match[2]?.toLowerCase() === "pt" ? size * (4 / 3) : size;

  return Math.min(Math.max(Math.round(pixels), 8), 48);
}

function inferNumberFormatStyle(styles: Record<string, string>) {
  return excelNumberFormatToCellStyle(
    normalizeCssValue(styles["mso-number-format"]),
  );
}

function htmlCellStyle(
  element: Element,
  classStyles: Map<string, Record<string, string>>,
): CellStyle | undefined {
  const styles = getElementStyles(element, classStyles);
  const fontWeight = normalizeCssValue(styles["font-weight"]).toLowerCase();
  const fontStyle = normalizeCssValue(styles["font-style"]).toLowerCase();
  const textDecoration = normalizeCssValue(
    styles["text-decoration-line"] ?? styles["text-decoration"],
  ).toLowerCase();
  const textAlign = normalizeCssValue(styles["text-align"]).toLowerCase();
  const whiteSpace = normalizeCssValue(styles["white-space"]).toLowerCase();
  const cellStyle: CellStyle = {};
  const background =
    normalizeCssColor(styles["background-color"]) ??
    normalizeCssColor(styles.background);
  const foreground = normalizeCssColor(styles.color);
  const fontFamily = inferCellFontFamily(
    normalizeCssValue(styles["font-family"]),
  );
  const fontSize = parseFontSize(styles["font-size"]);
  const numberFormatStyle = inferNumberFormatStyle(styles);

  if (fontWeight === "bold" || Number(fontWeight) >= 600) {
    cellStyle.bold = true;
  }

  if (fontStyle === "italic") {
    cellStyle.italic = true;
  }

  if (textDecoration.includes("underline")) {
    cellStyle.underline = true;
  }

  if (
    textDecoration.includes("line-through") ||
    textDecoration.includes("strikethrough")
  ) {
    cellStyle.strikethrough = true;
  }

  if (textAlign === "left" || textAlign === "center" || textAlign === "right") {
    cellStyle.align = textAlign;
  }

  if (
    styles["vertical-align"] === "top" ||
    styles["vertical-align"] === "middle" ||
    styles["vertical-align"] === "bottom"
  ) {
    cellStyle.verticalAlign = styles["vertical-align"];
  }

  if (background) {
    cellStyle.background = background;
  }

  if (foreground) {
    cellStyle.foreground = foreground;
  }

  if (fontFamily) {
    cellStyle.fontFamily = fontFamily;
  }

  if (fontSize) {
    cellStyle.fontSize = fontSize;
  }

  if (numberFormatStyle) {
    Object.assign(cellStyle, numberFormatStyle);
  }

  if (whiteSpace.includes("pre") || whiteSpace.includes("wrap")) {
    cellStyle.wrap = true;
  }

  if (normalizeCssValue(styles["writing-mode"]).toLowerCase() === "vertical-rl") {
    cellStyle.verticalText = true;
  }

  if (normalizeCssValue(styles["font-stretch"]).toLowerCase() === "condensed") {
    cellStyle.shrinkToFit = true;
  }

  const rotation = normalizeCssValue(styles.transform).match(
    /rotate\((-?\d+(?:\.\d+)?)deg\)/i,
  );

  if (rotation) {
    cellStyle.textRotation = Number(rotation[1]);
  }

  return Object.keys(cellStyle).length > 0 ? cellStyle : undefined;
}

function richTextRunStyle(style?: CellStyle): Omit<CellRichTextRun, "text"> {
  if (!style) {
    return {};
  }

  return {
    ...(style.bold ? { bold: true } : {}),
    ...(style.italic ? { italic: true } : {}),
    ...(style.underline ? { underline: true } : {}),
    ...(style.strikethrough ? { strikethrough: true } : {}),
    ...(style.foreground ? { foreground: style.foreground } : {}),
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
  };
}

function htmlCellRichTextRuns(
  element: Element,
  classStyles: Map<string, Record<string, string>>,
) {
  const runElements = Array.from(
    element.querySelectorAll("[data-ee-rich-run='true']"),
  );

  if (!runElements.length) {
    return undefined;
  }

  const runs = runElements.flatMap((runElement) => {
    const text = runElement.textContent ?? "";

    return text
      ? [
          {
            text,
            ...richTextRunStyle(htmlCellStyle(runElement, classStyles)),
          },
        ]
      : [];
  });

  const normalizedRuns = normalizeCellRichTextRuns(
    runs,
    element.textContent ?? "",
  );

  return normalizedRuns.length > 0 ? normalizedRuns : undefined;
}

function htmlCellFormula(element: Element) {
  const formula =
    element.getAttribute("data-sheets-formula") ??
    element.getAttribute("data-formula") ??
    element.getAttribute("formula") ??
    element.getAttribute("x:fmla");
  const normalized = normalizeCssValue(formula);

  if (!normalized) {
    return null;
  }

  return canonicalizeFormulaInput(
    normalized.startsWith("=") ? normalized : `=${normalized}`,
  );
}

export function htmlTableToClipboardPayload(
  html: string,
): HtmlTableClipboardPayload | null {
  const document = new DOMParser().parseFromString(html, "text/html");
  const table = document.querySelector("table");

  if (!table) {
    return null;
  }

  const grid: string[][] = [];
  const cellGrid: (CellRecord | null)[][] = [];
  const rows = Array.from(table.querySelectorAll("tr"));
  const classStyles = getClassStyleMap(document);

  rows.forEach((rowElement, rowIndex) => {
    grid[rowIndex] ??= [];
    cellGrid[rowIndex] ??= [];

    let columnIndex = 0;
    const cells = Array.from(rowElement.children).filter(
      (element) =>
        element.tagName.toLowerCase() === "td" ||
        element.tagName.toLowerCase() === "th",
    );

    cells.forEach((cell) => {
      while (cellGrid[rowIndex][columnIndex] !== undefined) {
        columnIndex += 1;
      }

      const text = normalizeHtmlCellText(cell.textContent ?? "");
      const formula = htmlCellFormula(cell);
      const style = htmlCellStyle(cell, classStyles);
      const richTextRuns = formula
        ? undefined
        : htmlCellRichTextRuns(cell, classStyles);
      const rowSpan = parseSpan(cell.getAttribute("rowspan"));
      const columnSpan = parseSpan(cell.getAttribute("colspan"));
      const record: CellRecord | null =
        text || formula || style || richTextRuns
          ? {
              raw: formula ?? text,
              ...(style ? { style } : {}),
              ...(richTextRuns ? { richTextRuns } : {}),
            }
          : null;

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        const targetRowIndex = rowIndex + rowOffset;
        grid[targetRowIndex] ??= [];
        cellGrid[targetRowIndex] ??= [];

        for (
          let columnOffset = 0;
          columnOffset < columnSpan;
          columnOffset += 1
        ) {
          grid[targetRowIndex][columnIndex + columnOffset] =
            rowOffset === 0 && columnOffset === 0 ? text : "";
          cellGrid[targetRowIndex][columnIndex + columnOffset] =
            rowOffset === 0 && columnOffset === 0 ? record : null;
        }
      }

      columnIndex += columnSpan;
    });
  });

  return {
    text: serializeClipboardGrid(grid),
    cells: cellGrid,
  };
}

export function htmlTableToClipboardText(html: string) {
  return htmlTableToClipboardPayload(html)?.text ?? null;
}
